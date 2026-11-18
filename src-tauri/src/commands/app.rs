use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    version: String,
    os: &'static str,
}

/// Example command. Frontend: `invoke<AppInfo>("app_info")`.
#[tauri::command]
pub fn app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS,
    }
}
