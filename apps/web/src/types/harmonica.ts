import type { NoteName, KeyAction } from "@harmonica-os/core";

export type HarmonicaConfig = {
  key: NoteName;
  tuningStandard: number; // A4 frequency, default 440
};

export type NoteMapping = {
  degree: number;
  note: NoteName;
  action: KeyAction;
  label: string;
};

export type DetectedDegree = {
  degree: number;
  note: NoteName;
  confidence: number;
  centsOff: number;
  withinThreshold: boolean;
};
