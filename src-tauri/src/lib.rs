use tauri::{LogicalSize, Size, WebviewWindow};

#[tauri::command]
fn minimize_window(window: WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn close_window(window: WebviewWindow) {
    let _ = window.close();
}

#[tauri::command]
fn toggle_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<bool, String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())?;
    Ok(always_on_top)
}

#[tauri::command]
fn resize_window(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    window
        .set_size(Size::Logical(LogicalSize { width, height }))
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            close_window,
            toggle_always_on_top,
            resize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
