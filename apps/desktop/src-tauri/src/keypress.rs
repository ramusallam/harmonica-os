use enigo::{Enigo, Key, Keyboard, Settings};
use std::sync::Mutex;
use std::time::Instant;
use tauri::State;

// --- Server-side safety state ---

pub struct KeypressState {
    armed: Mutex<bool>,
    last_fire: Mutex<Option<Instant>>,
    total_fired: Mutex<u64>,
    min_interval_ms: u64,
}

impl KeypressState {
    pub fn new() -> Self {
        Self {
            armed: Mutex::new(false),
            last_fire: Mutex::new(None),
            total_fired: Mutex::new(0),
            min_interval_ms: 200, // Server-side rate limit: max 5 keys/sec
        }
    }
}

// --- IPC commands ---

/// Arm or disarm the key injection system.
/// Must be explicitly armed before inject_key will work.
#[tauri::command]
pub fn set_armed(armed: bool, state: State<'_, KeypressState>) -> Result<bool, String> {
    let mut guard = state.armed.lock().map_err(|e| e.to_string())?;
    *guard = armed;

    if !armed {
        // Reset fire tracking when disarming
        if let Ok(mut last) = state.last_fire.lock() {
            *last = None;
        }
    }

    Ok(*guard)
}

/// Check if the system is currently armed.
#[tauri::command]
pub fn is_armed(state: State<'_, KeypressState>) -> Result<bool, String> {
    let guard = state.armed.lock().map_err(|e| e.to_string())?;
    Ok(*guard)
}

/// Get the total number of keys fired this session.
#[tauri::command]
pub fn get_fire_count(state: State<'_, KeypressState>) -> Result<u64, String> {
    let guard = state.total_fired.lock().map_err(|e| e.to_string())?;
    Ok(*guard)
}

/// Reset the fire counter.
#[tauri::command]
pub fn reset_fire_count(state: State<'_, KeypressState>) -> Result<(), String> {
    let mut guard = state.total_fired.lock().map_err(|e| e.to_string())?;
    *guard = 0;
    Ok(())
}

/// Inject a keypress at the OS level.
/// Only works when armed. Rate-limited server-side.
#[tauri::command]
pub fn inject_key(key: String, state: State<'_, KeypressState>) -> Result<String, String> {
    // Check armed state
    {
        let armed = state.armed.lock().map_err(|e| e.to_string())?;
        if !*armed {
            return Err("Not armed. Call set_armed(true) first.".into());
        }
    }

    // Rate limit check
    {
        let mut last_fire = state.last_fire.lock().map_err(|e| e.to_string())?;
        let now = Instant::now();

        if let Some(last) = *last_fire {
            let elapsed_ms = now.duration_since(last).as_millis() as u64;
            if elapsed_ms < state.min_interval_ms {
                return Err(format!(
                    "Rate limited. {}ms since last fire, minimum is {}ms.",
                    elapsed_ms, state.min_interval_ms
                ));
            }
        }

        *last_fire = Some(now);
    }

    // Map key string to enigo key
    let enigo_key = match key.as_str() {
        "ArrowRight" => Key::RightArrow,
        "ArrowLeft" => Key::LeftArrow,
        "Space" => Key::Space,
        other => return Err(format!("Unknown key action: {}", other)),
    };

    // Fire the key
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(enigo_key, enigo::Direction::Click)
        .map_err(|e| e.to_string())?;

    // Increment counter
    {
        let mut count = state.total_fired.lock().map_err(|e| e.to_string())?;
        *count += 1;
    }

    Ok(key)
}
