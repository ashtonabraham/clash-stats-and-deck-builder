mod clash_api;
mod config;
mod db;
mod refresh;
mod routes;

use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post},
};
use sqlx::sqlite::SqlitePoolOptions;
use tower_http::cors::CorsLayer;

use routes::AppStateInner;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let cfg = config::AppConfig::from_env().expect(
        "CLASH_ROYALE_API_TOKEN must be set (either in .env or as an env var)",
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect("sqlite:clash-meta.db?mode=rwc")
        .await
        .expect("Failed to open SQLite database");

    db::init_db(&pool).await;

    let client = clash_api::ClashClient::new(cfg.clash_api_token);
    let state = Arc::new(AppStateInner { client, db: pool });

    let app = Router::new()
        .route("/api/player/{tag}", get(routes::get_player))
        .route("/api/refresh", post(routes::refresh_data))
        .route("/api/top-decks", get(routes::get_top_decks))
        .route("/api/decks/{deck_key}", get(routes::get_deck_detail))
        .route("/api/build-deck", post(routes::build_deck))
        .route("/api/cards", get(routes::get_cards))
        .route("/api/cards/{card_id}", get(routes::get_card_stats))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&cfg.listen_addr)
        .await
        .expect("Failed to bind");

    tracing::info!("Listening on {}", cfg.listen_addr);
    axum::serve(listener, app).await.expect("Server error");
}
