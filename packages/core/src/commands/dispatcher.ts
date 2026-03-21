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

export type TauriDispatcherCallbacks = {
  onFire?: (action: KeyAction) => void;
  onError?: (action: KeyAction, error: string) => void;
  onRateLimited?: (action: KeyAction) => void;
};

export class TauriDispatcher implements CommandDispatcher {
  private invoke: TauriInvoke;
  private callbacks: TauriDispatcherCallbacks;

  constructor(invoke: TauriInvoke, callbacks: TauriDispatcherCallbacks = {}) {
    this.invoke = invoke;
    this.callbacks = callbacks;
  }

  fire(action: KeyAction): void {
    this.invoke("inject_key", { key: action })
      .then(() => {
        this.callbacks.onFire?.(action);
      })
      .catch((err: unknown) => {
        const msg = String(err);
        if (msg.includes("Rate limited")) {
          this.callbacks.onRateLimited?.(action);
        } else {
          this.callbacks.onError?.(action, msg);
        }
      });
  }

  async arm(): Promise<boolean> {
    const result = await this.invoke("set_armed", { armed: true });
    return result as boolean;
  }

  async disarm(): Promise<boolean> {
    const result = await this.invoke("set_armed", { armed: false });
    return result as boolean;
  }

  async isArmed(): Promise<boolean> {
    const result = await this.invoke("is_armed");
    return result as boolean;
  }

  async getFireCount(): Promise<number> {
    const result = await this.invoke("get_fire_count");
    return result as number;
  }

  async resetFireCount(): Promise<void> {
    await this.invoke("reset_fire_count");
  }
}
