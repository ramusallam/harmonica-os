import { getNotesForKey, noteToFrequency, frequencyToNote, type NoteName } from "@harmonica-os/core";
import type {
  CalibrationStep,
  CalibrationProfile,
  DegreeSample,
} from "@/types/calibration";
import {
  MIN_SAMPLES_PER_DEGREE,
  TOLERANCE_PADDING_CENTS,
  CALIBRATION_VERSION,
} from "@/types/calibration";
import type { SmoothedPitch } from "@/types/pitch";

// --- Step sequencing ---

const STEPS_IN_ORDER: CalibrationStep[] = [
  "select-key",
  "check-mic",
  "noise-floor",
  "play-1",
  "play-4",
  "play-5",
  "review",
  "complete",
];

const DEGREE_STEPS: Record<string, number> = {
  "play-1": 1,
  "play-4": 4,
  "play-5": 5,
};

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

export function getDegreeForStep(step: CalibrationStep): number | null {
  return DEGREE_STEPS[step] ?? null;
}

export function isPlayStep(step: CalibrationStep): boolean {
  return step in DEGREE_STEPS;
}

export function getStepInstruction(step: CalibrationStep, harmonicaKey: NoteName): string {
  const scale = getNotesForKey(harmonicaKey);
  const noteFor = (degree: number) => scale.find((s) => s.degree === degree)?.note ?? "?";

  switch (step) {
    case "select-key":
      return "Select the key of your harmonica.";
    case "check-mic":
      return "Make sure your microphone is working. You should see the level meter respond.";
    case "noise-floor":
      return "Stay quiet for 3 seconds. We're measuring your room's background noise.";
    case "play-1":
      return `Play the root note — ${noteFor(1)} (degree 1). Hold it steady until the samples fill up. Play it a few times.`;
    case "play-4":
      return `Now play the fourth — ${noteFor(4)} (degree 4). Hold it steady.`;
    case "play-5":
      return `Finally, play the fifth — ${noteFor(5)} (degree 5). Hold it steady.`;
    case "review":
      return "Review your calibration results below. Redo any step if needed.";
    case "complete":
      return "Calibration saved. You're ready to go.";
  }
}

// --- Sample collector ---

export class SampleCollector {
  private frequencies: number[] = [];
  private confidences: number[] = [];
  readonly degree: number;
  readonly expectedNote: NoteName;

  constructor(degree: number, harmonicaKey: NoteName) {
    this.degree = degree;
    const scale = getNotesForKey(harmonicaKey);
    this.expectedNote = scale.find((s) => s.degree === degree)?.note ?? "C";
  }

  // Returns true if the pitch matches the expected note and was accepted
  addSample(pitch: SmoothedPitch): boolean {
    // Only accept stable or settling pitches
    if (pitch.stability === "unstable") return false;
    // Only accept if smoothed note matches expected (pitch class, any octave)
    if (pitch.smoothedNote !== this.expectedNote) return false;
    // Only accept reasonable confidence
    if (pitch.raw.confidence < 0.8) return false;

    this.frequencies.push(pitch.smoothedFrequency);
    this.confidences.push(pitch.raw.confidence);
    return true;
  }

  get sampleCount(): number {
    return this.frequencies.length;
  }

  get isComplete(): boolean {
    return this.sampleCount >= MIN_SAMPLES_PER_DEGREE;
  }

  get progress(): number {
    return Math.min(1, this.sampleCount / MIN_SAMPLES_PER_DEGREE);
  }

  reset(): void {
    this.frequencies = [];
    this.confidences = [];
  }

