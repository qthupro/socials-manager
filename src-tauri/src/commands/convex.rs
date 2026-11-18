//! HTTP calls used to deploy the realtime backend to the user's own Convex deployment
//! (src/features/realtime/backend/deploy.ts).
//!
//! Done here rather than through the http plugin's JS `fetch`: that one streams the
//! response body over IPC into a `ReadableStream`, which failed on these calls
//! ("close" errors on the stream). This returns the whole body at once.

use std::time::Duration;

use serde::Serialize;
use tauri_plugin_http::reqwest;

#[derive(Serialize)]
pub struct ConvexReply {
    status: u16,
    body: String,
}

/// Only Convex's API and deployments — the deploy key never goes anywhere else.
fn allowed(url: &reqwest::Url) -> bool {
    url.scheme() == "https"
        && url
            .host_str()
            .is_some_and(|h| h == "api.convex.dev" || h.ends_with(".convex.cloud"))
}

/// POSTs a JSON `body` with the given `Authorization` header; returns status + text body.
#[tauri::command]
pub async fn convex_post(
    url: String,
    authorization: String,
    client: Option<String>,
    body: String,
) -> Result<ConvexReply, String> {
    let url = reqwest::Url::parse(&url).map_err(|e| e.to_string())?;
    if !allowed(&url) {
        return Err(format!("URL không được phép: {url}"));
    }

    let mut req = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?
        .post(url)
        .header("Authorization", authorization)
        .header("Content-Type", "application/json")
        .body(body);
    if let Some(client) = client {
        req = req.header("Convex-Client", client);
    }

    let res = req.send().await.map_err(|e| format!("Convex: {e}"))?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| format!("Convex: {e}"))?;
    Ok(ConvexReply { status, body })
}
