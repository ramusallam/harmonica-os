"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { CommandLog } from "@/components/harmonica/command-log";
import { LevelMeter } from "@/components/audio/level-meter";
import { usePitchDetector } from "@/hooks/use-pitch-detector";
import { useSettings } from "@/hooks/use-settings";
import { CalibrationMatcher, type DegreeMatch } from "@/lib/calibration/matcher";
import { CommandStateMachine, type CommandMachineState, type ControlMode } from "@/lib/commands/state-machine";
import { loadCalibration } from "@/lib/storage/local-storage";
import { buildDefaultProfile } from "@/lib/calibration/calibration";
import { DEFAULT_COMMAND_MAP, WebDispatcher, TauriDispatcher, type CommandDispatcher } from "@harmonica-os/core";
import { isTauri, getTauriInvoke } from "@/lib/runtime";
import type { CommandEvent } from "@/types/commands";

// --- Dispatchers ---

class NoOpDispatcher implements CommandDispatcher {
  fire(): void {
    // Learn-only mode — no action
  }
}

class LoggingWebDispatcher implements CommandDispatcher {
  private inner = new WebDispatcher();
  fire(action: Parameters<CommandDispatcher["fire"]>[0]): void {
    this.inner.fire(action);
  }
}

function getDispatcher(mode: ControlMode): CommandDispatcher {
  switch (mode) {
    case "learn-only":
      return new NoOpDispatcher();
    case "browser-demo":
      return new LoggingWebDispatcher();
    case "desktop":
      return new NoOpDispatcher(); // Replaced async in useEffect below
  }
}

// --- Phase display config ---

const PHASE_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "idle" }> = {
  idle: { label: "Idle", variant: "idle" },
  listening: { label: "Listening", variant: "info" },
  candidate: { label: "Candidate", variant: "warning" },
  confirmed: { label: "Fired", variant: "success" },
  cooldown: { label: "Cooldown", variant: "idle" },
};

const ACTION_LABELS: Record<string, string> = {
  ArrowRight: "→ Right Arrow",
  ArrowLeft: "← Left Arrow",
  Space: "␣ Spacebar",
};

