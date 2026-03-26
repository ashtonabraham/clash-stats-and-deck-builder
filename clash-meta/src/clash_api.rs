use reqwest::{Client, StatusCode};
use serde::Deserialize;
use serde_json::Value;

/// A thin wrapper around reqwest::Client that injects the Bearer token.
///
/// C++ analogy: this is like a class with a private HttpClient member and an
/// auth header baked in. In Rust we don't need inheritance — we just compose
/// the reqwest Client inside our own struct.
#[derive(Clone)]
pub struct ClashClient {
    http: Client,
    base_url: String,
    token: String,
}

/// Our own error type so handlers can pattern-match on what went wrong.
#[derive(Debug)]
pub enum ClashApiError {
    /// reqwest failed (DNS, timeout, TLS, etc.)
    Network(reqwest::Error),
    /// Clash Royale API returned a non-2xx status
    ApiError { status: StatusCode, body: String },
    /// JSON deserialization failed
    Parse(serde_json::Error),
}

// Display lets us log the error easily.
impl std::fmt::Display for ClashApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClashApiError::Network(e) => write!(f, "network error: {e}"),
            ClashApiError::ApiError { status, body } => {
                write!(f, "Clash API {status}: {body}")
            }
            ClashApiError::Parse(e) => write!(f, "JSON parse error: {e}"),
        }
    }
}

// --- Types for deserialized API responses ---

/// A ranked player from the Path of Legend leaderboard.
#[derive(Debug, Deserialize)]
pub struct RankedPlayer {
    pub tag: String,
    pub name: String,
    pub rank: u32,
}

#[derive(Debug, Deserialize)]
pub struct PaginatedList<T> {
    pub items: Vec<T>,
}

/// A card as it appears in a battle log entry.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BattleCard {
    pub id: i64,
    pub name: String,
    pub elixir_cost: Option<i32>,
    pub icon_urls: Option<IconUrls>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconUrls {
    pub medium: Option<String>,
    pub hero_medium: Option<String>,
}

/// One side (team or opponent) in a battle.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BattleParticipant {
    pub tag: String,
    pub crowns: i32,
    pub cards: Vec<BattleCard>,
    pub trophy_change: Option<i32>,
    pub starting_trophies: Option<i32>,
}

/// A single battle from the battle log.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Battle {
    #[serde(rename = "type")]
    pub battle_type: String,
    pub battle_time: String,
    pub game_mode: GameMode,
    pub team: Vec<BattleParticipant>,
    pub opponent: Vec<BattleParticipant>,
    pub deck_selection: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GameMode {
    pub id: i64,
    pub name: String,
}

/// A card from the /cards endpoint (full card catalog).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardInfo {
    pub id: i64,
    pub name: String,
    pub max_level: i32,
    pub elixir_cost: Option<i32>,
    pub icon_urls: Option<IconUrls>,
    pub rarity: Option<String>,
}

impl ClashClient {
    pub fn new(token: String) -> Self {
        Self {
            http: Client::new(),
            base_url: "https://api.clashroyale.com/v1".into(),
            token,
        }
    }

    /// Generic GET helper — sends auth header and maps errors.
    async fn get(&self, path: &str) -> Result<Value, ClashApiError> {
        let url = format!("{}{}", self.base_url, path);
        let resp = self
            .http
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .send()
            .await
            .map_err(ClashApiError::Network)?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ClashApiError::ApiError { status, body });
        }
        resp.json::<Value>().await.map_err(ClashApiError::Network)
    }

    /// Fetch a player by tag (without leading `#`).
    pub async fn get_player(&self, tag: &str) -> Result<Value, ClashApiError> {
        self.get(&format!("/players/%23{}", tag)).await
    }

    /// Fetch top players from Path of Legend global rankings.
    pub async fn get_top_players(&self, limit: u32) -> Result<Vec<RankedPlayer>, ClashApiError> {
        let val = self
            .get(&format!(
                "/locations/global/pathoflegend/players?limit={}",
                limit
            ))
            .await?;
        let list: PaginatedList<RankedPlayer> =
            serde_json::from_value(val).map_err(ClashApiError::Parse)?;
        Ok(list.items)
    }

    /// Fetch a player's recent battle log (up to 25 battles).
    pub async fn get_battlelog(&self, tag: &str) -> Result<Vec<Battle>, ClashApiError> {
        // Tag comes with a leading `#` from the rankings API — strip it.
        let clean = tag.trim_start_matches('#');
        let val = self
            .get(&format!("/players/%23{}/battlelog", clean))
            .await?;
        let battles: Vec<Battle> =
            serde_json::from_value(val).map_err(ClashApiError::Parse)?;
        Ok(battles)
    }

    /// Fetch the full card catalog.
    pub async fn get_all_cards(&self) -> Result<Vec<CardInfo>, ClashApiError> {
        let val = self.get("/cards").await?;
        let list: PaginatedList<CardInfo> =
            serde_json::from_value(val).map_err(ClashApiError::Parse)?;
        Ok(list.items)
    }
}
