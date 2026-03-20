export type MicrophoneStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "no-device"
  | "error"
  | "ended";

export type AudioEngineStatus =
  | "idle"
  | "starting"
  | "running"
  | "suspended"
  | "stopping"
  | "error";

export type AudioLevels = {
  rms: number;     // 0-1, smoothed RMS amplitude
  peak: number;    // 0-1, peak sample in current window
  dbFS: number;    // dBFS (0 = full scale, -Infinity = silence)
  isSilent: boolean;
};

export type AudioDeviceInfo = {
  deviceId: string;
  label: string;
  isDefault: boolean;
};

export type AudioEngineState = {
  engineStatus: AudioEngineStatus;
  micStatus: MicrophoneStatus;
  levels: AudioLevels;
  sampleRate: number;
  bufferSize: number;
  selectedDeviceId: string | null;
  availableDevices: AudioDeviceInfo[];
  errorMessage: string | null;
  buffersReceived: number;
  lastBufferTimestamp: number;
};

export type AudioBufferMessage = {
  type: "audio-buffer";
  samples: Float32Array;
  rms: number;
  peak: number;
  timestamp: number;
  sampleRate: number;
};

export type AudioLevelMessage = {
  type: "level";
  rms: number;
  peak: number;
  timestamp: number;
};

export type AudioSilenceMessage = {
  type: "silence";
  timestamp: number;
};

export type WorkletMessage = AudioBufferMessage | AudioLevelMessage | AudioSilenceMessage;
