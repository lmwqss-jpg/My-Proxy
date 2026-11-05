/** Pure HUD text composition. Kept separate from Minecraft runtime code. */

import { t } from "./i18n.js";
import { hudColorCode } from "./themes.js";
import {
  bearingBetween,
  bearingFromView,
  cardinalKey,
  distance3,
  formatCoord,
  formatDistance,
  formatKd,
  formatSessionDuration,
  gameClock,
  getPath,
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

const EFFECT_KEYS = Object.freeze({
  speed: "effect.speed",
  slowness: "effect.slowness",
  haste: "effect.haste",
  mining_fatigue: "effect.miningFatigue",
  strength: "effect.strength",
  instant_health: "effect.instantHealth",
  instant_damage: "effect.instantDamage",
  jump_boost: "effect.jumpBoost",
  nausea: "effect.nausea",
  regeneration: "effect.regeneration",
  resistance: "effect.resistance",
  fire_resistance: "effect.fireResistance",
  water_breathing: "effect.waterBreathing",
  invisibility: "effect.invisibility",
  blindness: "effect.blindness",
  night_vision: "effect.nightVision",
  hunger: "effect.hunger",
  weakness: "effect.weakness",
  poison: "effect.poison",
  wither: "effect.wither",
  health_boost: "effect.healthBoost",
  absorption: "effect.absorption",
  saturation: "effect.saturation",
  levitation: "effect.levitation",
  fatal_poison: "effect.fatalPoison",
  conduit_power: "effect.conduitPower",
  slow_falling: "effect.slowFalling",
  bad_omen: "effect.badOmen",
  village_hero: "effect.villageHero",
  darkness: "effect.darkness",
  trial_omen: "effect.trialOmen",
  raid_omen: "effect.raidOmen",
  wind_charged: "effect.windCharged",
  weaving: "effect.weaving",
  oozing: "effect.oozing",
  infested: "effect.infested",
});

const ROMAN_LEVELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function effectLabel(typeId, language) {
  const id = String(typeId ?? "").replace(/^minecraft:/, "");
  const key = EFFECT_KEYS[id];
  if (key) return t(language, key);
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatEffectDuration(duration) {
  if (!Number.isFinite(duration)) return "--";
  if (duration < 0) return "∞";
  const seconds = Math.max(0, Math.ceil(duration / 20));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Roman effect level for display. Level I is amplifier 0. */
export function formatEffectLevel(amplifier) {
  if (!Number.isFinite(amplifier) || amplifier < 0) return "--";
  return ROMAN_LEVELS[amplifier] ?? `x${amplifier + 1}`;
}

function effectLevel(amplifier) {
  if (!Number.isFinite(amplifier) || amplifier <= 0) return "";
  return ` ${formatEffectLevel(amplifier)}`;
}

function durabilityTone(percent, threshold) {
  const yellowLimit = Math.min(100, Math.max(threshold, threshold * 2));
  if (percent <= threshold) return "§c";
  if (percent <= yellowLimit) return "§e";
  return "§a";
}

function formatArmorPiece(piece, settings) {
  if (!piece) return "";
  const label = `§7${piece.label}`;
  if (piece.empty || !piece.durability) {
    return `${label} §8--`;
  }
  const { remaining, max, percent } = piece.durability;
  const rounded = Math.max(0, Math.min(100, Math.round(percent)));
  const tone = durabilityTone(rounded, settings.hud.durabilityThreshold);
  const value = settings.hud.armorDetail
    ? `§f${Math.ceil(remaining)}§8/§7${Math.ceil(max)}`
    : `§f${Math.ceil(remaining)}`;
  return `${label} ${value} ${tone}${rounded}%§r`;
}

function formatArmorPanel(armor, settings) {
  if (!Array.isArray(armor)) return "";
  const parts = [];
  for (const piece of armor) {
    if (!piece || !piece.toggle || getPath(settings, piece.toggle) !== true) continue;
    const text = formatArmorPiece(piece, settings);
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

function formatPotionPanel(effects, language, accent) {
  if (!Array.isArray(effects) || effects.length === 0) return "";
  return effects
    .map((effect) => {
      const name = `${accent}${effectLabel(effect.typeId, language)}${effectLevel(effect.amplifier)}§r`;
      return `${name} §f${formatEffectDuration(effect.duration)}`;
    })
    .join("§8, §r");
}

function formatWasd(input, accent) {
  if (!input || !input.wasd) return "§8WASD --";
  const key = (letter, active) =>
    active ? `${accent}§l${letter}§r` : `§8${letter}`;
  return `§8[${key("W", input.wasd.forward)}§8][${key("A", input.wasd.left)}§8][${key("S", input.wasd.back)}§8][${key("D", input.wasd.right)}§8]`;
}

function formatCps(input) {
  if (!input || !Number.isFinite(input.cps)) return "";
  return `§7CPS §f${input.cps}`;
}

function formatClickIndicators(input, accent) {
  if (!input) return "";
  const left = input.left ? `${accent}§lLMB` : "§8LMB";
  const right = input.right ? `${accent}§lRMB` : "§8RMB";
  return `§8[${left}§8][${right}§8]`;
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
  const accent = hudColorCode(themeId, settings.hud.color);
  const elements = [];
  const separator = settings.hud.compact ? "§8|§r" : "§8 | §r";

  if (settings.hud.wasd && snapshot.input) {
    elements.push(formatWasd(snapshot.input, accent));
  }

  if (settings.hud.cps) {
    const cps = formatCps(snapshot.input);
    if (cps) elements.push(cps);
  }

  if (settings.hud.clickIndicators) {
    const indicators = formatClickIndicators(snapshot.input, accent);
    if (indicators) elements.push(indicators);
  }

  if (settings.hud.armor && snapshot.armor) {
    const armor = formatArmorPanel(snapshot.armor, settings);
    if (armor) elements.push(armor);
  }

  if (settings.hud.potions && snapshot.effects) {
    const potions = formatPotionPanel(snapshot.effects, language, accent);
    if (potions) elements.push(potions);
  }

  if (settings.hud.totems && snapshot.totems !== null && snapshot.totems !== undefined) {
    elements.push(`§6${t(language, "hud.totemShort")} §f${snapshot.totems}`);
  }

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

  const healthAvailable = Number.isFinite(snapshot.health) && Number.isFinite(snapshot.maxHealth);
  if (settings.hud.health && healthAvailable) {
    const value = healthValue(snapshot);
    elements.push(
      settings.hud.compact
        ? `${healthColor(snapshot.health, snapshot.maxHealth)}${value}`
        : `§7${t(language, "hud.hp")} ${healthColor(snapshot.health, snapshot.maxHealth)}${value}`,
    );
  }

  if (settings.pvp.showHealth && healthAvailable) {
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
    const worldParts = [];
    if (Number.isFinite(snapshot.day)) {
      worldParts.push(`§7${t(language, "common.day")} §f${snapshot.day}`);
    }
    if (Number.isFinite(snapshot.timeOfDay)) {
      worldParts.push(`§8${gameClock(snapshot.timeOfDay).text}`);
    }
    if (worldParts.length > 0) elements.push(worldParts.join(" "));
  }

  if (settings.hud.session) {
    const session = formatSessionDuration(snapshot.sessionSeconds);
    if (session !== "--") {
      elements.push(`§7${t(language, "common.session")} §f${session}`);
    }
  }

  if (settings.hud.dimension && snapshot.dimensionId) {
    const dimension = dimensionLabel(snapshot.dimensionId, language);
    elements.push(
      settings.hud.compact
        ? `§f${dimension}`
        : `§7${t(language, "common.dimension")} §f${dimension}`,
    );
  }

  if (settings.hud.compass && snapshot.view) {
    const bearing = bearingFromView(snapshot.view);
    const direction = t(language, cardinalKey(bearing, true));
    elements.push(
      settings.hud.compact
        ? `${accent}${direction}`
        : `§7${t(language, "hud.facing")} ${accent}${direction}`,
    );
  }

  if (settings.hud.waypoint && snapshot.trackedWaypoint) {
    const tracked = snapshot.trackedWaypoint;
    if (tracked.sameDimension && tracked.distance !== null && tracked.bearing !== null) {
      const direction = t(language, cardinalKey(tracked.bearing, true));
      elements.push(
        `§7${tracked.name} §f${formatDistance(tracked.distance)}${t(language, "common.meters")} ${accent}${direction}`,
      );
    } else {
      elements.push(`§7${tracked.name} §8(${t(language, "hud.other")})`);
    }
  }

  if (settings.visual.playerInfo) {
    const playerParts = [];
    if (Number.isFinite(snapshot.level)) {
      playerParts.push(`§7${t(language, "common.level")} §f${snapshot.level}`);
    }
    if (snapshot.gameMode) {
      playerParts.push(`§f${gameModeLabel(snapshot.gameMode, language)}`);
    }
    if (playerParts.length > 0) elements.push(playerParts.join(" §8| "));
  }

  if (settings.visual.worldInfo) {
    const worldParts = [];
    if (Number.isFinite(snapshot.playerCount)) {
      worldParts.push(`§7${t(language, "common.players")} §f${snapshot.playerCount}`);
    }
    if (snapshot.difficulty) {
      worldParts.push(`§7${t(language, "common.difficulty")} §f${difficultyLabel(snapshot.difficulty, language)}`);
    }
    if (worldParts.length > 0) elements.push(worldParts.join(" §8| "));
  }

  if (settings.visual.healthBar && healthAvailable) {
    elements.push(healthBar(snapshot.health, snapshot.maxHealth));
  }

  if (
    settings.visual.stats &&
    Number.isFinite(snapshot.kills) &&
    Number.isFinite(snapshot.deaths)
  ) {
    elements.push(
      `§7${t(language, "hud.kills")} §f${snapshot.kills} §7${t(language, "hud.deaths")} §f${snapshot.deaths} §7${t(language, "hud.kd")} §f${formatKd(snapshot.kills, snapshot.deaths)}`,
    );
  }

  if (elements.length === 0) return [];
  return [`${accent}§lATLAS`, ` ${separator}`, elements.join(separator)];
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
