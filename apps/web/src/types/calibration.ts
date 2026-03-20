import type { NoteName } from "@harmonica-os/core";

export type CalibrationStep =
  | "select-key"
  | "check-mic"
  | "noise-floor"
  | "play-1"
  | "play-4"
  | "play-5"
  | "review"
  | "complete";

export type DegreeSample = {
  degree: number;
  expectedNote: NoteName;
  frequencies: number[];
  confidences: number[];
  centerFrequency: number;
  standardDeviation: number;
  // Tolerance window: accept frequencies within this range
  lowFrequency: number;
  highFrequency: number;
  centsWindow: number;
  sampleCount: number;
};

export type CalibrationProfile = {
  harmonicaKey: NoteName;
  noiseFloorRms: number;
  amplitudeThreshold: number;
  degreeSamples: DegreeSample[];
  completedAt: number;
  version: number;
};

// Minimum stable samples required per degree before accepting
export const MIN_SAMPLES_PER_DEGREE = 8;
// How many extra cents to pad the tolerance window beyond observed deviation
export const TOLERANCE_PADDING_CENTS = 15;
// Calibration data version (bump when format changes)
export const CALIBRATION_VERSION = 1;
