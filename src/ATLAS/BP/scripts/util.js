/** Small, dependency-free helpers shared by the model, HUD and forms. */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function formatCoord(value, precise = false) {
  if (!Number.isFinite(value)) return "?";
  return precise ? value.toFixed(1) : String(Math.floor(value));
}

export function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "?";
  return String(Math.round(distance));
}

export function distance3(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Bearing in degrees clockwise from north. */
export function bearingBetween(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return normalizeDegrees((Math.atan2(dx, -dz) * 180) / Math.PI);
}

/** Bearing of a look vector, clock-wise from north. */
export function bearingFromView(view) {
  return normalizeDegrees((Math.atan2(view.x, -view.z) * 180) / Math.PI);
}

export function normalizeDegrees(degrees) {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

const CARDINAL_KEYS = [
  "dir.short.n",
  "dir.short.ne",
  "dir.short.e",
  "dir.short.se",
  "dir.short.s",
  "dir.short.sw",
  "dir.short.w",
  "dir.short.nw",
];

const FULL_CARDINAL_KEYS = [
  "dir.n",
  "dir.ne",
  "dir.e",
  "dir.se",
  "dir.s",
  "dir.sw",
  "dir.w",
  "dir.nw",
];

export function cardinalIndex(bearing) {
  return Math.round(normalizeDegrees(bearing) / 45) % 8;
}

export function cardinalKey(bearing, short = true) {
  const index = cardinalIndex(bearing);
  return (short ? CARDINAL_KEYS : FULL_CARDINAL_KEYS)[index];
}

/** Relative direction from the player's view to a target. */
export function relativeDirectionIndex(targetBearing, viewBearing) {
  const relative = ((targetBearing - viewBearing + 540) % 360) - 180;
  const step = Math.round(relative / 45);
  // Steps are in [-4, 4]; negative values map to the left-hand side.
  if (step === 0) return 0;
  if (step === 4 || step === -4) return 4;
  return step;
}

const RELATIVE_KEYS = [
  "relative.ahead",
  "relative.frontRight",
  "relative.right",
  "relative.backRight",
  "relative.behind",
  "relative.backLeft",
  "relative.left",
  "relative.frontLeft",
];

export function relativeDirectionKey(targetBearing, viewBearing) {
  const index = relativeDirectionIndex(targetBearing, viewBearing);
  if (index === -1) return RELATIVE_KEYS[7];
  if (index === -2) return RELATIVE_KEYS[6];
  if (index === -3) return RELATIVE_KEYS[5];
  return RELATIVE_KEYS[index];
}

/**
 * Minecraft time 0 is 06:00. /time set day (1000) is 07:00 and
 * /time set noon (6000) is 12:00.
 */
export function gameClock(ticks) {
  const normalized = Number.isFinite(ticks) ? ((ticks % 24000) + 24000) % 24000 : 0;
  const totalMinutes = Math.floor((normalized / 1000 + 6) * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    hours,
    minutes,
    text: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

export function formatKd(kills, deaths) {
  if (!deaths) return kills > 0 ? String(kills) : "0.00";
  return (kills / deaths).toFixed(2);
}

/** Player session duration. Returns "--" when no real value is available. */
export function formatSessionDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/**
 * Waypoint names are rendered in forms and chat. Strip section-sign colour
 * codes, line breaks and other control characters, then cap the length.
 */
export function sanitizeName(value, fallback, maxLength = 40) {
  const raw = typeof value === "string" ? value : "";
  const cleaned = raw
    .replace(/§[0-9a-zA-Z]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return cleaned || fallback;
}

export function safeNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getPath(object, path) {
  const parts = path.split(".");
  let current = object;
  for (const part of parts) {
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

export function setPath(object, path, value) {
  const parts = path.split(".");
  let current = object;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/** Compact, human-typable unsigned integer helpers used by settings codes. */
export function toBase36(value, width = 0) {
  const text = Math.max(0, Math.floor(value)).toString(36);
  return width > 0 ? text.padStart(width, "0") : text;
}

export function fromBase36(text) {
  if (typeof text !== "string" || !/^[0-9a-z]+$/.test(text)) return NaN;
  return parseInt(text, 36);
}
