import {
  mapNoteToScaleDegree,
  DEFAULT_COMMAND_MAP,
  degreeToAction,
  WebDispatcher,
} from "@harmonica-os/core";
import type { NoteName, CommandMap, CommandDispatcher } from "@harmonica-os/core";
import type { PitchDetectionResult } from "@/types/pitch";
import type { CommandEvent } from "@/types/commands";

export type CommandEngineConfig = {
  harmonicaKey: NoteName;
  commandMap: CommandMap[];
  dispatcher: CommandDispatcher;
  onCommand?: (event: CommandEvent) => void;
};

export function createCommandEngine(config: CommandEngineConfig) {
  const { harmonicaKey, commandMap, dispatcher, onCommand } = config;

  return {
    process(pitch: PitchDetectionResult): CommandEvent | null {
      const degree = mapNoteToScaleDegree(pitch.note, harmonicaKey);
      if (degree === null) return null;

      const action = degreeToAction(degree, commandMap);
      if (action === null) return null;

      dispatcher.fire(action);

      const event: CommandEvent = {
        action,
        degree,
        confidence: pitch.confidence,
        timestamp: pitch.timestamp,
      };

      onCommand?.(event);
      return event;
    },
  };
}

export function createWebCommandEngine(
  harmonicaKey: NoteName,
  commandMap: CommandMap[] = DEFAULT_COMMAND_MAP,
  onCommand?: (event: CommandEvent) => void,
) {
  return createCommandEngine({
    harmonicaKey,
    commandMap,
    dispatcher: new WebDispatcher(),
    onCommand,
  });
}
