//! Rust commands callable from the frontend via `invoke("<name>")`.
//! One file per domain (e.g. `files.rs`).
//!
//! Note: register commands by full path (`commands::app::app_info`) in lib.rs —
//! `pub use` re-exports don't work with `#[tauri::command]`.

pub mod app;
pub mod convex;
pub mod desktop;
