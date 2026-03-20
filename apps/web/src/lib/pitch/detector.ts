import { yin } from "./yin";
import { frequencyToNote } from "@harmonica-os/core";
import type { PitchDetectionResult } from "@/types/pitch";

export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
): PitchDetectionResult | null {
  const result = yin(samples, sampleRate);
  if (!result) return null;

  const { note, octave, cents } = frequencyToNote(result.frequency);

  return {
    frequency: result.frequency,
    confidence: result.confidence,
    note,
    octave,
    cents,
    timestamp: performance.now(),
  };
}
