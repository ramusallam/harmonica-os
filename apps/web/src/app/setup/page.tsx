"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import type { MicrophoneStatus, AudioEngineStatus } from "@/types/audio";

function getStatusBadge(
  engineStatus: AudioEngineStatus,
  micStatus: MicrophoneStatus,
): { variant: "success" | "warning" | "error" | "info" | "idle"; label: string; pulse: boolean } {
  if (engineStatus === "running") {
    return { variant: "success", label: "Listening", pulse: false };
  }
  if (engineStatus === "suspended") {
    return { variant: "warning", label: "Suspended — click to resume", pulse: true };
  }
  if (engineStatus === "starting") {
    return { variant: "info", label: "Starting...", pulse: true };
  }
  if (micStatus === "denied") {
    return { variant: "error", label: "Permission denied", pulse: false };
  }
  if (micStatus === "no-device") {
    return { variant: "error", label: "No microphone found", pulse: false };
  }
  if (micStatus === "ended") {
    return { variant: "error", label: "Microphone disconnected", pulse: false };
  }
  if (engineStatus === "error") {
    return { variant: "error", label: "Error", pulse: false };
  }
  return { variant: "idle", label: "Not connected", pulse: false };
}

export default function SetupPage() {
  const {
    state,
    start,
    stop,
    switchDevice,
    refreshDevices,
    resumeContext,
    isRunning,
    isSuspended,
    hasError,
  } = useAudioEngine();

  // Enumerate devices on mount (labels may be empty before permission)
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const badge = getStatusBadge(state.engineStatus, state.micStatus);

  return (
    <div>
      <PageHeader
        title="Microphone Setup"
        description="HarmonicaOS needs access to your microphone to hear you play."
      />

      <div className="flex flex-col gap-6">
        {/* Status + Controls */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Microphone</h2>
            <StatusBadge variant={badge.variant} label={badge.label} pulse={badge.pulse} />
          </div>

          {/* Level meter — only meaningful when running */}
          <LevelMeter
            level={state.levels.rms}
            peak={state.levels.peak}
            showDb={isRunning}
            dbFS={state.levels.dbFS}
            label="Microphone input level"
          />

          {/* Silence warning */}
          {isRunning && state.levels.isSilent && state.buffersReceived > 20 && (
            <p className="text-sm text-[var(--warning)]">
              Signal is extremely quiet. Check that the correct microphone is
              selected and that it isn't muted at the OS level.
            </p>
          )}

          {/* Device selector — only show when we have labeled devices */}
          {state.availableDevices.length > 1 && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="device-select"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Input device
              </label>
              <select
                id="device-select"
                value={state.selectedDeviceId ?? "default"}
                onChange={(e) => switchDevice(e.target.value)}
                className="rounded-lg border border-white/10 bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {state.availableDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}{d.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isRunning && !isSuspended ? (
              <Button
                onClick={() => start()}
                disabled={state.engineStatus === "starting"}
              >
                {hasError ? "Retry" : "Connect Microphone"}
              </Button>
            ) : isSuspended ? (
              <Button onClick={resumeContext}>
                Resume Audio
              </Button>
            ) : (
              <Button variant="secondary" onClick={stop}>
                Disconnect
              </Button>
            )}
          </div>

          {/* Error message */}
          {state.errorMessage && (
            <p className="text-sm text-[var(--error)]" role="alert">
              {state.errorMessage}
            </p>
          )}

          {/* Success message */}
          {isRunning && !state.levels.isSilent && (
            <p className="text-sm text-[var(--success)]">
              Microphone is working — the level meter is responding to your audio
              input. When ready, proceed to harmonica selection.
            </p>
          )}
        </Card>

        {/* Quick diagnostics */}
        {isRunning && (
          <Card>
            <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
              Audio Pipeline
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-[var(--text-secondary)]">Sample Rate</div>
                <div className="font-mono font-medium">{state.sampleRate} Hz</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Buffer Size</div>
                <div className="font-mono font-medium">{state.bufferSize}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Buffers</div>
                <div className="font-mono font-medium">{state.buffersReceived}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Latency</div>
                <div className="font-mono font-medium">
                  {state.sampleRate > 0
                    ? `~${Math.round((state.bufferSize / state.sampleRate) * 1000)}ms`
                    : "—"}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        {isRunning && (
          <div className="flex justify-end">
            <Link href="/select">
              <Button>Continue to Harmonica Selection</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
