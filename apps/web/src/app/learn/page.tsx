"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { LevelMeter } from "@/components/audio/level-meter";
import { usePitchDetector } from "@/hooks/use-pitch-detector";
import { useSettings } from "@/hooks/use-settings";
import { CalibrationMatcher, type DegreeMatch } from "@/lib/calibration/matcher";
import { LessonEngine, type LessonPrompt, type LessonStats, type LessonMode } from "@/lib/learn/lesson-engine";
import { loadCalibration } from "@/lib/storage/local-storage";
import { buildDefaultProfile } from "@/lib/calibration/calibration";
import { getNotesForKey, type NoteName } from "@harmonica-os/core";

export default function LearnPage() {
  const { settings } = useSettings();
  const {
    state: audioState,
    pitchState,
    start,
    stop,
    isRunning,
  } = usePitchDetector();

  // Lesson state
  const engineRef = useRef(new LessonEngine());
  const matcherRef = useRef<CalibrationMatcher | null>(null);
  const [prompt, setPrompt] = useState<LessonPrompt | null>(null);
  const [stats, setStats] = useState<LessonStats>({ hits: 0, misses: 0, streak: 0, bestStreak: 0, attempts: 0 });
  const [mode, setMode] = useState<LessonMode>("sequential");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = getNotesForKey(settings.harmonicaKey);

  // Initialize matcher with calibration profile (or defaults)
  useEffect(() => {
    const profile = loadCalibration(settings.harmonicaKey) ?? buildDefaultProfile(settings.harmonicaKey);
    matcherRef.current = new CalibrationMatcher(profile);
  }, [settings.harmonicaKey]);

  // Update engine mode
  useEffect(() => {
    engineRef.current.setMode(mode);
  }, [mode]);

  const scheduleNextPrompt = useCallback((delayMs: number) => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      const next = engineRef.current.nextPrompt();
      setPrompt(next);
      setFeedback("");
    }, delayMs);
  }, []);

  // Feed pitch data into lesson engine every frame
  useEffect(() => {
    if (!isSessionActive || !isRunning) return;
    if (!prompt || prompt.state === "correct" || prompt.state === "wrong") return;

    const matcher = matcherRef.current;
    if (!matcher) return;

    const match: DegreeMatch | null = pitchState.currentPitch
      ? matcher.match(pitchState.currentPitch)
      : null;

    const updated = engineRef.current.tick(match);
    if (!updated) return;

    setPrompt(updated);
    setStats(engineRef.current.getStats());

    // Generate feedback on resolution
    if (updated.state === "correct") {
      setFeedback(correctFeedback(updated));
      scheduleNextPrompt(engineRef.current.correctDisplayMs);
    } else if (updated.state === "wrong") {
      setFeedback(wrongFeedback(updated, settings.harmonicaKey));
      scheduleNextPrompt(engineRef.current.wrongDisplayMs);
    }
  }, [isSessionActive, isRunning, pitchState.currentPitch, prompt, scheduleNextPrompt, settings.harmonicaKey]);

  function startSession() {
    engineRef.current.reset();
    setStats({ hits: 0, misses: 0, streak: 0, bestStreak: 0, attempts: 0 });
    setFeedback("");

    if (!isRunning) {
      start();
    }

    // Small delay so mic is ready before first prompt
    setTimeout(() => {
      const first = engineRef.current.nextPrompt();
      setPrompt(first);
      setIsSessionActive(true);
    }, 300);
  }

  function stopSession() {
    setIsSessionActive(false);
    setPrompt(null);
    setFeedback("");
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    stop();
  }

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const targetNote = prompt
    ? scale.find((s) => s.degree === prompt.degree)?.note
    : null;

  const accuracy = stats.attempts > 0
    ? Math.round((stats.hits / stats.attempts) * 100)
    : null;

  const promptBg = prompt?.state === "correct"
    ? "ring-4 ring-[var(--success)]/40"
    : prompt?.state === "wrong"
      ? "ring-4 ring-[var(--error)]/40"
      : "";

  return (
    <div>
      <PageHeader
        title="Learn Mode"
        description={`Practice hitting the 1, 4, and 5 on your ${settings.harmonicaKey} harmonica.`}
      />

      <div className="flex flex-col gap-6">
        {/* Status bar */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge
              variant={isSessionActive ? "success" : "idle"}
              label={isSessionActive ? "Session active" : "Ready"}
              pulse={isSessionActive}
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
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as LessonMode)}
              className="rounded-md bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              aria-label="Lesson mode"
            >
              <option value="sequential">Sequential</option>
              <option value="random">Random</option>
            </select>
            <Button
              variant={isSessionActive ? "danger" : "primary"}
              onClick={isSessionActive ? stopSession : startSession}
            >
              {isSessionActive ? "Stop" : "Start Practice"}
            </Button>
          </div>
        </Card>

        {/* Main lesson area */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Target prompt — large and clear */}
          <Card className={`flex flex-col items-center gap-4 py-8 transition-all duration-300 ${promptBg}`}>
            <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Play this note
            </h2>

            {prompt && targetNote ? (
              <>
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--accent)]/10 ring-4 ring-[var(--accent)]/30">
                  <span className="text-6xl font-bold text-[var(--accent)]">
                    {targetNote}
                  </span>
                </div>
                <div className="text-xl font-medium text-[var(--text-secondary)]">
                  Degree {prompt.degree}
                </div>

                {/* State indicator */}
                {prompt.state === "correct" && (
                  <div className="text-2xl font-bold text-[var(--success)]" aria-live="assertive">
                    Correct
                  </div>
                )}
                {prompt.state === "wrong" && (
                  <div className="text-2xl font-bold text-[var(--error)]" aria-live="assertive">
                    {prompt.match ? `Heard degree ${prompt.match.degree}` : "No note detected"}
                  </div>
                )}
                {(prompt.state === "waiting" || prompt.state === "listening") && (
                  <div className="text-lg text-[var(--text-secondary)]" aria-live="polite">
                    {prompt.state === "waiting" ? "Play when ready..." : "Listening..."}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
                <span className="text-5xl font-bold text-[var(--text-secondary)]">—</span>
              </div>
            )}
          </Card>

          {/* Detection panel */}
          <Card className="flex flex-col items-center gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              What we hear
            </h2>
            <PitchDisplay pitch={pitchState.currentPitch} />
            <LevelMeter
              level={audioState.levels.rms}
              peak={audioState.levels.peak}
              showDb={isRunning}
              dbFS={audioState.levels.dbFS}
            />
          </Card>
        </div>

        {/* Feedback bar */}
        {feedback && (
          <Card className="text-center">
            <p className="text-lg" aria-live="polite">{feedback}</p>
          </Card>
        )}

        {/* Stats */}
        <Card>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{stats.hits}</div>
              <div className="text-sm text-[var(--text-secondary)]">Hits</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats.streak}</div>
              <div className="text-sm text-[var(--text-secondary)]">Streak</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats.bestStreak}</div>
              <div className="text-sm text-[var(--text-secondary)]">Best</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {accuracy !== null ? `${accuracy}%` : "—"}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Accuracy</div>
            </div>
          </div>
        </Card>

        {/* Degree reference */}
        <Card>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            Note reference — Key of {settings.harmonicaKey}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[1, 4, 5].map((degree) => {
              const note = scale.find((s) => s.degree === degree)?.note;
              const isTarget = prompt?.degree === degree;
              return (
                <div
                  key={degree}
                  className={`flex flex-col items-center gap-1 rounded-lg p-3 ${
                    isTarget
                      ? "bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]/30"
                      : "bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <span className="text-2xl font-bold">{note}</span>
                  <span className="text-xs text-[var(--text-secondary)]">Degree {degree}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- Feedback generators ---

function correctFeedback(prompt: LessonPrompt): string {
  const confidence = prompt.match ? Math.round(prompt.match.confidence * 100) : 0;
  const centsOff = prompt.match ? Math.abs(prompt.match.centsFromCenter) : 0;

  if (confidence >= 90 && centsOff <= 10) {
    return "Excellent — right on target.";
  }
  if (confidence >= 75) {
    return "Good hit. Keep it steady.";
  }
  return "Got it, but try to hold the note more steadily.";
}

function wrongFeedback(prompt: LessonPrompt, harmonicaKey: NoteName): string {
  if (!prompt.match) {
    return "No note detected. Play louder or closer to the mic.";
  }

  const scale = getNotesForKey(harmonicaKey);
  const targetNote = scale.find((s) => s.degree === prompt.degree)?.note ?? "?";
  const heardNote = scale.find((s) => s.degree === prompt.match!.degree)?.note ?? "?";

  return `Wanted ${targetNote} (degree ${prompt.degree}), heard ${heardNote} (degree ${prompt.match.degree}). Try again.`;
}
