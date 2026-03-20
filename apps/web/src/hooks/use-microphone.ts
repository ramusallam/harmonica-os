"use client";

import { useState, useCallback, useRef } from "react";
import type { MicrophoneStatus } from "@/types/audio";
import {
  requestMicrophone,
  getMicrophoneStatus,
  type MicrophoneHandle,
} from "@/lib/audio/microphone";

export function useMicrophone() {
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const handleRef = useRef<MicrophoneHandle | null>(null);

  const start = useCallback(async () => {
    if (handleRef.current) return handleRef.current;

    setStatus("requesting");
    try {
      const handle = await requestMicrophone();
      handleRef.current = handle;
      setStatus("active");
      return handle;
    } catch (err) {
      setStatus(getMicrophoneStatus(err));
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setStatus("idle");
  }, []);

  return {
    status,
    handle: handleRef.current,
    start,
    stop,
  };
}
