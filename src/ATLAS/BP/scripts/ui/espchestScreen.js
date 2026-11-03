/** ESPCHEST: a real log of containers the player has opened, not a wall scanner. */

import { ActionFormData } from "@minecraft/server-ui";
import { openScreen, registerScreen } from "./router.js";
import {
  confirmAction,
  emptyLine,
  formTitle,
  safeShow,
  send,
} from "./common.js";
import {
  getContainerLog,
  getSettings,
  saveContainerLog,
} from "../store.js";
import {
  containerKey,
  containerLabel,
  removeContainer,
} from "../containers.js";
import { t } from "../i18n.js";
import { dimensionLabel } from "../hudFormat.js";
import {
  bearingBetween,
  bearingFromView,
  cardinalKey,
  distance3,
  formatCoord,
  formatDistance,
  relativeDirectionKey,
} from "../util.js";

function coordinates(entry) {
  return `${formatCoord(entry.x)} ${formatCoord(entry.y)} ${formatCoord(entry.z)}`;
}

function distanceText(player, entry, language) {
  if (entry.dimensionId !== player.dimension.id) {
    return `§8${t(language, "common.otherDimension")}`;
  }
  const distance = distance3(player.location, entry);
  const bearing = bearingBetween(player.location, entry);
  const direction = t(language, cardinalKey(bearing, false));
  let relative = "";
  try {
    const viewBearing = bearingFromView(player.getViewDirection());
    relative = `, ${t(language, relativeDirectionKey(bearing, viewBearing))}`;
  } catch {
    // The distance and cardinal direction are still real when view access is
    // unavailable; only the relative left/right label is omitted.
  }
  return `§f${formatDistance(distance)}${t(language, "common.meters")} §8(${direction}${relative})`;
}

function entryButton(player, entry, language) {
  const sameDimension = entry.dimensionId === player.dimension.id;
  const distance = sameDimension
    ? `${formatDistance(distance3(player.location, entry))}${t(language, "common.meters")}`
    : t(language, "common.otherDimension");
  return `§f${containerLabel(entry.typeId)} §8| §7${distance} §8| §7${coordinates(entry)}`;
}

async function containerDetail(player, payload) {
  const key = payload?.key;
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const entry = getContainerLog(player).find((candidate) => containerKey(candidate) === key);
    if (!entry) {
      send(player, t(language, "espchest.notFound"));
      return;
    }
    const body = [
      `§7${t(language, "espchest.type")}: §f${containerLabel(entry.typeId)}`,
      `§7${t(language, "espchest.location")}: §f${coordinates(entry)} §8(${dimensionLabel(entry.dimensionId, language)})`,
      `§7${t(language, "common.distance")}: ${distanceText(player, entry, language)}`,
      emptyLine(),
      `§8${t(language, "espchest.scope")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "espchest.detail")))
      .body(body)
      .button(`§c${t(language, "espchest.remove")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "espchest.remove"),
        t(language, "espchest.removeConfirm", { name: containerLabel(entry.typeId) }),
        t(language, "espchest.remove"),
      );
      if (!confirmed) continue;
      const saved = saveContainerLog(
        player,
        removeContainer(getContainerLog(player), containerKey(entry)),
      );
      if (!saved) {
        send(player, t(language, "errors.storage"));
        return;
      }
      send(player, t(language, "espchest.removed"));
      return;
    }
    return;
  }
}

async function espchestScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const list = getContainerLog(player);
    const body = [
      `§7${t(language, "espchest.body")}`,
      emptyLine(),
      list.length === 0
        ? `§8${t(language, "espchest.empty")}`
        : `§7${t(language, "espchest.count", { count: list.length })}`,
      `§8${t(language, "espchest.scope")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "espchest.title")))
      .body(body);
    for (const entry of list) {
      form.button(entryButton(player, entry, language));
    }
    if (list.length > 0) {
      form.button(`§c${t(language, "espchest.clear")}`);
    }
    form.button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < list.length) {
      await openScreen("espchest.detail", player, { key: containerKey(list[selection]) });
      continue;
    }
    const action = selection - list.length;
    if (list.length > 0 && action === 0) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "espchest.clear"),
        t(language, "espchest.clearConfirm"),
        t(language, "espchest.clear"),
      );
      if (confirmed) {
        if (saveContainerLog(player, [])) {
          send(player, t(language, "espchest.cleared"));
        } else {
          send(player, t(language, "errors.storage"));
        }
      }
      continue;
    }
    return;
  }
}

registerScreen("espchest", espchestScreen);
registerScreen("espchest.detail", containerDetail);
