/** Settings schema, validation and the compact transferable settings code. */

import {
  DEFAULT_SETTINGS,
  HUD_COLOR_IDS,
  LANGUAGE_IDS,
  THEME_IDS,
  TOGGLE_PATHS,
} from "./config.js";
import { isLanguage } from "./i18n.js";
import { isHudColor, isThemeId } from "./themes.js";
import {
  clamp,
  fromBase36,
  getPath,
  isPlainObject,
  setPath,
  toBase36,
} from "./util.js";

const CODE_PREFIX = "ATLAS2-";
const LEGACY_PREFIX = "ATLAS1-";
const CHECKSUM_LENGTH = 2;
const MASK_LENGTH = 7;
const BODY_LENGTH = 6 + MASK_LENGTH;
const LEGACY_MASK_LENGTH = 4;
const LEGACY_BODY_LENGTH = 4 + LEGACY_MASK_LENGTH;
const LEGACY_TOGGLE_COUNT = 20;

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function normalizeInterval(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / 5) * 5;
  return clamp(stepped, 5, 40);
}

function normalizeThreshold(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 2, 19);
}

function normalizeDurabilityThreshold(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / 5) * 5;
  return clamp(stepped, 5, 90);
}

/**
 * Returns a fresh settings object containing only known keys and valid
 * values. Never mutates the input; unknown properties are discarded.
 */
export function normalizeSettings(raw) {
  const result = cloneDefaults();
  if (!isPlainObject(raw)) return result;

  if (isThemeId(raw.theme)) result.theme = raw.theme;
  if (isLanguage(raw.language)) result.language = raw.language;

  for (const path of TOGGLE_PATHS) {
    const value = getPath(raw, path);
    if (typeof value === "boolean") setPath(result, path, value);
  }

  const hud = isPlainObject(raw.hud) ? raw.hud : {};
  result.hud.interval = normalizeInterval(hud.interval, result.hud.interval);
  result.hud.durabilityThreshold = normalizeDurabilityThreshold(
    hud.durabilityThreshold,
    result.hud.durabilityThreshold,
  );
  if (isHudColor(hud.color)) result.hud.color = hud.color;

  result.pvp.alertThreshold = normalizeThreshold(
    isPlainObject(raw.pvp) ? raw.pvp.alertThreshold : undefined,
    result.pvp.alertThreshold,
  );

  const trackedId = isPlainObject(raw.waypoints) ? raw.waypoints.trackedId : null;
  if (typeof trackedId === "string" && trackedId.length > 0 && trackedId.length <= 80) {
    result.waypoints.trackedId = trackedId;
  } else {
    result.waypoints.trackedId = null;
  }

  result.version = 2;
  return result;
}

export function toggleSetting(settings, path, value) {
  const next = normalizeSettings(settings);
  if (!TOGGLE_PATHS.includes(path)) return next;
  setPath(next, path, Boolean(value));
  return next;
}

function checksum(text) {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total = (total + text.charCodeAt(i)) % 1296;
  }
  return toBase36(total, CHECKSUM_LENGTH);
}

/**
 * A short, manually typable settings code. It carries the four themes,
 * two languages, interval, alert thresholds, HUD colour and every boolean
 * toggle. Waypoint names and coordinates are deliberately excluded.
 *
 * ATLAS2 uses a 7-character base36 toggle mask because the panel toggles
 * pushed the mask beyond the 32-bit range used by the old format.
 */
export function settingsToCode(settings) {
  const value = normalizeSettings(settings);
  const themeIndex = Math.max(0, THEME_IDS.indexOf(value.theme));
  const languageIndex = Math.max(0, LANGUAGE_IDS.indexOf(value.language));
  const intervalChar = toBase36(value.hud.interval - 5, 1);
  const thresholdChar = toBase36(value.pvp.alertThreshold - 2, 1);
  const durabilityChar = toBase36((value.hud.durabilityThreshold - 5) / 5, 1);
  const colorIndex = Math.max(0, HUD_COLOR_IDS.indexOf(value.hud.color));

  let mask = 0;
  TOGGLE_PATHS.forEach((path, index) => {
    if (getPath(value, path) === true) mask += 2 ** index;
  });
  const maskText = toBase36(mask, MASK_LENGTH);
  const body = `${themeIndex}${languageIndex}${intervalChar}${thresholdChar}${durabilityChar}${colorIndex}${maskText}`;
  return `${CODE_PREFIX}${body}${checksum(body)}`;
}

