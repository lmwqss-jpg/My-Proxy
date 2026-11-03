/** HUD element toggles and HUD-specific options. */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { registerScreen } from "./router.js";
import {
  emptyLine,
  formTitle,
  safeShow,
  send,
  toggleLabel,
} from "./common.js";
import { getSettings, saveSettings } from "../store.js";
import { updateHud, getHudPreview } from "../hud.js";
import { t } from "../i18n.js";
import { getPath, setPath } from "../util.js";

const TOGGLES = [
  ["hud.coords", "hud.coords"],
  ["hud.health", "hud.health"],
  ["hud.name", "hud.name"],
  ["hud.worldInfo", "hud.worldInfo"],
  ["hud.dimension", "hud.dimension"],
  ["hud.compass", "hud.compass"],
  ["hud.waypoint", "hud.waypoint"],
];

const ALL_HUD_PATHS = [
  "hud.coords",
  "hud.health",
  "hud.name",
  "hud.worldInfo",
  "hud.dimension",
  "hud.compass",
  "hud.waypoint",
];

function persist(player, settings) {
  if (!saveSettings(player, settings)) {
    send(player, t(settings.language, "errors.storage"));
    return false;
  }
  updateHud(player, true);
  return true;
}

async function hudOptions(player, settings) {
  const language = settings.language;
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "hud.settings")))
    .toggle(t(language, "hud.precise"), { defaultValue: settings.hud.precise })
    .toggle(t(language, "hud.compact"), { defaultValue: settings.hud.compact })
    .slider(
      t(language, "hud.interval"),
      5,
      40,
      { defaultValue: settings.hud.interval, valueStep: 5 },
    )
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const values = response.formValues;
  const next = getSettings(player);
  next.hud.precise = Boolean(values[0]);
  next.hud.compact = Boolean(values[1]);
  next.hud.interval = typeof values[2] === "number" ? values[2] : next.hud.interval;
  persist(player, next);
}

async function hudScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const preview = getHudPreview(player);
    const body = [
      `§7${t(language, "hud.body")}`,
      `§8${t(language, "hud.menuAccess")}`,
      emptyLine(),
      `§8${t(language, "hud.livePreview", { preview })}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "hud.title")))
      .body(body);
    for (const [path, key] of TOGGLES) {
      form.button(
        toggleLabel(settings, t(language, key), getPath(settings, path) === true),
      );
    }
    form
      .button(`§b${t(language, "hud.settings")}`)
      .button(`§a${t(language, "hud.enableAll")}`)
      .button(`§c${t(language, "hud.disableAll")}`)
      .button(`§8${t(language, "common.back")}`);

    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < TOGGLES.length) {
      const next = getSettings(player);
      const path = TOGGLES[selection][0];
      setPath(next, path, !getPath(next, path));
      persist(player, next);
      continue;
    }
    const action = selection - TOGGLES.length;
    if (action === 0) {
      await hudOptions(player, getSettings(player));
    } else if (action === 1 || action === 2) {
      const next = getSettings(player);
      for (const path of ALL_HUD_PATHS) setPath(next, path, action === 1);
      persist(player, next);
      send(player, t(language, action === 1 ? "hud.allOn" : "hud.allOff"));
    } else {
      return;
    }
  }
}

registerScreen("hud", hudScreen);
