/**
 * World event wiring: spawn, menu access, combat stats and death points.
 *
 * Each event is subscribed independently. If one event is unavailable on a
 * particular client/server build, the rest of the add-on (including the menu
 * item, /atlas and /atlas:menu) still initializes instead of aborting the module.
 */

import { system, world } from "@minecraft/server";
import {
  addCombatHistory,
  clearSettingsCache,
  getBootVersion,
  getCombatStats,
  getContainerLog,
  getSettings,
  getWaypoints,
  hasWelcomed,
  markBootVersion,
  markWelcomed,
  saveCombatStats,
  saveContainerLog,
  saveWaypoints,
} from "./store.js";
import { ensureMenuItem } from "./items.js";
import { openMenu } from "./menu.js";
import {
  clearLowHealthState,
  forgetHudState,
  updateHud,
  updateHudAfterInventoryChange,
} from "./hud.js";
import {
  forgetLocatorState,
  syncAllLocators,
  syncLocator,
} from "./locator.js";
import { t } from "./i18n.js";
import { ADDON_VERSION, MENU_ITEM_ID, MENU_SCRIPT_EVENT_ID } from "./config.js";
import { upsertDeathWaypoint } from "./waypoints.js";
import { initInputTracking, forgetInputState } from "./input.js";
import { isContainerBlock, recordContainer } from "./containers.js";
import {
  markFeatureSuccess,
  onPlayerDimensionChanged,
  onPlayerLeft,
  onPlayerSession,
  onWorldLoaded,
  recordEngineError,
} from "./compatibility.js";

let eventsInitialized = false;

function guarded(name, callback) {
  return (...args) => {
    try {
      callback(...args);
    } catch (error) {
      console.warn(`[ATLAS] ${name} event failed: ${error}`);
      recordEngineError("event", error);
    }
  };
}

function on(signal, name, callback) {
  try {
    if (!signal || typeof signal.subscribe !== "function") {
      console.warn(`[ATLAS] Event unavailable: ${name}`);
      return false;
    }
    signal.subscribe(guarded(name, callback));
    return true;
  } catch (error) {
    console.warn(`[ATLAS] Could not subscribe to ${name}: ${error}`);
    return false;
  }
}

function welcome(player) {
  const settings = getSettings(player);
  const language = settings.language;
  if (!hasWelcomed(player)) {
    markWelcomed(player);
    player.onScreenDisplay.setTitle("§b§lATLAS CLIENT", {
      subtitle: `§7${t(language, "welcome.subtitle")}`,
      fadeInDuration: 10,
      stayDuration: 70,
      fadeOutDuration: 10,
    });
    player.sendMessage(t(language, "welcome.chat1"));
    player.sendMessage(t(language, "welcome.chat2"));
  }
}

function handleSpawn(event) {
  const { player, initialSpawn } = event;
  if (!player.isValid) return;
  onPlayerSession(player, initialSpawn ? "join" : "respawn");
  getSettings(player);
  clearLowHealthState(player.id);
  system.runTimeout(() => {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const firstTime = !hasWelcomed(player);
    // Confirm a successful update once per add-on version. This makes a
    // missing/old pack visible in chat even when Content Log is closed.
    if (getBootVersion(player) !== ADDON_VERSION) {
      markBootVersion(player, ADDON_VERSION);
      player.sendMessage(t(language, "boot.running", { version: ADDON_VERSION }));
    }
    const itemState = ensureMenuItem(player);
    if (itemState === "given" && (initialSpawn || firstTime)) {
      player.sendMessage(t(language, "welcome.itemGiven"));
    } else if (itemState === "full" && (initialSpawn || firstTime)) {
      player.sendMessage(t(language, "welcome.inventoryFull"));
    } else if (itemState === "error" && firstTime) {
      player.sendMessage(t(language, "welcome.itemFailed"));
    }
    if (firstTime) welcome(player);
    syncLocator(player);
    updateHud(player, true);
  }, 30);
}

function handleDeath(event) {
  const dead = event.deadEntity;
  if (dead.typeId !== "minecraft:player") return;
  const player = dead;
  const dimensionId = player.dimension.id;
  const location = player.location;
  const deathLocation = {
    dimensionId,
    x: location.x,
    y: location.y,
    z: location.z,
  };

  const stats = getCombatStats(player);
  stats.deaths += 1;
  stats.lastDeath = deathLocation;
  addCombatHistory(stats, { type: "death" });
  saveCombatStats(player, stats);
  clearLowHealthState(player.id);

  const killerEntity = event.damageSource.damagingEntity;
  let killerName = null;
  if (
    killerEntity &&
    killerEntity.typeId === "minecraft:player" &&
    killerEntity.id !== player.id
  ) {
    killerName = killerEntity.name;
    const killerStats = getCombatStats(killerEntity);
    killerStats.kills += 1;
    addCombatHistory(killerStats, { type: "kill", name: player.name });
    saveCombatStats(killerEntity, killerStats);
    if (killerEntity.isValid) updateHud(killerEntity, true);
  }
  if (killerName) {
    const ownHistory = stats.history[stats.history.length - 1];
    if (ownHistory) ownHistory.name = killerName;
    saveCombatStats(player, stats);
  }

  const settings = getSettings(player);
  if (settings.pvp.deathWaypoint) {
    const result = upsertDeathWaypoint(getWaypoints(), deathLocation);
    if (result.waypoint) {
      saveWaypoints(result.list);
      syncAllLocators();
    }
  }
  // saveCombatStats records the combat success/error for this player.
  updateHud(player, true);
}

