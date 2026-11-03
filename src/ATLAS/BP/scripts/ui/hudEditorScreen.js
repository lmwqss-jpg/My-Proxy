/** HUD editor: live panel toggles, armor pieces, colour, alert threshold and reset. */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { registerScreen } from "./router.js";
import {
  confirmAction,
  emptyLine,
  formTitle,
  safeShow,
  send,
  toggleLabel,
} from "./common.js";
import { getSettings, saveSettings } from "../store.js";
import { getHudPreview, updateHud } from "../hud.js";
import { t } from "../i18n.js";
import { getPath, setPath } from "../util.js";
import { DEFAULT_SETTINGS, HUD_COLOR_IDS } from "../config.js";

const TOGGLES = [
  ["hud.wasd", "hud.wasd"],
  ["hud.cps", "hud.cps"],
  ["hud.clickIndicators", "hud.clickIndicators"],
  ["hud.armor", "hud.armor"],
  ["hud.armorHelmet", "hud.piece.helmet"],
  ["hud.armorChest", "hud.piece.chest"],
  ["hud.armorLegs", "hud.piece.legs"],
  ["hud.armorBoots", "hud.piece.boots"],
  ["hud.armorDetail", "hud.armorDetail"],
  ["hud.potions", "hud.potions"],
  ["hud.totems", "hud.totems"],
  ["hud.coords", "hud.coords"],
  ["hud.health", "hud.health"],
  ["hud.name", "hud.name"],
  ["hud.worldInfo", "hud.worldInfo"],
  ["hud.dimension", "hud.dimension"],
  ["hud.compass", "hud.compass"],
  ["hud.waypoint", "hud.waypoint"],
  ["hud.durabilityAlert", "hud.durabilityAlert"],
  ["hud.durabilitySound", "hud.durabilitySound"],
  ["hud.session", "hud.session"],
  // Visual/PvP elements are part of the same action-bar line, so keep every
  // HUD switch reachable from this editor as well as from its own section.
  ["visual.playerInfo", "visual.playerInfo"],
  ["visual.worldInfo", "visual.worldInfo"],
  ["visual.healthBar", "visual.healthBar"],
  ["visual.stats", "visual.stats"],
  ["pvp.showHealth", "pvp.showHealth"],
];

function persist(player, settings) {
  if (!saveSettings(player, settings)) {
    send(player, t(settings.language, "errors.storage"));
    return false;
  }
  updateHud(player, true);
  return true;
}

function colorLabel(settings) {
  return t(settings.language, `hud.color.${settings.hud.color}`);
}

async function colorPicker(player, settings) {
  const language = settings.language;
  const index = Math.max(0, HUD_COLOR_IDS.indexOf(settings.hud.color));
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "hud.color")))
    .dropdown(
      t(language, "hud.color"),
      HUD_COLOR_IDS.map((id) => t(language, `hud.color.${id}`)),
      { defaultValueIndex: index },
    )
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const selected = typeof response.formValues[0] === "number"
    ? response.formValues[0]
    : index;
  const next = getSettings(player);
  next.hud.color = HUD_COLOR_IDS[selected] ?? next.hud.color;
  if (persist(player, next)) send(player, t(language, "hud.colorChanged"));
}

async function thresholdPicker(player, settings) {
  const language = settings.language;
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "hud.durabilityThreshold")))
    .slider(
      t(language, "hud.durabilityThreshold"),
      5,
      90,
      { defaultValue: settings.hud.durabilityThreshold, valueStep: 5 },
    )
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const value = response.formValues[0];
  if (typeof value !== "number") return;
  const next = getSettings(player);
  next.hud.durabilityThreshold = value;
  persist(player, next);
}

async function resetLayout(player, settings) {
  const language = settings.language;
  const confirmed = await confirmAction(
    player,
    settings,
    t(language, "hud.resetEditor"),
    t(language, "hud.resetEditorConfirm"),
    t(language, "hud.resetEditor"),
  );
  if (!confirmed) return;
  const next = getSettings(player);
  // Reset only HUD layout/appearance. Theme, language, PvP and waypoints are
  // deliberately left untouched.
  next.hud = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.hud));
  if (persist(player, next)) send(player, t(language, "hud.resetEditorDone"));
}

async function hudEditorScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const preview = getHudPreview(player);
    const body = [
      `§7${t(language, "hud.editorBody")}`,
      `§8${t(language, "hud.editorLimits")}`,
      emptyLine(),
      `§7${t(language, "hud.color")}: §f${colorLabel(settings)}`,
      `§7${t(language, "hud.durabilityThreshold")}: §f${settings.hud.durabilityThreshold}%`,
      `§8${t(language, "hud.livePreview", { preview })}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "hud.editorTitle")))
      .body(body);

    for (const [path, key] of TOGGLES) {
      form.button(
        toggleLabel(settings, t(language, key), getPath(settings, path) === true),
      );
    }
    form
      .button(`§b${t(language, "hud.color")} §8| §f${colorLabel(settings)}`)
      .button(`§b${t(language, "hud.durabilityThreshold")} §8| §f${settings.hud.durabilityThreshold}%`)
      .button(`§c${t(language, "hud.resetEditor")}`)
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
      await colorPicker(player, getSettings(player));
    } else if (action === 1) {
      await thresholdPicker(player, getSettings(player));
    } else if (action === 2) {
      await resetLayout(player, getSettings(player));
    } else {
      return;
    }
  }
}

registerScreen("hud.editor", hudEditorScreen);
