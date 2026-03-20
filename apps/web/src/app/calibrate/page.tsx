"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import {
  getStepInstruction,
  getStepIndex,
  getNextStep,
  getTotalSteps,
} from "@/lib/calibration/calibration";
import type { CalibrationStep } from "@/types/calibration";
import Link from "next/link";

export default function CalibratePage() {
  const [step, setStep] = useState<CalibrationStep>("check-mic");
  const instruction = getStepInstruction(step);
  const stepIndex = getStepIndex(step);
  const totalSteps = getTotalSteps();
  const isComplete = step === "complete";

  function advance() {
    const next = getNextStep(step);
    if (next) setStep(next);
  }

  return (
    <div>
      <PageHeader
        title="Calibration"
        description="We'll tune the system to your specific harmonica and environment."
      />

      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Step {stepIndex + 1} of {totalSteps}
          </h2>
          <StatusBadge
            variant={isComplete ? "success" : "info"}
            label={isComplete ? "Complete" : "In progress"}
          />
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
            }}
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          />
        </div>

        <p className="text-lg">{instruction}</p>

        {!isComplete && <LevelMeter level={0} label="Microphone input level" />}

        <div className="flex gap-3">
          {isComplete ? (
            <Link href="/learn">
              <Button>Start Learning</Button>
            </Link>
          ) : (
            <>
              <Button onClick={advance}>
                {step === "check-mic" ? "Mic sounds good" : "Next Step"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep("check-mic")}
              >
                Start Over
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
