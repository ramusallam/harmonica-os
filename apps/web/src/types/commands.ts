import type { KeyAction } from "@harmonica-os/core";

export type CommandEvent = {
  action: KeyAction;
  degree: number;
  confidence: number;
  timestamp: number;
};

export type CommandEngineState = {
  isActive: boolean;
  lastCommand: CommandEvent | null;
  commandHistory: CommandEvent[];
  totalCommands: number;
};

export type GateConfig = {
  minAmplitude: number;
  minNoteDurationMs: number;
  silenceGapMs: number;
  centsThreshold: number;
};
