"use client";

import { useState, useCallback, useEffect } from "react";
import type { AppSettings } from "@/types/app";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage/local-storage";

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettingsState(loadSettings());
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}
