use sqlx::SqlitePool;

pub async fn init_db(pool: &SqlitePool) {
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(pool)
        .await
        .ok();

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS cards (
            id            INTEGER PRIMARY KEY,
            name          TEXT NOT NULL,
            elixir        INTEGER,
            rarity        TEXT,
            icon_url      TEXT,
            hero_icon_url TEXT
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create cards table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS decks (
            deck_key TEXT PRIMARY KEY,
            card_ids TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create decks table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS deck_stats (
            deck_key   TEXT PRIMARY KEY,
            wins       INTEGER NOT NULL DEFAULT 0,
            losses     INTEGER NOT NULL DEFAULT 0,
            total      INTEGER NOT NULL DEFAULT 0,
            win_rate   REAL NOT NULL DEFAULT 0.0,
            usage_rank INTEGER,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (deck_key) REFERENCES decks(deck_key)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create deck_stats table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS card_pairs (
            card_a   INTEGER NOT NULL,
            card_b   INTEGER NOT NULL,
            wins     INTEGER NOT NULL DEFAULT 0,
            total    INTEGER NOT NULL DEFAULT 0,
            win_rate REAL NOT NULL DEFAULT 0.0,
            PRIMARY KEY (card_a, card_b)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create card_pairs table");
}

// --- Shared types ---

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct CardDetail {
    pub id: i64,
    pub name: String,
    pub elixir: Option<i32>,
    pub rarity: Option<String>,
    pub icon_url: Option<String>,
    pub hero_icon_url: Option<String>,
}

/// A deck with full card details and stats, ready for JSON.
#[derive(Debug, serde::Serialize)]
pub struct DeckWithCards {
    pub deck_key: String,
    pub cards: Vec<CardDetail>,
    pub wins: i64,
    pub losses: i64,
    pub total: i64,
    pub win_rate: f64,
    pub avg_elixir: f64,
    /// True if deck contains a champion-rarity card (Archer Queen, Golden Knight, etc.)
    pub has_champion: bool,
    /// True if deck contains a card with a hero skin (Knight, Wizard, Musketeer, etc.)
    pub has_hero: bool,
}

#[derive(Debug, sqlx::FromRow)]
struct DeckStatsRow {
    deck_key: String,
    card_ids: String,
    wins: i64,
    losses: i64,
    total: i64,
    win_rate: f64,
}

/// Resolve a list of card IDs into full CardDetail structs.
async fn resolve_cards(pool: &SqlitePool, card_ids_csv: &str) -> Vec<CardDetail> {
    let ids: Vec<&str> = card_ids_csv.split(',').collect();
    let mut cards = Vec::with_capacity(ids.len());
    for id_str in ids {
        if let Ok(id) = id_str.trim().parse::<i64>() {
            if let Ok(card) = sqlx::query_as::<_, CardDetail>(
                "SELECT id, name, elixir, rarity, icon_url, hero_icon_url FROM cards WHERE id = ?",
            )
            .bind(id)
            .fetch_one(pool)
            .await
            {
                cards.push(card);
            }
        }
    }
    cards
}

fn compute_avg_elixir(cards: &[CardDetail]) -> f64 {
    let costs: Vec<f64> = cards.iter().filter_map(|c| c.elixir.map(|e| e as f64)).collect();
    if costs.is_empty() {
        0.0
    } else {
        costs.iter().sum::<f64>() / costs.len() as f64
    }
}

fn build_deck(row: DeckStatsRow, cards: Vec<CardDetail>) -> DeckWithCards {
    let avg_elixir = compute_avg_elixir(&cards);
    let has_champion = cards.iter().any(|c| c.rarity.as_deref() == Some("champion"));
    let has_hero = cards.iter().any(|c| {
        c.hero_icon_url
            .as_ref()
            .is_some_and(|u| !u.is_empty())
    });
    DeckWithCards {
        deck_key: row.deck_key,
        cards,
        wins: row.wins,
        losses: row.losses,
        total: row.total,
        win_rate: row.win_rate,
        avg_elixir,
        has_champion,
        has_hero,
    }
}

/// Return the top N decks with full card details.
pub async fn get_top_decks(pool: &SqlitePool, limit: i64) -> Vec<DeckWithCards> {
    let rows = sqlx::query_as::<_, DeckStatsRow>(
        "SELECT d.deck_key, d.card_ids, s.wins, s.losses, s.total, s.win_rate
         FROM deck_stats s
         JOIN decks d ON d.deck_key = s.deck_key
         WHERE s.total >= 3
         ORDER BY s.total DESC, s.win_rate DESC
         LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let cards = resolve_cards(pool, &row.card_ids).await;
        result.push(build_deck(row, cards));
    }
    result
}

/// Get a single deck by its key, with full card details.
pub async fn get_deck_detail(pool: &SqlitePool, deck_key: &str) -> Option<DeckWithCards> {
    let row = sqlx::query_as::<_, DeckStatsRow>(
        "SELECT d.deck_key, d.card_ids, s.wins, s.losses, s.total, s.win_rate
         FROM deck_stats s
         JOIN decks d ON d.deck_key = s.deck_key
         WHERE d.deck_key = ?",
    )
    .bind(deck_key)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()?;

    let cards = resolve_cards(pool, &row.card_ids).await;
    Some(build_deck(row, cards))
}

/// Get stats for a single card: how many decks it appears in, total wins/losses.
pub async fn get_card_stats(pool: &SqlitePool, card_id: i64) -> Option<serde_json::Value> {
    // Find the card info first.
    let card = sqlx::query_as::<_, CardDetail>(
        "SELECT id, name, elixir, rarity, icon_url, hero_icon_url FROM cards WHERE id = ?",
    )
    .bind(card_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()?;

    // Find all decks containing this card and aggregate.
    let id_str = card_id.to_string();
    let rows = sqlx::query_as::<_, DeckStatsRow>(
        "SELECT d.deck_key, d.card_ids, s.wins, s.losses, s.total, s.win_rate
         FROM deck_stats s
         JOIN decks d ON d.deck_key = s.deck_key",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut deck_count = 0i64;
    let mut total_wins = 0i64;
    let mut total_losses = 0i64;
    let mut top_decks = Vec::new();

    for row in &rows {
        let ids: Vec<&str> = row.card_ids.split(',').collect();
        if ids.contains(&id_str.as_str()) {
            deck_count += 1;
            total_wins += row.wins;
            total_losses += row.losses;
            top_decks.push((row.deck_key.clone(), row.total, row.win_rate));
        }
    }

    // Sort by usage, take top 5.
    top_decks.sort_by(|a, b| b.1.cmp(&a.1));
    top_decks.truncate(5);

    let total_battles = total_wins + total_losses;
    let win_rate = if total_battles > 0 {
        total_wins as f64 / total_battles as f64
    } else {
        0.0
    };

    // Resolve card details for each top deck so the frontend can display names.
    let mut top_decks_json = Vec::new();
    for (key, total, wr) in &top_decks {
        let card_ids_csv = rows
            .iter()
            .find(|r| &r.deck_key == key)
            .map(|r| r.card_ids.as_str())
            .unwrap_or("");
        let cards = resolve_cards(pool, card_ids_csv).await;
        top_decks_json.push(serde_json::json!({
            "deck_key": key,
            "total": total,
            "win_rate": wr,
            "cards": cards,
        }));
    }

    Some(serde_json::json!({
        "card": card,
        "deck_count": deck_count,
        "total_wins": total_wins,
        "total_losses": total_losses,
        "total_battles": total_battles,
        "win_rate": win_rate,
        "top_decks": top_decks_json,
    }))
}

/// Build a deck recommendation given locked card IDs.
/// Step 1: Try to find an existing meta deck containing all locked cards.
/// Step 2: Fall back to synergy-based building using card_pairs.
pub async fn build_deck_recommendation(
    pool: &SqlitePool,
    locked_cards: Vec<i64>,
) -> Option<DeckWithCards> {
    // Step 1: Try meta deck match
    // Get all decks with stats, filter to those containing all locked cards
    let rows = sqlx::query_as::<_, DeckStatsRow>(
        "SELECT d.deck_key, d.card_ids, s.wins, s.losses, s.total, s.win_rate
         FROM deck_stats s
         JOIN decks d ON d.deck_key = s.deck_key
         WHERE s.total >= 3",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Filter to decks containing ALL locked cards
    let matching: Vec<&DeckStatsRow> = rows
        .iter()
        .filter(|row| {
            let ids: Vec<i64> = row
                .card_ids
                .split(',')
                .filter_map(|s| s.trim().parse().ok())
                .collect();
            locked_cards.iter().all(|lc| ids.contains(lc))
        })
        .collect();

    if !matching.is_empty() {
        // Pick the best by weighted score: win_rate * ln(total + 1)
        let best = matching
            .iter()
            .max_by(|a, b| {
                let sa = a.win_rate * (a.total as f64 + 1.0).ln();
                let sb = b.win_rate * (b.total as f64 + 1.0).ln();
                sa.partial_cmp(&sb).unwrap_or(std::cmp::Ordering::Equal)
            })
            .unwrap();

        let cards = resolve_cards(pool, &best.card_ids).await;
        let row = DeckStatsRow {
            deck_key: best.deck_key.clone(),
            card_ids: best.card_ids.clone(),
            wins: best.wins,
            losses: best.losses,
            total: best.total,
            win_rate: best.win_rate,
        };
        return Some(build_deck(row, cards));
    }

    // Step 2: Synergy-based fallback using card_pairs
    let mut selected: Vec<i64> = locked_cards.clone();

    // If no locked cards, start with the card that has the best overall synergy
    if selected.is_empty() {
        #[derive(sqlx::FromRow)]
        struct BestCard {
            card_a: i64,
        }
        let best = sqlx::query_as::<_, BestCard>(
            "SELECT card_a, SUM(win_rate * total) / SUM(total) as score
             FROM card_pairs
             WHERE total >= 2
             GROUP BY card_a
             HAVING SUM(total) >= 10
             ORDER BY score DESC
             LIMIT 1",
        )
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

        if let Some(b) = best {
            selected.push(b.card_a);
        } else {
            return None;
        }
    }

    // Fill remaining slots using synergy scores
    while selected.len() < 8 {
        let mut best_card: Option<(i64, f64)> = None;

        // For each candidate, compute average synergy with current cards
        // Build the query dynamically for the current set
        let placeholders: Vec<String> = selected.iter().map(|_| "?".to_string()).collect();
        let in_clause = placeholders.join(",");

        let query_str = format!(
            "SELECT card_b as candidate, AVG(win_rate) as avg_synergy
             FROM card_pairs
             WHERE card_a IN ({0}) AND card_b NOT IN ({0}) AND total >= 2
             GROUP BY card_b
             ORDER BY avg_synergy DESC
             LIMIT 1",
            in_clause
        );

        let mut q = sqlx::query_as::<_, (i64, f64)>(&query_str);
        // Bind for the first IN clause (card_a IN)
        for &id in &selected {
            q = q.bind(id);
        }
        // Bind for the second IN clause (card_b NOT IN)
        for &id in &selected {
            q = q.bind(id);
        }

        if let Ok(Some((candidate, score))) = q.fetch_optional(pool).await {
            best_card = Some((candidate, score));
        }

        // Also check the reverse direction (card_a as candidate)
        let query_str2 = format!(
            "SELECT card_a as candidate, AVG(win_rate) as avg_synergy
             FROM card_pairs
             WHERE card_b IN ({0}) AND card_a NOT IN ({0}) AND total >= 2
             GROUP BY card_a
             ORDER BY avg_synergy DESC
             LIMIT 1",
            in_clause
        );

        let mut q2 = sqlx::query_as::<_, (i64, f64)>(&query_str2);
        for &id in &selected {
            q2 = q2.bind(id);
        }
        for &id in &selected {
            q2 = q2.bind(id);
        }

        if let Ok(Some((candidate2, score2))) = q2.fetch_optional(pool).await {
            match best_card {
                Some((_, s)) if score2 > s => best_card = Some((candidate2, score2)),
                None => best_card = Some((candidate2, score2)),
                _ => {}
            }
        }

        match best_card {
            Some((card_id, _)) => selected.push(card_id),
            None => break, // no more candidates
        }
    }

    if selected.len() != 8 {
        return None;
    }

    selected.sort();
    let deck_key = selected
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let cards = resolve_cards(pool, &deck_key).await;
    let avg_elixir = compute_avg_elixir(&cards);
    let has_champion = cards.iter().any(|c| c.rarity.as_deref() == Some("champion"));
    let has_hero = cards.iter().any(|c| {
        c.hero_icon_url.as_ref().is_some_and(|u| !u.is_empty())
    });

    Some(DeckWithCards {
        deck_key,
        cards,
        wins: 0,
        losses: 0,
        total: 0,
        win_rate: 0.0,
        avg_elixir,
        has_champion,
        has_hero,
    })
}
