/**
 * ATLAS UNIVERSAL COMPATIBILITY ENGINE.
 *
 * Runtime side of the feature compatibility manager. It probes the official
 * APIs once at script start, then per player when that player joins or changes
 * dimension. No world or player data is read at module scope: Script API v2
 * loads scripts during early execution, before storage is available.
 *
 * The engine does not subscribe to Minecraft events itself. events.js calls the
 * lifecycle functions, which keeps registration in one place and prevents
 * duplicate listeners when the pack is reloaded.
 */

import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
  ADDON_VERSION,
  MENU_COMMANDS,
  MENU_ITEM_ID,
  MENU_SCRIPT_EVENT_ID,
  SCRIPT_MODULES,
  TARGET_GAME_VERSION,
} from "./config.js";
import {
  buildCompatibilitySummary,
  buildFeatureRow,
  CAPABILITY_IDS,
  FEATURE_DEFINITIONS,
  featureById,
} from "./compatibilityModel.js";

const ERROR_CATEGORIES = Object.freeze(["script", "event", "storage", "form"]);
const MAX_RECENT_ERRORS = 8;
const MAX_ERROR_LENGTH = 160;

let initialized = false;
let bootTick = 0;
let worldLoads = 0;
let reinitCount = 0;
let lastReinitReason = null;
let lastCheckTick = 0;
let dimensionChanges = 0;
let playerSessions = 0;
let playerRespawns = 0;
/** @type {string[]} */
let registeredCommandNames = [];

/** @type {Record<string, boolean | undefined>} */
let globalCapabilities = {};
/** @type {Map<string, any>} */
const globalRuntime = new Map();
/** @type {Map<string, any>} */
const playerStates = new Map();
const recentErrors = [];
/** @type {Record<string, number>} */
const errorCounters = { script: 0, event: 0, storage: 0, form: 0 };

/**
 * @template T
 * @param {() => T} read
 * @param {T} [fallback]
 * @returns {T}
 */
