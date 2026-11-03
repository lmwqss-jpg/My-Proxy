/**
 * Theme palettes. Bedrock forms accept section-sign colour codes, not hex
 * colours, so each theme provides both form colours and an RGB waypoint tint.
 */

import { HUD_COLOR_IDS, THEME_IDS } from "./config.js";

export const THEMES = Object.freeze({
  atlas: Object.freeze({
    id: "atlas",
    nameKey: "theme.atlas",
    accent: "§9",
    bright: "§b",
    RGB: Object.freeze({ red: 0.16, green: 0.58, blue: 1 }),
  }),
  emerald: Object.freeze({
    id: "emerald",
    nameKey: "theme.emerald",
    accent: "§2",
    bright: "§a",
    RGB: Object.freeze({ red: 0.18, green: 0.85, blue: 0.46 }),
  }),
  violet: Object.freeze({
    id: "violet",
    nameKey: "theme.violet",
    accent: "§5",
    bright: "§d",
    RGB: Object.freeze({ red: 0.67, green: 0.35, blue: 1 }),
  }),
  ember: Object.freeze({
    id: "ember",
    nameKey: "theme.ember",
    accent: "§c",
    bright: "§6",
    RGB: Object.freeze({ red: 1, green: 0.43, blue: 0.16 }),
  }),
});

export const HUD_COLORS = Object.freeze({
  theme: null,
  white: "§f",
  gray: "§7",
  green: "§a",
  yellow: "§e",
  red: "§c",
  blue: "§b",
});

export function getTheme(themeId) {
  return THEMES[themeId] ?? THEMES.atlas;
}

/** Resolves the HUD editor colour. The special "theme" id uses the theme's bright colour. */
export function hudColorCode(themeId, colorId) {
  if (colorId === "theme") return getTheme(themeId).bright;
  return HUD_COLORS[colorId] ?? getTheme(themeId).bright;
}

export function isHudColor(value) {
  return typeof value === "string" && HUD_COLOR_IDS.includes(value);
}

export function themeNameKey(themeId) {
  return getTheme(themeId).nameKey;
}

export function isThemeId(value) {
  return typeof value === "string" && THEME_IDS.includes(value);
}
