use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::clash_api::{ClashApiError, ClashClient};
use crate::refresh;

pub struct AppStateInner {
    pub client: ClashClient,
    pub db: SqlitePool,
}

pub type AppState = Arc<AppStateInner>;

/// GET /api/player/:tag
pub async fn get_player(
    State(state): State<AppState>,
    Path(tag): Path<String>,
) -> impl IntoResponse {
    match state.client.get_player(&tag).await {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(ClashApiError::ApiError { status, body }) => {
            let code = if status == StatusCode::NOT_FOUND {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::BAD_GATEWAY
            };
            (code, Json(json!({ "error": body }))).into_response()
        }
        Err(e @ (ClashApiError::Network(_) | ClashApiError::Parse(_))) => {
            tracing::error!("Clash API error: {e}");
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({ "error": "Failed to reach Clash Royale API" })),
            )
                .into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct RefreshParams {
    force: Option<bool>,
}

/// POST /api/refresh?force=true
pub async fn refresh_data(
    State(state): State<AppState>,
    Query(params): Query<RefreshParams>,
) -> impl IntoResponse {
    let force = params.force.unwrap_or(false);
    match refresh::run_refresh(&state.client, &state.db, force).await {
        Ok(summary) => (StatusCode::OK, Json(json!({ "message": summary }))).into_response(),
        Err(e) => {
            tracing::error!("Refresh failed: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e })),
            )
                .into_response()
        }
    }
}

/// GET /api/top-decks — top 10 decks with full card details.
pub async fn get_top_decks(State(state): State<AppState>) -> impl IntoResponse {
    let decks = crate::db::get_top_decks(&state.db, 200).await;
    Json(json!({ "decks": decks }))
}

/// GET /api/decks/:deck_key — detailed view of a single deck.
///
/// The deck_key is the comma-separated sorted card IDs (e.g. "26000010,26000024,...").
pub async fn get_deck_detail(
    State(state): State<AppState>,
    Path(deck_key): Path<String>,
) -> impl IntoResponse {
    match crate::db::get_deck_detail(&state.db, &deck_key).await {
        Some(deck) => (StatusCode::OK, Json(json!(deck))).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Deck not found" })),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct BuildDeckRequest {
    locked_cards: Vec<i64>,
}

/// POST /api/build-deck — recommend a deck given locked cards.
pub async fn build_deck(
    State(state): State<AppState>,
    Json(body): Json<BuildDeckRequest>,
) -> impl IntoResponse {
    match crate::db::build_deck_recommendation(&state.db, body.locked_cards).await {
        Some(deck) => (StatusCode::OK, Json(json!(deck))).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Could not build a deck with those cards" })),
        )
            .into_response(),
    }
}

/// GET /api/cards — full card catalog.
pub async fn get_cards(State(state): State<AppState>) -> impl IntoResponse {
    let rows = sqlx::query_as::<_, crate::db::CardDetail>(
        "SELECT id, name, elixir, rarity, icon_url, hero_icon_url FROM cards ORDER BY name",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(json!({ "cards": rows }))
}

/// GET /api/cards/:card_id — stats for a single card across all decks.
pub async fn get_card_stats(
    State(state): State<AppState>,
    Path(card_id): Path<i64>,
) -> impl IntoResponse {
    match crate::db::get_card_stats(&state.db, card_id).await {
        Some(data) => (StatusCode::OK, Json(data)).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Card not found" })),
        )
            .into_response(),
    }
}