function safeCall(read, fallback = /** @type {T} */ (/** @type {any} */ (false))) {
  try {
    const value = read();
    if (value === undefined || value === null) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

function hasSignal(signal) {
  return Boolean(signal && typeof signal.subscribe === "function");
}

function currentTick() {
  const tick = safeCall(() => mc.system.currentTick, 0);
  return Number.isFinite(tick) ? tick : 0;
}

function sanitizeError(error) {
  const text = error instanceof Error ? error.message : String(error ?? "unknown error");
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_LENGTH) || "unknown error";
}

function readRuntime(player, featureId) {
  const definition = featureById(featureId);
  if (!definition) return null;
  if (definition.global) return globalRuntime.get(featureId) ?? null;
  if (!player) return null;
  return playerStates.get(player.id)?.runtime?.get(featureId) ?? null;
}

function writeRuntime(player, featureId, update) {
  const definition = featureById(featureId);
  if (!definition) return false;
  if (definition.global) {
    const previous = globalRuntime.get(featureId) ?? {};
    globalRuntime.set(featureId, { ...previous, ...update });
    return true;
  }
  if (!player) return false;
  const state = playerStates.get(player.id);
  if (!state) return false;
  const previous = state.runtime.get(featureId) ?? {};
  state.runtime.set(featureId, { ...previous, ...update });
  return true;
}

/** Records one caught error in the bounded diagnostics history. */
export function recordEngineError(category, error) {
  const bucket = ERROR_CATEGORIES.includes(category) ? category : "script";
  errorCounters[bucket] = (errorCounters[bucket] ?? 0) + 1;
  recentErrors.unshift({
    tick: currentTick(),
    category: bucket,
    message: sanitizeError(error),
  });
  while (recentErrors.length > MAX_RECENT_ERRORS) recentErrors.pop();
}

/** Global API presence only. Must not read world/player data at module load. */
function probeModuleCapabilities() {
  const afterWorld = safeCall(() => mc.world?.afterEvents, null);
  const afterSystem = safeCall(() => mc.system?.afterEvents, null);
  const capabilities = {
    scripts: true,
    engine: true,
    forms: typeof ActionFormData === "function",
    "forms.modal": typeof ModalFormData === "function",
    command: undefined,
    "events.worldLoad": hasSignal(afterWorld?.worldLoad),
    "events.spawn": hasSignal(afterWorld?.playerSpawn),
    "events.itemUse": hasSignal(afterWorld?.itemUse),
    "events.interact": hasSignal(afterWorld?.playerInteractWithBlock),
    "events.damage": hasSignal(afterWorld?.entityDie) && hasSignal(afterWorld?.entityHurt),
    "events.inventory": hasSignal(afterWorld?.playerInventoryItemChange),
    "events.scriptEvent": hasSignal(afterSystem?.scriptEventReceive),
    // World-scoped capabilities stay unknown until worldLoad proves them by
    // calling the APIs. Function presence alone is not enough for a claim.
    "world.api": undefined,
    "world.clock": undefined,
    "world.dynamic": undefined,
  };
  return capabilities;
}

/** Verifies world-scoped APIs by calling them after the world is available. */
function probeWorldCapabilities() {
  const worldApi = safeCall(() => Array.isArray(mc.world.getPlayers()));
  const worldClock = safeCall(() => {
    const day = mc.world.getDay();
    const time = mc.world.getTimeOfDay();
    const difficulty = mc.world.getDifficulty();
    return (
      Number.isFinite(day) &&
      Number.isFinite(time) &&
      (typeof difficulty === "string" || typeof difficulty === "number")
    );
  });
  // Reading an unused key proves dynamic properties are readable without
  // changing the player's or the world's saved data.
  const worldDynamic = safeCall(() => {
    mc.world.getDynamicProperty("atlas:compatibility_probe");
    return typeof mc.world.setDynamicProperty === "function";
  });
  if (typeof worldApi === "boolean") globalCapabilities["world.api"] = worldApi;
  if (typeof worldClock === "boolean") globalCapabilities["world.clock"] = worldClock;
  if (typeof worldDynamic === "boolean") globalCapabilities["world.dynamic"] = worldDynamic;
  lastCheckTick = currentTick();
}

function probePlayerCapabilities(player, state) {
  const capabilities = {};
  const valid = Boolean(player && player.isValid !== false);
  capabilities["player.session"] = valid;
  if (!valid) {
    state.capabilities = capabilities;
    state.lastCheckTick = currentTick();
    return capabilities;
  }

  capabilities["player.dynamic"] = safeCall(() => {
    player.getDynamicProperty("atlas:compatibility_probe");
    return typeof player.setDynamicProperty === "function";
  });
  capabilities["player.health"] = safeCall(() => {
    const health = player.getComponent("minecraft:health");
    return Boolean(health) && Number.isFinite(Number(health.currentValue));
  });
  capabilities["player.equipment"] = safeCall(() => {
    const equippable = player.getComponent("minecraft:equippable");
    return Boolean(equippable) && typeof equippable.getEquipment === "function";
  });
  capabilities["player.inventory"] = safeCall(() => {
    const inventory = player.getComponent("minecraft:inventory");
    return Boolean(inventory?.container) && Number.isFinite(inventory.container.size) && inventory.container.size > 0;
  });
  capabilities["player.effects"] = safeCall(() => Array.isArray(player.getEffects()));
  capabilities["player.input"] = safeCall(() => {
    const movement = player.inputInfo.getMovementVector();
    return (
      Boolean(movement) &&
      Number.isFinite(movement.x) &&
      Number.isFinite(movement.y)
    );
  });
  capabilities["player.actionBar"] = safeCall(
    () => typeof player.onScreenDisplay?.setActionBar === "function",
  );
  capabilities["player.view"] = safeCall(() => {
    const view = player.getViewDirection();
    return (
      Boolean(view) &&
      Number.isFinite(view.x) &&
      Number.isFinite(view.y) &&
      Number.isFinite(view.z)
    );
  });
  capabilities["player.gameMode"] = safeCall(
    () => typeof player.getGameMode() === "string",
  );
  capabilities["player.locator"] = safeCall(() => {
    if (typeof mc.LocationWaypoint !== "function") return false;
    if (!mc.WaypointTexture?.Circle) return false;
    const bar = player.locatorBar;
    return Boolean(bar) && Number.isFinite(bar.maxCount) && bar.maxCount > 0;
  });
  state.capabilities = capabilities;
  state.lastCheckTick = currentTick();
  lastCheckTick = state.lastCheckTick;
  return capabilities;
}

function ensurePlayerState(player, reason, countJoin) {
  let state = playerStates.get(player.id);
  if (!state) {
    state = {
      id: player.id,
      capabilities: {},
      runtime: new Map(),
      joinedAtTick: currentTick(),
      lastCheckTick: 0,
      joins: 0,
      respawns: 0,
      lastReason: null,
    };
    playerStates.set(player.id, state);
  }
  if (countJoin) {
    state.joins += 1;
    if (reason === "respawn") {
      state.respawns += 1;
      playerRespawns += 1;
    }
    playerSessions += 1;
  }
  state.lastReason = reason;
  probePlayerCapabilities(player, state);
  return state;
}

/** Initializes the engine. Safe to call more than once. */
export function initCompatibilityEngine() {
  if (initialized) return;
  initialized = true;
  bootTick = currentTick();
  lastCheckTick = bootTick;
  globalCapabilities = probeModuleCapabilities();
  // Failures here are environment limits, not exceptions we cause; keep the
  // status list readable instead of logging one warning per missing API.
}

/**
 * Records which command names the startup event accepted. Called by
 * commands.js so DIAGNOSTICS can report real entry points instead of assuming
 * that `/atlas` exists.
 */
export function markCommandRegistered(names = []) {
  registeredCommandNames = Array.isArray(names)
    ? [...new Set(names.filter((name) => typeof name === "string" && name.length > 0))]
    : [];
  globalCapabilities.command = registeredCommandNames.length > 0;
  lastCheckTick = currentTick();
  // Registration proves the command capability but not that a player has run
  // the command. The feature becomes WORKING only after a real execution.
}

export function markCommandUnavailable() {
  registeredCommandNames = [];
  globalCapabilities.command = false;
  lastCheckTick = currentTick();
}

/**
 * Marks a globally probed API/signal unavailable after a real failure, for
 * example when an event signal exists but subscribing to it throws. Features
 * that require this capability then report UNAVAILABLE instead of READY.
 */
export function markCapabilityUnavailable(capability) {
  if (!CAPABILITY_IDS.includes(capability)) return;
  globalCapabilities[capability] = false;
  lastCheckTick = currentTick();
}

/** Real command names, chat aliases, item and scriptevent entry points. */
export function getEntryPointStatus() {
  const registered = new Set(registeredCommandNames);
  return {
    commandAvailable: globalCapabilities.command === true,
    commands: MENU_COMMANDS.filter((entry) => registered.has(entry.name)).map((entry) => ({
      name: entry.name,
      chatAlias: entry.chatAlias,
      primary: entry.primary,
    })),
    item: MENU_ITEM_ID,
    scriptEvent: MENU_SCRIPT_EVENT_ID,
  };
}

/** Called from events.js after worldLoad. Idempotent per world session. */
export function onWorldLoaded() {
  if (!initialized) return;
  worldLoads += 1;
  reinitCount += 1;
  lastReinitReason = "worldLoad";
  probeWorldCapabilities();
  // Drop state for players that are no longer present so a long session cannot
  // retain stale maps after a world switch.
  const presentIds = safeCall(
    () => mc.world.getPlayers().map((player) => player.id),
    null,
  );
  if (Array.isArray(presentIds)) {
    const present = new Set(presentIds);
    for (const id of [...playerStates.keys()]) {
      if (!present.has(id)) playerStates.delete(id);
    }
  }
  const players = safeCall(() => mc.world.getPlayers(), null);
  if (Array.isArray(players)) {
    for (const player of players) {
      const state = playerStates.get(player.id);
      if (state) probePlayerCapabilities(player, state);
    }
  }
}

/** Fallback for a client that does not fire worldLoad (deferred by 40 ticks). */
export function onWorldReadyFallback() {
  if (!initialized || worldLoads > 0) return;
  reinitCount += 1;
  lastReinitReason = "deferred world ready";
  probeWorldCapabilities();
}

/** Called on initial spawn and respawn. Only per-player state is re-probed. */
export function onPlayerSession(player, reason) {
  if (!initialized || !player?.id) return null;
  return ensurePlayerState(player, reason, true);
}

export function onPlayerLeft(playerId) {
  if (!initialized) return;
  playerStates.delete(playerId);
}

export function onPlayerDimensionChanged(player) {
  if (!initialized || !player?.id) return;
  dimensionChanges += 1;
  const state = ensurePlayerState(player, "dimension", false);
  state.lastCheckTick = currentTick();
}

/** Re-probes all APIs for one player, used by DIAGNOSTICS -> Refresh. */
export function refreshPlayerCompatibility(player) {
  if (!initialized || !player?.id) return null;
  const state = ensurePlayerState(player, "manual refresh", false);
  probeWorldCapabilities();
  return state;
}

export function markFeatureSuccess(player, featureId, detail = null) {
  if (!initialized) return;
  const tick = currentTick();
  const previous = readRuntime(player, featureId);
  // Avoid rewriting the same runtime record on every HUD tick. A pending
  // error is not throttled so a later success can clear the ERROR state.
  const pendingError =
    previous?.lastError &&
    (previous.lastSuccessTick == null || previous.lastError.tick > previous.lastSuccessTick);
  if (
    previous &&
    Number.isFinite(previous.lastSuccessTick) &&
    tick - previous.lastSuccessTick < 20 &&
    !pendingError
  ) {
    return;
  }
  writeRuntime(player, featureId, {
    lastSuccessTick: tick,
    lastSuccessDetail: detail,
  });
}

export function markFeatureError(player, featureId, error, category = "script") {
  if (!initialized) return;
  const tick = currentTick();
  writeRuntime(player, featureId, {
    lastError: {
      tick,
      category: ERROR_CATEGORIES.includes(category) ? category : "script",
      message: sanitizeError(error),
    },
  });
  recordEngineError(category, error);
}

export function getMergedCapabilities(player) {
  if (!player?.id || player.isValid === false) return { ...globalCapabilities };
  const state =
    playerStates.get(player.id) ?? ensurePlayerState(player, "lazy probe", false);
  return { ...globalCapabilities, ...state.capabilities };
}

export function getEngineStats() {
  return {
    version: ADDON_VERSION,
    bootTick,
    currentTick: currentTick(),
    uptimeTicks: Math.max(0, currentTick() - bootTick),
    worldLoads,
    reinitCount,
    lastReinitReason,
    lastCheckTick,
    dimensionChanges,
    playerSessions,
    playerRespawns,
    activePlayers: playerStates.size,
    errors: { ...errorCounters },
    recentErrors: recentErrors.map((entry) => ({ ...entry })),
  };
}

export function getCompatibilitySnapshot(player, extraContext = []) {
  const capabilities = CAPABILITY_IDS.map((id) => {
    const value = getMergedCapabilities(player)[id];
    return {
      id,
      available: value === true ? true : value === false ? false : null,
    };
  });
  const features = FEATURE_DEFINITIONS.map((definition) => {
    const caps = definition.global
      ? { ...globalCapabilities }
      : getMergedCapabilities(player);
    const runtime = readRuntime(player, definition.id) ?? {};
    const checkTick = definition.global
      ? lastCheckTick
      : playerStates.get(player?.id)?.lastCheckTick ?? lastCheckTick;
    return buildFeatureRow(definition, caps, { ...runtime, lastCheckTick: checkTick });
  });
  const summary = buildCompatibilitySummary(features);
  return {
    version: ADDON_VERSION,
    gameVersion: TARGET_GAME_VERSION.join("."),
    serverModule: SCRIPT_MODULES.server,
    uiModule: SCRIPT_MODULES.serverUi,
    engine: getEngineStats(),
    entryPoints: getEntryPointStatus(),
    features,
    capabilities,
    summary,
    contextLines: Array.isArray(extraContext) ? extraContext.slice(0, 20) : [],
  };
}

export function getCapabilitySummary(player) {
  const merged = getMergedCapabilities(player);
  const available = [];
  const unavailable = [];
  const unknown = [];
  for (const id of CAPABILITY_IDS) {
    const value = merged[id];
    if (value === true) available.push(id);
    else if (value === false) unavailable.push(id);
    else unknown.push(id);
  }
  return { available, unavailable, unknown };
}
