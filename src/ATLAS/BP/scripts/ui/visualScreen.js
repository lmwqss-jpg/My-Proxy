/** Visual information toggles, including official locator-bar waypoints. */

import { ActionFormData } from "@minecraft/server-ui";
import { registerScreen } from "./router.js";
import {
  emptyLine,
  formTitle,
  safeShow,
  send,
  toggleLabel,
} from "./common.js";
import { getSettings, saveSettings } from "../store.js";
import { getHudPreview, updateHud } from "../hud.js";
import { isLocatorSupported, syncLocator } from "../locator.js";
import { t } from "../i18n.js";
import { getPath, setPath } from "../util.js";

const TOGGLES = [
  ["visual.playerInfo", "visual.playerInfo"],
  ["visual.worldInfo", "visual.worldInfo"],
  ["visual.healthBar", "visual.healthBar"],
  ["visual.locator", "visual.locator"],
  ["visual.stats", "visual.stats"],
];

async function visualScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const locatorSupported = isLocatorSupported(player);
    const body = [
      `§7${t(language, "visual.body")}`,
      emptyLine(),
      `§7${t(language, "visual.locator")}: ${locatorSupported ? `§a${t(language, "diag.statusOk")}` : `§c${t(language, "diag.statusUnsupported")}`}`,
      `§8${t(language, "visual.locatorHint")}`,
      emptyLine(),
      `§8${t(language, "visual.preview", { preview: getHudPreview(player) })}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "visual.title")))
      .body(body);
    for (const [path, key] of TOGGLES) {
      form.button(
        toggleLabel(settings, t(language, key), getPath(settings, path) === true),
      );
    }
    form.button(`§8${t(language, "common.back")}`);

    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection < 0 || selection >= TOGGLES.length) return;

    const next = getSettings(player);
    const path = TOGGLES[selection][0];
    setPath(next, path, !getPath(next, path));
    if (!saveSettings(player, next)) {
      send(player, t(language, "errors.storage"));
      continue;
    }
    updateHud(player, true);
    if (path === "visual.locator") syncLocator(player);
  }
}

registerScreen("visual", visualScreen);
