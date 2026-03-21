"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { KeySelector } from "@/components/harmonica/key-selector";
import { usePitchDetector } from "@/hooks/use-pitch-detector";
import { useSettings } from "@/hooks/use-settings";
import {
  getStepInstruction,
  getStepIndex,
  getNextStep,
  getTotalSteps,
  getDegreeForStep,
  isPlayStep,
  SampleCollector,
  NoiseFloorMeasurer,
  buildCalibrationProfile,
  buildDefaultProfile,
} from "@/lib/calibration/calibration";
import { saveCalibration, loadCalibration } from "@/lib/storage/local-storage";
import { getNotesForKey, type NoteName } from "@harmonica-os/core";
import type { CalibrationStep, CalibrationProfile, DegreeSample } from "@/types/calibration";

export default function CalibratePage() {
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState<CalibrationStep>("select-key");
  const [savedProfile, setSavedProfile] = useState<CalibrationProfile | null>(null);

  // Collectors
  const noiseRef = useRef(new NoiseFloorMeasurer());
  const collectorsRef = useRef<Map<number, SampleCollector>>(new Map());
  const [collectorProgress, setCollectorProgress] = useState<Record<number, number>>({});
  const [completedSamples, setCompletedSamples] = useState<Record<number, DegreeSample | null>>({});

  // Track noise floor progress separately
  const [noiseProgress, setNoiseProgress] = useState(0);

  const {
    state: audioState,
    pitchState,
    start,
    stop,
    isRunning,
  } = usePitchDetector();

  const stepIndex = getStepIndex(step);
  const totalSteps = getTotalSteps();
  const instruction = getStepInstruction(step, settings.harmonicaKey);
  const currentDegree = getDegreeForStep(step);

  // Load existing calibration
  useEffect(() => {
    const existing = loadCalibration(settings.harmonicaKey);
    setSavedProfile(existing);
  }, [settings.harmonicaKey]);

  // Initialize collectors when key changes
  const initCollectors = useCallback(() => {
    const map = new Map<number, SampleCollector>();
    [1, 4, 5].forEach((d) => {
      map.set(d, new SampleCollector(d, settings.harmonicaKey));
    });
    collectorsRef.current = map;
    setCollectorProgress({});
    setCompletedSamples({});
    noiseRef.current = new NoiseFloorMeasurer();
    setNoiseProgress(0);
  }, [settings.harmonicaKey]);

  useEffect(() => {
    initCollectors();
  }, [initCollectors]);

  // Feed audio data into noise floor measurer
  useEffect(() => {
    if (step !== "noise-floor" || !isRunning) return;
    const measurer = noiseRef.current;
    measurer.addReading(audioState.levels.rms);
    setNoiseProgress(measurer.progress);

    if (measurer.isComplete) {
      // Auto-advance
      const next = getNextStep(step);
      if (next) setStep(next);
    }
  }, [step, isRunning, audioState.levels.rms]);

  // Feed pitch data into sample collectors during play steps
  useEffect(() => {
    if (!isPlayStep(step) || !isRunning || !pitchState.currentPitch) return;
    const degree = currentDegree;
    if (degree === null) return;

    const collector = collectorsRef.current.get(degree);
    if (!collector || collector.isComplete) return;

    const accepted = collector.addSample(pitchState.currentPitch);
    if (accepted) {
      setCollectorProgress((prev) => ({
        ...prev,
        [degree]: collector.progress,
      }));

      if (collector.isComplete) {
        setCompletedSamples((prev) => ({
          ...prev,
          [degree]: collector.buildDegreeSample(),
        }));
      }
    }
  }, [step, isRunning, pitchState.currentPitch, currentDegree]);

  function advance() {
    const next = getNextStep(step);
    if (next) setStep(next);
  }

  function handleSave() {
    const collectors = [1, 4, 5]
      .map((d) => collectorsRef.current.get(d))
      .filter((c): c is SampleCollector => c !== undefined);

    const profile = buildCalibrationProfile(
      settings.harmonicaKey,
      noiseRef.current,
      collectors,
    );
    saveCalibration(profile);
    setSavedProfile(profile);
    setStep("complete");
  }

  function handleSkip() {
    const defaultProfile = buildDefaultProfile(settings.harmonicaKey);
    saveCalibration(defaultProfile);
    setSavedProfile(defaultProfile);
    setStep("complete");
  }

  function handleReset() {
    initCollectors();
    setStep("select-key");
    stop();
  }

  function retryDegree() {
    if (currentDegree === null) return;
    const collector = collectorsRef.current.get(currentDegree);
    collector?.reset();
    setCollectorProgress((prev) => ({ ...prev, [currentDegree]: 0 }));
    setCompletedSamples((prev) => ({ ...prev, [currentDegree]: null }));
  }

  const scale = getNotesForKey(settings.harmonicaKey);
  const allDegreesComplete = [1, 4, 5].every((d) => completedSamples[d]);

  return (
    <div>
      <PageHeader
        title="Calibration"
        description="Tune the system to your harmonica, microphone, and playing style."
      />

      <div className="flex flex-col gap-6">
        {/* Progress */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Step {stepIndex + 1} of {totalSteps}
            </h2>
            <div className="flex items-center gap-2">
              {savedProfile && savedProfile.completedAt > 0 && step === "select-key" && (
                <StatusBadge variant="success" label={`Calibrated ${new Date(savedProfile.completedAt).toLocaleDateString()}`} />
              )}
              <StatusBadge
                variant={step === "complete" ? "success" : "info"}
                label={step === "complete" ? "Complete" : step.replace(/-/g, " ")}
              />
            </div>
          </div>

          {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
            role="progressbar"
            aria-label="Calibration progress"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <p className="text-lg">{instruction}</p>
        </Card>

        {/* Step: Select key */}
        {step === "select-key" && (
          <Card className="flex flex-col gap-4">
            <KeySelector
              value={settings.harmonicaKey}
              onChange={(key: NoteName) => {
                updateSettings({ harmonicaKey: key });
              }}
            />
            <div className="flex gap-3">
              <Button onClick={advance}>Continue</Button>
              <Button variant="ghost" onClick={handleSkip}>
                Skip calibration (use defaults)
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Check mic */}
        {step === "check-mic" && (
          <Card className="flex flex-col gap-4">
            <LevelMeter
              level={audioState.levels.rms}
              peak={audioState.levels.peak}
              showDb={isRunning}
              dbFS={audioState.levels.dbFS}
            />
            {!isRunning ? (
              <Button onClick={() => start()}>Connect Microphone</Button>
            ) : (
              <div className="flex gap-3">
                <Button onClick={advance} disabled={!isRunning}>
                  Mic sounds good
                </Button>
                <Button variant="ghost" onClick={stop}>
                  Disconnect
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Step: Noise floor */}
        {step === "noise-floor" && (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>Measuring noise floor...</span>
                <span>{Math.round(noiseProgress * 100)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-150"
                  style={{ width: `${noiseProgress * 100}%` }}
                />
              </div>
            </div>
            <LevelMeter level={audioState.levels.rms} peak={audioState.levels.peak} />
            {noiseRef.current.isComplete && (
              <p className="text-sm text-[var(--success)]">
                Noise floor: {noiseRef.current.getNoiseFloor().toFixed(5)} RMS.
                Amplitude threshold set to {noiseRef.current.getAmplitudeThreshold().toFixed(4)}.
              </p>
            )}
          </Card>
        )}

        {/* Steps: Play 1, 4, 5 */}
        {isPlayStep(step) && currentDegree !== null && (
          <Card className="flex flex-col gap-5">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Target */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Target</span>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent)]/10 ring-4 ring-[var(--accent)]/30">
                  <div>
                    <span className="text-4xl font-bold text-[var(--accent)]">
                      {scale.find((s) => s.degree === currentDegree)?.note}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  Degree {currentDegree}
                </span>
              </div>

              {/* Live detection */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Detected</span>
                <PitchDisplay pitch={pitchState.currentPitch} />
              </div>
            </div>

            {/* Sample progress */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">
                  Samples collected
                </span>
                <span className="font-mono">
                  {collectorsRef.current.get(currentDegree)?.sampleCount ?? 0} / 8
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    completedSamples[currentDegree]
                      ? "bg-[var(--success)]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{
                    width: `${(collectorProgress[currentDegree] ?? 0) * 100}%`,
                  }}
                />
              </div>
            </div>

            <LevelMeter level={audioState.levels.rms} peak={audioState.levels.peak} />

            {/* Completed sample stats */}
            {completedSamples[currentDegree] && (
              <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-sm">
                <p className="mb-1 font-medium text-[var(--success)]">
                  Degree {currentDegree} captured
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--text-secondary)]">
                  <span>Center frequency:</span>
                  <span className="font-mono">{completedSamples[currentDegree]!.centerFrequency.toFixed(1)} Hz</span>
                  <span>Std deviation:</span>
                  <span className="font-mono">{completedSamples[currentDegree]!.standardDeviation.toFixed(2)} Hz</span>
                  <span>Tolerance window:</span>
                  <span className="font-mono">±{completedSamples[currentDegree]!.centsWindow.toFixed(0)}¢</span>
                  <span>Frequency range:</span>
                  <span className="font-mono">
                    {completedSamples[currentDegree]!.lowFrequency.toFixed(1)} – {completedSamples[currentDegree]!.highFrequency.toFixed(1)} Hz
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={advance}
                disabled={!completedSamples[currentDegree]}
              >
                {completedSamples[currentDegree] ? "Next" : "Collecting samples..."}
              </Button>
              <Button variant="ghost" onClick={retryDegree}>
                Retry this note
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <Card className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold">Calibration Summary</h2>

            <div className="flex flex-col gap-3">
              {[1, 4, 5].map((degree) => {
                const sample = completedSamples[degree];
                const note = scale.find((s) => s.degree === degree)?.note;
                return (
                  <div
                    key={degree}
                    className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10">
                        <span className="text-lg font-bold text-[var(--accent)]">{degree}</span>
                      </div>
                      <div>
                        <div className="font-medium">{note}</div>
                        {sample && (
                          <div className="text-xs text-[var(--text-secondary)]">
                            {sample.centerFrequency.toFixed(1)} Hz ± {sample.centsWindow.toFixed(0)}¢
                            ({sample.sampleCount} samples)
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge
                      variant={sample ? "success" : "warning"}
                      label={sample ? "Calibrated" : "Using defaults"}
                    />
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
              <p>Noise floor: {noiseRef.current.getNoiseFloor().toFixed(5)} RMS</p>
              <p>Amplitude threshold: {noiseRef.current.getAmplitudeThreshold().toFixed(4)}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={!allDegreesComplete}>
                Save Calibration
              </Button>
              {!allDegreesComplete && (
                <Button variant="secondary" onClick={handleSave}>
                  Save partial (defaults for missing)
                </Button>
              )}
              <Button variant="ghost" onClick={handleReset}>
                Start Over
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <Card className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-lg font-medium">
              Calibration saved for key of {settings.harmonicaKey}
            </p>
            <div className="flex gap-3">
              <Link href="/learn">
                <Button>Start Learning</Button>
              </Link>
              <Link href="/control">
                <Button variant="secondary">Control Mode</Button>
              </Link>
              <Button variant="ghost" onClick={handleReset}>
                Recalibrate
              </Button>
            </div>
          </Card>
        )}

        {/* Always visible: skip and reset options */}
        {step !== "complete" && step !== "select-key" && (
          <div className="flex justify-between text-sm">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Start over
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip (use defaults)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
