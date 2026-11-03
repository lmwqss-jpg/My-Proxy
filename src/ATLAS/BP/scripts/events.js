/** World event wiring: spawn, menu access, combat stats and death points. */

import { system, world } from "@minecraft/server";
import {
  addCombatHistory,
  clearSettingsCache,
  getCombatStats,
  getSettings,
  getWaypoints,
  hasWelcomed,
  markWelcomed,
  saveCombatStats,
  saveWaypoints,
} from "./store.js";
import { ensureMenuItem } from "./items.js";
import { openMenu } from "./menu.js";
import {
  clearLowHealthState,
  forgetHudState,
  updateHud,
} from "./hud.js";
import {
  forgetLocatorState,
  syncAllLocators,
  syncLocator,
} from "./locator.js";
import { t } from "./i18n.js";
import { MENU_ITEM_ID } from "./config.js";
import { upsertDeathWaypoint } from "./waypoints.js";
import { initInputTracking, forgetInputState } from "./input.js";

function guarded(name, callback) {
  return (...args) => {
    try {
      callback(...args);
    } catch (error) {
      console.warn(`[ATLAS] ${name} event failed: ${error}`);
    }
  };
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
  getSettings(player);
  clearLowHealthState(player.id);
  system.runTimeout(() => {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const firstTime = !hasWelcomed(player);
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
  }
}

function handleItemUse(event) {
  if (event.itemStack?.typeId !== MENU_ITEM_ID) return;
  openMenu(event.source);
}

function handleScriptEvent(event) {
  if (event.id !== "atlas:menu") return;
  const source = event.sourceEntity;
  if (source && source.typeId === "minecraft:player") {
    openMenu(source);
  }
}

export function initEvents() {
  initInputTracking();
  world.afterEvents.worldLoad.subscribe(
    guarded("worldLoad", () => {
      // Safe point for world storage and player queries in Script API v2.
      getWaypoints();
      syncAllLocators();
      for (const player of world.getPlayers()) updateHud(player, true);
    }),
  );
  world.afterEvents.playerSpawn.subscribe(guarded("playerSpawn", handleSpawn));
  world.afterEvents.playerLeave.subscribe(
    guarded("playerLeave", (event) => {
      clearSettingsCache(event.playerId);
      forgetHudState(event.playerId);
      forgetInputState(event.playerId);
      forgetLocatorState(event.playerId);
    }),
  );
  world.afterEvents.itemUse.subscribe(guarded("itemUse", handleItemUse));
  world.afterEvents.entityDie.subscribe(guarded("entityDie", handleDeath));
  world.afterEvents.entityHurt.subscribe(guarded("entityHurt", handleHurt));
  world.afterEvents.playerInventoryItemChange.subscribe(
    guarded("playerInventoryItemChange", (event) => {
      if (event.player?.isValid) updateHud(event.player);
    }),
  );
  world.afterEvents.playerDimensionChange.subscribe(
    guarded("playerDimensionChange", (event) => {
      syncLocator(event.player);
      updateHud(event.player, true);
    }),
  );
  system.afterEvents.scriptEventReceive.subscribe(
    guarded("scriptEventReceive", handleScriptEvent),
  );
}
