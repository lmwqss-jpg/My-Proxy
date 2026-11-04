/**
 * Official locator-bar integration. LocationWaypoint markers are supplied by
 * Minecraft's own locator bar; this module never modifies Ore UI.
 */

import * as mc from "@minecraft/server";
import { getSettings, getWaypoints } from "./store.js";
import { distance3 } from "./util.js";
import { getTheme } from "./themes.js";
import { findWaypoint } from "./waypoints.js";

const { world } = mc;

/**
 * The locator-bar API only exists in newer Script API versions. Access it
 * through the module namespace and build the texture selector lazily so an
 * older client cannot crash the whole script module while it is loading.
 */
function textureSelector() {
  const texture = mc.WaypointTexture?.Circle;
  if (!texture) return null;
  return Object.freeze({
    textureBoundsList: [{ lowerBound: 0, texture }],
  });
}

/** @type {Map<string, Map<string, any>>} */
const handlesByPlayer = new Map();
/** @type {Set<string>} */
const warnedPlayers = new Set();
let locatorUnsupported = false;

function handlesFor(playerId) {
  let map = handlesByPlayer.get(playerId);
  if (!map) {
    map = new Map();
    handlesByPlayer.set(playerId, map);
  }
  return map;
}

function removeHandle(handle) {
  try {
    handle.remove();
  } catch {
    // The waypoint may already be invalid after a dimension change or reload.
  }
}

function locatorBarOf(player) {
  try {
    const bar = player.locatorBar;
    if (!bar) return null;
    return bar;
  } catch {
    return null;
  }
}

export function isLocatorSupported(player) {
  if (locatorUnsupported) return false;
  if (typeof mc.LocationWaypoint !== "function" || !textureSelector()) return false;
  const bar = locatorBarOf(player);
  if (!bar) return false;
  try {
    return typeof bar.maxCount === "number" && bar.maxCount > 0;
  } catch {
    return false;
  }
}

/**
 * Recreates/updates this player's own waypoint markers. Only same-dimension
 * locations are added; other-dimension markers have no useful distance.
 */
export function syncLocator(player) {
  if (!player || !player.isValid) return false;
  if (typeof mc.LocationWaypoint !== "function") {
    locatorUnsupported = true;
    return false;
  }
  const selector = textureSelector();
  if (!selector) {
    locatorUnsupported = true;
    return false;
  }
  const bar = locatorBarOf(player);
  if (!bar) return false;
  const handles = handlesFor(player.id);

  let settings;
  let max = 0;
  try {
    settings = getSettings(player);
    max = bar.maxCount;
  } catch (error) {
    warnOnce(player, error);
    return false;
  }

  if (!settings.visual.locator || typeof max !== "number" || max <= 0) {
    for (const handle of handles.values()) removeHandle(handle);
    handles.clear();
    return true;
  }

  const trackedId = settings.waypoints.trackedId;
  let candidates = getWaypoints().filter(
    (waypoint) => waypoint.dimensionId === player.dimension.id,
  );
  if (!settings.waypoints.locatorAll) {
    candidates = candidates.filter((waypoint) => waypoint.id === trackedId);
  }

  const distanceOf = (waypoint) => distance3(player.location, waypoint);
  candidates.sort((a, b) => {
    if (a.id === trackedId) return -1;
    if (b.id === trackedId) return 1;
    return distanceOf(a) - distanceOf(b);
  });
  const desired = candidates.slice(0, max);
  const desiredIds = new Set(desired.map((waypoint) => waypoint.id));

  for (const [id, handle] of [...handles.entries()]) {
    if (desiredIds.has(id)) continue;
    removeHandle(handle);
    handles.delete(id);
  }

  const theme = getTheme(settings.theme);
  for (const waypoint of desired) {
    try {
      const dimension = player.dimension;
      const location = {
        dimension,
        x: waypoint.x,
        y: waypoint.y,
        z: waypoint.z,
      };
      let handle = handles.get(waypoint.id);
      if (!handle || !handle.isValid) {
        handle = new mc.LocationWaypoint(location, selector, { ...theme.RGB });
        handles.set(waypoint.id, handle);
      } else {
        handle.setDimensionLocation(location);
        handle.color = { ...theme.RGB };
      }
      handle.isEnabled = true;
      if (!bar.hasWaypoint(handle)) bar.addWaypoint(handle);
    } catch (error) {
      // A full locator bar, an invalid dimension or an unsupported client
      // should never prevent the rest of the add-on from working.
      warnOnce(player, error);
      if (String(error).toLowerCase().includes("unsupported")) {
        locatorUnsupported = true;
        break;
      }
    }
  }
  return true;
}

export function syncAllLocators() {
  for (const player of getPlayersSafe()) {
    try {
      syncLocator(player);
    } catch (error) {
      // One player's invalid dimension or stale handle must not stop the
      // remaining players from receiving their locator markers.
      warnOnce(player, error);
    }
  }
}

function getPlayersSafe() {
  try {
    return world.getPlayers();
  } catch {
    return [];
  }
}

export function forgetLocatorState(playerId) {
  const handles = handlesByPlayer.get(playerId);
  if (handles) {
    for (const handle of handles.values()) removeHandle(handle);
    handlesByPlayer.delete(playerId);
  }
  warnedPlayers.delete(playerId);
}

function warnOnce(player, error) {
  if (warnedPlayers.has(player.id)) return;
  warnedPlayers.add(player.id);
  console.warn(`[ATLAS] Locator bar error: ${error}`);
}
