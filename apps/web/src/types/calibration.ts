export type CalibrationStep =
  | "check-mic"
  | "noise-floor"
  | "play-root"
  | "play-fourth"
  | "play-fifth"
  | "complete";

export type CalibrationResult = {
  noiseFloor: number;
  amplitudeThreshold: number;
  // Per-degree frequency samples from the user's actual harmonica
  degreeSamples: {
    degree: number;
    frequencies: number[];
    averageFrequency: number;
  }[];
  completedAt: number;
};

export type CalibrationState = {
  currentStep: CalibrationStep;
  result: CalibrationResult | null;
  isRunning: boolean;
};
