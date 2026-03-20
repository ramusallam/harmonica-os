"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PitchDetector, type PitchDetectorConfig } from "@/lib/pitch/detector";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import type { PitchDetectorState } from "@/types/pitch";
import type { AudioBufferMessage } from "@/types/audio";

const INITIAL_PITCH_STATE: PitchDetectorState = {
  isActive: false,
  currentPitch: null,
  rawPitch: null,
  framesProcessed: 0,
  framesWithPitch: 0,
  lastUpdateTime: 0,
};

// Throttle pitch state updates to ~20fps — pitch changes slower than audio levels
const PITCH_THROTTLE_MS = 50;

export function usePitchDetector(config?: Partial<PitchDetectorConfig>) {
  const [pitchState, setPitchState] = useState<PitchDetectorState>(INITIAL_PITCH_STATE);
  const detectorRef = useRef<PitchDetector | null>(null);
  const lastPitchUpdateRef = useRef(0);
  const pendingPitchRef = useRef<PitchDetectorState | null>(null);
  const pitchRafRef = useRef(0);

  const getDetector = useCallback(() => {
    if (!detectorRef.current) {
      detectorRef.current = new PitchDetector(config);
    }
    return detectorRef.current;
  }, [config]);

  const throttledSetPitch = useCallback((state: PitchDetectorState) => {
    const now = performance.now();
    pendingPitchRef.current = state;

    if (now - lastPitchUpdateRef.current >= PITCH_THROTTLE_MS) {
      lastPitchUpdateRef.current = now;
      setPitchState(state);
    } else if (!pitchRafRef.current) {
      pitchRafRef.current = requestAnimationFrame(() => {
        pitchRafRef.current = 0;
        if (pendingPitchRef.current) {
          lastPitchUpdateRef.current = performance.now();
          setPitchState(pendingPitchRef.current);
        }
      });
    }
  }, []);

  const handleAudioBuffer = useCallback((msg: AudioBufferMessage) => {
    const detector = getDetector();
    detector.process(msg.samples, msg.sampleRate);
    throttledSetPitch(detector.getState());
  }, [getDetector, throttledSetPitch]);

  const audioEngine = useAudioEngine(handleAudioBuffer);

  // Reset detector when engine stops
  useEffect(() => {
    if (audioEngine.state.engineStatus === "idle") {
      detectorRef.current?.reset();
      setPitchState(INITIAL_PITCH_STATE);
    }
  }, [audioEngine.state.engineStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pitchRafRef.current) cancelAnimationFrame(pitchRafRef.current);
    };
  }, []);

  return {
    ...audioEngine,
    pitchState,
  };
}
