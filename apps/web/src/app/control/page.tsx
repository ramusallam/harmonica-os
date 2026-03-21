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
  fire(): void {}
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
      return new NoOpDispatcher();
  }
}

// --- Phase display ---

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

// --- Debug log entry ---

type DebugEntry = {
  time: string;
  message: string;
  level: "info" | "warn" | "error" | "fire";
};

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 1 });
}

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

  // Desktop safety state
  const [tauriAvailable, setTauriAvailable] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [nativeFireCount, setNativeFireCount] = useState(0);
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const matcherRef = useRef<CalibrationMatcher | null>(null);
  const smRef = useRef<CommandStateMachine | null>(null);
  const dispatcherRef = useRef<CommandDispatcher>(getDispatcher(controlMode));
  const tauriDispatcherRef = useRef<TauriDispatcher | null>(null);

  const addDebug = useCallback((message: string, level: DebugEntry["level"] = "info") => {
    setDebugLog((prev) => [{ time: timestamp(), message, level }, ...prev.slice(0, 99)]);
  }, []);

  // Detect Tauri runtime
  useEffect(() => {
    const available = isTauri();
    setTauriAvailable(available);
    if (available) {
      addDebug("Tauri runtime detected");
    }
  }, [addDebug]);

  // Initialize matcher with calibration profile
  useEffect(() => {
    const profile = loadCalibration(settings.harmonicaKey) ?? buildDefaultProfile(settings.harmonicaKey);
    matcherRef.current = new CalibrationMatcher(profile);
  }, [settings.harmonicaKey]);

  // Initialize state machine + dispatcher
  useEffect(() => {
    if (controlMode === "desktop" && tauriAvailable) {
      getTauriInvoke().then((invoke) => {
        if (invoke) {
          const td = new TauriDispatcher(invoke, {
            onFire: (action) => {
              setNativeFireCount((c) => c + 1);
              addDebug(`Native key fired: ${ACTION_LABELS[action] ?? action}`, "fire");
            },
            onError: (action, err) => {
              addDebug(`Error firing ${action}: ${err}`, "error");
            },
            onRateLimited: (action) => {
              addDebug(`Rate limited: ${action}`, "warn");
            },
          });
          tauriDispatcherRef.current = td;
          dispatcherRef.current = td;
          addDebug("TauriDispatcher initialized");
        }
      });
    } else {
      dispatcherRef.current = getDispatcher(controlMode);
      tauriDispatcherRef.current = null;
    }

    smRef.current = new CommandStateMachine({
      commandMap: settings.commandMap ?? DEFAULT_COMMAND_MAP,
      confirmFrames: 4,
      cooldownMs: 300,
      displayMs: 400,
      onCommand: (event) => {
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
  }, [controlMode, settings.commandMap, tauriAvailable, addDebug]);

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

  // Browser-demo keyboard listener
  useEffect(() => {
    if (controlMode !== "browser-demo") return;

    function handleKey(e: KeyboardEvent) {
      if (!e.isTrusted) {
        setDemoOutput((prev) => {
          const label = e.code === "Space" ? "␣ Space" : e.code === "ArrowRight" ? "→ Right" : e.code === "ArrowLeft" ? "← Left" : e.code;
          const msg = `Key: ${label}`;
          if (prev[0] === msg) return prev;
          return [msg, ...prev.slice(0, 9)];
        });
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [controlMode]);

  // Kill switch: Escape key disarms + stops everything
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && (isActive || isArmed)) {
        e.preventDefault();
        emergencyStop();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isActive, isArmed]);

  // --- Actions ---

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
    addDebug(`Started in ${controlMode} mode`);
  }

  function stopControl() {
    setIsActive(false);
    stop();
    addDebug("Stopped");
  }

  async function armDesktop() {
    const td = tauriDispatcherRef.current;
    if (!td) return;

    try {
      await td.arm();
      setIsArmed(true);
      setNativeFireCount(0);
      addDebug("ARMED — native key injection is live", "warn");
    } catch (err) {
      addDebug(`Failed to arm: ${err}`, "error");
    }
  }

  async function disarmDesktop() {
    const td = tauriDispatcherRef.current;
    if (!td) return;

    try {
      await td.disarm();
      setIsArmed(false);
      addDebug("Disarmed — native key injection stopped");
    } catch (err) {
      addDebug(`Failed to disarm: ${err}`, "error");
    }
  }

  function emergencyStop() {
    setIsActive(false);
    stop();
    if (tauriDispatcherRef.current) {
      tauriDispatcherRef.current.disarm().catch(() => {});
      setIsArmed(false);
    }
    addDebug("EMERGENCY STOP — all systems halted", "error");
  }

  const phase = machineState?.phase ?? "idle";
  const phaseInfo = PHASE_CONFIG[phase] ?? PHASE_CONFIG.idle;
  const isDesktopMode = controlMode === "desktop";
  const isDesktopLive = isDesktopMode && tauriAvailable && isArmed && isActive;

  return (
    <div>
      <PageHeader
        title="Control Mode"
        description="Your harmonica becomes a controller. Notes trigger keyboard commands."
      />

      <div className="flex flex-col gap-6">
        {/* Emergency stop banner — always visible when armed */}
        {isArmed && (
          <div className="flex items-center justify-between rounded-lg bg-[var(--error)]/10 p-4 ring-2 ring-[var(--error)]/40">
            <div>
              <div className="font-bold text-[var(--error)]">Native Key Injection Armed</div>
              <div className="text-sm text-[var(--text-secondary)]">
                Press Escape or click Emergency Stop to disarm instantly.
                {nativeFireCount > 0 && ` Keys fired: ${nativeFireCount}`}
              </div>
            </div>
            <Button variant="danger" onClick={emergencyStop}>
              Emergency Stop
            </Button>
          </div>
        )}

        {/* Status + controls bar */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge
                variant={isDesktopLive ? "error" : isActive ? phaseInfo.variant : "idle"}
                label={isDesktopLive ? "LIVE" : isActive ? phaseInfo.label : "Off"}
                pulse={isDesktopLive || (isActive && phase === "candidate")}
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
            <div className="flex items-center gap-2">
              <Button
                variant={isActive ? "danger" : "primary"}
                onClick={isActive ? stopControl : startControl}
              >
                {isActive ? "Stop" : "Start Controlling"}
              </Button>
            </div>
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
                if (isArmed) {
                  disarmDesktop();
                }
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

          {/* Desktop arm/disarm toggle */}
          {isDesktopMode && tauriAvailable && (
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
              <div>
                <div className="text-sm font-medium">
                  {isArmed ? "Native key injection is armed" : "Native key injection is disarmed"}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {isArmed
                    ? "Confirmed notes will inject OS-level keystrokes. Press Escape to stop."
                    : "Arm to enable OS-level keystrokes. Detection will run but no keys will fire until armed."}
                </div>
              </div>
              <Button
                variant={isArmed ? "danger" : "secondary"}
                size="sm"
                onClick={isArmed ? disarmDesktop : armDesktop}
              >
                {isArmed ? "Disarm" : "Arm"}
              </Button>
            </div>
          )}
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
                  {isDesktopLive && " · native"}
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

        {/* Debug log — collapsible */}
        <Card>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-medium text-[var(--text-secondary)]">
              Debug Log ({debugLog.length} entries)
            </h2>
            <span className="text-xs text-[var(--text-secondary)]">{showDebug ? "Hide" : "Show"}</span>
          </button>
          {showDebug && (
            <div className="mt-3 flex max-h-64 flex-col gap-0.5 overflow-y-auto font-mono text-xs">
              {debugLog.length === 0 ? (
                <div className="text-[var(--text-secondary)]">No events yet</div>
              ) : (
                debugLog.map((entry, i) => (
                  <div
                    key={`${entry.time}-${i}`}
                    className={`rounded px-2 py-0.5 ${
                      entry.level === "error" ? "text-[var(--error)]" :
                      entry.level === "warn" ? "text-[var(--warning)]" :
                      entry.level === "fire" ? "text-[var(--success)]" :
                      "text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="opacity-50">{entry.time}</span> {entry.message}
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Mode notices */}
        {controlMode === "browser-demo" && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Browser Demo: commands fire as DOM keyboard events within this page only.
          </p>
        )}
        {controlMode === "desktop" && (
          <p className={`text-center text-sm ${tauriAvailable ? "text-[var(--text-secondary)]" : "text-[var(--warning)]"}`}>
            {tauriAvailable
              ? "Desktop mode. Arm the system to enable native key injection. Escape key is the kill switch."
              : "Desktop control requires the Tauri desktop app. Run `npm run tauri:dev` to use this mode."}
          </p>
        )}
        {controlMode === "learn-only" && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Learn Only: detection runs but no commands are dispatched.
          </p>
        )}
      </div>
    </div>
  );
}
