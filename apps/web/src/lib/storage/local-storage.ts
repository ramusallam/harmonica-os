import type { AppSettings } from "@/types/app";
import type { CalibrationResult } from "@/types/calibration";
import { DEFAULT_COMMAND_MAP } from "@harmonica-os/core";
import { AUDIO_CONFIG } from "@harmonica-os/core";

const STORAGE_KEYS = {
  settings: "harmonica-os:settings",
  calibration: "harmonica-os:calibration",
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
    // Storage full or unavailable — fail silently
  }
}

export function loadSettings(): AppSettings {
  const stored = safeGet<Partial<AppSettings>>(STORAGE_KEYS.settings);
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: AppSettings): void {
  safeSet(STORAGE_KEYS.settings, settings);
}

export function loadCalibration(): CalibrationResult | null {
  return safeGet<CalibrationResult>(STORAGE_KEYS.calibration);
}

export function saveCalibration(result: CalibrationResult): void {
  safeSet(STORAGE_KEYS.calibration, result);
}

export function clearAll(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });
}
