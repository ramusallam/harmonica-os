// Harmonica theory
export {
  NOTE_NAMES,
  HARMONICA_KEYS,
  frequencyToNote,
  noteToFrequency,
  getNotesForKey,
} from "./harmonica/tuning";
export type { NoteName } from "./harmonica/tuning";

export { mapNoteToScaleDegree } from "./harmonica/degree-mapper";

// Commands
export {
  DEFAULT_COMMAND_MAP,
  degreeToAction,
} from "./commands/command-mapper";
export type { CommandMap, KeyAction } from "./commands/command-mapper";

export { WebDispatcher } from "./commands/dispatcher";
export type { CommandDispatcher } from "./commands/dispatcher";

// Config
export { AUDIO_CONFIG } from "./config/defaults";
