/** Pure HUD text composition. Kept separate from Minecraft runtime code. */

import { t } from "./i18n.js";
import { getTheme } from "./themes.js";
import {
  bearingBetween,
  bearingFromView,
  cardinalKey,
  distance3,
  formatCoord,
  formatDistance,
  formatKd,
  gameClock,
} from "./util.js";

const DIMENSION_KEYS = {
  overworld: "dim.overworld",
  "minecraft:overworld": "dim.overworld",
  nether: "dim.nether",
  "minecraft:nether": "dim.nether",
  the_end: "dim.theEnd",
  "minecraft:the_end": "dim.theEnd",
};

const DIFFICULTY_KEYS = {
  peaceful: "difficulty.peaceful",
  easy: "difficulty.easy",
  normal: "difficulty.normal",
  hard: "difficulty.hard",
};

const GAMEMODE_KEYS = {
  survival: "gamemode.survival",
  creative: "gamemode.creative",
  adventure: "gamemode.adventure",
  spectator: "gamemode.spectator",
};

export function dimensionLabel(dimensionId, language) {
  const key = DIMENSION_KEYS[String(dimensionId).toLowerCase()];
  return key ? t(language, key) : String(dimensionId);
}

export function difficultyLabel(value, language) {
  const key = DIFFICULTY_KEYS[String(value).toLowerCase()];
  return key ? t(language, key) : String(value);
}

export function gameModeLabel(value, language) {
  const key = GAMEMODE_KEYS[String(value).toLowerCase()];
  return key ? t(language, key) : String(value);
}

function healthColor(health, maxHealth) {
  const ratio = maxHealth > 0 ? health / maxHealth : 0;
  if (ratio > 0.6) return "§a";
  if (ratio > 0.3) return "§e";
  return "§c";
}

function healthBar(health, maxHealth) {
  const ratio = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;
  const filled = Math.round(ratio * 10);
  return `${healthColor(health, maxHealth)}[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
}

function healthValue(snapshot) {
  return `${Math.ceil(snapshot.health)}/${Math.ceil(snapshot.maxHealth)}`;
}

/**
 * Builds an array of colour-coded strings for Player.onScreenDisplay.
 * Returns an empty array when every HUD element is disabled.
 */
export function buildHudSegments(snapshot, settings, themeId) {
  const language = settings.language;
  const theme = getTheme(themeId);
  const elements = [];
  const separator = settings.hud.compact ? "§8|§r" : "§8 | §r";

  if (settings.hud.coords) {
    const x = formatCoord(snapshot.location.x, settings.hud.precise);
    const y = formatCoord(snapshot.location.y, settings.hud.precise);
    const z = formatCoord(snapshot.location.z, settings.hud.precise);
    elements.push(
      settings.hud.compact
        ? `§f${x} ${y} ${z}`
        : `§7${t(language, "common.coordinates")} §fX ${x} Y ${y} Z ${z}`,
    );
  }

  if (settings.hud.health) {
    const value = healthValue(snapshot);
    elements.push(
      settings.hud.compact
        ? `${healthColor(snapshot.health, snapshot.maxHealth)}${value}`
        : `§7${t(language, "hud.hp")} ${healthColor(snapshot.health, snapshot.maxHealth)}${value}`,
    );
  }

  if (settings.pvp.showHealth) {
    elements.push(
      `§cPvP ${healthColor(snapshot.health, snapshot.maxHealth)}${healthValue(snapshot)}`,
    );
  }

  if (settings.hud.name && snapshot.name) {
    elements.push(
      settings.hud.compact ? `§f${snapshot.name}` : `§7${t(language, "common.name")} §f${snapshot.name}`,
    );
  }

  if (settings.hud.worldInfo) {
    const clock = gameClock(snapshot.timeOfDay);
    elements.push(
      `§7${t(language, "common.day")} §f${snapshot.day} §8${clock.text}§r`,
    );
  }

  if (settings.hud.dimension) {
    const dimension = dimensionLabel(snapshot.dimensionId, language);
    elements.push(
      settings.hud.compact
        ? `§f${dimension}`
        : `§7${t(language, "common.dimension")} §f${dimension}`,
    );
  }

  if (settings.hud.compass) {
    const bearing = bearingFromView(snapshot.view);
    const direction = t(language, cardinalKey(bearing, true));
    elements.push(
      settings.hud.compact
        ? `${theme.bright}${direction}`
        : `§7${t(language, "hud.facing")} ${theme.bright}${direction}`,
    );
  }

  if (settings.hud.waypoint && snapshot.trackedWaypoint) {
    const tracked = snapshot.trackedWaypoint;
    if (tracked.sameDimension && tracked.distance !== null && tracked.bearing !== null) {
      const direction = t(language, cardinalKey(tracked.bearing, true));
      elements.push(
        `§7${tracked.name} §f${formatDistance(tracked.distance)}${t(language, "common.meters")} ${theme.bright}${direction}`,
      );
    } else {
      elements.push(`§7${tracked.name} §8(${t(language, "hud.other")})`);
    }
  }

  if (settings.visual.playerInfo) {
    elements.push(
      `§7${t(language, "common.level")} §f${snapshot.level} §8| §f${gameModeLabel(snapshot.gameMode, language)}`,
    );
  }

  if (settings.visual.worldInfo) {
    elements.push(
      `§7${t(language, "common.players")} §f${snapshot.playerCount} §8| §7${t(language, "common.difficulty")} §f${difficultyLabel(snapshot.difficulty, language)}`,
    );
  }

  if (settings.visual.healthBar) {
    elements.push(healthBar(snapshot.health, snapshot.maxHealth));
  }

  if (settings.visual.stats) {
    elements.push(
      `§7${t(language, "hud.kills")} §f${snapshot.kills} §7${t(language, "hud.deaths")} §f${snapshot.deaths} §7${t(language, "hud.kd")} §f${formatKd(snapshot.kills, snapshot.deaths)}`,
    );
  }

  if (elements.length === 0) return [];
  return [`${theme.bright}§lATLAS`, ` ${separator}`, elements.join(separator)];
}

export function buildHudPreview(snapshot, settings, themeId) {
  const segments = buildHudSegments(snapshot, settings, themeId);
  if (segments.length === 0) return t(settings.language, "hud.noElements");
  return segments.join("");
}

/** Compute distance and bearing for the tracked waypoint. */
export function trackedWaypointSnapshot(
  playerLocation,
  playerDimensionId,
  waypoint,
  displayName,
) {
  if (!waypoint) return null;
  const sameDimension = playerDimensionId === waypoint.dimensionId;
  return {
    name: displayName ?? waypoint.name,
    sameDimension,
    distance: sameDimension ? distance3(playerLocation, waypoint) : null,
    bearing: sameDimension ? bearingBetween(playerLocation, waypoint) : null,
  };
}
