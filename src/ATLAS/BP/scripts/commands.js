/** Registers the no-cheats /atlas:menu custom command. */

import {
  CommandPermissionLevel,
  CustomCommandStatus,
  system,
} from "@minecraft/server";
import { openMenu } from "./menu.js";
import {
  markCommandRegistered,
  markCommandUnavailable,
  recordEngineError,
} from "./compatibility.js";

let registered = false;

export function registerCommands() {
  if (registered) return;
  registered = true;
  system.beforeEvents.startup.subscribe((event) => {
    try {
      if (!event.customCommandRegistry) {
        console.warn("[ATLAS] Custom command registry is unavailable on this game version.");
        markCommandUnavailable();
        return;
      }
      event.customCommandRegistry.registerCommand(
        {
          name: "atlas:menu",
          description: "Open the ATLAS CLIENT menu.",
          permissionLevel: CommandPermissionLevel.Any,
          cheatsRequired: false,
        },
        (origin) => {
          const source = origin.sourceEntity;
          if (!source || source.typeId !== "minecraft:player") {
            return {
              status: CustomCommandStatus.Failure,
              message: "Run /atlas:menu in-game as a player.",
            };
          }
          // Command callbacks run in a read-only context. openMenu defers its
          // form work to the next tick with system.run.
          openMenu(source);
          return { status: CustomCommandStatus.Success };
        },
      );
      markCommandRegistered();
      console.log("[ATLAS] Custom command /atlas:menu registered (no cheats required).");
    } catch (error) {
      console.warn(`[ATLAS] Could not register /atlas:menu: ${error}`);
      markCommandUnavailable();
      recordEngineError("script", error);
    }
  });
}
