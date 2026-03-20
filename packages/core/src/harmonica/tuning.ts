export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export const HARMONICA_KEYS: NoteName[] = [...NOTE_NAMES];

const SEMITONE_RATIO = Math.pow(2, 1 / 12);
const A4_FREQ = 440;
const A4_MIDI = 69;

export function frequencyToNote(freq: number): {
  note: NoteName;
  octave: number;
  cents: number;
} {
  const midiFloat = 12 * Math.log2(freq / A4_FREQ) + A4_MIDI;
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
  };
}

export function noteToFrequency(note: NoteName, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  const midi = (octave + 1) * 12 + noteIndex;
  return A4_FREQ * Math.pow(SEMITONE_RATIO, midi - A4_MIDI);
}

export function getNotesForKey(key: NoteName): {
  degree: number;
  note: NoteName;
}[] {
  const rootIndex = NOTE_NAMES.indexOf(key);
  const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

  return majorScaleIntervals.map((interval, i) => ({
    degree: i + 1,
    note: NOTE_NAMES[(rootIndex + interval) % 12],
  }));
}
