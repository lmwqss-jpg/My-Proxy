/**
 * ATLAS CLIENT script entry point.
 *
 * Loaded by the behavior-pack script module declared in manifest.json.
 * All APIs used here are stable @minecraft/server 2.11.0 /
 * @minecraft/server-ui 2.3.0 APIs; no experiments are required.
 */

import { system } from "@minecraft/server";
import { ADDON_VERSION, SCRIPT_MODULES, TARGET_GAME_VERSION } from "./config.js";
import { registerCommands } from "./commands.js";
import { initEvents } from "./events.js";
import { startHud } from "./hud.js";
import { syncAllLocators } from "./locator.js";

console.log(
  `[ATLAS] Scripts loaded: v${ADDON_VERSION} | target Minecraft ${TARGET_GAME_VERSION.join(".")} | server ${SCRIPT_MODULES.server} | ui ${SCRIPT_MODULES.serverUi}`,
);

try {
  registerCommands();
} catch (error) {
  console.warn(`[ATLAS] Command initialization failed: ${error}`);
}

try {
  initEvents();
} catch (error) {
  console.warn(`[ATLAS] Event initialization failed: ${error}`);
}

try {
  startHud();
  console.log("[ATLAS] HUD tick loop started.");
} catch (error) {
  console.warn(`[ATLAS] HUD loop failed to start: ${error}`);
}

// Script API v2 loads scripts during early execution, before world storage is
// readable. Never touch world/player data at module scope. The worldLoad event
// and this deferred fallback initialise storage after the world is ready.
try {
  system.runTimeout(() => {
    try {
      syncAllLocators();
    } catch (error) {
      console.warn(`[ATLAS] Locator-bar initialization failed: ${error}`);
    }
  }, 40);
} catch (error) {
  console.warn(`[ATLAS] Deferred initialization could not be scheduled: ${error}`);
}

console.log("[ATLAS] Boot sequence complete. Waiting for world load.");
