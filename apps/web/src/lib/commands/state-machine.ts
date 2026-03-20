import type { DegreeMatch } from "@/lib/calibration/matcher";
import type { KeyAction, CommandMap } from "@harmonica-os/core";
import { degreeToAction } from "@harmonica-os/core";
import type { CommandEvent } from "@/types/commands";

// --- State machine types ---

export type CommandPhase =
  | "idle"       // No audio, nothing happening
  | "listening"  // Audio detected, no degree match yet
  | "candidate"  // Degree matched, accumulating hold frames
  | "confirmed"  // Command fired, displaying result
  | "cooldown";  // Waiting before accepting next command

export type ControlMode = "learn-only" | "browser-demo" | "desktop";

export type CommandStateMachineConfig = {
  commandMap: CommandMap[];
  confirmFrames: number;    // How many consecutive matching frames to confirm
  cooldownMs: number;       // Minimum ms between commands
  displayMs: number;        // How long to show "confirmed" before returning to idle
  onCommand?: (event: CommandEvent) => void;
};

export type CommandMachineState = {
  phase: CommandPhase;
  candidateDegree: number | null;
  candidateAction: KeyAction | null;
  holdFrames: number;
  lastMatch: DegreeMatch | null;
  lastCommand: CommandEvent | null;
  phaseEnteredAt: number;
};

const DEFAULT_CONFIG: CommandStateMachineConfig = {
  commandMap: [],
  confirmFrames: 4,
  cooldownMs: 300,
  displayMs: 400,
};

// --- State machine ---

export class CommandStateMachine {
  private config: CommandStateMachineConfig;
  private state: CommandMachineState;
  private commandHistory: CommandEvent[] = [];

  constructor(config: Partial<CommandStateMachineConfig> & Pick<CommandStateMachineConfig, "commandMap">) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.initialState();
  }

  private initialState(): CommandMachineState {
    return {
      phase: "idle",
      candidateDegree: null,
      candidateAction: null,
      holdFrames: 0,
      lastMatch: null,
      lastCommand: null,
      phaseEnteredAt: performance.now(),
    };
  }

  reset(): void {
    this.state = this.initialState();
    this.commandHistory = [];
  }

  getState(): CommandMachineState {
    return { ...this.state };
  }

  getHistory(): CommandEvent[] {
    return [...this.commandHistory];
  }

  getTotalCommands(): number {
    return this.commandHistory.length;
  }

  updateConfig(partial: Partial<CommandStateMachineConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  // Feed a match result (or null for silence/no-match) every frame.
  // Returns the command event if one was just fired, null otherwise.
  tick(match: DegreeMatch | null): CommandEvent | null {
    const now = performance.now();

    switch (this.state.phase) {
      case "idle":
        return this.tickIdle(match, now);
      case "listening":
        return this.tickListening(match, now);
      case "candidate":
        return this.tickCandidate(match, now);
      case "confirmed":
        return this.tickConfirmed(now);
      case "cooldown":
        return this.tickCooldown(now);
      default:
        return null;
    }
  }

  // --- Phase handlers ---

  private tickIdle(match: DegreeMatch | null, now: number): CommandEvent | null {
    if (match) {
      this.enterCandidate(match, now);
    }
    return null;
  }

  private tickListening(match: DegreeMatch | null, now: number): CommandEvent | null {
    if (!match) {
      this.enterPhase("idle", now);
      return null;
    }
    this.enterCandidate(match, now);
    return null;
  }

  private tickCandidate(match: DegreeMatch | null, now: number): CommandEvent | null {
    if (!match) {
      // Lost the note — back to idle
      this.state.candidateDegree = null;
      this.state.candidateAction = null;
      this.state.holdFrames = 0;
      this.enterPhase("idle", now);
      return null;
    }

    this.state.lastMatch = match;

    if (match.degree === this.state.candidateDegree) {
      // Same degree — accumulate
      this.state.holdFrames++;

      if (this.state.holdFrames >= this.config.confirmFrames) {
        return this.fireCommand(match, now);
      }
    } else {
      // Different degree — restart candidate
      this.enterCandidate(match, now);
    }

    return null;
  }

  private tickConfirmed(now: number): CommandEvent | null {
    if (now - this.state.phaseEnteredAt >= this.config.displayMs) {
      this.enterPhase("cooldown", now);
    }
    return null;
  }

  private tickCooldown(now: number): CommandEvent | null {
    if (now - this.state.phaseEnteredAt >= this.config.cooldownMs) {
      this.enterPhase("idle", now);
    }
    return null;
  }

  // --- Transitions ---

  private enterPhase(phase: CommandPhase, now: number): void {
    this.state.phase = phase;
    this.state.phaseEnteredAt = now;
  }

  private enterCandidate(match: DegreeMatch, now: number): void {
    const action = degreeToAction(match.degree, this.config.commandMap);
    this.state.phase = "candidate";
    this.state.candidateDegree = match.degree;
    this.state.candidateAction = action;
    this.state.holdFrames = 1;
    this.state.lastMatch = match;
    this.state.phaseEnteredAt = now;
  }

  private fireCommand(match: DegreeMatch, now: number): CommandEvent | null {
    const action = degreeToAction(match.degree, this.config.commandMap);
    if (!action) {
      this.enterPhase("idle", now);
      return null;
    }

    const event: CommandEvent = {
      action,
      degree: match.degree,
      confidence: match.confidence,
      timestamp: Date.now(),
    };

    this.state.lastCommand = event;
    this.commandHistory.push(event);
    this.enterPhase("confirmed", now);

    this.config.onCommand?.(event);
    return event;
  }
}
