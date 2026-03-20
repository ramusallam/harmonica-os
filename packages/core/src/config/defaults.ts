export const AUDIO_CONFIG = {
  sampleRate: 44100,
  bufferSize: 2048,
  minAmplitude: 0.01,
  minNoteDurationMs: 150,
  silenceGapMs: 100,
  centsThreshold: 30,
} as const;
