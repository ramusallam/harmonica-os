"use client";

import { HARMONICA_KEYS, type NoteName } from "@harmonica-os/core";

type KeySelectorProps = {
  value: NoteName;
  onChange: (key: NoteName) => void;
  disabled?: boolean;
};

export function KeySelector({ value, onChange, disabled }: KeySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="harmonica-key"
        className="text-sm font-medium text-[var(--text-secondary)]"
      >
        Harmonica Key
      </label>
      <select
        id="harmonica-key"
        value={value}
        onChange={(e) => onChange(e.target.value as NoteName)}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-4 py-2.5 text-lg font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
      >
        {HARMONICA_KEYS.map((key) => (
          <option key={key} value={key}>
            Key of {key}
          </option>
        ))}
      </select>
    </div>
  );
}
