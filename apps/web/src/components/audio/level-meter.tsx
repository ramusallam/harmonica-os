type LevelMeterProps = {
  level: number; // 0-1
  label?: string;
};

export function LevelMeter({ level, label = "Audio level" }: LevelMeterProps) {
  const percentage = Math.min(100, Math.max(0, level * 100));
  const barColor =
    percentage > 80
      ? "bg-[var(--error)]"
      : percentage > 50
        ? "bg-[var(--warning)]"
        : "bg-[var(--success)]";

  return (
    <div className="w-full" role="meter" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <div
          className={`h-full rounded-full transition-all duration-75 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
