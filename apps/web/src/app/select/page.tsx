"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { KeySelector } from "@/components/harmonica/key-selector";
import { useSettings } from "@/hooks/use-settings";
import { getNotesForKey, type NoteName } from "@harmonica-os/core";
import Link from "next/link";

export default function SelectPage() {
  const { settings, updateSettings } = useSettings();
  const scale = getNotesForKey(settings.harmonicaKey);

  return (
    <div>
      <PageHeader
        title="Select Your Harmonica"
        description="Choose the key stamped on your diatonic harmonica."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <KeySelector
            value={settings.harmonicaKey}
            onChange={(key: NoteName) => updateSettings({ harmonicaKey: key })}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">
            Scale degrees for key of {settings.harmonicaKey}
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {scale.map((s) => {
              const isTarget = [1, 4, 5].includes(s.degree);
              return (
                <div
                  key={s.degree}
                  className={`flex flex-col items-center rounded-lg p-3 ${
                    isTarget
                      ? "border-2 border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border border-white/10 bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <span className="text-xs text-[var(--text-secondary)]">
                    {s.degree}
                  </span>
                  <span className="text-lg font-bold">{s.note}</span>
                  {isTarget && (
                    <span className="mt-1 text-xs text-[var(--accent)]">
                      {s.degree === 1 ? "→" : s.degree === 4 ? "␣" : "←"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Highlighted notes (1, 4, 5) are the ones that trigger commands.
          </p>
        </Card>

        <div className="flex justify-end">
          <Link href="/calibrate">
            <Button>Continue to Calibration</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
