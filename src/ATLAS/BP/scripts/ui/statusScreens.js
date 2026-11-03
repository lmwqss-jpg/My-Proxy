/** Read-only status sections with real controls for the panels they describe. */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { openScreen, registerScreen } from "./router.js";
import {
  emptyLine,
  formTitle,
  safeShow,
  send,
  toggleLabel,
} from "./common.js";
import { getSettings, saveSettings } from "../store.js";
import {
  collectSnapshot,
  getHudPreview,
  updateHud,
} from "../hud.js";
import {
  collectEffects,
  collectEquipment,
  collectTotems,
} from "../hudData.js";
import { getInputSnapshot } from "../input.js";
import { t } from "../i18n.js";
import {
  effectLabel,
  dimensionLabel,
  formatEffectDuration,
  gameModeLabel,
} from "../hudFormat.js";
import {
  formatCoord,
  formatSessionDuration,
  formatKd,
  getPath,
  setPath,
} from "../util.js";
import { TOGGLE_PATHS } from "../config.js";

function persist(player, settings) {
  if (!saveSettings(player, settings)) {
    send(player, t(settings.language, "errors.storage"));
    return false;
  }
  updateHud(player, true);
  return true;
}

function valueOrUnavailable(value, language) {
  return value === null || value === undefined || value === ""
    ? `§8${t(language, "common.notAvailable")}`
    : `§f${value}`;
}

function typeLabel(typeId) {
  return String(typeId ?? "")
    .replace(/^minecraft:/, "")
    .replace(/_/g, " ");
}

function coordinates(snapshot, language) {
  return Number.isFinite(snapshot.location?.x)
    ? `${formatCoord(snapshot.location.x)} ${formatCoord(snapshot.location.y)} ${formatCoord(snapshot.location.z)}`
    : t(language, "common.notAvailable");
}

function durabilityText(piece, language) {
  if (!piece || piece.empty) return t(language, "common.none");
  if (!piece.durability) return t(language, "common.notAvailable");
  const { remaining, max, percent } = piece.durability;
  return `${Math.ceil(remaining)}/${Math.ceil(max)} (${Math.round(percent)}%)`;
}

function effectLine(effect, language) {
  if (!effect) return "";
  const amplifier = Number.isFinite(effect.amplifier) ? effect.amplifier : 0;
  const level = amplifier > 0 ? ` ${amplifier + 1}` : "";
  return `${effectLabel(effect.typeId, language)}${level} §8| §f${formatEffectDuration(effect.duration)}`;
}

