"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LevelMeter } from "@/components/audio/level-meter";
import { useMicrophone } from "@/hooks/use-microphone";
import type { MicrophoneStatus } from "@/types/audio";

const STATUS_MAP: Record<
  MicrophoneStatus,
  { variant: "success" | "warning" | "error" | "info" | "idle"; label: string }
> = {
  idle: { variant: "idle", label: "Not connected" },
  requesting: { variant: "info", label: "Requesting access..." },
  active: { variant: "success", label: "Microphone active" },
  denied: { variant: "error", label: "Permission denied" },
  error: { variant: "error", label: "Microphone error" },
};

export default function SetupPage() {
  const { status, start, stop } = useMicrophone();
  const statusInfo = STATUS_MAP[status];

  return (
    <div>
      <PageHeader
        title="Microphone Setup"
        description="HarmonicaOS needs access to your microphone to hear you play."
      />

      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Microphone Status</h2>
          <StatusBadge
            variant={statusInfo.variant}
            label={statusInfo.label}
            pulse={status === "requesting"}
          />
        </div>

        <LevelMeter level={status === "active" ? 0 : 0} />

        <div className="flex gap-3">
          {status !== "active" ? (
            <Button onClick={start} disabled={status === "requesting"}>
              {status === "idle" ? "Connect Microphone" : "Retry"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={stop}>
              Disconnect
            </Button>
          )}
        </div>

        {status === "denied" && (
          <p className="text-sm text-[var(--error)]">
            Microphone access was denied. Please allow microphone access in your
            browser settings and reload the page.
          </p>
        )}

        {status === "active" && (
          <p className="text-sm text-[var(--success)]">
            Microphone is working. Try making some noise — you should see the
            level meter respond. When ready, proceed to harmonica selection.
          </p>
        )}
      </Card>
    </div>
  );
}
