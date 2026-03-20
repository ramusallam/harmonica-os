import type { CalibrationProfile, DegreeSample } from "@/types/calibration";
import type { SmoothedPitch } from "@/types/pitch";
import { mapNoteToScaleDegree, type NoteName } from "@harmonica-os/core";

export type DegreeMatch = {
  degree: number;
  confidence: number;
  method: "calibrated" | "default";
  // How far the frequency is from the calibrated center, in cents
  centsFromCenter: number;
};

export class CalibrationMatcher {
  private profile: CalibrationProfile;
  private targetDegrees: Set<number>;

  constructor(profile: CalibrationProfile, targetDegrees: number[] = [1, 4, 5]) {
    this.profile = profile;
    this.targetDegrees = new Set(targetDegrees);
  }

  updateProfile(profile: CalibrationProfile): void {
    this.profile = profile;
  }

  // Match a pitch against calibration data. Returns the matching degree or null.
  match(pitch: SmoothedPitch): DegreeMatch | null {
    const hasCalibrationData = this.profile.degreeSamples.some((s) => s.sampleCount > 0);

    if (hasCalibrationData) {
      return this.matchCalibrated(pitch);
    }
    return this.matchDefault(pitch);
  }

  private matchCalibrated(pitch: SmoothedPitch): DegreeMatch | null {
    const freq = pitch.smoothedFrequency;
    let bestMatch: DegreeMatch | null = null;
    let bestDistance = Infinity;

    for (const sample of this.profile.degreeSamples) {
      if (!this.targetDegrees.has(sample.degree)) continue;
      if (sample.sampleCount === 0) continue;

      // Check all octaves of this degree's center frequency
      // Harmonicas span roughly octaves 3-6
      for (let octaveShift = -2; octaveShift <= 2; octaveShift++) {
        const center = sample.centerFrequency * Math.pow(2, octaveShift);
        const low = sample.lowFrequency * Math.pow(2, octaveShift);
        const high = sample.highFrequency * Math.pow(2, octaveShift);

        if (freq >= low && freq <= high) {
          const centsFromCenter = 1200 * Math.log2(freq / center);
          const distance = Math.abs(centsFromCenter);

          if (distance < bestDistance) {
            bestDistance = distance;
            // Scale confidence: 1.0 at center, decreasing toward edges
            const normalizedDistance = distance / sample.centsWindow;
            const matchConfidence = Math.max(0, 1 - normalizedDistance) * pitch.raw.confidence;

            bestMatch = {
              degree: sample.degree,
              confidence: matchConfidence,
              method: "calibrated",
              centsFromCenter: Math.round(centsFromCenter),
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private matchDefault(pitch: SmoothedPitch): DegreeMatch | null {
    const degree = mapNoteToScaleDegree(pitch.smoothedNote, this.profile.harmonicaKey);
    if (degree === null || !this.targetDegrees.has(degree)) return null;

    return {
      degree,
      confidence: pitch.raw.confidence,
      method: "default",
      centsFromCenter: pitch.smoothedCents,
    };
  }
}
