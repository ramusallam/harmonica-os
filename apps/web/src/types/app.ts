import type { NoteName } from "@harmonica-os/core";
import type { CommandMap } from "@harmonica-os/core";

export type AppMode = "learn" | "control";

export type AppSettings = {
  harmonicaKey: NoteName;
  tuningStandard: number;
  commandMap: CommandMap[];
  gateConfig: {
    minAmplitude: number;
    minNoteDurationMs: number;
    silenceGapMs: number;
    centsThreshold: number;
  };
  ui: {
    showDebugPanel: boolean;
    showWaveform: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: "normal" | "large" | "xl";
  };
};

export type AppState = {
  mode: AppMode;
  settings: AppSettings;
  isSetupComplete: boolean;
  isCalibrated: boolean;
};
