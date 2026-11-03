/** Theme, language, HUD access, transfer codes, diagnostics and reset. */

import { system, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { registerScreen, openScreen } from "./router.js";
import {
  confirmAction,
  currentLanguageName,
  currentThemeName,
  emptyLine,
  formTitle,
  safeShow,
  send,
} from "./common.js";
import {
  getSettings,
  getWaypoints,
  saveSettings,
} from "../store.js";
import { getHudPreview, updateHud } from "../hud.js";
import { isLocatorSupported, syncLocator, syncAllLocators } from "../locator.js";
import { hasMenuItem } from "../items.js";
import {
  normalizeSettings,
  settingsFromCode,
  settingsToCode,
} from "../settings.js";
import { t } from "../i18n.js";
import { getTheme } from "../themes.js";
import {
  ADDON_VERSION,
  LANGUAGE_IDS,
  SCRIPT_MODULES,
  TARGET_GAME_VERSION,
  THEME_IDS,
} from "../config.js";

function persist(player, settings, language) {
  if (!saveSettings(player, settings)) {
    send(player, t(language, "errors.storage"));
    return false;
  }
  updateHud(player, true);
  syncLocator(player);
  return true;
}

async function themePicker(player, settings) {
  const language = settings.language;
  const options = THEME_IDS.map((id) => t(language, getTheme(id).nameKey));
  const index = Math.max(0, THEME_IDS.indexOf(settings.theme));
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "settings.themePicker")))
    .dropdown(t(language, "settings.themePicker"), options, { defaultValueIndex: index })
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const selected = typeof response.formValues[0] === "number" ? response.formValues[0] : index;
  const next = getSettings(player);
  next.theme = THEME_IDS[selected] ?? next.theme;
  if (persist(player, next, language)) {
    send(player, t(language, "settings.themeChanged", { theme: currentThemeName(next) }));
  }
}

async function languagePicker(player, settings) {
  const language = settings.language;
  const options = LANGUAGE_IDS.map((id) => t(id, `lang.${id}`));
  const index = Math.max(0, LANGUAGE_IDS.indexOf(settings.language));
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "settings.languagePicker")))
    .dropdown(t(language, "settings.languagePicker"), options, { defaultValueIndex: index })
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const selected = typeof response.formValues[0] === "number" ? response.formValues[0] : index;
  const next = getSettings(player);
  next.language = LANGUAGE_IDS[selected] ?? next.language;
  if (persist(player, next, next.language)) {
    send(player, t(next.language, "settings.languageChanged"));
  }
}

async function exportScreen(player) {
  const settings = getSettings(player);
  const language = settings.language;
  const code = settingsToCode(settings);
  const form = new ActionFormData()
    .title(formTitle(settings, t(language, "settings.exportTitle")))
    .body(`§7${t(language, "settings.exportBody", { code: `§f${code}` })}`)
    .button(`§b${t(language, "settings.sendCode")}`)
    .button(`§8${t(language, "common.back")}`);
  const response = await safeShow(player, () => form);
  if (!response || response.canceled) return;
  if (response.selection === 0) {
    send(player, `${t(language, "settings.codeSent")} §f${code}`);
  }
}