/** HOME: real summary plus shortcuts for the most used controls. */
async function homeScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const snapshot = collectSnapshot(player);
    const body = [
      `§7${t(language, "home.body")}`,
      emptyLine(),
      `§7${t(language, "common.name")}: ${valueOrUnavailable(snapshot.name, language)}`,
      `§7${t(language, "common.health")}: ${valueOrUnavailable(
        Number.isFinite(snapshot.health) && Number.isFinite(snapshot.maxHealth)
          ? `${Math.ceil(snapshot.health)}/${Math.ceil(snapshot.maxHealth)}`
          : null,
        language,
      )}`,
      `§7${t(language, "common.coordinates")}: §f${coordinates(snapshot, language)}`,
      `§7${t(language, "common.dimension")}: ${valueOrUnavailable(
        snapshot.dimensionId ? dimensionLabel(snapshot.dimensionId, language) : null,
        language,
      )}`,
      `§7${t(language, "common.waypoints")}: §f${snapshot.trackedWaypoint?.name ?? t(language, "common.none")}`,
      emptyLine(),
      `§8${t(language, "hud.livePreview", { preview: getHudPreview(player) })}`,
      `§8${t(language, "menu.openHint")}`,
    ].join("\n");

    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "home.title")))
      .body(body)
      .button(`§b${t(language, "hud.editor")}`, "textures/atlas/common/atlas_hud")
      .button(
        toggleLabel(settings, t(language, "hud.session"), settings.hud.session),
      )
      .button(`§a${t(language, "hud.enableAll")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      await openScreen("hud.editor", player);
    } else if (response.selection === 1) {
      const next = getSettings(player);
      next.hud.session = !next.hud.session;
      persist(player, next);
    } else if (response.selection === 2) {
      const next = getSettings(player);
      for (const path of TOGGLE_PATHS.filter((entry) => entry.startsWith("hud."))) {
        setPath(next, path, true);
      }
      persist(player, next);
      send(player, t(language, "hud.allOn"));
    } else {
      return;
    }
  }
}

const PLAYER_TOGGLES = [
  ["hud.name", "hud.name"],
  ["hud.health", "hud.health"],
  ["hud.coords", "hud.coords"],
  ["visual.playerInfo", "visual.playerInfo"],
  ["visual.stats", "visual.stats"],
];

async function playerScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const snapshot = collectSnapshot(player);
    const body = [
      `§7${t(language, "player.body")}`,
      emptyLine(),
      `§7${t(language, "common.name")}: ${valueOrUnavailable(snapshot.name, language)}`,
      `§7${t(language, "common.health")}: ${valueOrUnavailable(
        Number.isFinite(snapshot.health) && Number.isFinite(snapshot.maxHealth)
          ? `${Math.ceil(snapshot.health)}/${Math.ceil(snapshot.maxHealth)}`
          : null,
        language,
      )}`,
      `§7${t(language, "common.coordinates")}: §f${coordinates(snapshot, language)}`,
      `§7${t(language, "common.dimension")}: ${valueOrUnavailable(
        snapshot.dimensionId ? dimensionLabel(snapshot.dimensionId, language) : null,
        language,
      )}`,
      `§7${t(language, "common.gameMode")}: ${valueOrUnavailable(
        snapshot.gameMode ? gameModeLabel(snapshot.gameMode, language) : null,
        language,
      )}`,
      `§7${t(language, "common.level")}: ${valueOrUnavailable(snapshot.level, language)}`,
      `§7${t(language, "player.session")}: §f${formatSessionDuration(snapshot.sessionSeconds)}`,
      emptyLine(),
      `§7${t(language, "pvp.kills")}: §f${snapshot.kills} §8| §7${t(language, "pvp.deaths")}: §f${snapshot.deaths} §8| §7${t(language, "pvp.kd")}: §f${formatKd(snapshot.kills, snapshot.deaths)}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "player.title")))
      .body(body);
    for (const [path, key] of PLAYER_TOGGLES) {
      form.button(toggleLabel(settings, t(language, key), getPath(settings, path) === true));
    }
    form.button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection < 0 || selection >= PLAYER_TOGGLES.length) return;
    const next = getSettings(player);
    setPath(next, PLAYER_TOGGLES[selection][0], !getPath(next, PLAYER_TOGGLES[selection][0]));
    persist(player, next);
  }
}

const MOVEMENT_TOGGLES = [
  ["hud.wasd", "hud.wasd"],
  ["hud.cps", "hud.cps"],
  ["hud.clickIndicators", "hud.clickIndicators"],
];

