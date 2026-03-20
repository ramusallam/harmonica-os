import type { PitchDetectionResult } from "@/types/pitch";
import type { GateConfig } from "@/types/commands";
import type { NoteName } from "@harmonica-os/core";
import { AUDIO_CONFIG } from "@harmonica-os/core";

// The gate prevents false triggers by requiring:
// 1. Amplitude above noise floor
// 2. Note sustained for minimum duration
// 3. Silence gap before accepting a new note

type GateState = {
  currentNote: NoteName | null;
  noteStartTime: number;
  lastFireTime: number;
  silenceSince: number;
  hasFired: boolean;
};

export function createGate(config: Partial<GateConfig> = {}) {
  const cfg: GateConfig = {
    minAmplitude: config.minAmplitude ?? AUDIO_CONFIG.minAmplitude,
    minNoteDurationMs: config.minNoteDurationMs ?? AUDIO_CONFIG.minNoteDurationMs,
    silenceGapMs: config.silenceGapMs ?? AUDIO_CONFIG.silenceGapMs,
    centsThreshold: config.centsThreshold ?? AUDIO_CONFIG.centsThreshold,
  };

  const state: GateState = {
    currentNote: null,
    noteStartTime: 0,
    lastFireTime: 0,
    silenceSince: 0,
    hasFired: false,
  };

  return {
    // Returns the note if it should trigger a command, null otherwise
    process(
      pitch: PitchDetectionResult | null,
      amplitude: number,
    ): PitchDetectionResult | null {
      const now = performance.now();

      // Below noise floor — treat as silence
      if (!pitch || amplitude < cfg.minAmplitude) {
        if (state.currentNote !== null) {
          state.silenceSince = now;
          state.currentNote = null;
          state.hasFired = false;
        }
        return null;
      }

      // Reject if too far from a clean note
      if (Math.abs(pitch.cents) > cfg.centsThreshold) {
        return null;
      }

      const silenceElapsed = state.silenceSince > 0
        ? now - state.silenceSince
        : Infinity;

      // New note after silence gap
      if (pitch.note !== state.currentNote) {
        if (silenceElapsed < cfg.silenceGapMs && state.currentNote !== null) {
          return null; // Not enough silence between notes
        }
        state.currentNote = pitch.note;
        state.noteStartTime = now;
        state.hasFired = false;
        return null;
      }

      // Same note, check if sustained long enough to fire
      const noteDuration = now - state.noteStartTime;
      if (noteDuration >= cfg.minNoteDurationMs && !state.hasFired) {
        state.hasFired = true;
        state.lastFireTime = now;
        return pitch;
      }

      return null;
    },

    reset() {
      state.currentNote = null;
      state.noteStartTime = 0;
      state.lastFireTime = 0;
      state.silenceSince = 0;
      state.hasFired = false;
    },
  };
}
