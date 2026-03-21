import type { KeyAction } from "./command-mapper";

export interface CommandDispatcher {
  fire(action: KeyAction): void;
}

export class WebDispatcher implements CommandDispatcher {
  fire(action: KeyAction): void {
    const key = action === "Space" ? " " : action;
    const code = action === "Space" ? "Space" : action;

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        code,
        bubbles: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key,
        code,
        bubbles: true,
      }),
    );
  }
}

// Tauri IPC type — matches @tauri-apps/api invoke signature
type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

export class TauriDispatcher implements CommandDispatcher {
  private invoke: TauriInvoke;

  constructor(invoke: TauriInvoke) {
    this.invoke = invoke;
  }

  fire(action: KeyAction): void {
    this.invoke("inject_key", { key: action }).catch((err) => {
      console.error("[TauriDispatcher] inject_key failed:", err);
    });
  }
}
