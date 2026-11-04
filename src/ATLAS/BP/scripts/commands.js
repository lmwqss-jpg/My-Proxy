/**
 * Registers the ATLAS menu commands.
 *
 * Bedrock requires a namespace in `CustomCommand.name`, so `/atlas` cannot be
 * registered as-is. Minecraft automatically exposes the un-namespaced alias of
 * every custom command in chat, so `atlas:atlas` provides `/atlas` and
 * `atlas:menu` provides `/atlas:menu` plus `/menu`.
 *
 * Each name is registered independently: a collision, a missing registry or a
 * game build without custom commands disables only that entry point. The ATLAS
 * item and the optional `/scriptevent atlas:menu` path are unaffected.
 */

import {
  CommandPermissionLevel,
  CustomCommandStatus,
  system,
} from "@minecraft/server";
import { MENU_COMMANDS } from "./config.js";
import { openMenu } from "./menu.js";
import {
  markCommandRegistered,
  markCommandUnavailable,
  markFeatureSuccess,
  recordEngineError,
} from "./compatibility.js";

let subscribed = false;
let registrationAttempted = false;
/** @type {string[]} */
const registeredNames = [];

function playerFrom(origin) {
  const candidates = [origin?.sourceEntity, origin?.initiator];
  for (const entity of candidates) {
    try {
      if (entity?.typeId === "minecraft:player") return entity;
    } catch {
      // Entity handles can throw after a player leaves; try the next candidate.
    }
  }
  return null;
}

function runCommand(origin) {
  try {
    const player = playerFrom(origin);
    if (!player || player.isValid === false) {
      return {
        status: CustomCommandStatus.Failure,
        message: "Run this command in-game as a player.",
      };
    }
    // Command callbacks run in a read-only context; openMenu defers its form
    // work to the next tick with system.run. Reaching this point is a real
    // command execution, not just a successful registration.
    openMenu(player);
    markFeatureSuccess(null, "command", "menu command");
    return { status: CustomCommandStatus.Success };
  } catch (error) {
    console.warn(`[ATLAS] Menu command failed: ${error}`);
    recordEngineError("script", error);
    return {
      status: CustomCommandStatus.Failure,
      message: "ATLAS could not open its menu. Use the ATLAS item or check Content Log.",
    };
  }
}

function registerName(registry, entry) {
  try {
    registry.registerCommand(
      {
        name: entry.name,
        description: entry.primary
          ? "Open the ATLAS CLIENT menu."
          : "Open the ATLAS CLIENT menu (short /atlas form).",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
      },
      runCommand,
    );
    registeredNames.push(entry.name);
    console.log(
      `[ATLAS] Custom command /${entry.name} registered (no cheats required); chat alias /${entry.chatAlias}.`,
    );
    return true;
  } catch (error) {
    console.warn(
      `[ATLAS] Could not register /${entry.name} (chat alias /${entry.chatAlias}): ${error}`,
    );
    recordEngineError("script", error);
    return false;
  }
}

export function registerCommands() {
  if (subscribed) return;
  try {
    system.beforeEvents.startup.subscribe((event) => {
      if (registrationAttempted) return;
      registrationAttempted = true;
      try {
        const registry = event?.customCommandRegistry;
        if (!registry || typeof registry.registerCommand !== "function") {
          console.warn("[ATLAS] Custom command registry is unavailable on this game version.");
          markCommandUnavailable();
          return;
        }
        let registered = false;
        for (const entry of MENU_COMMANDS) {
          if (registerName(registry, entry)) registered = true;
        }
        if (registered) markCommandRegistered(registeredNames);
        else markCommandUnavailable();
      } catch (error) {
        // A registry getter or a future API shape change must not escape the
        // startup event; the item and scriptevent entry points stay usable.
        console.warn(`[ATLAS] Custom command setup failed: ${error}`);
        markCommandUnavailable();
        recordEngineError("script", error);
      }
    });
    subscribed = true;
  } catch (error) {
    // Startup is the only place where registration is allowed. If this game
    // build cannot subscribe, keep the item/scriptevent paths alive and report
    // the missing command instead of aborting the whole add-on.
    console.warn(`[ATLAS] Could not subscribe to the startup event: ${error}`);
    recordEngineError("script", error);
  }
}
