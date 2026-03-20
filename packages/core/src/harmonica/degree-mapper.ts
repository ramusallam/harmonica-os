import { type NoteName, getNotesForKey } from "./tuning";

export function mapNoteToScaleDegree(
  note: NoteName,
  harmonicaKey: NoteName,
): number | null {
  const scale = getNotesForKey(harmonicaKey);
  const match = scale.find((s) => s.note === note);
  return match ? match.degree : null;
}
