/** PvP health alerts, persisted kill/death stats and session combat log. */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { registerScreen, openScreen } from "./router.js";
import {
  confirmAction,
  emptyLine,
  formTitle,
  safeShow,
  send,
  toggleLabel,
} from "./common.js";
import {
  getCombatStats,
  getSettings,
  resetCombatStats,
  saveSettings,
} from "../store.js";
import { updateHud } from "../hud.js";
import { t } from "../i18n.js";
import { dimensionLabel } from "../hudFormat.js";
import { formatKd, getPath, setPath, formatCoord } from "../util.js";

const TOGGLES = [
  ["pvp.showHealth", "pvp.showHealth"],
  ["pvp.lowHealthAlert", "pvp.lowHealthAlert"],
  ["pvp.alertSound", "pvp.alertSound"],
  ["pvp.alertTitle", "pvp.alertTitle"],
  ["pvp.deathWaypoint", "pvp.deathWaypoint"],
];

async function thresholdOptions(player, settings) {
  const language = settings.language;
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "pvp.alertThreshold")))
    .slider(
      t(language, "pvp.alertThreshold"),
      2,
      19,
      { defaultValue: settings.pvp.alertThreshold, valueStep: 1 },
    )
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const next = getSettings(player);
  next.pvp.alertThreshold =
    typeof response.formValues[0] === "number"
      ? response.formValues[0]
      : next.pvp.alertThreshold;
  if (!saveSettings(player, next)) {
    send(player, t(language, "errors.storage"));
  }
}

function historyLines(stats, language) {
  if (stats.history.length === 0) return `§8${t(language, "pvp.noHistory")}`;
  return stats.history
    .slice()
    .reverse()
    .map((entry) => {
      if (entry.type === "kill") {
        return `§7- ${t(language, "pvp.killEvent", { name: entry.name ?? "?" })}`;
      }
      if (entry.name) {
        return `§7- ${t(language, "pvp.deathEvent", { name: entry.name })}`;
      }
      return `§7- ${t(language, "pvp.deathCause")}`;
    })
    .join("\n");
}

function combatBody(stats, language) {
  const lastDeath = stats.lastDeath
    ? `§f${formatCoord(stats.lastDeath.x)} ${formatCoord(stats.lastDeath.y)} ${formatCoord(stats.lastDeath.z)} §8(${dimensionLabel(stats.lastDeath.dimensionId, language)})`
    : `§8${t(language, "pvp.noDeath")}`;
  return [
    `§7${t(language, "pvp.kills")}: §f${stats.kills}`,
    `§7${t(language, "pvp.deaths")}: §f${stats.deaths}`,
    `§7${t(language, "pvp.kd")}: §f${formatKd(stats.kills, stats.deaths)}`,
    emptyLine(),
    `§7${t(language, "pvp.damageDealt")}: §f${stats.damageDealt.toFixed(1)}`,
    `§7${t(language, "pvp.damageTaken")}: §f${stats.damageTaken.toFixed(1)}`,
    `§7${t(language, "pvp.lastDeath")}: ${lastDeath}`,
    emptyLine(),
    `§7${t(language, "pvp.history")}`,
    historyLines(stats, language),
    `§8${t(language, "pvp.statsBody")}`,
  ].join("\n");
}

async function combatLogScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const stats = getCombatStats(player);
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "pvp.statsTitle")))
      .body(combatBody(stats, language))
      .button(`§c${t(language, "pvp.resetStats")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "pvp.resetStats"),
        t(language, "pvp.resetConfirm"),
        t(language, "pvp.resetStats"),
      );
      if (confirmed) {
        resetCombatStats(player);
        send(player, t(language, "pvp.resetDone"));
        updateHud(player, true);
      }
      continue;
    }
    return;
  }
}

async function pvpScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const body = [
      `§7${t(language, "pvp.body")}`,
      emptyLine(),
      `§7${t(language, "pvp.alertThreshold")}: §f${t(language, "pvp.alertThresholdValue", { hp: settings.pvp.alertThreshold })}`,
      `§8${t(language, "pvp.statsBody")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "pvp.title")))
      .body(body);
    for (const [path, key] of TOGGLES) {
      form.button(
        toggleLabel(settings, t(language, key), getPath(settings, path) === true),
      );
    }
    form
      .button(`§b${t(language, "pvp.alertThreshold")}`)
      .button(`§b${t(language, "pvp.combatLog")}`)
      .button(`§c${t(language, "pvp.resetStats")}`)
      .button(`§8${t(language, "common.back")}`);

    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < TOGGLES.length) {
      const next = getSettings(player);
      const path = TOGGLES[selection][0];
      setPath(next, path, !getPath(next, path));
      if (!saveSettings(player, next)) {
        send(player, t(language, "errors.storage"));
      }
      updateHud(player, true);
      continue;
    }
    const action = selection - TOGGLES.length;
    if (action === 0) {
      await thresholdOptions(player, getSettings(player));
    } else if (action === 1) {
      await openScreen("pvp.log", player);
    } else if (action === 2) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "pvp.resetStats"),
        t(language, "pvp.resetConfirm"),
        t(language, "pvp.resetStats"),
      );
      if (confirmed) {
        resetCombatStats(player);
        send(player, t(language, "pvp.resetDone"));
        updateHud(player, true);
      }
    } else {
      return;
    }
  }
}

registerScreen("pvp", pvpScreen);
registerScreen("pvp.log", combatLogScreen);
