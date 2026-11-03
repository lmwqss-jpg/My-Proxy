/**
 * Persistence boundary. All dynamic-property access lives here so the rest of
 * the add-on can work with validated plain objects.
 */

import { world } from "@minecraft/server";
import { LIMITS, STORAGE_KEYS } from "./config.js";
import { normalizeSettings } from "./settings.js";
import { parseWaypoints, serializeWaypoints } from "./waypoints.js";
import { parseContainers, serializeContainers } from "./containers.js";

/** @type {Map<string, any>} */
const settingsCache = new Map();
/** @type {Map<string, any>} */
const combatCache = new Map();
/** @type {Map<string, any[]>} */
const containerCache = new Map();
/** @type {any[] | null} */
let waypointCache = null;
let waypointStorageWarned = false;

function parseJson(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getSettings(player) {
  // Return a fresh copy so a caller cannot mutate the cache before a save
  // succeeds. All callers save their changes explicitly.
  if (settingsCache.has(player.id)) return normalizeSettings(settingsCache.get(player.id));
  let stored = null;
  let readable = true;
  try {
    stored = parseJson(player.getDynamicProperty(STORAGE_KEYS.settings));
  } catch (error) {
    readable = false;
    console.warn(`[ATLAS] Could not read settings: ${error}`);
  }
  const settings = normalizeSettings(stored);
  // Do not cache defaults after an early-execution/unavailable read; a later
  // call must be allowed to load the player's real settings.
  if (readable) settingsCache.set(player.id, settings);
  return normalizeSettings(settings);
}

export function saveSettings(player, settings) {
  const normalized = normalizeSettings(settings);
  try {
    player.setDynamicProperty(STORAGE_KEYS.settings, JSON.stringify(normalized));
  } catch (error) {
    console.warn(`[ATLAS] Could not save settings: ${error}`);
    return false;
  }
  settingsCache.set(player.id, normalized);
  return true;
}

export function clearSettingsCache(playerId) {
  settingsCache.delete(playerId);
  combatCache.delete(playerId);
  containerCache.delete(playerId);
}

export function getWaypoints() {
  if (waypointCache) return waypointCache;
  let stored;
  try {
    stored = world.getDynamicProperty(STORAGE_KEYS.waypoints);
  } catch (error) {
    console.warn(`[ATLAS] Could not read waypoints: ${error}`);
    return [];
  }
  waypointCache = parseWaypoints(stored);
  return waypointCache;
}

export function saveWaypoints(list) {
  const normalized = parseWaypoints(list);
  try {
    world.setDynamicProperty(STORAGE_KEYS.waypoints, serializeWaypoints(normalized));
  } catch (error) {
    if (!waypointStorageWarned) {
      console.warn(`[ATLAS] Could not save waypoints: ${error}`);
      waypointStorageWarned = true;
    }
    return null;
  }
  waypointCache = normalized;
  return normalized;
}

/** Containers this player has actually opened/interacted with. */
export function getContainerLog(player) {
  if (containerCache.has(player.id)) return parseContainers(containerCache.get(player.id));
  let stored = null;
  let readable = true;
  try {
    stored = parseJson(player.getDynamicProperty(STORAGE_KEYS.containers));
  } catch (error) {
    readable = false;
    console.warn(`[ATLAS] Could not read container log: ${error}`);
  }
  const list = parseContainers(stored);
  if (readable) containerCache.set(player.id, list);
  return parseContainers(list);
}

export function saveContainerLog(player, list) {
  const normalized = parseContainers(list);
  try {
    player.setDynamicProperty(STORAGE_KEYS.containers, serializeContainers(normalized));
  } catch (error) {
    console.warn(`[ATLAS] Could not save container log: ${error}`);
    return null;
  }
  containerCache.set(player.id, normalized);
  return normalized;
}

export function emptyCombatStats() {
  return {
    kills: 0,
    deaths: 0,
    lastDeath: null,
    damageDealt: 0,
    damageTaken: 0,
    history: [],
  };
}

function normalizeLastDeath(raw) {
  if (!raw || typeof raw !== "object") return null;
  const { dimensionId, x, y, z } = raw;
  if (typeof dimensionId !== "string") return null;
  if (![x, y, z].every((value) => typeof value === "number" && Number.isFinite(value))) {
    return null;
  }
  return { dimensionId, x, y, z };
}

export function getCombatStats(player) {
  if (combatCache.has(player.id)) return combatCache.get(player.id);
  const stats = emptyCombatStats();
  let readable = true;
  try {
    const kills = player.getDynamicProperty(STORAGE_KEYS.kills);
    const deaths = player.getDynamicProperty(STORAGE_KEYS.deaths);
    const lastDeath = parseJson(player.getDynamicProperty(STORAGE_KEYS.lastDeath));
    if (typeof kills === "number" && Number.isFinite(kills) && kills >= 0) {
      stats.kills = Math.floor(kills);
    }
    if (typeof deaths === "number" && Number.isFinite(deaths) && deaths >= 0) {
      stats.deaths = Math.floor(deaths);
    }
    stats.lastDeath = normalizeLastDeath(lastDeath);
  } catch (error) {
    readable = false;
    console.warn(`[ATLAS] Could not read combat stats: ${error}`);
  }
  if (readable) combatCache.set(player.id, stats);
  return stats;
}

export function saveCombatStats(player, stats) {
  try {
    player.setDynamicProperty(STORAGE_KEYS.kills, Math.max(0, Math.floor(stats.kills)));
    player.setDynamicProperty(STORAGE_KEYS.deaths, Math.max(0, Math.floor(stats.deaths)));
    if (stats.lastDeath) {
      player.setDynamicProperty(STORAGE_KEYS.lastDeath, JSON.stringify(stats.lastDeath));
    } else {
      player.setDynamicProperty(STORAGE_KEYS.lastDeath, undefined);
    }
  } catch (error) {
    console.warn(`[ATLAS] Could not save combat stats: ${error}`);
    return false;
  }
  combatCache.set(player.id, stats);
  return true;
}

export function addCombatHistory(stats, entry) {
  stats.history.push(entry);
  while (stats.history.length > LIMITS.historyEntries) stats.history.shift();
  return stats;
}

export function resetCombatStats(player) {
  const stats = emptyCombatStats();
  combatCache.set(player.id, stats);
  try {
    player.setDynamicProperty(STORAGE_KEYS.kills, 0);
    player.setDynamicProperty(STORAGE_KEYS.deaths, 0);
    player.setDynamicProperty(STORAGE_KEYS.lastDeath, undefined);
  } catch (error) {
    console.warn(`[ATLAS] Could not reset combat stats: ${error}`);
    return false;
  }
  return true;
}

export function hasWelcomed(player) {
  try {
    return player.getDynamicProperty(STORAGE_KEYS.welcomed) === true;
  } catch {
    return false;
  }
}

export function markWelcomed(player) {
  try {
    player.setDynamicProperty(STORAGE_KEYS.welcomed, true);
  } catch (error) {
    console.warn(`[ATLAS] Could not store the welcome flag: ${error}`);
  }
}

/** Last add-on version that announced itself to this player. */
export function getBootVersion(player) {
  try {
    const value = player.getDynamicProperty(STORAGE_KEYS.bootVersion);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function markBootVersion(player, version) {
  try {
    player.setDynamicProperty(STORAGE_KEYS.bootVersion, version);
  } catch (error) {
    console.warn(`[ATLAS] Could not store the boot version: ${error}`);
  }
}
