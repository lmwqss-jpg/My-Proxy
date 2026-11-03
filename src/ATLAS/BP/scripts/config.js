/**
 * Shared constants and defaults for ATLAS CLIENT.
 *
 * This module is intentionally free of Minecraft API imports so the
 * settings and data model can be tested with plain Node.js.
 */

export const ADDON_VERSION = "1.0.0";

export const MENU_ITEM_ID = "atlas:client_token";

/** Stable Minecraft Bedrock script modules used by the pack. */
export const SCRIPT_MODULES = Object.freeze({
  server: "2.11.0",
  serverUi: "2.3.0",
});

/** Product version this pack is built and tested against. */
export const TARGET_GAME_VERSION = Object.freeze([1, 26, 60]);

export const STORAGE_KEYS = Object.freeze({
  settings: "atlas:settings",
  waypoints: "atlas:waypoints",
  kills: "atlas:kills",
  deaths: "atlas:deaths",
  lastDeath: "atlas:last_death",
  welcomed: "atlas:welcomed",
});

export const LIMITS = Object.freeze({
  waypoints: 30,
  waypointNameLength: 40,
  historyEntries: 5,
  settingsCodeLength: 32,
});

export const DEATH_WAYPOINT_ID = "atlas_death";

export const THEME_IDS = Object.freeze(["atlas", "emerald", "violet", "ember"]);
export const LANGUAGE_IDS = Object.freeze(["en", "ar"]);

/**
 * Toggle paths are shared by the settings screen and the compact export code.
 * Order matters: changing the order changes codes, so bump the code version.
 */
export const TOGGLE_PATHS = Object.freeze([
  "hud.coords",
  "hud.health",
  "hud.name",
  "hud.worldInfo",
  "hud.dimension",
  "hud.compass",
  "hud.waypoint",
  "hud.precise",
  "hud.compact",
  "visual.playerInfo",
  "visual.worldInfo",
  "visual.healthBar",
  "visual.locator",
  "visual.stats",
  "pvp.showHealth",
  "pvp.lowHealthAlert",
  "pvp.alertSound",
  "pvp.alertTitle",
  "pvp.deathWaypoint",
  "waypoints.locatorAll",
]);

export const DEFAULT_SETTINGS = deepFreeze({
  version: 1,
  theme: "atlas",
  language: "en",
  hud: {
    coords: true,
    health: true,
    name: false,
    worldInfo: false,
    dimension: true,
    compass: true,
    waypoint: true,
    precise: false,
    compact: true,
    interval: 10,
  },
  visual: {
    playerInfo: false,
    worldInfo: false,
    healthBar: false,
    locator: true,
    stats: false,
  },
  pvp: {
    showHealth: false,
    lowHealthAlert: true,
    alertThreshold: 6,
    alertSound: true,
    alertTitle: true,
    deathWaypoint: true,
  },
  waypoints: {
    trackedId: null,
    locatorAll: true,
  },
});

export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
    Object.freeze(value);
  }
  return value;
}
