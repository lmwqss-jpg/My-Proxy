/** Waypoint CRUD, HUD tracking, locator markers and item restoration. */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { registerScreen, openScreen } from "./router.js";
import {
  confirmAction,
  emptyLine,
  formTitle,
  safeShow,
  send,
} from "./common.js";
import {
  getSettings,
  getWaypoints,
  saveSettings,
  saveWaypoints,
} from "../store.js";
import { updateHud } from "../hud.js";
import { syncAllLocators, syncLocator } from "../locator.js";
import { ensureMenuItem } from "../items.js";
import { t } from "../i18n.js";
import { LIMITS } from "../config.js";
import {
  bearingBetween,
  bearingFromView,
  cardinalKey,
  distance3,
  formatCoord,
  formatDistance,
  relativeDirectionKey,
  sanitizeName,
} from "../util.js";
import {
  addWaypoint,
  createWaypoint,
  findWaypoint,
  moveWaypoint,
  removeWaypoint,
  renameWaypoint,
  waypointDisplayName,
} from "../waypoints.js";
import { dimensionLabel } from "../hudFormat.js";

function displayName(waypoint, settings) {
  return waypointDisplayName(waypoint, t, settings.language);
}

function currentTracked(settings) {
  const id = settings.waypoints.trackedId;
  if (!id) return null;
  return findWaypoint(getWaypoints(), id);
}

function coordinatesText(waypoint) {
  return `${formatCoord(waypoint.x)} ${formatCoord(waypoint.y)} ${formatCoord(waypoint.z)}`;
}

function distanceLine(player, waypoint, language) {
  if (waypoint.dimensionId !== player.dimension.id) {
    return `§7${t(language, "common.distance")}: §8${t(language, "common.otherDimension")}`;
  }
  const distance = distance3(player.location, waypoint);
  const bearing = bearingBetween(player.location, waypoint);
  const viewBearing = bearingFromView(player.getViewDirection());
  const direction = t(language, cardinalKey(bearing, false));
  const relative = t(language, relativeDirectionKey(bearing, viewBearing));
  return `§7${t(language, "common.distance")}: §f${formatDistance(distance)}${t(language, "common.meters")} §8| §7${t(language, "common.direction")}: §f${direction} §8(${relative})`;
}

function waypointSummary(player, waypoint, settings) {
  const name = displayName(waypoint, settings);
  if (waypoint.dimensionId !== player.dimension.id) {
    return `§f${name} §8| §7${t(settings.language, "common.otherDimension")}`;
  }
  const distance = distance3(player.location, waypoint);
  return `§f${name} §8| §7${formatDistance(distance)}${t(settings.language, "common.meters")}`;
}

async function addWaypointFlow(player, settings) {
  const language = settings.language;
  const list = getWaypoints();
  if (list.length >= LIMITS.waypoints) {
    send(player, t(language, "utilities.limit", { max: LIMITS.waypoints }));
    return;
  }
  const defaultName = t(language, "utilities.defaultName", { number: list.length + 1 });
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "utilities.add")))
    .textField(t(language, "utilities.name"), t(language, "utilities.namePlaceholder"), {
      defaultValue: defaultName,
    })
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return;
  const rawName = typeof response.formValues[0] === "string" ? response.formValues[0] : "";
  const name = sanitizeName(rawName, defaultName, LIMITS.waypointNameLength);
  const waypoint = createWaypoint({
    name,
    dimensionId: player.dimension.id,
    x: player.location.x,
    y: player.location.y,
    z: player.location.z,
  });
  if (!waypoint) {
    send(player, t(language, "errors.storage"));
    return;
  }
  const result = addWaypoint(list, waypoint);
  if (!result.added) {
    send(
      player,
      t(language, result.reason === "limit" ? "utilities.limit" : "errors.storage", {
        max: LIMITS.waypoints,
      }),
    );
    return;
  }
  const saved = saveWaypoints(result.list);
  if (!saved) {
    send(player, t(language, "errors.storage"));
    return;
  }
  const current = getSettings(player);
  if (!current.waypoints.trackedId || !findWaypoint(saved, current.waypoints.trackedId)) {
    current.waypoints.trackedId = waypoint.id;
    saveSettings(player, current);
  }
  syncAllLocators();
  updateHud(player, true);
  send(player, t(language, "utilities.added", { name }));
}

async function renameFlow(player, settings, waypoint) {
  const language = settings.language;
  const currentName = displayName(waypoint, settings);
  const form = new ModalFormData()
    .title(formTitle(settings, t(language, "utilities.rename")))
    .textField(t(language, "utilities.name"), t(language, "utilities.namePlaceholder"), {
      defaultValue: currentName,
    })
    .submitButton(t(language, "common.save"));
  const response = await safeShow(player, () => form);
  if (!response || response.canceled || !response.formValues) return false;
  const raw = typeof response.formValues[0] === "string" ? response.formValues[0].trim() : "";
  if (!raw) return false;
  const name = sanitizeName(raw, currentName, LIMITS.waypointNameLength);
  // Submitting the auto-generated "Death point" label is not a rename; keep
  // the automatic death-point behaviour instead of converting it to custom.
  if (waypoint.kind === "death" && name === currentName) return false;
  const saved = saveWaypoints(renameWaypoint(getWaypoints(), waypoint.id, name));
  if (!saved) {
    send(player, t(language, "errors.storage"));
    return false;
  }
  syncAllLocators();
  updateHud(player, true);
  send(player, t(language, "utilities.renamed"));
  return true;
}

