/**
 * Persistent server registry model.
 *
 * This module deliberately contains no connection code. Minecraft's stable
 * Script API cannot open a network connection or change the server the game
 * is connected to, so ATLAS only stores validated addresses, keeps the
 * player's own ordering/favourites and shows the exact values to type into
 * Minecraft's built-in Servers screen.
 *
 * No Minecraft API imports, so every rule here is unit-tested in Node.js.
 */

import {
  DEFAULT_SERVER_PORT,
  LIMITS,
  SERVER_CATEGORIES,
  SERVER_REGIONS,
} from "./config.js";
import { isPlainObject, safeNumber, sanitizeName } from "./util.js";

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_ADDRESS_LENGTH = 253;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HOST_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_PATTERN = /^[a-z]{2,63}$/i;

function makeId(now, random) {
  return `s_${now.toString(36)}_${random.toString(36).slice(2, 8)}`;
}

/**
 * Returns a lowercase IPv4 address or domain name, or null.
 *
 * Ports are rejected here on purpose: a pasted "host:19132" must not be
 * half-validated. The form asks for the port separately and shows a dedicated
 * message.
 */
export function normalizeAddress(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > MAX_ADDRESS_LENGTH) return null;
  if (/[\s/\\?#@]/.test(value)) return null;
  if (value.includes(":")) return null;

  const ipv4 = value.match(IPV4_PATTERN);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.every((octet) => octet >= 0 && octet <= 255)) {
      return octets.join(".");
    }
    return null;
  }

  const labels = value.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!HOST_LABEL_PATTERN.test(label)) return null;
  }
  if (!TLD_PATTERN.test(labels[labels.length - 1])) return null;
  return value.toLowerCase();
}

/** Accepts "19132" or 19132 and returns an integer in 1..65535, or null. */
export function normalizePort(raw) {
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 1 || raw > 65535) return null;
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d{1,5}$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return value >= 1 && value <= 65535 ? value : null;
  }
  return null;
}

export function serverTarget(address, port) {
  const normalizedAddress = normalizeAddress(address);
  const normalizedPort = normalizePort(port);
  if (!normalizedAddress || normalizedPort === null) return null;
  return { address: normalizedAddress, port: normalizedPort };
}

export function serverAddress(server) {
  return `${server.address}:${server.port}`;
}

export function sameTarget(a, b) {
  return Boolean(a && b && a.address === b.address && a.port === b.port);
}

export function normalizeServer(raw) {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !ID_PATTERN.test(raw.id)) return null;
  const name = sanitizeName(raw.name, "", LIMITS.serverNameLength);
  if (!name) return null;
  const address = normalizeAddress(raw.address);
  if (!address) return null;
  const port = normalizePort(raw.port);
  if (port === null) return null;

  const category = SERVER_CATEGORIES.includes(raw.category) ? raw.category : "other";
  const region = SERVER_REGIONS.includes(raw.region) ? raw.region : "other";
  const description = sanitizeName(raw.description, "", LIMITS.serverDescriptionLength);
  const lastMarkedAt = safeNumber(raw.lastMarkedAt, 0);
  return {
    id: raw.id,
    name,
    address,
    port,
    description,
    category,
    region,
    favorite: raw.favorite === true,
    current: raw.current === true,
    createdAt: safeNumber(raw.createdAt, 0),
    lastMarkedAt: lastMarkedAt > 0 ? lastMarkedAt : null,
  };
}

/** Accepts a JSON string, a raw array, or garbage and always returns an array. */
export function parseServers(value) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const seenIds = new Set();
  const seenTargets = new Set();
  const result = [];
  let currentSeen = false;
  for (const entry of parsed) {
    const server = normalizeServer(entry);
    if (!server) continue;
    if (seenIds.has(server.id)) continue;
    const key = serverAddress(server);
    if (seenTargets.has(key)) continue;
    // Only one entry can be the manually marked current server.
    if (server.current && currentSeen) server.current = false;
    if (server.current) currentSeen = true;
    seenIds.add(server.id);
    seenTargets.add(key);
    result.push(server);
    if (result.length >= LIMITS.servers) break;
  }
  return result;
}

export function serializeServers(list) {
  return JSON.stringify(
    list.map((server) => ({
      id: server.id,
      name: server.name,
      address: server.address,
      port: server.port,
      description: server.description,
      category: server.category,
      region: server.region,
      favorite: server.favorite,
      current: server.current,
      createdAt: server.createdAt,
      lastMarkedAt: server.lastMarkedAt,
    })),
  );
}

export function createServer(input) {
  const now = safeNumber(input?.now, Date.now());
  return normalizeServer({
    id: typeof input?.id === "string" ? input.id : makeId(now, Math.random()),
    name: input?.name,
    address: input?.address,
    port: input?.port ?? DEFAULT_SERVER_PORT,
    description: input?.description,
    category: input?.category,
    region: input?.region,
    favorite: input?.favorite,
    current: false,
    createdAt: now,
    lastMarkedAt: null,
  });
}

export function findServer(list, id) {
  return list.find((server) => server.id === id) ?? null;
}

export function addServer(list, server) {
  if (!server) return { list, added: false, reason: "invalid" };
  if (list.length >= LIMITS.servers) return { list, added: false, reason: "limit" };
  if (findServer(list, server.id)) return { list, added: false, reason: "duplicate" };
  if (list.some((entry) => sameTarget(entry, server))) {
    return { list, added: false, reason: "duplicateAddress" };
  }
  return { list: [...list, server], added: true, reason: null };
}

export function updateServer(list, id, input) {
  const existing = findServer(list, id);
  if (!existing) return { list, updated: false, reason: "notFound" };
  const server = normalizeServer({
    ...existing,
    ...input,
    id: existing.id,
    createdAt: existing.createdAt,
    current: existing.current,
    lastMarkedAt: existing.lastMarkedAt,
  });
  if (!server) return { list, updated: false, reason: "invalid" };
  if (list.some((entry) => entry.id !== id && sameTarget(entry, server))) {
    return { list, updated: false, reason: "duplicateAddress" };
  }
  return {
    list: list.map((entry) => (entry.id === id ? server : entry)),
    updated: true,
    reason: null,
  };
}

export function removeServer(list, id) {
  return list.filter((server) => server.id !== id);
}

export function toggleFavorite(list, id) {
  return list.map((server) =>
    server.id === id ? { ...server, favorite: !server.favorite } : server,
  );
}

/** Moves one entry by -1 or +1 without wrapping; returns the same list otherwise. */
export function moveServer(list, id, offset) {
  const index = list.findIndex((server) => server.id === id);
  if (index < 0 || (offset !== -1 && offset !== 1)) return list;
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Marks one entry as the player's manual current server and timestamps it. */
export function markCurrent(list, id, now = Date.now()) {
  if (!findServer(list, id)) return list;
  return list.map((server) =>
    server.id === id
      ? { ...server, current: true, lastMarkedAt: now }
      : { ...server, current: false },
  );
}

export function clearCurrent(list) {
  return list.map((server) => (server.current ? { ...server, current: false } : server));
}

export function normalizeServerTarget(value) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!isPlainObject(parsed)) return null;
  return serverTarget(parsed.address, parsed.port);
}

/** "2026-01-31 14:05 UTC", or null when no real timestamp exists. */
export function formatServerTimestamp(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const pad = (part) => String(part).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}
