import { yin } from "./yin";
import { PitchSmoother } from "./smoother";
import { frequencyToNote } from "@harmonica-os/core";
import { computeRMS } from "@/lib/audio/microphone";
import type { PitchDetectionResult, PitchDetectorState, SmoothedPitch } from "@/types/pitch";

export type PitchDetectorConfig = {
  // Minimum RMS amplitude to attempt detection (reject silence/noise)
  minAmplitude: number;
  // Minimum YIN confidence to accept a result
  minConfidence: number;
  // YIN threshold parameter (lower = stricter)
  yinThreshold: number;
};

const DEFAULT_CONFIG: PitchDetectorConfig = {
  minAmplitude: 0.008,
  minConfidence: 0.85,
  yinThreshold: 0.15,
};

export class PitchDetector {
  private config: PitchDetectorConfig;
  private smoother = new PitchSmoother();
  private framesProcessed = 0;
  private framesWithPitch = 0;
  private currentSmoothed: SmoothedPitch | null = null;
  private currentRaw: PitchDetectionResult | null = null;
  // Count consecutive silent/rejected frames to clear stale pitch
  private silentFrames = 0;
  private static readonly CLEAR_AFTER_SILENT_FRAMES = 4;

  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Process a single audio buffer. Returns smoothed pitch or null.
  process(samples: Float32Array, sampleRate: number): SmoothedPitch | null {
    this.framesProcessed++;

    // Gate 1: amplitude check
    const rms = computeRMS(samples);
    if (rms < this.config.minAmplitude) {
      this.silentFrames++;
      if (this.silentFrames >= PitchDetector.CLEAR_AFTER_SILENT_FRAMES) {
        this.currentSmoothed = null;
        this.currentRaw = null;
        this.smoother.reset();
      }
      return this.currentSmoothed;
    }

    // Gate 2: run YIN
    const yinResult = yin(samples, sampleRate, this.config.yinThreshold);
    if (!yinResult) {
      this.silentFrames++;
      if (this.silentFrames >= PitchDetector.CLEAR_AFTER_SILENT_FRAMES) {
        this.currentSmoothed = null;
        this.currentRaw = null;
        this.smoother.reset();
      }
      return this.currentSmoothed;
    }

    // Gate 3: confidence check
    if (yinResult.confidence < this.config.minConfidence) {
      this.silentFrames++;
      if (this.silentFrames >= PitchDetector.CLEAR_AFTER_SILENT_FRAMES) {
        this.currentSmoothed = null;
        this.currentRaw = null;
        this.smoother.reset();
      }
      return this.currentSmoothed;
    }

    // Valid detection — reset silence counter
    this.silentFrames = 0;
    this.framesWithPitch++;

    // Classify raw frequency
    const { note, octave, cents } = frequencyToNote(yinResult.frequency);
    const raw: PitchDetectionResult = {
      frequency: yinResult.frequency,
      confidence: yinResult.confidence,
      note,
      octave,
      cents,
      timestamp: performance.now(),
    };
    this.currentRaw = raw;

    // Smooth
    this.currentSmoothed = this.smoother.process(raw);
    return this.currentSmoothed;
  }

  getState(): PitchDetectorState {
    return {
      isActive: true,
      currentPitch: this.currentSmoothed,
      rawPitch: this.currentRaw,
      framesProcessed: this.framesProcessed,
      framesWithPitch: this.framesWithPitch,
      lastUpdateTime: this.currentRaw?.timestamp ?? 0,
    };
  }

  reset(): void {
    this.smoother.reset();
    this.framesProcessed = 0;
    this.framesWithPitch = 0;
    this.currentSmoothed = null;
    this.currentRaw = null;
    this.silentFrames = 0;
  }

  updateConfig(config: Partial<PitchDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
