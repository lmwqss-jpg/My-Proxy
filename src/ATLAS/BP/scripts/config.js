/**
 * Shared constants and defaults for ATLAS CLIENT.
 *
 * This module is intentionally free of Minecraft API imports so the
 * settings and data model can be tested with plain Node.js.
 */

export const ADDON_VERSION = "1.7.0";

export const MENU_ITEM_ID = "atlas:client_token";

/**
 * Custom menu commands.
 *
 * Bedrock requires a namespace in `CustomCommand.name`, so `/atlas` cannot be
 * registered directly. Minecraft automatically exposes the un-namespaced
 * alias of every custom command in chat, which means:
 *
 *   atlas:menu  -> /atlas:menu  and /menu
 *   atlas:atlas -> /atlas:atlas and /atlas
 *
 * The second name exists so the short `/atlas` form players actually type is
 * registered. `atlas:menu` stays the canonical, documented command.
 */
export const MENU_COMMANDS = Object.freeze([
  Object.freeze({ name: "atlas:menu", chatAlias: "menu", primary: true }),
  Object.freeze({ name: "atlas:atlas", chatAlias: "atlas", primary: false }),
]);

/** Cheats-only fallback handled by events.js; not a replacement for the command. */
export const MENU_SCRIPT_EVENT_ID = "atlas:menu";

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
  bootVersion: "atlas:boot_version",
  containers: "atlas:containers",
  servers: "atlas:servers",
  serverTarget: "atlas:server_target",
});

export const LIMITS = Object.freeze({
  waypoints: 30,
  waypointNameLength: 40,
  historyEntries: 5,
  containers: 20,
  settingsCodeLength: 32,
  servers: 40,
  serverNameLength: 32,
  serverDescriptionLength: 80,
});

export const DEATH_WAYPOINT_ID = "atlas_death";

export const THEME_IDS = Object.freeze(["atlas", "emerald", "violet", "ember"]);
export const LANGUAGE_IDS = Object.freeze(["en", "ar"]);
/**
 * Server entries are an address book only. The stable Script API has no
 * networking and cannot start or observe a connection, so these values never
 * trigger a fake connect action.
 */
export const DEFAULT_SERVER_PORT = 19132;
export const SERVER_CATEGORIES = Object.freeze([
  "public",
  "private",
  "friends",
  "realm",
  "dedicated",
  "other",
]);
export const SERVER_REGIONS = Object.freeze(["eu", "asia", "na", "sa", "me", "other"]);

export const HUD_COLOR_IDS = Object.freeze([
  "theme",
  "white",
  "gray",
  "green",
  "yellow",
  "red",
  "blue",
]);

/**
 * Armor slots shown in the text HUD. Minecraft's Script API does not expose a
 * way to draw item icons in the action bar, so each piece gets a short label.
 */
export const ARMOR_PIECES = Object.freeze([
  Object.freeze({ key: "helmet", label: "H", toggle: "hud.armorHelmet", nameKey: "hud.piece.helmet" }),
  Object.freeze({ key: "chest", label: "C", toggle: "hud.armorChest", nameKey: "hud.piece.chest" }),
  Object.freeze({ key: "legs", label: "L", toggle: "hud.armorLegs", nameKey: "hud.piece.legs" }),
  Object.freeze({ key: "boots", label: "B", toggle: "hud.armorBoots", nameKey: "hud.piece.boots" }),
]);

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
  // Appended after the original 20 toggles so legacy ATLAS1 codes keep
  // pointing at the same bits.
  "hud.wasd",
  "hud.cps",
  "hud.clickIndicators",
  "hud.armor",
  "hud.armorHelmet",
  "hud.armorChest",
  "hud.armorLegs",
  "hud.armorBoots",
  "hud.potions",
  "hud.totems",
  "hud.armorDetail",
  "hud.durabilityAlert",
  "hud.durabilitySound",
  // Appended again for 1.3.0 so existing ATLAS2 codes keep the same bit
  // positions. New toggles start off when an older code is imported.
  "hud.session",
]);

export const DEFAULT_SETTINGS = deepFreeze({
  version: 2,
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
    interval: 5,
    // Live panels. The action bar is the only persistent HUD surface that
    // official add-ons can draw into.
    wasd: true,
    cps: true,
    clickIndicators: true,
    armor: true,
    armorHelmet: true,
    armorChest: true,
    armorLegs: true,
    armorBoots: true,
    potions: true,
    totems: true,
    armorDetail: false,
    durabilityAlert: true,
    durabilityThreshold: 20,
    durabilitySound: true,
    // Opt-in so importing an older ATLAS2/ATLAS1 code cannot silently change
    // how much text the action bar has to render.
    session: false,
    color: "theme",
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
