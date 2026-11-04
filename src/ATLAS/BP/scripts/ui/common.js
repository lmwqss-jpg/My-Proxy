/** Shared form helpers, icon paths and safe navigation plumbing. */

import { system } from "@minecraft/server";
import {
  ActionFormData,
  FormCancelationReason,
} from "@minecraft/server-ui";
import { t } from "../i18n.js";
import { getSettings } from "../store.js";
import { getTheme } from "../themes.js";

export const ICONS = Object.freeze({
  hud: "textures/atlas/common/atlas_hud",
  visual: "textures/atlas/common/atlas_visual",
  pvp: "textures/atlas/common/atlas_pvp",
  utilities: "textures/atlas/common/atlas_utilities",
  servers: "textures/atlas/common/atlas_servers",
  settings: "textures/atlas/common/atlas_settings",
  close: "textures/atlas/common/atlas_close",
});

export function waitTicks(ticks) {
  return new Promise((resolve) => {
    system.runTimeout(() => resolve(undefined), ticks);
  });
}

/**
 * A form could not be shown at all. Callers treat this as a real failure so
 * DIAGNOSTICS cannot record the section as WORKING after the UI never opened.
 */
export class FormShowError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "FormShowError";
    this.cause = cause;
  }
}

/**
 * Shows a form and retries the common "player is busy" case. A form factory is
 * used so a retry always gets a fresh builder. A form that never becomes
 * available throws FormShowError instead of looking like a user cancel.
 */
export async function safeShow(player, formFactory) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await formFactory().show(player);
      if (response.canceled && response.cancelationReason === FormCancelationReason.UserBusy) {
        if (attempt < 2) {
          await waitTicks(10);
          continue;
        }
        notifyFormFailure(player);
        throw new FormShowError("The form stayed busy after three attempts.");
      }
      return response;
    } catch (error) {
      if (error instanceof FormShowError) throw error;
      console.warn(`[ATLAS] ${t("en", "errors.formLog", { error })}`);
      notifyFormFailure(player);
      throw new FormShowError(`The form could not be shown: ${error}`, error);
    }
  }
  throw new FormShowError("The form could not be shown.");
}

function notifyFormFailure(player) {
  try {
    const language = getSettings(player).language;
    player.sendMessage(`§cATLAS §8| §r§c${t(language, "errors.form")}`);
  } catch {
    // The player may already have disconnected.
  }
}

export function formTitle(settings, sectionTitle) {
  const theme = getTheme(settings.theme);
  return `${theme.bright}§lATLAS CLIENT §8| §r${theme.accent}${sectionTitle}`;
}

export function currentThemeName(settings) {
  return t(settings.language, getTheme(settings.theme).nameKey);
}

export function currentLanguageName(settings) {
  return t(settings.language, `lang.${settings.language}`);
}

export function toggleLabel(settings, label, enabled) {
  return `${enabled ? "§a" : "§c"}${t(settings.language, enabled ? "common.on" : "common.off")} §8| §r§f${label}`;
}

export function sectionButton(settings, title, description) {
  const theme = getTheme(settings.theme);
  return `${theme.bright}§l${title}§r §8| §7${description}`;
}

export function send(player, message) {
  try {
    player.sendMessage(`§bATLAS §8| §r${message}`);
  } catch {
    // A player can disconnect between a form response and this call.
  }
}

export async function confirmAction(player, settings, title, body, confirmLabel) {
  const theme = getTheme(settings.theme);
  const form = new ActionFormData()
    .title(formTitle(settings, title))
    .body(`§7${body}`)
    .button(`§c${confirmLabel}`, ICONS.close)
    .button(`§8${t(settings.language, "common.cancel")}`);
  const response = await safeShow(player, () => form);
  if (!response || response.canceled) return false;
  return response.selection === 0;
}

export function emptyLine() {
  return `§8${"-".repeat(28)}`;
}