  buildDegreeSample(): DegreeSample | null {
    if (this.sampleCount < 3) return null;

    const center = this.frequencies.reduce((a, b) => a + b, 0) / this.sampleCount;
    const variance = this.frequencies.reduce((sum, f) => sum + (f - center) ** 2, 0) / this.sampleCount;
    const stdDev = Math.sqrt(variance);
    const avgConfidence = this.confidences.reduce((a, b) => a + b, 0) / this.sampleCount;

    // Compute observed cents range from center
    const minFreq = Math.min(...this.frequencies);
    const maxFreq = Math.max(...this.frequencies);
    const centsLow = Math.abs(1200 * Math.log2(minFreq / center));
    const centsHigh = Math.abs(1200 * Math.log2(maxFreq / center));
    const observedCentsWindow = Math.max(centsLow, centsHigh);

    // Padded tolerance: observed range + padding
    const totalCents = observedCentsWindow + TOLERANCE_PADDING_CENTS;
    const lowFreq = center * Math.pow(2, -totalCents / 1200);
    const highFreq = center * Math.pow(2, totalCents / 1200);

    return {
      degree: this.degree,
      expectedNote: this.expectedNote,
      frequencies: [...this.frequencies],
      confidences: [...this.confidences],
      centerFrequency: center,
      standardDeviation: stdDev,
      lowFrequency: lowFreq,
      highFrequency: highFreq,
      centsWindow: totalCents,
      sampleCount: this.sampleCount,
    };
  }
}

// --- Noise floor measurement ---

export class NoiseFloorMeasurer {
  private rmsReadings: number[] = [];
  private targetReadings = 60; // ~3 seconds at ~20 buffers/sec

  addReading(rms: number): void {
    this.rmsReadings.push(rms);
  }

  get progress(): number {
    return Math.min(1, this.rmsReadings.length / this.targetReadings);
  }

  get isComplete(): boolean {
    return this.rmsReadings.length >= this.targetReadings;
  }

  getNoiseFloor(): number {
    if (this.rmsReadings.length === 0) return 0;
    // Use the 90th percentile as noise floor (accounts for occasional ambient spikes)
    const sorted = [...this.rmsReadings].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.9);
    return sorted[idx];
  }

  getAmplitudeThreshold(): number {
    // Set threshold at 3x the noise floor, minimum 0.008
    return Math.max(0.008, this.getNoiseFloor() * 3);
  }

  reset(): void {
    this.rmsReadings = [];
  }
}

// --- Profile builder ---

export function buildCalibrationProfile(
  harmonicaKey: NoteName,
  noiseFloor: NoiseFloorMeasurer,
  collectors: SampleCollector[],
): CalibrationProfile {
  return {
    harmonicaKey,
    noiseFloorRms: noiseFloor.getNoiseFloor(),
    amplitudeThreshold: noiseFloor.getAmplitudeThreshold(),
    degreeSamples: collectors
      .map((c) => c.buildDegreeSample())
      .filter((s): s is DegreeSample => s !== null),
    completedAt: Date.now(),
    version: CALIBRATION_VERSION,
  };
}

// --- Default tolerance windows (no calibration) ---

export function buildDefaultProfile(harmonicaKey: NoteName): CalibrationProfile {
  const scale = getNotesForKey(harmonicaKey);
  const targetDegrees = [1, 4, 5];

  const degreeSamples: DegreeSample[] = targetDegrees.map((degree) => {
    const note = scale.find((s) => s.degree === degree)!.note;
    // Use middle octave (4) as default center
    const center = noteToFrequency(note, 4);
    // Default tolerance: ±35 cents
    const defaultCents = 35;
    const low = center * Math.pow(2, -defaultCents / 1200);
    const high = center * Math.pow(2, defaultCents / 1200);

    return {
      degree,
      expectedNote: note,
      frequencies: [],
      confidences: [],
      centerFrequency: center,
      standardDeviation: 0,
      lowFrequency: low,
      highFrequency: high,
      centsWindow: defaultCents,
      sampleCount: 0,
    };
  });

  return {
    harmonicaKey,
    noiseFloorRms: 0,
    amplitudeThreshold: 0.008,
    degreeSamples,
    completedAt: 0,
    version: CALIBRATION_VERSION,
  };
}
