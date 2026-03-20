export type MicrophoneStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "error";

export type AudioPipelineState = {
  micStatus: MicrophoneStatus;
  isListening: boolean;
  inputLevel: number; // 0-1 RMS amplitude
  sampleRate: number;
  latencyMs: number;
};

export type RawAudioFrame = {
  samples: Float32Array;
  timestamp: number;
  sampleRate: number;
};
