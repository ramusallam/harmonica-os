"use client";

import { useState } from "react";
import { HARMONICA_KEYS } from "@harmonica-os/core";

export default function Home() {
  const [selectedKey, setSelectedKey] = useState("C");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Harmonica<span className="text-[var(--accent)]">OS</span>
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          Control your computer with harmonica playing
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <label
          htmlFor="key-select"
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          Select your harmonica key
        </label>
        <select
          id="key-select"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-4 py-2.5 text-lg font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        >
          {HARMONICA_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-6 py-4">
          <div className="text-2xl font-bold">1</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">→ Right Arrow</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-6 py-4">
          <div className="text-2xl font-bold">4</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">→ Spacebar</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-6 py-4">
          <div className="text-2xl font-bold">5</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">→ Left Arrow</div>
        </div>
      </div>

      <button
        className="mt-4 rounded-lg bg-[var(--accent)] px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        disabled
      >
        Start Listening (Phase 1)
      </button>
    </main>
  );
}