async function movementScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const input = getInputSnapshot(player, settings.hud.interval);
    const state = (active) =>
      active === null || active === undefined
        ? `§8${t(language, "common.notAvailable")}`
        : active
          ? `§a${t(language, "common.on")}`
          : `§8${t(language, "common.off")}`;
    const wasd = input.wasd;
    const body = [
      `§7${t(language, "movement.body")}`,
      emptyLine(),
      `§7W: ${state(wasd?.forward)}  §7A: ${state(wasd?.left)}  §7S: ${state(wasd?.back)}  §7D: ${state(wasd?.right)}`,
      `§7${t(language, "hud.cps")}: ${valueOrUnavailable(
        Number.isFinite(input.cps) ? input.cps : null,
        language,
      )}`,
      `§7LMB: ${state(input.left)}  §7RMB: ${state(input.right)}`,
      emptyLine(),
      `§8${t(language, "hud.inputNote")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "movement.title")))
      .body(body);
    for (const [path, key] of MOVEMENT_TOGGLES) {
      form.button(toggleLabel(settings, t(language, key), getPath(settings, path) === true));
    }
    form.button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection < 0 || selection >= MOVEMENT_TOGGLES.length) return;
    const next = getSettings(player);
    const path = MOVEMENT_TOGGLES[selection][0];
    setPath(next, path, !getPath(next, path));
    persist(player, next);
  }
}

const ARMOR_TOGGLES = [
  ["hud.armor", "hud.armor"],
  ["hud.armorHelmet", "hud.piece.helmet"],
  ["hud.armorChest", "hud.piece.chest"],
  ["hud.armorLegs", "hud.piece.legs"],
  ["hud.armorBoots", "hud.piece.boots"],
  ["hud.armorDetail", "hud.armorDetail"],
  ["hud.durabilityAlert", "hud.durabilityAlert"],
  ["hud.durabilitySound", "hud.durabilitySound"],
];

async function armorThreshold(player, settings) {
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

async function armorScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const equipment = collectEquipment(player);
    const lines = equipment
      ? equipment.armor.map((piece) => {
          const typeText = piece.empty
            ? t(language, "common.none")
            : valueOrUnavailable(piece.typeId ? typeLabel(piece.typeId) : null, language);
          return `§7${t(language, piece.nameKey)}: ${typeText} §8| §f${durabilityText(piece, language)}`;
        })
      : [`§8${t(language, "common.notAvailable")}`];
    const body = [
      `§7${t(language, "armor.body")}`,
      emptyLine(),
      ...lines,
      `§7${t(language, "hud.durabilityThreshold")}: §f${settings.hud.durabilityThreshold}%`,
      emptyLine(),
      `§8${t(language, "hud.editorLimits")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "armor.title")))
      .body(body);
    for (const [path, key] of ARMOR_TOGGLES) {
      form.button(toggleLabel(settings, t(language, key), getPath(settings, path) === true));
    }
    form
      .button(`§b${t(language, "hud.durabilityThreshold")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < ARMOR_TOGGLES.length) {
      const next = getSettings(player);
      const path = ARMOR_TOGGLES[selection][0];
      setPath(next, path, !getPath(next, path));
      persist(player, next);
      continue;
    }
    if (selection === ARMOR_TOGGLES.length) {
      await armorThreshold(player, getSettings(player));
      continue;
    }
    return;
  }
}

async function itemsScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const equipment = collectEquipment(player);
    const totems = collectTotems(player);
    const itemLine = (item) =>
      item
        ? `${valueOrUnavailable(typeLabel(item.typeId), language)} §8| §f${durabilityText(item, language)}`
        : `§8${t(language, "items.emptyHand")}`;
    const handUnavailable = `§8${t(language, "common.notAvailable")}`;
    const body = [
      `§7${t(language, "items.body")}`,
      emptyLine(),
      `§7${t(language, "items.mainhand")}: ${equipment ? itemLine(equipment.mainhand) : handUnavailable}`,
      `§7${t(language, "items.offhand")}: ${equipment ? itemLine(equipment.offhand) : handUnavailable}`,
      `§7${t(language, "hud.totems")}: ${valueOrUnavailable(totems, language)}`,
      emptyLine(),
      `§8${t(language, "items.scope")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "items.title")))
      .body(body)
      .button(toggleLabel(settings, t(language, "hud.totems"), settings.hud.totems))
      .button(toggleLabel(settings, t(language, "hud.armorDetail"), settings.hud.armorDetail))
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      const next = getSettings(player);
      next.hud.totems = !next.hud.totems;
      persist(player, next);
    } else if (response.selection === 1) {
      const next = getSettings(player);
      next.hud.armorDetail = !next.hud.armorDetail;
      persist(player, next);
    } else {
      return;
    }
  }
}

async function potionsScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const effects = collectEffects(player);
    let effectLines;
    if (effects === null) {
      effectLines = [`§8${t(language, "common.notAvailable")}`];
    } else if (effects.length === 0) {
      effectLines = [`§8${t(language, "potions.empty")}`];
    } else {
      effectLines = effects.map((effect) => `§7- ${effectLine(effect, language)}`);
    }
    const body = [
      `§7${t(language, "potions.body")}`,
      emptyLine(),
      ...effectLines,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "potions.title")))
      .body(body)
      .button(toggleLabel(settings, t(language, "hud.potions"), settings.hud.potions))
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      const next = getSettings(player);
      next.hud.potions = !next.hud.potions;
      persist(player, next);
    } else {
      return;
    }
  }
}

async function totemsScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const totems = collectTotems(player);
    const body = [
      `§7${t(language, "totems.body")}`,
      emptyLine(),
      `§7${t(language, "hud.totems")}: ${valueOrUnavailable(totems, language)}`,
      emptyLine(),
      `§8${t(language, "totems.scope")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "totems.title")))
      .body(body)
      .button(toggleLabel(settings, t(language, "hud.totems"), settings.hud.totems))
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      const next = getSettings(player);
      next.hud.totems = !next.hud.totems;
      persist(player, next);
    } else {
      return;
    }
  }
}

registerScreen("home", homeScreen);
registerScreen("player", playerScreen);
registerScreen("movement", movementScreen);
registerScreen("armor", armorScreen);
registerScreen("items", itemsScreen);
registerScreen("potions", potionsScreen);
registerScreen("totems", totemsScreen);
