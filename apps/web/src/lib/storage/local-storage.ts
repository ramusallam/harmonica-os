import type { AppSettings } from "@/types/app";
import type { CalibrationProfile } from "@/types/calibration";
import { CALIBRATION_VERSION } from "@/types/calibration";
import { DEFAULT_COMMAND_MAP, AUDIO_CONFIG } from "@harmonica-os/core";
import type { NoteName } from "@harmonica-os/core";

const STORAGE_KEYS = {
  settings: "harmonica-os:settings",
  calibrationPrefix: "harmonica-os:calibration:",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  harmonicaKey: "C",
  tuningStandard: 440,
  commandMap: DEFAULT_COMMAND_MAP,
  gateConfig: {
    minAmplitude: AUDIO_CONFIG.minAmplitude,
    minNoteDurationMs: AUDIO_CONFIG.minNoteDurationMs,
    silenceGapMs: AUDIO_CONFIG.silenceGapMs,
    centsThreshold: AUDIO_CONFIG.centsThreshold,
  },
  ui: {
    showDebugPanel: false,
    showWaveform: true,
    highContrast: false,
    reducedMotion: false,
    fontSize: "normal",
  },
};

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

// --- Settings ---

export function loadSettings(): AppSettings {
  const stored = safeGet<Partial<AppSettings>>(STORAGE_KEYS.settings);
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: AppSettings): void {
  safeSet(STORAGE_KEYS.settings, settings);
}

// --- Calibration profiles (keyed by harmonica key) ---

function calibrationKey(harmonicaKey: NoteName): string {
  return `${STORAGE_KEYS.calibrationPrefix}${harmonicaKey}`;
}

export function loadCalibration(harmonicaKey: NoteName): CalibrationProfile | null {
  const profile = safeGet<CalibrationProfile>(calibrationKey(harmonicaKey));
  if (!profile) return null;
  // Reject stale versions
  if (profile.version !== CALIBRATION_VERSION) return null;
  return profile;
}

export function saveCalibration(profile: CalibrationProfile): void {
  safeSet(calibrationKey(profile.harmonicaKey), profile);
}

export function deleteCalibration(harmonicaKey: NoteName): void {
  try {
    localStorage.removeItem(calibrationKey(harmonicaKey));
  } catch {
    // Ignore
  }
}

export function hasCalibration(harmonicaKey: NoteName): boolean {
  return loadCalibration(harmonicaKey) !== null;
}

export function listCalibratedKeys(): NoteName[] {
  const keys: NoteName[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_KEYS.calibrationPrefix)) {
        const noteName = k.slice(STORAGE_KEYS.calibrationPrefix.length) as NoteName;
        keys.push(noteName);
      }
    }
  } catch {
    // Ignore
  }
  return keys;
}

// --- Reset ---

export function clearAll(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("harmonica-os:")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
