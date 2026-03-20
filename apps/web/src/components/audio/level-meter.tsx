type LevelMeterProps = {
  level: number;  // 0-1 RMS
  peak?: number;  // 0-1 peak
  label?: string;
  showDb?: boolean;
  dbFS?: number;
};

export function LevelMeter({
  level,
  peak,
  label = "Audio level",
  showDb = false,
  dbFS,
}: LevelMeterProps) {
  // Scale RMS to a more visible range (raw RMS is usually 0-0.3 for speech/instruments)
  const scaledLevel = Math.min(1, level * 4);
  const percentage = Math.round(scaledLevel * 100);

  const scaledPeak = peak !== undefined ? Math.min(1, peak * 3) : undefined;
  const peakPercentage = scaledPeak !== undefined ? Math.round(scaledPeak * 100) : undefined;

  const barColor =
    percentage > 85
      ? "bg-[var(--error)]"
      : percentage > 55
        ? "bg-[var(--warning)]"
        : percentage > 5
          ? "bg-[var(--success)]"
          : "bg-[var(--text-secondary)]";

  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
        role="meter"
        aria-label={label}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* RMS bar */}
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
        {/* Peak indicator */}
        {peakPercentage !== undefined && peakPercentage > 2 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/60 transition-[left] duration-75"
            style={{ left: `${peakPercentage}%` }}
          />
        )}
      </div>
      {showDb && dbFS !== undefined && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>RMS: {level > 0 ? level.toFixed(4) : "0"}</span>
          <span>{dbFS === -Infinity ? "-∞" : dbFS.toFixed(1)} dBFS</span>
        </div>
      )}
    </div>
  );
}
