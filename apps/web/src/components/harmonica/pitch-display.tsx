import type { SmoothedPitch, PitchStability } from "@/types/pitch";

type PitchDisplayProps = {
  pitch: SmoothedPitch | null;
  showRaw?: boolean;
};

const STABILITY_CONFIG: Record<PitchStability, { label: string; color: string; ring: string }> = {
  unstable: { label: "Unstable", color: "text-[var(--error)]", ring: "ring-[var(--error)]/30" },
  settling: { label: "Settling", color: "text-[var(--warning)]", ring: "ring-[var(--warning)]/30" },
  stable: { label: "Stable", color: "text-[var(--success)]", ring: "ring-[var(--success)]/30" },
};

export function PitchDisplay({ pitch, showRaw = false }: PitchDisplayProps) {
  if (!pitch) {
    return (
      <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
          <span className="text-5xl font-bold text-[var(--text-secondary)]">—</span>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">No pitch detected</div>
      </div>
    );
  }

  const stabilityInfo = STABILITY_CONFIG[pitch.stability];

  const centsLabel =
    pitch.smoothedCents === 0
      ? "In tune"
      : pitch.smoothedCents > 0
        ? `+${pitch.smoothedCents}¢`
        : `${pitch.smoothedCents}¢`;

  const centsColor =
    Math.abs(pitch.smoothedCents) <= 10
      ? "text-[var(--success)]"
      : Math.abs(pitch.smoothedCents) <= 30
        ? "text-[var(--warning)]"
        : "text-[var(--error)]";

  // Confidence bar width
  const confidencePercent = Math.round(pitch.raw.confidence * 100);

  return (
    <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
      {/* Note circle with stability ring */}
      <div
        className={`flex h-28 w-28 items-center justify-center rounded-full bg-[var(--bg-tertiary)] ring-4 ${stabilityInfo.ring}`}
      >
        <div>
          <span className="text-5xl font-bold">{pitch.smoothedNote}</span>
          <span className="text-xl text-[var(--text-secondary)]">{pitch.smoothedOctave}</span>
        </div>
      </div>

      {/* Cents indicator */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-lg font-semibold ${centsColor}`}>{centsLabel}</span>
        {/* Visual cents bar: center is in-tune, left is flat, right is sharp */}
        <div className="relative h-2 w-40 rounded-full bg-[var(--bg-tertiary)]">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
          <div
            className={`absolute top-0 h-full w-2 rounded-full transition-[left] duration-100 ${
              Math.abs(pitch.smoothedCents) <= 10
                ? "bg-[var(--success)]"
                : Math.abs(pitch.smoothedCents) <= 30
                  ? "bg-[var(--warning)]"
                  : "bg-[var(--error)]"
            }`}
            style={{
              left: `${50 + pitch.smoothedCents}%`,
              transform: "translateX(-50%)",
            }}
          />
        </div>
      </div>

      {/* Frequency + confidence */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span>{pitch.smoothedFrequency.toFixed(1)} Hz</span>
        <span className={stabilityInfo.color}>{stabilityInfo.label}</span>
      </div>

      {/* Confidence bar */}
      <div className="flex w-full max-w-[10rem] flex-col gap-0.5">
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-100"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Raw vs smoothed (debug) */}
      {showRaw && (
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          raw: {pitch.raw.note}{pitch.raw.octave} {pitch.raw.frequency.toFixed(1)}Hz
          ({pitch.raw.cents > 0 ? "+" : ""}{pitch.raw.cents}¢)
          · agree: {pitch.agreementCount}
        </div>
      )}
    </div>
  );
}
