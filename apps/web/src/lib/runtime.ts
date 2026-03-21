// Runtime environment detection for web vs Tauri

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

export async function getTauriInvoke(): Promise<
  ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null
> {
  if (!isTauri()) return null;
  try {
    // Dynamic import — only resolves when running inside Tauri.
    // The @tauri-apps/api package is injected by the Tauri runtime,
    // not bundled by Next.js, so we use a string variable to prevent
    // webpack from trying to resolve it at build time.
    const tauriModule = "@tauri-apps/api/core";
    const mod = await (Function(`return import("${tauriModule}")`)() as Promise<{ invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }>);
    return mod.invoke;
  } catch {
    return null;
  }
}
