import { frequencyToNote, type NoteName } from "@harmonica-os/core";
import type {
  PitchDetectionResult,
  PitchStability,
  SmoothedPitch,
} from "@/types/pitch";

// --- Configuration ---
// How many recent frequencies to keep for median filtering
const MEDIAN_WINDOW = 5;
// Exponential smoothing factor (0 = no smoothing, 1 = ignore new data)
const SMOOTHING_ALPHA = 0.3;
// Consecutive same-note frames needed for "settling"
const SETTLING_THRESHOLD = 3;
// Consecutive same-note frames needed for "stable"
const STABLE_THRESHOLD = 6;
// If new frequency jumps more than this ratio from smoothed, reset the smoother
// (handles octave jumps and note changes cleanly)
const JUMP_RATIO_THRESHOLD = 1.08; // ~1.3 semitones

export class PitchSmoother {
  private recentFrequencies: number[] = [];
  private smoothedFrequency = 0;
  private currentNote: NoteName | null = null;
  private agreementCount = 0;

  process(raw: PitchDetectionResult): SmoothedPitch {
    const rawNote = raw.note;

    // Detect note change or large frequency jump — reset smoother
    if (this.currentNote !== null && this.smoothedFrequency > 0) {
      const ratio = raw.frequency / this.smoothedFrequency;
      if (ratio > JUMP_RATIO_THRESHOLD || ratio < 1 / JUMP_RATIO_THRESHOLD) {
        this.reset();
      }
    }

    // Track note agreement
    if (rawNote === this.currentNote) {
      this.agreementCount++;
    } else {
      this.currentNote = rawNote;
      this.agreementCount = 1;
    }

    // Add to median window
    this.recentFrequencies.push(raw.frequency);
    if (this.recentFrequencies.length > MEDIAN_WINDOW) {
      this.recentFrequencies.shift();
    }

    // Compute median of recent frequencies
    const median = this.computeMedian();

    // Apply exponential smoothing on top of median
    if (this.smoothedFrequency === 0) {
      this.smoothedFrequency = median;
    } else {
      this.smoothedFrequency =
        SMOOTHING_ALPHA * this.smoothedFrequency + (1 - SMOOTHING_ALPHA) * median;
    }

    // Classify smoothed frequency to note
    const smoothedClassification = frequencyToNote(this.smoothedFrequency);

    // Determine stability
    let stability: PitchStability = "unstable";
    if (this.agreementCount >= STABLE_THRESHOLD) {
      stability = "stable";
    } else if (this.agreementCount >= SETTLING_THRESHOLD) {
      stability = "settling";
    }

    return {
      raw,
      smoothedFrequency: this.smoothedFrequency,
      smoothedNote: smoothedClassification.note,
      smoothedOctave: smoothedClassification.octave,
      smoothedCents: smoothedClassification.cents,
      stability,
      agreementCount: this.agreementCount,
    };
  }

  reset(): void {
    this.recentFrequencies = [];
    this.smoothedFrequency = 0;
    this.currentNote = null;
    this.agreementCount = 0;
  }

  private computeMedian(): number {
    if (this.recentFrequencies.length === 0) return 0;
    if (this.recentFrequencies.length === 1) return this.recentFrequencies[0];
    const sorted = [...this.recentFrequencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
