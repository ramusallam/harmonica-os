mod keypress;

use keypress::{inject_key, is_armed, set_armed, get_fire_count, reset_fire_count, KeypressState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(KeypressState::new())
        .invoke_handler(tauri::generate_handler![
            inject_key,
            set_armed,
            is_armed,
            get_fire_count,
            reset_fire_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HarmonicaOS");
}
