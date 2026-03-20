"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AudioEngine } from "@/lib/audio/engine";
import type { AudioEngineState, AudioBufferMessage } from "@/types/audio";

const INITIAL_STATE: AudioEngineState = {
  engineStatus: "idle",
  micStatus: "idle",
  levels: { rms: 0, peak: 0, dbFS: -Infinity, isSilent: true },
  sampleRate: 0,
  bufferSize: 2048,
  selectedDeviceId: null,
  availableDevices: [],
  errorMessage: null,
  buffersReceived: 0,
  lastBufferTimestamp: 0,
};

// Throttle state updates to ~30fps to avoid React render thrashing
const THROTTLE_MS = 33;

export function useAudioEngine(
  onAudioBuffer?: (msg: AudioBufferMessage) => void,
) {
  const [state, setState] = useState<AudioEngineState>(INITIAL_STATE);
  const engineRef = useRef<AudioEngine | null>(null);
  const lastUpdateRef = useRef(0);
  const pendingStateRef = useRef<AudioEngineState | null>(null);
  const rafRef = useRef<number>(0);
  const onAudioBufferRef = useRef(onAudioBuffer);
  onAudioBufferRef.current = onAudioBuffer;

  // Throttled state setter
  const throttledSetState = useCallback((newState: AudioEngineState) => {
    const now = performance.now();
    pendingStateRef.current = newState;

    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setState(newState);
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (pendingStateRef.current) {
          lastUpdateRef.current = performance.now();
          setState(pendingStateRef.current);
        }
      });
    }
  }, []);

  // Create engine lazily
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine({
        onStateChange: throttledSetState,
        onAudioBuffer: (msg) => onAudioBufferRef.current?.(msg),
      });
    }
    return engineRef.current;
  }, [throttledSetState]);

  const start = useCallback(async (deviceId?: string) => {
    return getEngine().start(deviceId);
  }, [getEngine]);

  const stop = useCallback(async () => {
    return getEngine().stop();
  }, [getEngine]);

  const switchDevice = useCallback(async (deviceId: string) => {
    return getEngine().switchDevice(deviceId);
  }, [getEngine]);

  const refreshDevices = useCallback(async () => {
    return getEngine().refreshDevices();
  }, [getEngine]);

  const resumeContext = useCallback(async () => {
    return getEngine().resumeContext();
  }, [getEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return {
    state,
    start,
    stop,
    switchDevice,
    refreshDevices,
    resumeContext,
    isRunning: state.engineStatus === "running",
    isSuspended: state.engineStatus === "suspended",
    hasError: state.engineStatus === "error" || state.micStatus === "denied" || state.micStatus === "no-device",
  };
}
