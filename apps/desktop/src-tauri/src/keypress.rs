use enigo::{Enigo, Key, Keyboard, Settings};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct KeyAction {
    /// The key to inject. Matches the TypeScript KeyAction type:
    /// "ArrowRight", "ArrowLeft", or "Space"
    key: String,
}

/// Inject a keypress at the OS level.
/// Called from the frontend via Tauri IPC: `invoke("inject_key", { key: "ArrowRight" })`
#[tauri::command]
pub fn inject_key(key: String) -> Result<(), String> {
    let enigo_key = match key.as_str() {
        "ArrowRight" => Key::RightArrow,
        "ArrowLeft" => Key::LeftArrow,
        "Space" => Key::Space,
        other => return Err(format!("Unknown key action: {}", other)),
    };

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    enigo.key(enigo_key, enigo::Direction::Click).map_err(|e| e.to_string())?;

    Ok(())
}
