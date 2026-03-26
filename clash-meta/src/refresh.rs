use std::collections::HashMap;

use futures::stream::{self, StreamExt};
use sqlx::SqlitePool;

use crate::clash_api::ClashClient;

/// How many battle log requests to run concurrently.
/// The Clash API allows ~20 req/s on the silver tier, so 10 concurrent
/// is aggressive but safe — each request takes ~200ms round-trip so we'll
/// peak around 10 in-flight at once.
const CONCURRENT_FETCHES: usize = 10;

/// Minimum seconds between refreshes. Callers can pass `force: true` to bypass.
const REFRESH_COOLDOWN_SECS: i64 = 3600; // 1 hour

/// Check whether the data is stale enough to warrant a refresh.
async fn is_stale(pool: &SqlitePool) -> bool {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT updated_at FROM deck_stats ORDER BY updated_at DESC LIMIT 1")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    match row {
        None => true, // no data at all
        Some((ts,)) => {
            // Parse the stored RFC3339 timestamp and compare to now.
            match chrono::DateTime::parse_from_rfc3339(&ts) {
                Ok(last) => {
                    let age = chrono::Utc::now().signed_duration_since(last);
                    age.num_seconds() > REFRESH_COOLDOWN_SECS
                }
                Err(_) => true, // unparseable → treat as stale
            }
        }
    }
}

