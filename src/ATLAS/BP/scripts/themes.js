/**
 * Theme palettes. Bedrock forms accept section-sign colour codes, not hex
 * colours, so each theme provides both form colours and an RGB waypoint tint.
 */

import { THEME_IDS } from "./config.js";

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

export function getTheme(themeId) {
  return THEMES[themeId] ?? THEMES.atlas;
}

export function themeNameKey(themeId) {
  return getTheme(themeId).nameKey;
}

export function isThemeId(value) {
  return typeof value === "string" && THEME_IDS.includes(value);
}
