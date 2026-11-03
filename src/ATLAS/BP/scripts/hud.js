/** Runtime HUD loop and low-health alert. */

import { system, world } from "@minecraft/server";
import { getCombatStats, getSettings, getWaypoints } from "./store.js";
import { findWaypoint, waypointDisplayName } from "./waypoints.js";
import { t } from "./i18n.js";
import {
  buildHudPreview,
  buildHudSegments,
  trackedWaypointSnapshot,
} from "./hudFormat.js";

/** @type {Map<string, number>} */
const lastUpdate = new Map();
/** @type {Map<string, boolean>} */
const lowHealthState = new Map();
/** @type {Set<string>} */
const warnedPlayers = new Set();

function healthOf(player) {
  try {
    const health = player.getComponent("minecraft:health");
    if (!health) return { current: 0, max: 20 };
    return {
      current: Math.max(0, health.currentValue),
      max: Math.max(1, health.effectiveMax || health.defaultValue || 20),
    };
  } catch {
    return { current: 0, max: 20 };
  }
}

export function collectSnapshot(player) {
  const settings = getSettings(player);
  const health = healthOf(player);
  const stats = getCombatStats(player);
  const trackedId = settings.waypoints.trackedId;
  const tracked = trackedId ? findWaypoint(getWaypoints(), trackedId) : null;
  const displayName = tracked
    ? waypointDisplayName(tracked, t, settings.language)
    : null;
  const trackedSnapshot = tracked
    ? trackedWaypointSnapshot(
        player.location,
        player.dimension.id,
        tracked,
        displayName,
      )
    : null;

  return {
    name: player.name,
    health: health.current,
    maxHealth: health.max,
    location: { x: player.location.x, y: player.location.y, z: player.location.z },
    dimensionId: player.dimension.id,
    view: player.getViewDirection(),
    day: world.getDay(),
    timeOfDay: world.getTimeOfDay(),
    difficulty: world.getDifficulty(),
    playerCount: world.getPlayers().length,
    level: player.level,
    gameMode: player.getGameMode(),
    kills: stats.kills,
    deaths: stats.deaths,
    trackedWaypoint: trackedSnapshot,
  };
}

/**
 * Rebuilds the action-bar HUD for one player. Safe to call after any setting
 * or waypoint change; errors are logged once per player and never break the
 * tick loop.
 */
export function updateHud(player, force = false) {
  if (!player || !player.isValid) return false;
  try {
    const settings = getSettings(player);
    if (!force && settings.hud.interval > 0) {
      const previous = lastUpdate.get(player.id) ?? -10_000;
      if (system.currentTick - previous < settings.hud.interval) return false;
    }
    const snapshot = collectSnapshot(player);
    const segments = buildHudSegments(snapshot, settings, settings.theme);
    player.onScreenDisplay.setActionBar(segments.length > 0 ? segments.join("") : "");
    lastUpdate.set(player.id, system.currentTick);
    return true;
  } catch (error) {
    if (!warnedPlayers.has(player.id)) {
      warnedPlayers.add(player.id);
      console.warn(`[ATLAS] HUD update failed: ${error}`);
    }
    return false;
  }
}

export function getHudPreview(player) {
  try {
    const settings = getSettings(player);
    return buildHudPreview(collectSnapshot(player), settings, settings.theme);
  } catch {
    return "";
  }
}

function checkLowHealth(player, settings) {
  const { current } = healthOf(player);
  const threshold = settings.pvp.alertThreshold;
  const isLow = current > 0 && current <= threshold;
  const wasLow = lowHealthState.get(player.id) === true;
  if (!settings.pvp.lowHealthAlert) {
    lowHealthState.set(player.id, false);
    return;
  }
  if (isLow && !wasLow) {
    lowHealthState.set(player.id, true);
    try {
      if (settings.pvp.alertTitle) {
        player.onScreenDisplay.setTitle(
          `§c§l${t(settings.language, "pvp.lowHealth.title")}`,
          {
            subtitle: `§7${t(settings.language, "pvp.lowHealth.subtitle", {
              hp: Math.ceil(current),
            })}`,
            fadeInDuration: 5,
            stayDuration: 45,
            fadeOutDuration: 10,
          },
        );
      }
      if (settings.pvp.alertSound) {
        player.playSound("note.pling", { pitch: 0.8, volume: 0.9 });
      }
    } catch (error) {
      if (!warnedPlayers.has(player.id)) {
        warnedPlayers.add(player.id);
        console.warn(`[ATLAS] Low-health alert failed: ${error}`);
      }
    }
  } else if (!isLow) {
    lowHealthState.set(player.id, false);
  }
}

function tickPlayers() {
  let players;
  try {
    players = world.getPlayers();
  } catch {
    return;
  }
  for (const player of players) {
    if (!player.isValid) continue;
    try {
      const settings = getSettings(player);
      updateHud(player);
      checkLowHealth(player, settings);
    } catch (error) {
      if (!warnedPlayers.has(player.id)) {
        warnedPlayers.add(player.id);
        console.warn(`[ATLAS] HUD tick failed: ${error}`);
      }
    }
  }
}

export function startHud() {
  // Five ticks keeps low-health detection responsive while the configurable
  // HUD interval controls how often the action-bar text is rebuilt.
  system.runInterval(tickPlayers, 5);
}

export function forgetHudState(playerId) {
  lastUpdate.delete(playerId);
  lowHealthState.delete(playerId);
  warnedPlayers.delete(playerId);
}

export function clearLowHealthState(playerId) {
  lowHealthState.set(playerId, false);
}
