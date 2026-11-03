/** Single entry point for opening the main menu, with re-entrancy protection. */

import { system } from "@minecraft/server";
import { openScreen } from "./ui/router.js";
import "./ui/main.js";

/** @type {Set<string>} */
const activeMenus = new Set();

export function openMenu(player) {
  if (!player || !player.isValid) return;
  if (activeMenus.has(player.id)) return;
  activeMenus.add(player.id);
  system.run(async () => {
    try {
      if (player.isValid) await openScreen("main", player);
    } catch (error) {
      console.warn(`[ATLAS] Could not open the menu: ${error}`);
    } finally {
      activeMenus.delete(player.id);
    }
  });
}
