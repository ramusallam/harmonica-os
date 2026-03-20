"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { KeySelector } from "@/components/harmonica/key-selector";
import { useSettings } from "@/hooks/use-settings";
import type { NoteName } from "@harmonica-os/core";
import { clearAll } from "@/lib/storage/local-storage";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure HarmonicaOS to match your setup and preferences."
      />

      <div className="flex flex-col gap-6">
        {/* Harmonica */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Harmonica</h2>
          <div className="flex flex-col gap-4">
            <KeySelector
              value={settings.harmonicaKey}
              onChange={(key: NoteName) => updateSettings({ harmonicaKey: key })}
            />
            <div className="flex flex-col gap-2">
              <label
                htmlFor="tuning-standard"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Tuning standard (A4 Hz)
              </label>
              <input
                id="tuning-standard"
                type="number"
                min={400}
                max={480}
                step={1}
                value={settings.tuningStandard}
                onChange={(e) =>
                  updateSettings({ tuningStandard: Number(e.target.value) })
                }
                className="w-32 rounded-lg border border-white/10 bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </Card>

        {/* Detection */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Detection Sensitivity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-secondary)]">
                Min amplitude
              </label>
              <input
                type="range"
                min={0.005}
                max={0.1}
                step={0.005}
                value={settings.gateConfig.minAmplitude}
                onChange={(e) =>
                  updateSettings({
                    gateConfig: {
                      ...settings.gateConfig,
                      minAmplitude: Number(e.target.value),
                    },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {settings.gateConfig.minAmplitude}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-secondary)]">
                Min note duration (ms)
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={settings.gateConfig.minNoteDurationMs}
                onChange={(e) =>
                  updateSettings({
                    gateConfig: {
                      ...settings.gateConfig,
                      minNoteDurationMs: Number(e.target.value),
                    },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {settings.gateConfig.minNoteDurationMs} ms
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-secondary)]">
                Cents threshold
              </label>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={settings.gateConfig.centsThreshold}
                onChange={(e) =>
                  updateSettings({
                    gateConfig: {
                      ...settings.gateConfig,
                      centsThreshold: Number(e.target.value),
                    },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                ±{settings.gateConfig.centsThreshold}¢
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-secondary)]">
                Silence gap (ms)
              </label>
              <input
                type="range"
                min={50}
                max={300}
                step={25}
                value={settings.gateConfig.silenceGapMs}
                onChange={(e) =>
                  updateSettings({
                    gateConfig: {
                      ...settings.gateConfig,
                      silenceGapMs: Number(e.target.value),
                    },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {settings.gateConfig.silenceGapMs} ms
              </span>
            </div>
          </div>
        </Card>

        {/* Accessibility */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Accessibility</h2>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.ui.highContrast}
                onChange={(e) =>
                  updateSettings({
                    ui: { ...settings.ui, highContrast: e.target.checked },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-sm">High contrast mode</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.ui.reducedMotion}
                onChange={(e) =>
                  updateSettings({
                    ui: { ...settings.ui, reducedMotion: e.target.checked },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <span className="text-sm">Reduced motion</span>
            </label>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[var(--text-secondary)]">
                Font size
              </label>
              <select
                value={settings.ui.fontSize}
                onChange={(e) =>
                  updateSettings({
                    ui: {
                      ...settings.ui,
                      fontSize: e.target.value as "normal" | "large" | "xl",
                    },
                  })
                }
                className="w-40 rounded-lg border border-white/10 bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-[var(--error)]/30">
          <h2 className="mb-4 text-lg font-semibold text-[var(--error)]">
            Reset
          </h2>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Clear all saved settings and calibration data.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Reset all settings and calibration data?")) {
                clearAll();
                window.location.reload();
              }
            }}
          >
            Reset Everything
          </Button>
        </Card>
      </div>
    </div>
  );
}
