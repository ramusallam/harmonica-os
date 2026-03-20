import type { DegreeMatch } from "@/lib/calibration/matcher";

// --- Lesson types ---

export type PromptState = "waiting" | "listening" | "correct" | "wrong" | "timeout";

export type LessonPrompt = {
  degree: number;
  state: PromptState;
  startedAt: number;
  resolvedAt: number | null;
  match: DegreeMatch | null;
};

export type LessonStats = {
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
  attempts: number;
};

export type LessonMode = "sequential" | "random";

// --- Lesson engine ---

const TARGET_DEGREES = [1, 4, 5] as const;
const PROMPT_TIMEOUT_MS = 10_000;
const CORRECT_DISPLAY_MS = 1_200;
const WRONG_DISPLAY_MS = 1_500;

export class LessonEngine {
  private stats: LessonStats = { hits: 0, misses: 0, streak: 0, bestStreak: 0, attempts: 0 };
  private currentPrompt: LessonPrompt | null = null;
  private mode: LessonMode = "sequential";
  private sequentialIndex = 0;
  private holdFrames = 0;
  private lastMatchedDegree: number | null = null;

  // How many consecutive matching frames required to confirm a hit
  private readonly confirmFrames = 3;

  reset(): void {
    this.stats = { hits: 0, misses: 0, streak: 0, bestStreak: 0, attempts: 0 };
    this.currentPrompt = null;
    this.sequentialIndex = 0;
    this.holdFrames = 0;
    this.lastMatchedDegree = null;
  }

  setMode(mode: LessonMode): void {
    this.mode = mode;
  }

  getStats(): LessonStats {
    return { ...this.stats };
  }

  getCurrentPrompt(): LessonPrompt | null {
    return this.currentPrompt ? { ...this.currentPrompt } : null;
  }

  getMode(): LessonMode {
    return this.mode;
  }

  // Start a new prompt. Returns the prompt.
  nextPrompt(): LessonPrompt {
    const degree = this.pickNextDegree();
    this.currentPrompt = {
      degree,
      state: "waiting",
      startedAt: Date.now(),
      resolvedAt: null,
      match: null,
    };
    this.holdFrames = 0;
    this.lastMatchedDegree = null;
    return { ...this.currentPrompt };
  }

  // Feed a match result (or null for silence) each frame.
  // Returns updated prompt state, or null if no active prompt.
  tick(match: DegreeMatch | null): LessonPrompt | null {
    if (!this.currentPrompt || this.currentPrompt.state === "correct" || this.currentPrompt.state === "wrong") {
      return this.currentPrompt ? { ...this.currentPrompt } : null;
    }

    // If we get any audio, move from waiting to listening
    if (this.currentPrompt.state === "waiting" && match) {
      this.currentPrompt.state = "listening";
    }

    // Check timeout
    if (Date.now() - this.currentPrompt.startedAt > PROMPT_TIMEOUT_MS) {
      return this.resolveWrong(null);
    }

    if (!match) {
      // Silence — reset hold counter
      this.holdFrames = 0;
      this.lastMatchedDegree = null;
      return { ...this.currentPrompt };
    }

    // We have a match against some degree
    if (match.degree === this.currentPrompt.degree) {
      // Correct degree — accumulate hold frames
      if (this.lastMatchedDegree === match.degree) {
        this.holdFrames++;
      } else {
        this.holdFrames = 1;
        this.lastMatchedDegree = match.degree;
      }

      if (this.holdFrames >= this.confirmFrames) {
        return this.resolveCorrect(match);
      }

      this.currentPrompt.state = "listening";
      this.currentPrompt.match = match;
    } else {
      // Wrong degree detected — only penalize if they held it for a few frames
      if (this.lastMatchedDegree === match.degree) {
        this.holdFrames++;
      } else {
        this.holdFrames = 1;
        this.lastMatchedDegree = match.degree;
      }

      if (this.holdFrames >= this.confirmFrames) {
        return this.resolveWrong(match);
      }

      this.currentPrompt.state = "listening";
      this.currentPrompt.match = match;
    }

    return { ...this.currentPrompt };
  }

  get correctDisplayMs(): number {
    return CORRECT_DISPLAY_MS;
  }

  get wrongDisplayMs(): number {
    return WRONG_DISPLAY_MS;
  }

  // --- Private ---

  private resolveCorrect(match: DegreeMatch): LessonPrompt {
    this.currentPrompt!.state = "correct";
    this.currentPrompt!.resolvedAt = Date.now();
    this.currentPrompt!.match = match;
    this.stats.hits++;
    this.stats.attempts++;
    this.stats.streak++;
    if (this.stats.streak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.streak;
    }
    return { ...this.currentPrompt! };
  }

  private resolveWrong(match: DegreeMatch | null): LessonPrompt {
    this.currentPrompt!.state = "wrong";
    this.currentPrompt!.resolvedAt = Date.now();
    this.currentPrompt!.match = match;
    this.stats.misses++;
    this.stats.attempts++;
    this.stats.streak = 0;
    return { ...this.currentPrompt! };
  }

  private pickNextDegree(): number {
    if (this.mode === "sequential") {
      const degree = TARGET_DEGREES[this.sequentialIndex % TARGET_DEGREES.length];
      this.sequentialIndex++;
      return degree;
    }
    // Random but avoid repeating the same degree twice in a row
    const last = this.currentPrompt?.degree;
    const choices = TARGET_DEGREES.filter((d) => d !== last);
    return choices[Math.floor(Math.random() * choices.length)];
  }
}