function handleHurt(event) {
  const hurt = event.hurtEntity;
  const damage = Number.isFinite(event.damage) ? event.damage : 0;
  if (damage <= 0) return;
  if (hurt.typeId === "minecraft:player") {
    getCombatStats(hurt).damageTaken += damage;
  }
  const attacker = event.damageSource.damagingEntity;
  if (attacker && attacker.typeId === "minecraft:player" && attacker.id !== hurt.id) {
    getCombatStats(attacker).damageDealt += damage;
    markFeatureSuccess(attacker, "combat", "damage");
  }
  if (hurt.typeId === "minecraft:player") {
    markFeatureSuccess(hurt, "combat", "damage");
  }
}

/**
 * ESPCHEST log. Only a real interaction with a container is recorded; this
 * never scans for hidden containers or reads contents through walls.
 */
function handleContainerOpen(event) {
  if (!event?.isFirstEvent) return;
  const block = event.block;
  const player = event.player;
  if (!block || !player?.isValid || !isContainerBlock(block.typeId)) return;
  const location = block.location;
  if (!location) return;
  let dimensionId = null;
  try {
    dimensionId = block.dimension?.id ?? player.dimension.id;
  } catch {
    return;
  }
  const result = recordContainer(getContainerLog(player), {
    typeId: block.typeId,
    dimensionId,
    x: location.x,
    y: location.y,
    z: location.z,
  });
  if (result.entry) {
    // saveContainerLog records success/error for the ESPCHEST feature.
    saveContainerLog(player, result.list);
  }
}

function handleItemUse(event) {
  if (event.itemStack?.typeId !== MENU_ITEM_ID) return;
  openMenu(event.source);
}

function handleScriptEvent(event) {
  if (event.id !== MENU_SCRIPT_EVENT_ID) return;
  const source = event.sourceEntity;
  if (source && source.typeId === "minecraft:player") {
    openMenu(source);
  }
}

export function initEvents() {
  if (eventsInitialized) return;
  eventsInitialized = true;

  try {
    initInputTracking();
  } catch (error) {
    console.warn(`[ATLAS] Input tracking failed to initialize: ${error}`);
    recordEngineError("event", error);
  }

  let count = 0;
  const track = (result) => {
    if (result) count += 1;
    return result;
  };

  track(
    on(world.afterEvents.worldLoad, "worldLoad", () => {
      // Safe point for world storage and player queries in Script API v2.
      onWorldLoaded();
      getWaypoints();
      syncAllLocators();
      for (const player of world.getPlayers()) updateHud(player, true);
      console.log("[ATLAS] World loaded; storage, locators and HUD initialized.");
    }),
  );
  track(on(world.afterEvents.playerSpawn, "playerSpawn", handleSpawn));
  track(
    on(world.afterEvents.playerLeave, "playerLeave", (event) => {
      clearSettingsCache(event.playerId);
      forgetHudState(event.playerId);
      forgetInputState(event.playerId);
      forgetLocatorState(event.playerId);
      onPlayerLeft(event.playerId);
    }),
  );
  track(on(world.afterEvents.itemUse, "itemUse", handleItemUse));
  track(on(world.afterEvents.playerInteractWithBlock, "playerInteractWithBlock", handleContainerOpen));
  track(on(world.afterEvents.entityDie, "entityDie", handleDeath));
  track(on(world.afterEvents.entityHurt, "entityHurt", handleHurt));
  track(
    on(world.afterEvents.playerInventoryItemChange, "playerInventoryItemChange", (event) => {
      // Rebuild immediately for the totem count, but coalesce rapid inventory
      // events so dragging stacks cannot force a rebuild every tick.
      if (event.player?.isValid) updateHudAfterInventoryChange(event.player);
    }),
  );
  track(
    on(world.afterEvents.playerDimensionChange, "playerDimensionChange", (event) => {
      onPlayerDimensionChanged(event.player);
      syncLocator(event.player);
      updateHud(event.player, true);
    }),
  );
  track(on(system.afterEvents.scriptEventReceive, "scriptEventReceive", handleScriptEvent));

  console.log(`[ATLAS] Event handlers registered: ${count}.`);
  if (count === 0) {
    console.warn("[ATLAS] No world events could be registered; the menu item may still work.");
  }
}
