"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { LevelMeter } from "@/components/audio/level-meter";
import { useSettings } from "@/hooks/use-settings";
import { getNotesForKey } from "@harmonica-os/core";

const TARGET_DEGREES = [1, 4, 5] as const;

export default function LearnPage() {
  const { settings } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);

  const scale = getNotesForKey(settings.harmonicaKey);
  const targetDegree = TARGET_DEGREES[targetIndex];
  const targetNote = scale.find((s) => s.degree === targetDegree);

  function nextTarget() {
    setTargetIndex((i) => (i + 1) % TARGET_DEGREES.length);
  }

  return (
    <div>
      <PageHeader
        title="Learn Mode"
        description={`Practice hitting the 1, 4, and 5 on your ${settings.harmonicaKey} harmonica.`}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Target */}
        <Card className="flex flex-col items-center gap-4">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            Play this note
          </h2>
          <div className="text-7xl font-bold text-[var(--accent)]">
            {targetNote?.note}
          </div>
          <div className="text-lg text-[var(--text-secondary)]">
            Scale degree {targetDegree}
          </div>
          <Button variant="ghost" onClick={nextTarget} size="sm">
            Skip to next
          </Button>
        </Card>

        {/* Detection */}
        <Card className="flex flex-col items-center gap-4">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            What we hear
          </h2>
          <PitchDisplay pitch={null} />
          <LevelMeter level={0} label="Input level" />
        </Card>

        {/* Controls */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Listening</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {isListening
                  ? "Play your harmonica — we're detecting notes in real time"
                  : "Click Start to begin pitch detection"}
              </p>
            </div>
            <Button
              variant={isListening ? "danger" : "primary"}
              onClick={() => setIsListening(!isListening)}
            >
              {isListening ? "Stop" : "Start"}
            </Button>
          </div>
        </Card>

        {/* Score placeholder */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm text-[var(--text-secondary)]">Hits</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm text-[var(--text-secondary)]">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">—</div>
              <div className="text-sm text-[var(--text-secondary)]">
                Accuracy
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
