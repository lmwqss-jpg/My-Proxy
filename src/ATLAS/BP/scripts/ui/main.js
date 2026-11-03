/** ATLAS CLIENT main menu. */

import { world } from "@minecraft/server";
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
import "./statusScreens.js";
import "./espchestScreen.js";
import "./hudScreen.js";
import "./hudEditorScreen.js";
import "./visualScreen.js";
import "./pvpScreen.js";
import "./utilitiesScreen.js";
import "./settingsScreen.js";

function homeSummary(player, language) {
  const lines = [`§7${t(language, "menu.player", { name: player.name })}`];
  try {
    lines.push(
      `§7${t(language, "menu.world", {
        day: world.getDay(),
        players: world.getPlayers().length,
      })}`,
    );
  } catch {
    lines.push(`§8${t(language, "common.notAvailable")}`);
  }
  return lines.join("\n");
}

/** The order here is the visible main-menu order. */
function sectionsFor(language) {
  return [
    { id: "home", title: t(language, "home.title"), desc: t(language, "menu.homeDesc"), icon: ICONS.hud },
    { id: "espchest", title: t(language, "espchest.title"), desc: t(language, "menu.espchestDesc"), icon: ICONS.utilities },
    { id: "hud", title: t(language, "hud.title"), desc: t(language, "menu.hudDesc"), icon: ICONS.hud },
    { id: "visual", title: t(language, "visual.title"), desc: t(language, "menu.visualDesc"), icon: ICONS.visual },
    { id: "player", title: t(language, "player.title"), desc: t(language, "menu.playerDesc"), icon: ICONS.visual },
    { id: "movement", title: t(language, "movement.title"), desc: t(language, "menu.movementDesc"), icon: ICONS.hud },
    { id: "armor", title: t(language, "armor.title"), desc: t(language, "menu.armorDesc"), icon: ICONS.hud },
    { id: "items", title: t(language, "items.title"), desc: t(language, "menu.itemsDesc"), icon: ICONS.utilities },
    { id: "potions", title: t(language, "potions.title"), desc: t(language, "menu.potionsDesc"), icon: ICONS.visual },
    { id: "totems", title: t(language, "totems.title"), desc: t(language, "menu.totemsDesc"), icon: ICONS.utilities },
    { id: "pvp", title: t(language, "pvp.title"), desc: t(language, "menu.pvpDesc"), icon: ICONS.pvp },
    { id: "utilities", title: t(language, "utilities.title"), desc: t(language, "menu.utilitiesDesc"), icon: ICONS.utilities },
    { id: "settings", title: t(language, "settings.title"), desc: t(language, "menu.settingsDesc"), icon: ICONS.settings },
    { id: "settings.diagnostics", title: t(language, "diag.title"), desc: t(language, "menu.diagnosticsDesc"), icon: ICONS.settings },
    { id: "settings.about", title: t(language, "settings.aboutTitle"), desc: t(language, "menu.aboutDesc"), icon: ICONS.settings },
  ];
}

async function mainScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const theme = getTheme(settings.theme);
    const sections = sectionsFor(language);
    const body = [
      `§7${t(language, "menu.subtitle")}`,
      emptyLine(),
      homeSummary(player, language),
      `§7${t(language, "common.theme")}: §f${currentThemeName(settings)}§8 | §7${t(language, "common.language")}: §f${currentLanguageName(settings)}`,
      `§a> §7${t(language, "menu.ready")}`,
      emptyLine(),
      `§8${t(language, "menu.hint")}`,
      `§8${t(language, "menu.openHint")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(`${theme.bright}§lATLAS CLIENT`)
      .body(body);
    for (const section of sections) {
      form.button(
        sectionButton(settings, section.title, section.desc),
        section.icon,
      );
    }
    form.button(`§8${t(language, "menu.close")}`, ICONS.close);

    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const index = response.selection ?? -1;
    if (index < 0 || index >= sections.length) return;
    await openScreen(sections[index].id, player);
  }
}

registerScreen("main", mainScreen);