function decodeBody(body, toggleCount, hasColor) {
  if (!/^[0-9a-z]+$/.test(body)) return null;
  const themeIndex = fromBase36(body[0]);
  const languageIndex = fromBase36(body[1]);
  const interval = fromBase36(body[2]) + 5;
  const threshold = fromBase36(body[3]) + 2;
  const durabilityThreshold = hasColor ? fromBase36(body[4]) * 5 + 5 : 20;
  const colorIndex = hasColor ? fromBase36(body[5]) : 0;
  const mask = fromBase36(body.slice(hasColor ? 6 : 4));
  if (!Number.isFinite(themeIndex) || themeIndex >= THEME_IDS.length) return null;
  if (!Number.isFinite(languageIndex) || languageIndex >= LANGUAGE_IDS.length) return null;
  if (!Number.isFinite(interval) || interval < 5 || interval > 40) return null;
  if (!Number.isFinite(threshold) || threshold < 2 || threshold > 19) return null;
  if (!Number.isFinite(durabilityThreshold) || durabilityThreshold < 5 || durabilityThreshold > 90) return null;
  if (!Number.isFinite(colorIndex) || colorIndex >= HUD_COLOR_IDS.length) return null;
  if (!Number.isFinite(mask) || mask < 0 || mask >= 2 ** toggleCount) return null;

  const settings = cloneDefaults();
  settings.theme = THEME_IDS[themeIndex] ?? "atlas";
  settings.language = LANGUAGE_IDS[languageIndex] ?? "en";
  settings.hud.interval = interval;
  settings.pvp.alertThreshold = threshold;
  settings.hud.durabilityThreshold = durabilityThreshold;
  settings.hud.color = HUD_COLOR_IDS[colorIndex] ?? "theme";
  TOGGLE_PATHS.forEach((path, index) => {
    if (index >= toggleCount) return;
    const enabled = Math.floor(mask / 2 ** index) % 2 === 1;
    setPath(settings, path, enabled);
  });
  settings.version = 2;
  // Waypoints are world data, not settings. Never import a tracker target.
  settings.waypoints.trackedId = null;
  return normalizeSettings(settings);
}

/** Returns normalized settings, or null for an invalid code. */
export function settingsFromCode(code) {
  if (typeof code !== "string") return null;
  const cleaned = code.trim().toUpperCase();

  if (cleaned.startsWith(CODE_PREFIX)) {
    const body = cleaned.slice(CODE_PREFIX.length).toLowerCase();
    if (body.length !== BODY_LENGTH + CHECKSUM_LENGTH) return null;
    const payload = body.slice(0, BODY_LENGTH);
    if (checksum(payload) !== body.slice(BODY_LENGTH)) return null;
    return decodeBody(payload, TOGGLE_PATHS.length, true);
  }

  // Old ATLAS1 codes are still accepted. They only carry the original 20
  // toggles; the new panels keep their defaults.
  if (cleaned.startsWith(LEGACY_PREFIX)) {
    const body = cleaned.slice(LEGACY_PREFIX.length).toLowerCase();
    if (body.length !== LEGACY_BODY_LENGTH + CHECKSUM_LENGTH) return null;
    const payload = body.slice(0, LEGACY_BODY_LENGTH);
    if (checksum(payload) !== body.slice(LEGACY_BODY_LENGTH)) return null;
    return decodeBody(payload, LEGACY_TOGGLE_COUNT, false);
  }

  return null;
}
