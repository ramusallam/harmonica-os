import type { MicrophoneStatus } from "@/types/audio";

export type MicrophoneHandle = {
  stream: MediaStream;
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  stop: () => void;
};

export async function requestMicrophone(): Promise<MicrophoneHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaStreamSource(stream);

  return {
    stream,
    audioContext,
    sourceNode,
    stop: () => {
      stream.getTracks().forEach((track) => track.stop());
      audioContext.close();
    },
  };
}

export function getMicrophoneStatus(
  error: unknown,
): Extract<MicrophoneStatus, "denied" | "error"> {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "denied";
  }
  return "error";
}

export function computeRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}
