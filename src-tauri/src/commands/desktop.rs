use std::sync::atomic::Ordering;

use tauri::{AppHandle, State};

use crate::{tray::TRAY_ID, DesktopState, AUTOSTART_ARG};

/// "Run in background": closing the window hides it to the tray instead of quitting.
/// The preference lives in the frontend (localStorage) and is pushed here on startup / change.
#[tauri::command]
pub fn set_close_to_tray(app: AppHandle, state: State<DesktopState>, enabled: bool) {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_visible(enabled);
    }
}

/// Whether this process was started by the OS at login (autostart).
#[tauri::command]
pub fn launched_at_login() -> bool {
    std::env::args().any(|a| a == AUTOSTART_ARG)
}
