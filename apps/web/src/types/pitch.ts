import type { NoteName } from "@harmonica-os/core";

export type PitchDetectionResult = {
  frequency: number; // Hz
  confidence: number; // 0-1
  note: NoteName;
  octave: number;
  cents: number; // -50 to +50, deviation from perfect pitch
  timestamp: number;
};

export type PitchDetectorState = {
  isDetecting: boolean;
  currentPitch: PitchDetectionResult | null;
  noiseFloor: number;
};
