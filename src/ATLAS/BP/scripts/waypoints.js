/** Persistent waypoint model. No Minecraft API imports, so this is unit-tested. */

import { DEATH_WAYPOINT_ID, LIMITS } from "./config.js";
import { isPlainObject, safeNumber, sanitizeName } from "./util.js";

const DIMENSION_PATTERN = /^[a-z0-9_.:-]{1,80}$/i;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

let idCounter = 0;

function makeId() {
  idCounter = (idCounter + 1) % 1296;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `w_${time}_${idCounter.toString(36)}${random}`;
}

function validDimensionId(value) {
  return typeof value === "string" && DIMENSION_PATTERN.test(value);
}

export function normalizeWaypoint(raw) {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !ID_PATTERN.test(raw.id)) return null;
  if (!validDimensionId(raw.dimensionId)) return null;
  const x = safeNumber(raw.x, NaN);
  const y = safeNumber(raw.y, NaN);
  const z = safeNumber(raw.z, NaN);
  if (![x, y, z].every(Number.isFinite)) return null;
  const kind = raw.kind === "death" ? "death" : "custom";
  const fallback = kind === "death" ? "" : "Waypoint";
  const name = sanitizeName(raw.name, fallback, LIMITS.waypointNameLength);
  const createdAt = safeNumber(raw.createdAt, Date.now());
  return {
    id: raw.id,
    name,
    dimensionId: raw.dimensionId,
    x,
    y,
    z,
    kind,
    createdAt,
  };
}

/** Accepts a JSON string, a raw array, or garbage and always returns an array. */
export function parseWaypoints(value) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set();
  const result = [];
  for (const entry of parsed) {
    const waypoint = normalizeWaypoint(entry);
    if (!waypoint || seen.has(waypoint.id)) continue;
    seen.add(waypoint.id);
    result.push(waypoint);
    if (result.length >= LIMITS.waypoints) break;
  }
  return result;
}

export function serializeWaypoints(list) {
  return JSON.stringify(
    list.map((waypoint) => ({
      id: waypoint.id,
      name: waypoint.name,
      dimensionId: waypoint.dimensionId,
      x: waypoint.x,
      y: waypoint.y,
      z: waypoint.z,
      kind: waypoint.kind,
      createdAt: waypoint.createdAt,
    })),
  );
}

export function createWaypoint(input) {
  const waypoint = normalizeWaypoint({
    id: typeof input?.id === "string" ? input.id : makeId(),
    name: input?.name,
    dimensionId: input?.dimensionId,
    x: input?.x,
    y: input?.y,
    z: input?.z,
    kind: input?.kind,
    createdAt: input?.createdAt ?? Date.now(),
  });
  return waypoint;
}

export function findWaypoint(list, id) {
  return list.find((waypoint) => waypoint.id === id) ?? null;
}

/**
 * Case-insensitive waypoint search used by the list screen. It matches the
 * real stored fields only: name, id, dimension, coordinates and kind.
 */
export function filterWaypoints(list, query) {
  const needle = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (!needle) return Array.isArray(list) ? list : [];
  if (!Array.isArray(list)) return [];
  return list.filter((waypoint) => {
    if (!waypoint) return false;
    const haystack = [
      waypoint.name,
      waypoint.id,
      waypoint.dimensionId,
      waypoint.kind,
      String(waypoint.x),
      String(waypoint.y),
      String(waypoint.z),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function addWaypoint(list, waypoint) {
  if (!waypoint) return { list, added: false, reason: "invalid" };
  if (list.length >= LIMITS.waypoints) return { list, added: false, reason: "limit" };
  if (findWaypoint(list, waypoint.id)) return { list, added: false, reason: "duplicate" };
  return { list: [...list, waypoint], added: true, reason: null };
}

export function renameWaypoint(list, id, rawName) {
  return list.map((waypoint) => {
    if (waypoint.id !== id) return waypoint;
    const fallback = waypoint.kind === "death" ? "" : "Waypoint";
    const cleaned = sanitizeName(rawName, "", LIMITS.waypointNameLength);
    const name = cleaned || waypoint.name || fallback;
    const renamedDeath = waypoint.kind === "death" && name.length > 0;
    return {
      ...waypoint,
      name,
      kind: renamedDeath ? "custom" : waypoint.kind,
    };
  });
}

export function removeWaypoint(list, id) {
  return list.filter((waypoint) => waypoint.id !== id);
}

export function moveWaypoint(list, id, location) {
  return list.map((waypoint) => {
    if (waypoint.id !== id) return waypoint;
    return {
      ...waypoint,
      dimensionId: location.dimensionId,
      x: location.x,
      y: location.y,
      z: location.z,
    };
  });
}

/** Update the single automatic death point, or create it. */
export function upsertDeathWaypoint(list, location) {
  const existing = list.find((waypoint) => waypoint.kind === "death");
  if (existing) {
    return {
      list: moveWaypoint(list, existing.id, location),
      waypoint: { ...existing, ...location },
      created: false,
    };
  }
  if (list.length >= LIMITS.waypoints) {
    return { list, waypoint: null, created: false, reason: "limit" };
  }
  const waypoint = createWaypoint({
    id: findWaypoint(list, DEATH_WAYPOINT_ID) ? undefined : DEATH_WAYPOINT_ID,
    name: "",
    kind: "death",
    dimensionId: location.dimensionId,
    x: location.x,
    y: location.y,
    z: location.z,
  });
  if (!waypoint) return { list, waypoint: null, created: false, reason: "invalid" };
  return { list: [...list, waypoint], waypoint, created: true };
}

export function waypointDisplayName(waypoint, translate, language) {
  if (waypoint.kind === "death" && !waypoint.name) {
    return translate(language, "utilities.autoDeath");
  }
  return waypoint.name;
}
