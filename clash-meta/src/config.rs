use std::env;

/// App configuration loaded from environment variables.
///
/// In C++ you'd probably pass these around as globals or a singleton.
/// In Rust we make a plain struct and share it via Arc (thread-safe ref count).
pub struct AppConfig {
    pub clash_api_token: String,
    pub listen_addr: String,
}

impl AppConfig {
    /// Reads config from environment. Call `dotenvy::dotenv()` before this
    /// so .env values are available.
    pub fn from_env() -> Result<Self, env::VarError> {
        Ok(Self {
            clash_api_token: env::var("CLASH_ROYALE_API_TOKEN")?,
            listen_addr: env::var("PORT")
                .map(|p| format!("0.0.0.0:{p}"))
                .or_else(|_| env::var("LISTEN_ADDR"))
                .unwrap_or_else(|_| "127.0.0.1:3000".into()),
        })
    }
}
