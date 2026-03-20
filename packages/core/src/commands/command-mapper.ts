export type KeyAction = "ArrowRight" | "ArrowLeft" | "Space";

export type CommandMap = {
  degree: number;
  action: KeyAction;
  label: string;
};

export const DEFAULT_COMMAND_MAP: CommandMap[] = [
  { degree: 1, action: "ArrowRight", label: "Right Arrow" },
  { degree: 4, action: "Space", label: "Spacebar" },
  { degree: 5, action: "ArrowLeft", label: "Left Arrow" },
];

export function degreeToAction(
  degree: number,
  commandMap: CommandMap[] = DEFAULT_COMMAND_MAP,
): KeyAction | null {
  const match = commandMap.find((c) => c.degree === degree);
  return match ? match.action : null;
}
