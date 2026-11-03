/**
 * Reads real player status for the HUD: equipped armor durability, active
 * effects and totems. Every value comes from the official Script API; when a
 * component or value is unavailable the collector returns null so the HUD can
 * hide the panel instead of showing an invented number.
 */

import { EquipmentSlot } from "@minecraft/server";
import { ARMOR_PIECES } from "./config.js";

export const TOTEM_ID = "minecraft:totem_of_undying";

const EQUIPMENT_SLOTS = Object.freeze({
  helmet: EquipmentSlot.Head,
  chest: EquipmentSlot.Chest,
  legs: EquipmentSlot.Legs,
  boots: EquipmentSlot.Feet,
  mainhand: EquipmentSlot.Mainhand,
  offhand: EquipmentSlot.Offhand,
});

function equippableOf(player) {
  try {
    return player.getComponent("minecraft:equippable");
  } catch {
    return undefined;
  }
}

/** Reads real remaining/max durability from an ItemStack, or null. */
export function durabilityOf(item) {
  if (!item) return null;
  try {
    const durability = item.getComponent("minecraft:durability");
    if (!durability) return null;
    const max = Number(durability.maxDurability);
    const damage = Number(durability.damage);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(damage)) return null;
    const remaining = Math.max(0, Math.min(max, max - damage));
    return {
      remaining,
      max,
      percent: (remaining / max) * 100,
    };
  } catch {
    return null;
  }
}

function describeItem(item, piece) {
  if (!item) {
    return { ...piece, empty: true, typeId: null, durability: null };
  }
  return {
    ...piece,
    empty: false,
    typeId: item.typeId,
    durability: durabilityOf(item),
  };
}

/**
 * Collects the four armor slots and the held item. Returns null if the
 * equippable component itself is unavailable.
 */
export function collectEquipment(player) {
  const equippable = equippableOf(player);
  if (!equippable) return null;

  const armor = [];
  for (const piece of ARMOR_PIECES) {
    let item;
    try {
      item = equippable.getEquipment(EQUIPMENT_SLOTS[piece.key]);
    } catch {
      item = undefined;
    }
    armor.push(describeItem(item, piece));
  }

  let mainhand;
  try {
    const item = equippable.getEquipment(EQUIPMENT_SLOTS.mainhand);
    mainhand = item
      ? {
          key: "mainhand",
          label: "M",
          nameKey: "hud.piece.mainhand",
          empty: false,
          typeId: item.typeId,
          durability: durabilityOf(item),
        }
      : null;
  } catch {
    mainhand = null;
  }

  return { armor, mainhand };
}

/** Active effects with their real remaining duration in ticks. */
export function collectEffects(player) {
  try {
    return player
      .getEffects()
      .filter((effect) => effect && effect.isValid !== false)
      .map((effect) => ({
        typeId: effect.typeId,
        duration: Number(effect.duration),
        amplifier: Number.isFinite(effect.amplifier) ? effect.amplifier : 0,
      }))
      // getEffects() only returns active effects. Negative durations are
      // infinite and are rendered as "∞"; other values are real ticks left.
      .sort((left, right) => left.duration - right.duration);
  } catch {
    return null;
  }
}

/**
 * Counts totems in the main inventory plus the offhand. Returns null when the
 * inventory cannot be read, so "0" is only shown when it is a real zero.
 */
export function collectTotems(player) {
  let total = 0;
  try {
    const inventory = player.getComponent("minecraft:inventory");
    const container = inventory?.container;
    if (!container || !Number.isFinite(container.size) || container.size <= 0) return null;
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item?.typeId === TOTEM_ID) {
        total += Math.max(0, Number(item.amount) || 1);
      }
    }
  } catch {
    return null;
  }

  try {
    const equippable = equippableOf(player);
    const offhand = equippable?.getEquipment(EQUIPMENT_SLOTS.offhand);
    if (offhand?.typeId === TOTEM_ID) {
      total += Math.max(0, Number(offhand.amount) || 1);
    }
  } catch {
    // The main-inventory count is still real; just skip the offhand.
  }
  return total;
}
