"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { usePitchDetector } from "@/hooks/use-pitch-detector";
import { useSettings } from "@/hooks/use-settings";
import { getNotesForKey, AUDIO_CONFIG } from "@harmonica-os/core";

const MAX_PITCH_LOG = 60;

export default function DebugPage() {
  const { settings } = useSettings();
  const scale = getNotesForKey(settings.harmonicaKey);
  const [browserInfo, setBrowserInfo] = useState<Record<string, string>>({});
  const [pitchLog, setPitchLog] = useState<string[]>([]);
  const pitchLogRef = useRef<HTMLPreElement>(null);

  const {
    state: audioState,
    pitchState,
    start,
    stop,
    isRunning,
  } = usePitchDetector();

  // Build pitch log from pitch state changes
  const lastLoggedFrameRef = useRef(0);
  useEffect(() => {
    if (pitchState.framesProcessed === lastLoggedFrameRef.current) return;
    lastLoggedFrameRef.current = pitchState.framesProcessed;

    const p = pitchState.currentPitch;
    const r = pitchState.rawPitch;

    let line: string;
    if (!r) {
      // Only log silence every 10th frame to avoid spamming
      if (pitchState.framesProcessed % 10 !== 0) return;
      line = `[frame ${pitchState.framesProcessed}] — silence / noise —`;
    } else if (!p) {
      line = `[frame ${pitchState.framesProcessed}] raw=${r.note}${r.octave} ${r.frequency.toFixed(1)}Hz conf=${(r.confidence * 100).toFixed(0)}% (below threshold)`;
    } else {
      line = `[frame ${pitchState.framesProcessed}] ${p.smoothedNote}${p.smoothedOctave} ${p.smoothedFrequency.toFixed(1)}Hz ${p.smoothedCents > 0 ? "+" : ""}${p.smoothedCents}¢ [${p.stability}] conf=${(p.raw.confidence * 100).toFixed(0)}% agree=${p.agreementCount}`;
    }

    setPitchLog((prev) => {
      const next = [...prev, line];
      if (next.length > MAX_PITCH_LOG) next.shift();
      return next;
    });
  }, [pitchState]);

  // Auto-scroll pitch log
  useEffect(() => {
    if (pitchLogRef.current) {
      pitchLogRef.current.scrollTop = pitchLogRef.current.scrollHeight;
    }
  }, [pitchLog]);

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
        description="System diagnostics, pitch detection, and raw audio analysis."
      />

      <div className="flex flex-col gap-6">
        {/* Audio + pitch engine control */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Audio + Pitch Engine</h2>
            <div className="flex items-center gap-2">
              <StatusBadge
                variant={isRunning ? "success" : audioState.engineStatus === "error" ? "error" : "idle"}
                label={audioState.engineStatus}
                pulse={audioState.engineStatus === "starting"}
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
                level={audioState.levels.rms}
                peak={audioState.levels.peak}
                showDb
                dbFS={audioState.levels.dbFS}
              />
              <div className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Engine</div>
                  <div className="font-mono">{audioState.engineStatus}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Rate</div>
                  <div className="font-mono">{audioState.sampleRate}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Buffers</div>
                  <div className="font-mono">{audioState.buffersReceived}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Pitch Frames</div>
                  <div className="font-mono">{pitchState.framesProcessed}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">With Pitch</div>
                  <div className="font-mono">{pitchState.framesWithPitch}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">Detection %</div>
                  <div className="font-mono">
                    {pitchState.framesProcessed > 0
                      ? `${Math.round((pitchState.framesWithPitch / pitchState.framesProcessed) * 100)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            </>
          )}

          {audioState.errorMessage && (
            <p className="text-sm text-[var(--error)]">{audioState.errorMessage}</p>
          )}
        </Card>

        {/* Live pitch display */}
        {isRunning && (
          <Card className="flex flex-col items-center gap-4">
            <h2 className="text-sm font-medium text-[var(--text-secondary)]">
              Live Pitch Detection
            </h2>
            <PitchDisplay pitch={pitchState.currentPitch} showRaw />
          </Card>
        )}

        {/* Pitch stream log */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pitch Detection Stream</h2>
            {pitchLog.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setPitchLog([])}>
                Clear
              </Button>
            )}
          </div>
          <pre
            ref={pitchLogRef}
            className="h-56 overflow-y-auto overflow-x-hidden rounded-lg bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-secondary)]"
          >
            {pitchLog.length === 0
              ? "Start the engine to see pitch detection data..."
              : pitchLog.join("\n")}
          </pre>
        </Card>

        {/* Pitch detector state dump */}
        {isRunning && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Pitch Detector State</h2>
            <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-xs text-[var(--text-secondary)]">
              {JSON.stringify(
                {
                  ...pitchState,
                  currentPitch: pitchState.currentPitch
                    ? {
                        smoothedNote: pitchState.currentPitch.smoothedNote,
                        smoothedOctave: pitchState.currentPitch.smoothedOctave,
                        smoothedFrequency: pitchState.currentPitch.smoothedFrequency.toFixed(2),
                        smoothedCents: pitchState.currentPitch.smoothedCents,
                        stability: pitchState.currentPitch.stability,
                        agreementCount: pitchState.currentPitch.agreementCount,
                        rawNote: pitchState.currentPitch.raw.note,
                        rawFrequency: pitchState.currentPitch.raw.frequency.toFixed(2),
                        rawConfidence: pitchState.currentPitch.raw.confidence.toFixed(3),
                      }
                    : null,
                },
                null,
                2,
              )}
            </pre>
          </Card>
        )}

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
