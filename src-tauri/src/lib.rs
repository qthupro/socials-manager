mod commands;
mod notifications;
mod tray;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Manager, WindowEvent};

/// Passed to the app when the OS starts it at login.
pub const AUTOSTART_ARG: &str = "--autostart";

/// Desktop-integration state shared with commands.
pub struct DesktopState {
    pub close_to_tray: AtomicBool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Must be first: a second launch just brings the running window forward.
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                tray::show_main_window(app);
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec![AUTOSTART_ARG]),
            ));
    }

    builder
        // HTTP from Rust: SocialAPI calls bypass webview CORS.
        .plugin(tauri_plugin_http::init())
        // Open OAuth / external links in the system browser.
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(DesktopState {
            close_to_tray: AtomicBool::new(false),
        })
        .setup(|app| {
            tray::create(app.handle())?;
            // Best effort: without it Windows still shows toasts, just under a generic name.
            if let Err(e) = notifications::register(app.handle()) {
                eprintln!("notification registration failed: {e}");
            }
            // Started at login: stay in the background. The frontend shows the window
            // again if "run in background" is off (otherwise it'd be unreachable).
            if std::env::args().any(|a| a == AUTOSTART_ARG) {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide()?;
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<DesktopState>();
                if state.close_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        // Register new Rust commands in `commands/` and list them here.
        .invoke_handler(tauri::generate_handler![
            commands::app::app_info,
            commands::convex::convex_post,
            commands::desktop::set_close_to_tray,
            commands::desktop::launched_at_login,
            notifications::show_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