async function importScreen(player) {
  const settings = getSettings(player);
  const language = settings.language;
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "settings.importTitle")))
    .textField(
      t(language, "settings.importField"),
      t(language, "settings.importPlaceholder"),
      { defaultValue: "" },
    )
    .submitButton(t(language, "common.apply"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const code = typeof response.formValues[0] === "string" ? response.formValues[0] : "";
  const imported = settingsFromCode(code);
  if (!imported) {
    send(player, t(language, "settings.importInvalid"));
    return;
  }
  if (!persist(player, imported, imported.language)) return;
  syncAllLocators();
  send(player, t(imported.language, "settings.importDone"));
}

async function diagnosticsScreen(player) {
  if (!player.isValid) return;
  {
    const settings = getSettings(player);
    const language = settings.language;
    const locator = isLocatorSupported(player);
    const body = [
      `§7${t(language, "diag.scripts", { status: `§a${t(language, "diag.statusOk")}` })}`,
      `§8${t(language, "diag.api", {
        game: TARGET_GAME_VERSION.join("."),
        server: SCRIPT_MODULES.server,
        ui: SCRIPT_MODULES.serverUi,
      })}`,
      `§7${t(language, "diag.menuItem", {
        status: hasMenuItem(player)
          ? `§a${t(language, "diag.statusOk")}`
          : `§c${t(language, "diag.statusMissing")}`,
      })}`,
      `§8${t(language, "diag.command")}`,
      `§7${t(language, "diag.locator", {
        status: locator
          ? `§a${t(language, "diag.statusOk")}`
          : `§c${t(language, "diag.statusUnsupported")}`,
      })}`,
      emptyLine(),
      `§7${t(language, "diag.waypoints", { count: getWaypoints().length })}`,
      `§7${t(language, "diag.online", { count: world.getPlayers().length })}`,
      `§8${t(language, "diag.uptime", { ticks: system.currentTick })}`,
      `§8${t(language, "diag.footer")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "diag.title")))
      .body(body)
      .button(`§8${t(language, "common.back")}`);
    await safeShow(player, () => form);
  }
}

async function aboutScreen(player) {
  const settings = getSettings(player);
  const language = settings.language;
  const form = new ActionFormData()
    .title(formTitle(settings, t(language, "settings.aboutTitle")))
    .body(`§7${t(language, "settings.aboutBody", { version: ADDON_VERSION })}`)
    .button(`§8${t(language, "common.back")}`);
  const response = await safeShow(player, () => form);
  if (!response || response.canceled) return;
}

async function settingsScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const body = [
      `§7${t(language, "settings.body")}`,
      emptyLine(),
      `§7${t(language, "settings.theme", { theme: `§f${currentThemeName(settings)}` })}`,
      `§7${t(language, "settings.language", { language: `§f${currentLanguageName(settings)}` })}`,
      `§8${t(language, "common.version")}: §7${ADDON_VERSION}`,
      `§8${t(language, "hud.livePreview", { preview: getHudPreview(player) })}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "settings.title")))
      .body(body)
      .button(`§b${t(language, "settings.theme", { theme: currentThemeName(settings) })}`)
      .button(`§b${t(language, "settings.language", { language: currentLanguageName(settings) })}`)
      .button(`§b${t(language, "settings.hud")}`)
      .button(`§a${t(language, "settings.save")}`)
      .button(`§b${t(language, "settings.export")}`)
      .button(`§b${t(language, "settings.import")}`)
      .button(`§c${t(language, "settings.reset")}`)
      .button(`§7${t(language, "settings.diagnostics")}`)
      .button(`§7${t(language, "settings.about")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    switch (response.selection) {
      case 0:
        await themePicker(player, settings);
        break;
      case 1:
        await languagePicker(player, settings);
        break;
      case 2:
        await openScreen("hud", player);
        break;
      case 3:
        if (saveSettings(player, settings)) {
          send(player, t(language, "common.saved"));
        } else {
          send(player, t(language, "errors.storage"));
        }
        break;
      case 4:
        await openScreen("settings.export", player);
        break;
      case 5:
        await openScreen("settings.import", player);
        break;
      case 6: {
        const confirmed = await confirmAction(
          player,
          settings,
          t(language, "settings.reset"),
          t(language, "settings.resetConfirm"),
          t(language, "settings.reset"),
        );
        if (confirmed) {
          const next = normalizeSettings({});
          if (persist(player, next, next.language)) {
            syncAllLocators();
            send(player, t(next.language, "settings.resetDone"));
          }
        }
        break;
      }
      case 7:
        await openScreen("settings.diagnostics", player);
        break;
      case 8:
        await openScreen("settings.about", player);
        break;
      default:
        return;
    }
  }
}

registerScreen("settings", settingsScreen);
registerScreen("settings.export", exportScreen);
registerScreen("settings.import", importScreen);
registerScreen("settings.diagnostics", diagnosticsScreen);
registerScreen("settings.about", aboutScreen);
