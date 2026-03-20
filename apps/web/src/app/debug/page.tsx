"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSettings } from "@/hooks/use-settings";
import { getNotesForKey } from "@harmonica-os/core";
import { AUDIO_CONFIG } from "@harmonica-os/core";

export default function DebugPage() {
  const { settings } = useSettings();
  const scale = getNotesForKey(settings.harmonicaKey);
  const [browserInfo, setBrowserInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    setBrowserInfo({
      userAgent: navigator.userAgent,
      audioWorklet: "AudioWorklet" in window ? "supported" : "not supported",
      mediaDevices: "mediaDevices" in navigator ? "supported" : "not supported",
      audioContext:
        "AudioContext" in window || "webkitAudioContext" in window
          ? "supported"
          : "not supported",
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Debug Panel"
        description="System diagnostics and raw data for troubleshooting."
      />

      <div className="flex flex-col gap-6">
        {/* Browser capabilities */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Browser Capabilities</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(browserInfo).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="font-mono text-sm text-[var(--text-secondary)]">
                  {key}
                </span>
                <StatusBadge
                  variant={
                    value === "supported" || value === "active"
                      ? "success"
                      : value.includes("not")
                        ? "error"
                        : "info"
                  }
                  label={value.length > 40 ? value.slice(0, 40) + "..." : value}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Audio config */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Audio Configuration</h2>
          <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-sm text-[var(--text-secondary)]">
            {JSON.stringify(AUDIO_CONFIG, null, 2)}
          </pre>
        </Card>

        {/* Current settings */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Current Settings</h2>
          <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-sm text-[var(--text-secondary)]">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </Card>

        {/* Scale data */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            Scale: Key of {settings.harmonicaKey}
          </h2>
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--text-secondary)]">
                <th className="pb-2">Degree</th>
                <th className="pb-2">Note</th>
                <th className="pb-2">Mapped</th>
              </tr>
            </thead>
            <tbody>
              {scale.map((s) => (
                <tr key={s.degree} className="border-b border-white/5">
                  <td className="py-1.5 font-mono">{s.degree}</td>
                  <td className="py-1.5 font-bold">{s.note}</td>
                  <td className="py-1.5">
                    {s.degree === 1
                      ? "→ Right Arrow"
                      : s.degree === 4
                        ? "␣ Spacebar"
                        : s.degree === 5
                          ? "← Left Arrow"
                          : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Raw pitch stream placeholder */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            Live Pitch Stream
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Start listening on the Learn or Control page to see raw pitch data
            here.
          </p>
          <div className="mt-3 h-32 rounded-lg bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-secondary)]">
            {/* Will show streaming pitch data once pipeline is wired */}
            Waiting for audio input...
          </div>
        </Card>
      </div>
    </div>
  );
}
