import type { PitchDetectionResult } from "@/types/pitch";

type PitchDisplayProps = {
  pitch: PitchDetectionResult | null;
};

export function PitchDisplay({ pitch }: PitchDisplayProps) {
  if (!pitch) {
    return (
      <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
        <div className="text-6xl font-bold text-[var(--text-secondary)]">—</div>
        <div className="text-sm text-[var(--text-secondary)]">No pitch detected</div>
      </div>
    );
  }

  const centsLabel =
    pitch.cents === 0
      ? "In tune"
      : pitch.cents > 0
        ? `+${pitch.cents}¢ sharp`
        : `${pitch.cents}¢ flat`;

  const centsColor =
    Math.abs(pitch.cents) <= 10
      ? "text-[var(--success)]"
      : Math.abs(pitch.cents) <= 30
        ? "text-[var(--warning)]"
        : "text-[var(--error)]";

  return (
    <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
      <div className="text-6xl font-bold">
        {pitch.note}
        <span className="text-2xl text-[var(--text-secondary)]">{pitch.octave}</span>
      </div>
      <div className={`text-sm font-medium ${centsColor}`}>{centsLabel}</div>
      <div className="text-xs text-[var(--text-secondary)]">
        {pitch.frequency.toFixed(1)} Hz · {(pitch.confidence * 100).toFixed(0)}% confidence
      </div>
    </div>
  );
}
