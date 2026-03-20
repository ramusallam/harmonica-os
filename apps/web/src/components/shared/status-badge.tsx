type StatusBadgeVariant = "success" | "warning" | "error" | "info" | "idle";

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  label: string;
  pulse?: boolean;
};

const dotColors: Record<StatusBadgeVariant, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  error: "bg-[var(--error)]",
  info: "bg-[var(--accent)]",
  idle: "bg-[var(--text-secondary)]",
};

export function StatusBadge({ variant, label, pulse = false }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
      role="status"
      aria-label={label}
    >
      <span
        className={`h-2 w-2 rounded-full ${dotColors[variant]} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
