import type { CalibrationStep, CalibrationResult } from "@/types/calibration";

const STEPS_IN_ORDER: CalibrationStep[] = [
  "check-mic",
  "noise-floor",
  "play-root",
  "play-fourth",
  "play-fifth",
  "complete",
];

export function getNextStep(current: CalibrationStep): CalibrationStep | null {
  const idx = STEPS_IN_ORDER.indexOf(current);
  if (idx === -1 || idx >= STEPS_IN_ORDER.length - 1) return null;
  return STEPS_IN_ORDER[idx + 1];
}

export function getStepIndex(step: CalibrationStep): number {
  return STEPS_IN_ORDER.indexOf(step);
}

export function getTotalSteps(): number {
  return STEPS_IN_ORDER.length;
}

export function getStepInstruction(step: CalibrationStep): string {
  switch (step) {
    case "check-mic":
      return "Let's make sure your microphone is working. You should see the level meter respond when you make noise.";
    case "noise-floor":
      return "Stay quiet for a moment. We're measuring your room's background noise level.";
    case "play-root":
      return "Play the root note (1) on your harmonica. Hold it steady for about 2 seconds.";
    case "play-fourth":
      return "Now play the fourth (4). Hold it steady.";
    case "play-fifth":
      return "Finally, play the fifth (5). Hold it steady.";
    case "complete":
      return "Calibration complete. You're ready to go.";
  }
}

export function createEmptyCalibrationResult(): CalibrationResult {
  return {
    noiseFloor: 0,
    amplitudeThreshold: 0,
    degreeSamples: [],
    completedAt: 0,
  };
}
