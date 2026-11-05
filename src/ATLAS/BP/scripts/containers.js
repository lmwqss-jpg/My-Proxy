/**
 * Per-player container log for the ESPCHEST screen.
 *
 * This is deliberately interaction-based: an entry is recorded only after the
 * player actually opens/interacts with a block inside normal reach. The add-on
 * cannot scan unloaded chunks, hidden containers or contents through walls, so
 * no such claim or fake list is produced.
 */

import { LIMITS } from "./config.js";
import { isPlainObject, safeNumber, sanitizeName } from "./util.js";

const DIMENSION_PATTERN = /^[a-z0-9_.:-]{1,80}$/i;
const TYPE_PATTERN = /^[a-z0-9_.:-]{1,80}$/i;

/**
 * One physical interaction can be reported more than once (for example when
 * the client repeats a held-use event). A matching entry inside this window is
 * treated as the same opening and is not written, reordered or timestamped.
 */
export const CONTAINER_DUPLICATE_WINDOW_MS = 3000;

const KNOWN_CONTAINERS = Object.freeze([
  "minecraft:barrel",
  "minecraft:blast_furnace",
  "minecraft:brewing_stand",
  "minecraft:chest",
  "minecraft:crafter",
  "minecraft:decorated_pot",
  "minecraft:dispenser",
  "minecraft:dropper",
  "minecraft:ender_chest",
  "minecraft:furnace",
  "minecraft:hopper",
  "minecraft:lit_blast_furnace",
  "minecraft:lit_furnace",
  "minecraft:lit_smoker",
  "minecraft:smoker",
  "minecraft:trapped_chest",
]);

/**
 * Returns true for a real container-like block id. Unknown custom ids are
 * rejected instead of being recorded as a container.
 */
export function isContainerBlock(typeId) {
  if (typeof typeId !== "string" || !TYPE_PATTERN.test(typeId)) return false;
  if (KNOWN_CONTAINERS.includes(typeId)) return true;
  const path = typeId.split(":").pop() ?? "";
  if (path.includes("shulker_box")) return true;
  // Future/copper chest variants keep the standard "chest" suffix.
  return path === "chest" || path.endsWith("_chest");
}

function validDimensionId(value) {
  return typeof value === "string" && DIMENSION_PATTERN.test(value);
}

function blockCoord(value) {
  const number = safeNumber(value, NaN);
  return Number.isFinite(number) ? Math.floor(number) : NaN;
}

/** Durable identity for one block position, independent of its type. */
export function containerKey(entry) {
  if (!entry) return "";
  return `${entry.dimensionId}|${entry.x}|${entry.y}|${entry.z}`;
}

export function normalizeContainerEntry(raw) {
  if (!isPlainObject(raw)) return null;
  if (!isContainerBlock(raw.typeId)) return null;
  if (!validDimensionId(raw.dimensionId)) return null;
  const x = blockCoord(raw.x);
  const y = blockCoord(raw.y);
  const z = blockCoord(raw.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  const seenAt = safeNumber(raw.seenAt, Date.now());
  return {
    typeId: raw.typeId,
    dimensionId: raw.dimensionId,
    x,
    y,
    z,
    seenAt,
    name: sanitizeName(raw.name, "", 40),
  };
}

/** Accepts JSON, an array or garbage and always returns a bounded array. */
export function parseContainers(value) {
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
  for (const raw of parsed) {
    const entry = normalizeContainerEntry(raw);
    if (!entry) continue;
    const key = containerKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= LIMITS.containers) break;
  }
  return result;
}

export function serializeContainers(list) {
  return JSON.stringify(
    list.map((entry) => ({
      typeId: entry.typeId,
      dimensionId: entry.dimensionId,
      x: entry.x,
      y: entry.y,
      z: entry.z,
      seenAt: entry.seenAt,
      name: entry.name,
    })),
  );
}

/**
 * Inserts or refreshes an entry and keeps the newest first.
 *
 * A recent interaction with the same block, dimension and container type is
 * suppressed. The check scans every stored entry, not just the newest one, so
 * alternating between two nearby chests cannot create duplicate history.
 * Older entries are refreshed (time and type update) without adding a row.
 */
export function recordContainer(list, info, now = Date.now()) {
  const entry = normalizeContainerEntry({ ...info, seenAt: now });
  if (!entry) return { list, entry: null, added: false, duplicate: false };
  const key = containerKey(entry);
  const duplicate = list.some((candidate) => {
    if (containerKey(candidate) !== key) return false;
    if (candidate.typeId !== entry.typeId) return false;
    const elapsed = now - candidate.seenAt;
    return elapsed >= 0 && elapsed < CONTAINER_DUPLICATE_WINDOW_MS;
  });
  if (duplicate) {
    return { list, entry: null, added: false, duplicate: true };
  }
  const existing = list.find((candidate) => containerKey(candidate) === key);
  const next = [entry, ...list.filter((candidate) => containerKey(candidate) !== key)];
  while (next.length > LIMITS.containers) next.pop();
  return { list: next, entry, added: !existing, duplicate: false };
}

export function removeContainer(list, key) {
  return list.filter((entry) => containerKey(entry) !== key);
}

/** Human-readable block id without the namespace. */
export function containerLabel(typeId) {
  const id = String(typeId ?? "").replace(/^minecraft:/, "");
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
