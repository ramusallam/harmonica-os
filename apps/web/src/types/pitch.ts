import type { NoteName } from "@harmonica-os/core";

export type PitchDetectionResult = {
  frequency: number;
  confidence: number; // 0-1, from YIN
  note: NoteName;
  octave: number;
  cents: number; // -50 to +50
  timestamp: number;
};

export type PitchStability = "unstable" | "settling" | "stable";

export type SmoothedPitch = {
  raw: PitchDetectionResult;
  smoothedFrequency: number;
  smoothedNote: NoteName;
  smoothedOctave: number;
  smoothedCents: number;
  stability: PitchStability;
  // How many consecutive frames agreed on the same note
  agreementCount: number;
};

export type PitchDetectorState = {
  isActive: boolean;
  currentPitch: SmoothedPitch | null;
  // Null means no pitch detected (silence or noise)
  rawPitch: PitchDetectionResult | null;
  framesProcessed: number;
  framesWithPitch: number;
  lastUpdateTime: number;
};
