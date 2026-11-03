/** ATLAS CLIENT main menu. */

import { ActionFormData } from "@minecraft/server-ui";
import { registerScreen, openScreen } from "./router.js";
import {
  ICONS,
  currentLanguageName,
  currentThemeName,
  emptyLine,
  formTitle,
  safeShow,
  sectionButton,
} from "./common.js";
import { getSettings } from "../store.js";
import { t } from "../i18n.js";
import { getTheme } from "../themes.js";
import "./hudScreen.js";
import "./visualScreen.js";
import "./pvpScreen.js";
import "./utilitiesScreen.js";
import "./settingsScreen.js";

async function mainScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const theme = getTheme(settings.theme);
    const body = [
      `§7${t(language, "menu.subtitle")}`,
      emptyLine(),
      `§7${t(language, "common.theme")}: §f${currentThemeName(settings)}§8 | §7${t(language, "common.language")}: §f${currentLanguageName(settings)}`,
      `§a> §7${t(language, "menu.ready")}`,
      emptyLine(),
      `§8${t(language, "menu.hint")}`,
      `§8${t(language, "menu.openHint")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(`${theme.bright}§lATLAS CLIENT`)
      .body(body)
      .button(
        sectionButton(settings, t(language, "hud.title"), t(language, "menu.hudDesc")),
        ICONS.hud,
      )
      .button(
        sectionButton(settings, t(language, "visual.title"), t(language, "menu.visualDesc")),
        ICONS.visual,
      )
      .button(
        sectionButton(settings, t(language, "pvp.title"), t(language, "menu.pvpDesc")),
        ICONS.pvp,
      )
      .button(
        sectionButton(settings, t(language, "utilities.title"), t(language, "menu.utilitiesDesc")),
        ICONS.utilities,
      )
      .button(
        sectionButton(settings, t(language, "settings.title"), t(language, "menu.settingsDesc")),
        ICONS.settings,
      )
      .button(`§8${t(language, "menu.close")}`, ICONS.close);

    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    switch (response.selection) {
      case 0:
        await openScreen("hud", player);
        break;
      case 1:
        await openScreen("visual", player);
        break;
      case 2:
        await openScreen("pvp", player);
        break;
      case 3:
        await openScreen("utilities", player);
        break;
      case 4:
        await openScreen("settings", player);
        break;
      default:
        return;
    }
  }
}

registerScreen("main", mainScreen);
