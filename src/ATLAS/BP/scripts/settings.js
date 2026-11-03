/** Settings schema, validation and the compact transferable settings code. */

import {
  DEFAULT_SETTINGS,
  LANGUAGE_IDS,
  THEME_IDS,
  TOGGLE_PATHS,
} from "./config.js";
import { isLanguage } from "./i18n.js";
import { isThemeId } from "./themes.js";
import {
  clamp,
  fromBase36,
  getPath,
  isPlainObject,
  setPath,
  toBase36,
} from "./util.js";

const CODE_PREFIX = "ATLAS1-";
const BODY_LENGTH = 8;
const CHECKSUM_LENGTH = 2;

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

  result.version = 1;
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
 * two languages, interval, alert threshold and every boolean toggle.
 * Waypoint names and coordinates are deliberately excluded.
 */
export function settingsToCode(settings) {
  const value = normalizeSettings(settings);
  const themeIndex = Math.max(0, THEME_IDS.indexOf(value.theme));
  const languageIndex = Math.max(0, LANGUAGE_IDS.indexOf(value.language));
  const intervalChar = toBase36(value.hud.interval - 5, 1);
  const thresholdChar = toBase36(value.pvp.alertThreshold - 2, 1);

  let mask = 0;
  TOGGLE_PATHS.forEach((path, index) => {
    if (getPath(value, path) === true) mask += 2 ** index;
  });
  const maskText = toBase36(mask, 4);
  const body = `${themeIndex}${languageIndex}${intervalChar}${thresholdChar}${maskText}`;
  return `${CODE_PREFIX}${body}${checksum(body)}`;
}

/** Returns normalized settings, or null for an invalid code. */
export function settingsFromCode(code) {
  if (typeof code !== "string") return null;
  const cleaned = code.trim().toUpperCase();
  if (!cleaned.startsWith(CODE_PREFIX)) return null;
  const rawBody = cleaned.slice(CODE_PREFIX.length);
  // Base36 digits are case-insensitive; normalise back to lower case.
  const body = rawBody.toLowerCase();
  if (body.length !== BODY_LENGTH + CHECKSUM_LENGTH) return null;
  const payload = body.slice(0, BODY_LENGTH);
  const providedChecksum = body.slice(BODY_LENGTH);
  if (!/^[0-9a-z]+$/.test(body)) return null;
  if (checksum(payload) !== providedChecksum) return null;

  const themeIndex = fromBase36(payload[0]);
  const languageIndex = fromBase36(payload[1]);
  const interval = fromBase36(payload[2]) + 5;
  const threshold = fromBase36(payload[3]) + 2;
  const mask = fromBase36(payload.slice(4, 8));
  if (!Number.isFinite(themeIndex) || themeIndex >= THEME_IDS.length) return null;
  if (!Number.isFinite(languageIndex) || languageIndex >= LANGUAGE_IDS.length) return null;
  if (!Number.isFinite(interval) || interval < 5 || interval > 40) return null;
  if (!Number.isFinite(threshold) || threshold < 2 || threshold > 19) return null;
  if (!Number.isFinite(mask) || mask < 0 || mask >= 2 ** TOGGLE_PATHS.length) return null;

  const settings = cloneDefaults();
  settings.theme = THEME_IDS[themeIndex] ?? "atlas";
  settings.language = LANGUAGE_IDS[languageIndex] ?? "en";
  settings.hud.interval = interval;
  settings.pvp.alertThreshold = threshold;
  TOGGLE_PATHS.forEach((path, index) => {
    if ((mask & 2 ** index) !== 0) setPath(settings, path, true);
    else setPath(settings, path, false);
  });
  settings.version = 1;
  // Waypoints are world data, not settings. Never import a tracker target.
  settings.waypoints.trackedId = null;
  return normalizeSettings(settings);
}