/// Main refresh entry point.
///
/// If `force` is false, skips the refresh when data is less than 1 hour old.
/// Returns a summary string on success.
pub async fn run_refresh(
    client: &ClashClient,
    pool: &SqlitePool,
    force: bool,
) -> Result<String, String> {
    // --- Staleness check ---
    if !force && !is_stale(pool).await {
        return Ok("Data is fresh (< 1 hour old), skipping refresh. Use force=true to override.".into());
    }

    tracing::info!("Starting data refresh...");

    // --- Step 1: Sync card catalog (skip if we already have cards) ---
    let card_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cards")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));

    let cards_synced = if card_count.0 == 0 {
        let cards = client
            .get_all_cards()
            .await
            .map_err(|e| format!("Failed to fetch cards: {e}"))?;

        // Batch insert in a single transaction — much faster than 121 individual commits.
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| format!("Failed to start transaction: {e}"))?;

        for card in &cards {
            let icon = card
                .icon_urls
                .as_ref()
                .and_then(|u| u.medium.as_deref())
                .unwrap_or("");
            let hero_icon = card
                .icon_urls
                .as_ref()
                .and_then(|u| u.hero_medium.as_deref())
                .unwrap_or("");
            sqlx::query(
                "INSERT INTO cards (id, name, elixir, rarity, icon_url, hero_icon_url)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   elixir = excluded.elixir,
                   rarity = excluded.rarity,
                   icon_url = excluded.icon_url,
                   hero_icon_url = excluded.hero_icon_url",
            )
            .bind(card.id)
            .bind(&card.name)
            .bind(card.elixir_cost)
            .bind(&card.rarity)
            .bind(icon)
            .bind(hero_icon)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to upsert card {}: {e}", card.name))?;
        }

        tx.commit()
            .await
            .map_err(|e| format!("Failed to commit cards: {e}"))?;

        let count = cards.len();
        tracing::info!("Synced {} cards (first time)", count);
        count
    } else {
        tracing::info!("Card catalog already populated ({} cards), skipping API call", card_count.0);
        card_count.0 as usize
    };

    // --- Step 2: Fetch top players (1 API call, 200 players for better deck variety) ---
    let top_players = client
        .get_top_players(200)
        .await
        .map_err(|e| format!("Failed to fetch top players: {e}"))?;
    tracing::info!("Fetched {} top players", top_players.len());

    // --- Step 3: Fetch battle logs concurrently ---
    // C++ comparison: this is like launching a thread pool of futures.
    // `buffer_unordered(N)` runs up to N futures at once and yields results
    // as they complete (not necessarily in order). Much faster than sequential.
    let tags: Vec<String> = top_players.iter().map(|p| p.tag.clone()).collect();

    let battle_results: Vec<_> = stream::iter(tags)
        .map(|tag| {
            let client = client.clone();
            async move {
                let result = client.get_battlelog(&tag).await;
                (tag, result)
            }
        })
        .buffer_unordered(CONCURRENT_FETCHES)
        .collect()
        .await;

    // --- Step 4: Aggregate deck stats in memory ---
    let mut deck_map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut deck_cards: HashMap<String, Vec<i64>> = HashMap::new();
    let mut battles_processed = 0u32;
    let mut players_fetched = 0u32;

    for (tag, result) in &battle_results {
        let battles = match result {
            Ok(b) => b,
            Err(e) => {
                tracing::warn!("Skipping {}: {e}", tag);
                continue;
            }
        };
        players_fetched += 1;

        for battle in battles {
            let team = match battle.team.first() {
                Some(t) => t,
                None => continue,
            };
            let opponent = match battle.opponent.first() {
                Some(o) => o,
                None => continue,
            };

            let mut card_ids: Vec<i64> = team.cards.iter().map(|c| c.id).collect();
            card_ids.sort();

            if card_ids.len() != 8 {
                continue;
            }

            let key = card_ids
                .iter()
                .map(|id| id.to_string())
                .collect::<Vec<_>>()
                .join(",");

            let won = team.crowns > opponent.crowns;
            let entry = deck_map.entry(key.clone()).or_insert((0, 0));
            if won {
                entry.0 += 1;
            } else {
                entry.1 += 1;
            }

            deck_cards.entry(key).or_insert(card_ids);
            battles_processed += 1;
        }
    }

    tracing::info!(
        "Processed {} battles from {} players, found {} unique decks",
        battles_processed,
        players_fetched,
        deck_map.len()
    );

    // --- Step 5: Write to database in a single transaction ---
    let now = chrono::Utc::now().to_rfc3339();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    sqlx::query("DELETE FROM deck_stats")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to clear deck_stats: {e}"))?;

    for (key, (wins, losses)) in &deck_map {
        let card_ids_str = deck_cards
            .get(key)
            .map(|ids| {
                ids.iter()
                    .map(|id| id.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            })
            .unwrap_or_default();

        let total = wins + losses;
        let win_rate = if total > 0 {
            *wins as f64 / total as f64
        } else {
            0.0
        };

        sqlx::query(
            "INSERT INTO decks (deck_key, card_ids) VALUES (?, ?)
             ON CONFLICT(deck_key) DO NOTHING",
        )
        .bind(key)
        .bind(&card_ids_str)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert deck: {e}"))?;

        sqlx::query(
            "INSERT INTO deck_stats (deck_key, wins, losses, total, win_rate, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(key)
        .bind(wins)
        .bind(losses)
        .bind(total)
        .bind(win_rate)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert deck_stats: {e}"))?;
    }

    // --- Step 6: Compute card pair co-occurrence stats ---
    sqlx::query("DELETE FROM card_pairs")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to clear card_pairs: {e}"))?;

    let mut pair_map: HashMap<(i64, i64), (i64, i64)> = HashMap::new(); // (wins, total)
    for (key, (wins, losses)) in &deck_map {
        if let Some(card_ids) = deck_cards.get(key) {
            let total = wins + losses;
            for i in 0..card_ids.len() {
                for j in (i + 1)..card_ids.len() {
                    let a = card_ids[i];
                    let b = card_ids[j];
                    let pair = if a < b { (a, b) } else { (b, a) };
                    let entry = pair_map.entry(pair).or_insert((0, 0));
                    entry.0 += wins;
                    entry.1 += total;
                }
            }
        }
    }

    for ((a, b), (wins, total)) in &pair_map {
        let wr = if *total > 0 { *wins as f64 / *total as f64 } else { 0.0 };
        sqlx::query(
            "INSERT INTO card_pairs (card_a, card_b, wins, total, win_rate)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(a)
        .bind(b)
        .bind(wins)
        .bind(total)
        .bind(wr)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert card_pair: {e}"))?;
    }

    let pairs_count = pair_map.len();
    tracing::info!("Computed {} card pair synergies", pairs_count);

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit: {e}"))?;

    let summary = format!(
        "Refresh complete: {} cards, {} players, {} battles, {} unique decks",
        cards_synced, players_fetched, battles_processed, deck_map.len()
    );
    tracing::info!("{}", summary);
    Ok(summary)
}