async function waypointDetail(player, payload) {
  const id = payload?.id;
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const waypoint = findWaypoint(getWaypoints(), id);
    if (!waypoint) {
      send(player, t(language, "utilities.notFound"));
      return;
    }
    const isTracked = settings.waypoints.trackedId === waypoint.id;
    const kindKey =
      waypoint.kind === "death" ? "utilities.kindDeath" : "utilities.kindCustom";
    const body = [
      `§7${t(language, "utilities.location", {
        coords: coordinatesText(waypoint),
        dimension: dimensionLabel(waypoint.dimensionId, language),
      })}`,
      distanceLine(player, waypoint, language),
      `§7${t(language, "utilities.kind")}: §f${t(language, kindKey)}`,
      emptyLine(),
      `§8${t(language, "utilities.trackHint")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "utilities.detail")))
      .body(body)
      .button(
        isTracked
          ? `§c${t(language, "utilities.untrack")}`
          : `§a${t(language, "utilities.track")}`,
      )
      .button(`§b${t(language, "utilities.rename")}`)
      .button(`§b${t(language, "utilities.moveHere")}`)
      .button(`§c${t(language, "utilities.delete")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const action = response.selection ?? -1;
    if (action === 0) {
      const next = getSettings(player);
      next.waypoints.trackedId = isTracked ? null : waypoint.id;
      if (saveSettings(player, next)) {
        syncLocator(player);
        updateHud(player, true);
        send(
          player,
          isTracked
            ? t(language, "utilities.trackedCleared")
            : t(language, "utilities.trackedSet", { name: displayName(waypoint, settings) }),
        );
      } else {
        send(player, t(language, "errors.storage"));
      }
    } else if (action === 1) {
      await renameFlow(player, settings, waypoint);
    } else if (action === 2) {
      const saved = saveWaypoints(
        moveWaypoint(getWaypoints(), waypoint.id, {
          dimensionId: player.dimension.id,
          x: player.location.x,
          y: player.location.y,
          z: player.location.z,
        }),
      );
      if (saved) {
        syncAllLocators();
        updateHud(player, true);
        send(player, t(language, "utilities.moved"));
      } else {
        send(player, t(language, "errors.storage"));
      }
    } else if (action === 3) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "utilities.delete"),
        t(language, "utilities.deleteConfirm", { name: displayName(waypoint, settings) }),
        t(language, "utilities.delete"),
      );
      if (!confirmed) continue;
      const saved = saveWaypoints(removeWaypoint(getWaypoints(), waypoint.id));
      if (!saved) {
        send(player, t(language, "errors.storage"));
        return;
      }
      const current = getSettings(player);
      if (current.waypoints.trackedId === waypoint.id) {
        current.waypoints.trackedId = null;
        saveSettings(player, current);
      }
      syncAllLocators();
      updateHud(player, true);
      send(player, t(language, "utilities.deleted"));
      return;
    } else {
      return;
    }
  }
}

async function waypointListScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const list = getWaypoints();
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "utilities.list", { count: list.length })))
      .body(
        list.length === 0
          ? `§8${t(language, "utilities.empty")}`
          : `§7${t(language, "utilities.limitHint", { max: LIMITS.waypoints })}`,
      );
    for (const waypoint of list) {
      form.button(waypointSummary(player, waypoint, settings));
    }
    form.button(`§a${t(language, "utilities.add")}`);
    form.button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < list.length) {
      await openScreen("utilities.detail", player, { id: list[selection].id });
      continue;
    }
    if (selection === list.length) {
      await addWaypointFlow(player, settings);
      continue;
    }
    return;
  }
}

async function utilitiesScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const tracked = currentTracked(settings);
    const body = [
      `§7${t(language, "utilities.body")}`,
      emptyLine(),
      tracked
        ? `§7${t(language, "utilities.tracked", { name: displayName(tracked, settings) })}`
        : `§8${t(language, "utilities.noTracked")}`,
      `§8${t(language, "utilities.limitHint", { max: LIMITS.waypoints })}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "utilities.title")))
      .body(body)
      .button(`§a${t(language, "utilities.add")}`)
      .button(`§b${t(language, "utilities.list", { count: getWaypoints().length })}`)
      .button(`§b${t(language, "utilities.restoreItem")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const action = response.selection ?? -1;
    if (action === 0) {
      await addWaypointFlow(player, settings);
    } else if (action === 1) {
      await openScreen("utilities.list", player);
    } else if (action === 2) {
      const state = ensureMenuItem(player);
      const key =
        state === "given"
          ? "utilities.itemRestored"
          : state === "present"
            ? "utilities.itemPresent"
            : state === "full"
              ? "utilities.itemFull"
              : "utilities.itemFailed";
      send(player, t(language, key));
    } else {
      return;
    }
  }
}

registerScreen("utilities", utilitiesScreen);
registerScreen("utilities.list", waypointListScreen);
registerScreen("utilities.detail", waypointDetail);
