import type { MicrophoneStatus, AudioDeviceInfo } from "@/types/audio";

export async function enumerateAudioInputs(): Promise<AudioDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
        isDefault: d.deviceId === "default" || i === 0,
      }));
  } catch {
    return [];
  }
}

export async function requestMicrophoneStream(
  deviceId?: string,
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      ...(deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : {}),
    },
  };

  return navigator.mediaDevices.getUserMedia(constraints);
}

export function classifyMicError(error: unknown): MicrophoneStatus {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "denied";
      case "NotFoundError":
      case "OverconstrainedError":
        return "no-device";
      default:
        return "error";
    }
  }
  return "error";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "Microphone permission was denied. Allow access in browser settings and reload.";
      case "NotFoundError":
        return "No microphone found. Connect a microphone and try again.";
      case "OverconstrainedError":
        return "Selected microphone is unavailable. Try a different device.";
      case "NotReadableError":
        return "Microphone is in use by another application.";
      default:
        return `Microphone error: ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown microphone error";
}

export function computeRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

export function rmsToDbFS(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}
