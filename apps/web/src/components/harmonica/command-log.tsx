"use client";

import type { CommandEvent } from "@/types/commands";

type CommandLogProps = {
  events: CommandEvent[];
  maxVisible?: number;
};

const ACTION_LABELS: Record<string, string> = {
  ArrowRight: "→ Right",
  ArrowLeft: "← Left",
  Space: "␣ Space",
};

export function CommandLog({ events, maxVisible = 8 }: CommandLogProps) {
  const visible = events.slice(-maxVisible).reverse();

  return (
    <div className="flex flex-col gap-2" role="log" aria-label="Command history" aria-live="polite">
      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
        Command Log ({events.length} total)
      </h3>
      {visible.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No commands fired yet</p>
      ) : (
        <ul className="flex flex-col gap-1" role="list">
          {visible.map((event, i) => (
            <li
              key={event.timestamp}
              className={`flex items-center justify-between rounded-md border border-white/5 bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm ${i === 0 ? "border-[var(--accent)]/30" : ""}`}
            >
              <span className="font-mono font-medium">
                {ACTION_LABELS[event.action] ?? event.action}
              </span>
              <span className="text-[var(--text-secondary)]">
                degree {event.degree} · {(event.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
