/** Menu-item helpers, separated from menu navigation to avoid import cycles. */

import { ItemStack } from "@minecraft/server";
import { MENU_ITEM_ID } from "./config.js";

function inventoryOf(player) {
  try {
    const inventory = player.getComponent("minecraft:inventory");
    return inventory?.container ?? null;
  } catch {
    return null;
  }
}

export function hasMenuItem(player) {
  const container = inventoryOf(player);
  if (!container) return false;
  try {
    for (let slot = 0; slot < container.size; slot++) {
      if (container.getItem(slot)?.typeId === MENU_ITEM_ID) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Adds exactly one menu item when missing.
 * @returns {"present" | "given" | "full" | "error"}
 */
export function ensureMenuItem(player) {
  const container = inventoryOf(player);
  if (!container) return "error";
  if (hasMenuItem(player)) return "present";
  try {
    const leftover = container.addItem(new ItemStack(MENU_ITEM_ID, 1));
    return leftover ? "full" : "given";
  } catch (error) {
    console.warn(`[ATLAS] Could not give the menu item: ${error}`);
    return "error";
  }
}
