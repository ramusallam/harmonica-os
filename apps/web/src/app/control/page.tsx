"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PitchDisplay } from "@/components/harmonica/pitch-display";
import { CommandLog } from "@/components/harmonica/command-log";
import { LevelMeter } from "@/components/audio/level-meter";
import { useSettings } from "@/hooks/use-settings";
import { DEFAULT_COMMAND_MAP } from "@harmonica-os/core";
import type { CommandEvent } from "@/types/commands";

export default function ControlPage() {
  const { settings } = useSettings();
  const [isActive, setIsActive] = useState(false);
  const [commandHistory] = useState<CommandEvent[]>([]);

  return (
    <div>
      <PageHeader
        title="Control Mode"
        description="Your harmonica becomes a controller. Notes trigger keyboard commands."
      />

      <div className="flex flex-col gap-6">
        {/* Status bar */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge
              variant={isActive ? "success" : "idle"}
              label={isActive ? "Listening" : "Paused"}
              pulse={isActive}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Key of {settings.harmonicaKey}
            </span>
          </div>
          <Button
            variant={isActive ? "danger" : "primary"}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? "Stop" : "Start Controlling"}
          </Button>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Live detection */}
          <Card className="flex flex-col items-center gap-4">
            <h2 className="text-sm font-medium text-[var(--text-secondary)]">
              Detected Note
            </h2>
            <PitchDisplay pitch={null} />
            <LevelMeter level={0} />
          </Card>

          {/* Command mapping reference */}
          <Card>
            <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
              Active Mappings
            </h2>
            <div className="flex flex-col gap-2">
              {DEFAULT_COMMAND_MAP.map((cmd) => (
                <div
                  key={cmd.degree}
                  className="flex items-center justify-between rounded-md bg-[var(--bg-tertiary)] px-3 py-2"
                >
                  <span className="font-mono text-lg font-bold">
                    {cmd.degree}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {cmd.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Command log */}
        <Card>
          <CommandLog events={commandHistory} />
        </Card>

        {/* Web limitation notice */}
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Web mode: commands fire within this page only. For OS-level control,
          use the desktop app.
        </p>
      </div>
    </div>
  );
}
