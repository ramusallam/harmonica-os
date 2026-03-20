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