export default function ControlPage() {
  const { settings } = useSettings();
  const {
    state: audioState,
    pitchState,
    start,
    stop,
    isRunning,
  } = usePitchDetector();

  const [controlMode, setControlMode] = useState<ControlMode>("browser-demo");
  const [isActive, setIsActive] = useState(false);
  const [machineState, setMachineState] = useState<CommandMachineState | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandEvent[]>([]);
  const [lastFired, setLastFired] = useState<CommandEvent | null>(null);
  const [demoOutput, setDemoOutput] = useState<string[]>([]);

  const matcherRef = useRef<CalibrationMatcher | null>(null);
  const smRef = useRef<CommandStateMachine | null>(null);
  const dispatcherRef = useRef<CommandDispatcher>(getDispatcher(controlMode));

  // Initialize matcher with calibration profile
  useEffect(() => {
    const profile = loadCalibration(settings.harmonicaKey) ?? buildDefaultProfile(settings.harmonicaKey);
    matcherRef.current = new CalibrationMatcher(profile);
  }, [settings.harmonicaKey]);

  const [tauriAvailable, setTauriAvailable] = useState(false);

  // Detect Tauri runtime
  useEffect(() => {
    setTauriAvailable(isTauri());
  }, []);

  // Initialize state machine + dispatcher
  useEffect(() => {
    // Set dispatcher — async for Tauri, sync for others
    if (controlMode === "desktop" && tauriAvailable) {
      getTauriInvoke().then((invoke) => {
        if (invoke) {
          dispatcherRef.current = new TauriDispatcher(invoke);
        }
      });
    } else {
      dispatcherRef.current = getDispatcher(controlMode);
    }

    smRef.current = new CommandStateMachine({
      commandMap: settings.commandMap ?? DEFAULT_COMMAND_MAP,
      confirmFrames: 4,
      cooldownMs: 300,
      displayMs: 400,
      onCommand: (event) => {
        // Dispatch to the appropriate target
        dispatcherRef.current.fire(event.action);

        setLastFired(event);
        setCommandHistory((prev) => [...prev, event]);

        if (controlMode === "browser-demo") {
          setDemoOutput((prev) => [
            `${ACTION_LABELS[event.action] ?? event.action} (degree ${event.degree}, ${Math.round(event.confidence * 100)}%)`,
            ...prev.slice(0, 9),
          ]);
        }
      },
    });
  }, [controlMode, settings.commandMap, tauriAvailable]);

  // Feed pitch data into state machine every frame
  useEffect(() => {
    if (!isActive || !isRunning) return;

    const matcher = matcherRef.current;
    const sm = smRef.current;
    if (!matcher || !sm) return;

    const match: DegreeMatch | null = pitchState.currentPitch
      ? matcher.match(pitchState.currentPitch)
      : null;

    sm.tick(match);
    setMachineState(sm.getState());
  }, [isActive, isRunning, pitchState.currentPitch]);

  // Listen for browser-demo keyboard events
  useEffect(() => {
    if (controlMode !== "browser-demo") return;

    function handleKey(e: KeyboardEvent) {
      // Only capture our synthetic events
      if (!e.isTrusted) {
        setDemoOutput((prev) => {
          const label = e.code === "Space" ? "␣ Space" : e.code === "ArrowRight" ? "→ Right" : e.code === "ArrowLeft" ? "← Left" : e.code;
          const msg = `Key: ${label}`;
          if (prev[0] === msg) return prev; // Avoid duplicates from keydown+keyup
          return [msg, ...prev.slice(0, 9)];
        });
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [controlMode]);

  function startControl() {
    smRef.current?.reset();
    setCommandHistory([]);
    setLastFired(null);
    setDemoOutput([]);
    setMachineState(null);

    if (!isRunning) {
      start();
    }

    setIsActive(true);
  }

  function stopControl() {
    setIsActive(false);
    stop();
  }

  const phase = machineState?.phase ?? "idle";
  const phaseInfo = PHASE_CONFIG[phase] ?? PHASE_CONFIG.idle;

  return (
    <div>
      <PageHeader
        title="Control Mode"
        description="Your harmonica becomes a controller. Notes trigger keyboard commands."
      />

      <div className="flex flex-col gap-6">
        {/* Status + controls bar */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge
                variant={isActive ? phaseInfo.variant : "idle"}
                label={isActive ? phaseInfo.label : "Off"}
                pulse={isActive && phase === "candidate"}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Key of {settings.harmonicaKey}
              </span>
              {!loadCalibration(settings.harmonicaKey) && (
                <Link href="/calibrate" className="text-xs text-[var(--warning)] underline">
                  Not calibrated
                </Link>
              )}
            </div>
            <Button
              variant={isActive ? "danger" : "primary"}
              onClick={isActive ? stopControl : startControl}
            >
              {isActive ? "Stop" : "Start Controlling"}
            </Button>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="control-mode" className="text-sm text-[var(--text-secondary)]">
              Mode:
            </label>
            <select
              id="control-mode"
              value={controlMode}
              onChange={(e) => {
                const next = e.target.value as ControlMode;
                setControlMode(next);
                if (isActive) {
                  stopControl();
                }
              }}
              className="rounded-md bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            >
              <option value="learn-only">Learn Only (no commands)</option>
              <option value="browser-demo">Browser Demo (in-page keys)</option>
              <option value="desktop">
                {tauriAvailable ? "Desktop Control (native keys)" : "Desktop Control (requires desktop app)"}
              </option>
            </select>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Live detection */}
          <Card className="flex flex-col items-center gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Detected Note
            </h2>
            <PitchDisplay pitch={pitchState.currentPitch} />
            <LevelMeter
              level={audioState.levels.rms}
              peak={audioState.levels.peak}
              showDb={isRunning}
              dbFS={audioState.levels.dbFS}
            />
          </Card>

          {/* State machine + last command */}
          <Card className="flex flex-col gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Command Engine
            </h2>

            {/* Phase indicator */}
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-4">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Phase</div>
                <div className="text-2xl font-bold capitalize">{phase}</div>
              </div>
              {machineState?.candidateDegree !== null && machineState?.candidateDegree !== undefined && (
                <div className="text-right">
                  <div className="text-sm text-[var(--text-secondary)]">Candidate</div>
                  <div className="text-2xl font-bold text-[var(--accent)]">
                    {machineState.candidateDegree}
                  </div>
                </div>
              )}
            </div>

            {/* Hold progress during candidate phase */}
            {phase === "candidate" && machineState && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>Hold to confirm</span>
                  <span>{machineState.holdFrames} / 4</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div
                    className="h-full rounded-full bg-[var(--warning)] transition-all duration-100"
                    style={{ width: `${(machineState.holdFrames / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cooldown indicator */}
            {phase === "cooldown" && (
              <div className="text-center text-sm text-[var(--text-secondary)]">
                Cooldown — waiting before next command...
              </div>
            )}

            {/* Last fired command */}
            {lastFired && (
              <div className={`rounded-lg p-4 text-center ${phase === "confirmed" ? "bg-[var(--success)]/10 ring-2 ring-[var(--success)]/30" : "bg-[var(--bg-tertiary)]"}`}>
                <div className="text-sm text-[var(--text-secondary)]">Last command</div>
                <div className="text-3xl font-bold">
                  {ACTION_LABELS[lastFired.action] ?? lastFired.action}
                </div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                  Degree {lastFired.degree} · {Math.round(lastFired.confidence * 100)}% confidence
                </div>
              </div>
            )}

            {!isActive && !lastFired && (
              <div className="py-4 text-center text-[var(--text-secondary)]">
                Start controlling to see the command engine in action.
              </div>
            )}
          </Card>
        </div>

        {/* Command mappings reference */}
        <Card>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            Active Mappings
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(settings.commandMap ?? DEFAULT_COMMAND_MAP).map((cmd) => {
              const isCandidate = machineState?.candidateDegree === cmd.degree && phase === "candidate";
              const isFired = lastFired?.degree === cmd.degree && phase === "confirmed";
              return (
                <div
                  key={cmd.degree}
                  className={`flex flex-col items-center gap-1 rounded-lg p-4 transition-all duration-150 ${
                    isFired
                      ? "bg-[var(--success)]/10 ring-2 ring-[var(--success)]/30"
                      : isCandidate
                        ? "bg-[var(--warning)]/10 ring-2 ring-[var(--warning)]/30"
                        : "bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <span className="text-3xl font-bold">{cmd.degree}</span>
                  <span className="text-sm text-[var(--text-secondary)]">{cmd.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Browser demo output */}
        {controlMode === "browser-demo" && demoOutput.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
              Browser Demo Output
            </h2>
            <div className="flex flex-col gap-1 font-mono text-sm">
              {demoOutput.map((line, i) => (
                <div
                  key={`${line}-${i}`}
                  className={`rounded px-2 py-1 ${i === 0 ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
                >
                  {line}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Command log */}
        <Card>
          <CommandLog events={commandHistory} />
        </Card>

        {/* Mode notices */}
        {controlMode === "browser-demo" && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Browser Demo: commands fire as DOM keyboard events within this page only.
          </p>
        )}
        {controlMode === "desktop" && (
          <p className={`text-center text-sm ${tauriAvailable ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
            {tauriAvailable
              ? "Desktop mode active. Commands inject OS-level keystrokes via Tauri."
              : "Desktop control requires the Tauri desktop app. Run `npm run tauri dev` to use this mode."}
          </p>
        )}
        {controlMode === "learn-only" && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Learn Only: detection runs but no commands are dispatched.
            Use this to practice without triggering actions.
          </p>
        )}
      </div>
    </div>
  );
}
