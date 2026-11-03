/**
 * Real input tracking.
 *
 * The Script API exposes movement intent, button states for Jump/Sneak only,
 * and game events for attacks and interactions. It has no raw mouse/controller
 * click stream, so the CPS counter only counts actions the game actually
 * reports. It never invents a click or a rate.
 */

import { system, world } from "@minecraft/server";

const ACTION_WINDOW_TICKS = 20;
const MIN_INDICATOR_TICKS = 4;
const MOVEMENT_THRESHOLD = 0.2;
const MAX_TRACKED_ACTIONS = 80;

/** @type {Map<string, number[]>} */
const actionTicks = new Map();
/** @type {Map<string, {left: number, right: number}>} */
const lastActionTicks = new Map();
let initialized = false;

function isPlayer(entity) {
  return Boolean(entity && entity.typeId === "minecraft:player");
}

function recordAction(player, kind) {
  if (!isPlayer(player) || !player.isValid) return;
  const tick = system.currentTick;
  const last = lastActionTicks.get(player.id) ?? { left: -10_000, right: -10_000 };
  // A single right-click can fire both an interaction and an item-use event.
  // Collapse events from the same tick so the counter stays honest.
  if (tick - last[kind] <= 1) return;
  last[kind] = tick;
  lastActionTicks.set(player.id, last);

  const actions = actionTicks.get(player.id) ?? [];
  actions.push(tick);
  while (actions.length > MAX_TRACKED_ACTIONS) actions.shift();
  actionTicks.set(player.id, actions);
}

function subscribe(signal, callback) {
  try {
    signal.subscribe(callback);
  } catch (error) {
    console.warn(`[ATLAS] Input event unavailable: ${error}`);
  }
}

/** Subscribes once to the official input/action events. */
export function initInputTracking() {
  if (initialized) return;
  initialized = true;

  subscribe(world.afterEvents.entityHitEntity, (event) => {
    if (isPlayer(event.damagingEntity)) recordAction(event.damagingEntity, "left");
  });
  subscribe(world.afterEvents.entityHitBlock, (event) => {
    if (isPlayer(event.damagingEntity)) recordAction(event.damagingEntity, "left");
  });
  subscribe(world.afterEvents.playerInteractWithBlock, (event) => {
    if (event.isFirstEvent) recordAction(event.player, "right");
  });
  subscribe(world.afterEvents.playerInteractWithEntity, (event) => {
    recordAction(event.player, "right");
  });
  subscribe(world.afterEvents.itemUse, (event) => {
    recordAction(event.source, "right");
  });
}

function movementState(player) {
  try {
    const movement = player.inputInfo.getMovementVector();
    return {
      // Bedrock's vector is (strafe, forward): +x is left, +y is forward.
      forward: movement.y > MOVEMENT_THRESHOLD,
      back: movement.y < -MOVEMENT_THRESHOLD,
      left: movement.x > MOVEMENT_THRESHOLD,
      right: movement.x < -MOVEMENT_THRESHOLD,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the real state used by the input panels. `wasd` is null when the
 * client's movement vector cannot be read, so callers can show "not
 * available" instead of a fake neutral state.
 */
export function getInputSnapshot(player, hudInterval = 10) {
  const tick = system.currentTick;
  const actions = actionTicks.get(player.id) ?? [];
  while (actions.length > 0 && tick - actions[0] >= ACTION_WINDOW_TICKS) {
    actions.shift();
  }
  const last = lastActionTicks.get(player.id) ?? { left: -10_000, right: -10_000 };
  const indicatorTicks = Math.max(MIN_INDICATOR_TICKS, Math.round(hudInterval) + 1);

  return {
    wasd: movementState(player),
    cps: actions.length,
    left: tick - last.left <= indicatorTicks,
    right: tick - last.right <= indicatorTicks,
  };
}

export function forgetInputState(playerId) {
  actionTicks.delete(playerId);
  lastActionTicks.delete(playerId);
}
