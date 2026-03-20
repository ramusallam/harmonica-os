"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { useSettings } from "@/hooks/use-settings";
import { getNotesForKey, AUDIO_CONFIG } from "@harmonica-os/core";
import type { AudioBufferMessage } from "@/types/audio";

const MAX_LOG_LINES = 40;

export default function DebugPage() {
  const { settings } = useSettings();
  const scale = getNotesForKey(settings.harmonicaKey);
  const [browserInfo, setBrowserInfo] = useState<Record<string, string>>({});
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);

  const handleBuffer = useCallback((msg: AudioBufferMessage) => {
    const line = `[${msg.timestamp.toFixed(3)}s] rms=${msg.rms.toFixed(5)} peak=${msg.peak.toFixed(5)} sr=${msg.sampleRate} samples=${msg.samples.length}`;
    setStreamLog((prev) => {
      const next = [...prev, line];
      if (next.length > MAX_LOG_LINES) next.shift();
      return next;
    });
  }, []);

  const {
    state,
    start,
    stop,
    isRunning,
  } = useAudioEngine(handleBuffer);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamLog]);

  useEffect(() => {
    const info: Record<string, string> = {};

    info["userAgent"] = navigator.userAgent;
    info["AudioWorklet"] = "AudioWorklet" in window ? "supported" : "not supported";
    info["mediaDevices"] = "mediaDevices" in navigator ? "supported" : "not supported";
    info["AudioContext"] =
      "AudioContext" in window || "webkitAudioContext" in window
        ? "supported"
        : "not supported";
    info["Secure Context"] = window.isSecureContext ? "yes" : "no (mic will fail)";

    // Check if permissions API is available
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          info["Mic Permission"] = result.state;
          setBrowserInfo({ ...info });
        })
        .catch(() => {
          info["Mic Permission"] = "query unavailable";
          setBrowserInfo({ ...info });
        });
    } else {
      info["Mic Permission"] = "API unavailable";
    }

    setBrowserInfo(info);
  }, []);

  return (
    <div>
      <PageHeader
        title="Debug Panel"
        description="System diagnostics and raw audio analysis state."
      />

      <div className="flex flex-col gap-6">
        {/* Audio engine control */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Audio Engine</h2>
            <div className="flex items-center gap-2">
              <StatusBadge
                variant={isRunning ? "success" : state.engineStatus === "error" ? "error" : "idle"}
                label={state.engineStatus}
                pulse={state.engineStatus === "starting"}
              />
              <Button
                size="sm"
                variant={isRunning ? "secondary" : "primary"}
                onClick={() => (isRunning ? stop() : start())}
              >
                {isRunning ? "Stop" : "Start"}
              </Button>
            </div>
          </div>

          {isRunning && (
            <>
              <LevelMeter
                level={state.levels.rms}
                peak={state.levels.peak}
                showDb
                dbFS={state.levels.dbFS}
              />
              <div className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Engine</div>
                  <div className="font-mono">{state.engineStatus}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Mic</div>
                  <div className="font-mono">{state.micStatus}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Rate</div>
                  <div className="font-mono">{state.sampleRate}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Buffers</div>
                  <div className="font-mono">{state.buffersReceived}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">RMS</div>
                  <div className="font-mono">{state.levels.rms.toFixed(5)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Silent</div>
                  <div className="font-mono">{state.levels.isSilent ? "yes" : "no"}</div>
                </div>
              </div>
            </>
          )}

          {state.errorMessage && (
            <p className="text-sm text-[var(--error)]">{state.errorMessage}</p>
          )}
        </Card>

        {/* Raw audio stream log */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Raw Audio Stream</h2>
            {streamLog.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStreamLog([])}>
                Clear
              </Button>
            )}
          </div>
          <pre
            ref={logRef}
            className="h-48 overflow-y-auto overflow-x-hidden rounded-lg bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-secondary)]"
          >
            {streamLog.length === 0
              ? "Start the audio engine to see raw buffer data..."
              : streamLog.join("\n")}
          </pre>
        </Card>

        {/* Full engine state dump */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Engine State (raw)</h2>
          <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-xs text-[var(--text-secondary)]">
            {JSON.stringify(
              {
                ...state,
                levels: {
                  ...state.levels,
                  dbFS: state.levels.dbFS === -Infinity ? "-Infinity" : state.levels.dbFS,
                },
              },
              null,
              2,
            )}
          </pre>
        </Card>

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
                    value === "supported" || value === "yes" || value === "granted"
                      ? "success"
                      : value === "prompt"
                        ? "warning"
                        : value.includes("not") || value === "no" || value === "denied"
                          ? "error"
                          : "info"
                  }
                  label={value.length > 50 ? value.slice(0, 50) + "..." : value}
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
      </div>
    </div>
  );
}
