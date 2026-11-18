//! Desktop notifications.
//!
//! On Windows, toasts are sent under the app's own AppUserModelID (the bundle identifier),
//! registered under HKCU with a display name and icon — so they show "Social Manager" with
//! its logo in the bottom-right corner (like Telegram), in dev and when installed, and
//! clicking one brings the window back. Other platforms use the notification plugin.

use tauri::{AppHandle, Manager};

#[cfg(windows)]
const ICON_PNG: &[u8] = include_bytes!("../icons/128x128@2x.png");

/// Registers the AppUserModelID (name + icon) so Windows shows toasts as this app.
#[cfg(windows)]
pub fn register(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    let icon = dir.join("notification-icon.png");
    std::fs::write(&icon, ICON_PNG)?;

    let id = &app.config().identifier;
    let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
        .create_subkey(format!(r"Software\Classes\AppUserModelId\{id}"))?;
    key.set_value("DisplayName", &app.package_info().name)?;
    key.set_value("IconUri", &icon.display().to_string())?;
    Ok(())
}

#[cfg(not(windows))]
pub fn register(_app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

/// Emitted when a toast is clicked; payload = the in-app path it should open (if any).
pub const CLICKED_EVENT: &str = "notification://clicked";

/// Shows a notification. `link` is an in-app route (e.g. "/inbox/messages?c=…") opened
/// when the toast is clicked (Windows; other platforms just show it).
#[tauri::command]
pub fn show_notification(
    app: AppHandle,
    title: String,
    body: String,
    link: Option<String>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        use tauri::Emitter;
        use tauri_winrt_notification::Toast;

        let handle = app.clone();
        Toast::new(&app.config().identifier)
            .title(&title)
            .text1(&body)
            .on_activated(move |_| {
                crate::tray::show_main_window(&handle);
                let _ = handle.emit(CLICKED_EVENT, link.clone());
                Ok(())
            })
            .show()
            .map_err(|e| e.to_string())
    }

    #[cfg(not(windows))]
    {
        use tauri_plugin_notification::NotificationExt;
        let _ = link;
        app.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| e.to_string())
    }
}
