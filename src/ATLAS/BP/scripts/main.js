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
import {
  initCompatibilityEngine,
  onWorldReadyFallback,
  recordEngineError,
} from "./compatibility.js";

console.log(
  `[ATLAS] Scripts loaded: v${ADDON_VERSION} | target Minecraft ${TARGET_GAME_VERSION.join(".")} | server ${SCRIPT_MODULES.server} | ui ${SCRIPT_MODULES.serverUi}`,
);

// The engine subscribes to nothing and reads no world data here; it only
// probes API presence. World checks run after worldLoad or the deferred fallback.
try {
  initCompatibilityEngine();
  console.log("[ATLAS] Compatibility engine initialized.");
} catch (error) {
  console.warn(`[ATLAS] Compatibility engine failed to initialize: ${error}`);
  recordEngineError("script", error);
}

try {
  registerCommands();
} catch (error) {
  console.warn(`[ATLAS] Command initialization failed: ${error}`);
  recordEngineError("script", error);
}

try {
  initEvents();
} catch (error) {
  console.warn(`[ATLAS] Event initialization failed: ${error}`);
  recordEngineError("event", error);
}

try {
  startHud();
  console.log("[ATLAS] HUD tick loop started.");
} catch (error) {
  console.warn(`[ATLAS] HUD loop failed to start: ${error}`);
  recordEngineError("script", error);
}

// Script API v2 loads scripts during early execution, before world storage is
// readable. Never touch world/player data at module scope. The worldLoad event
// and this deferred fallback initialise storage after the world is ready.
try {
  system.runTimeout(() => {
    try {
      // If this client never fires worldLoad, probe once here so diagnostics
      // still reports real world/API availability.
      onWorldReadyFallback();
      syncAllLocators();
    } catch (error) {
      console.warn(`[ATLAS] Deferred initialization failed: ${error}`);
      recordEngineError("script", error);
    }
  }, 40);
} catch (error) {
  console.warn(`[ATLAS] Deferred initialization could not be scheduled: ${error}`);
}

console.log("[ATLAS] Boot sequence complete. Waiting for world load.");
