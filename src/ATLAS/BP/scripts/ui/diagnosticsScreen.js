/**
 * DIAGNOSTICS: real compatibility status per feature, API availability,
 * error counters and a copyable report export.
 *
 * The export uses chat because add-ons have no clipboard access. The report
 * contains no passwords, tokens or Microsoft account data.
 */

import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { openScreen, registerScreen } from "./router.js";
import { emptyLine, formTitle, safeShow, send } from "./common.js";
import {
  getContainerLog,
  getServers,
  getSettings,
  getWaypoints,
} from "../store.js";
import { getSessionSeconds } from "../hud.js";
import { hasMenuItem } from "../items.js";
import { isLocatorSupported } from "../locator.js";
import {
  getCapabilitySummary,
  getCompatibilitySnapshot,
  markFeatureError,
  markFeatureSuccess,
  refreshPlayerCompatibility,
} from "../compatibility.js";
import {
  FEATURE_STATUS,
  formatCompatibilityReport,
  splitForChat,
  summarizeStatuses,
} from "../compatibilityModel.js";
import { t } from "../i18n.js";
import {
  SCRIPT_MODULES,
  TARGET_GAME_VERSION,
  TOGGLE_PATHS,
} from "../config.js";
import { formatSessionDuration, getPath } from "../util.js";

const STATUS_KEYS = Object.freeze({
  [FEATURE_STATUS.READY]: "diag.state.ready",
  [FEATURE_STATUS.WORKING]: "diag.state.working",
  [FEATURE_STATUS.LIMITED]: "diag.state.limited",
  [FEATURE_STATUS.UNAVAILABLE]: "diag.state.unavailable",
  [FEATURE_STATUS.ERROR]: "diag.state.error",
  [FEATURE_STATUS.NOT_TESTED]: "diag.state.notTested",
});

function statusColor(status) {
  switch (status) {
    case FEATURE_STATUS.WORKING:
      return "§a";
    case FEATURE_STATUS.LIMITED:
      return "§e";
    case FEATURE_STATUS.READY:
      return "§b";
    case FEATURE_STATUS.UNAVAILABLE:
    case FEATURE_STATUS.ERROR:
      return "§c";
    default:
      return "§8";
  }
}

function safeCount(read) {
  try {
    const value = read();
    return Number.isFinite(value) ? String(value) : null;
  } catch {
    return null;
  }
}

function joinShort(list, limit = 8) {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const shown = list.slice(0, limit).join(", ");
  return list.length > limit ? `${shown}, +${list.length - limit}` : shown;
}

function featureLine(row, language) {
  const label = t(language, row.labelKey);
  const status = `${statusColor(row.status)}${t(language, STATUS_KEYS[row.status])}`;
  const details = [];
  if (row.missing.length > 0) {
    details.push(t(language, "diag.featureMissing", { list: row.missing.join(",") }));
  } else if (row.optionalMissing.length > 0) {
    details.push(t(language, "diag.featureLimited", { list: row.optionalMissing.join(",") }));
  } else if (row.scopeKey && row.status === FEATURE_STATUS.LIMITED) {
    details.push(t(language, row.scopeKey));
  }
  if (row.status === FEATURE_STATUS.ERROR && row.lastError) {
    details.push(row.lastError.message);
  }
  return `§7${label}: ${status}${details.length ? ` §8(${details.join("; ")})` : ""}`;
}

function contextLines(player, settings) {
  const enabledHud = TOGGLE_PATHS.filter((path) => getPath(settings, path) === true).length;
  let dimension = "unknown";
  try {
    dimension = player.dimension?.id ?? "unknown";
  } catch {
    dimension = "unknown";
  }
  return [
    `Player context: dimension ${dimension} | theme ${settings.theme} | language ${settings.language} | HUD toggles ${enabledHud}/${TOGGLE_PATHS.length}`,
    `Stored data: waypoints ${getWaypoints().length} | containers ${getContainerLog(player).length} | servers ${getServers(player).length}`,
    `Locator bar: ${isLocatorSupported(player) ? "supported" : "unavailable"} | session ${formatSessionDuration(getSessionSeconds(player.id))}`,
    `Target: Minecraft ${TARGET_GAME_VERSION.join(".")} | @minecraft/server ${SCRIPT_MODULES.server} | @minecraft/server-ui ${SCRIPT_MODULES.serverUi}`,
  ];
}

async function diagnosticsScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    try {
      refreshPlayerCompatibility(player);
    } catch (error) {
      markFeatureError(player, "diagnostics", error, "script");
    }
    const context = contextLines(player, settings);
    const snapshot = getCompatibilitySnapshot(player, context);
    const engine = snapshot.engine;
    const entryPoints = snapshot.entryPoints;
    const commandList = entryPoints.commands.length > 0
      ? entryPoints.commands
          .map((entry) => `§f/${entry.chatAlias}§8 /${entry.name}`)
          .join("§7, ")
      : `§c${t(language, "diag.commandMissing")}`;
    const capabilities = getCapabilitySummary(player);
    const inventoryAvailable = capabilities.available.includes("player.inventory");
    const waypointCount = safeCount(() => getWaypoints().length);
    const onlineCount = safeCount(() => world.getPlayers().length);
    const recent = engine.recentErrors[0];
    const body = [
      `§7${t(language, "diag.scripts", { status: `§a${t(language, "diag.statusOk")}` })}`,
      `§8${t(language, "diag.api", {
        game: TARGET_GAME_VERSION.join("."),
        server: SCRIPT_MODULES.server,
        ui: SCRIPT_MODULES.serverUi,
      })}`,
      `§8${t(language, "diag.engine", {
        worlds: engine.worldLoads,
        reinit: engine.reinitCount,
        tick: engine.lastCheckTick,
        duration: formatSessionDuration(getSessionSeconds(player.id)),
      })}`,
      `§8${t(language, "diag.errors", {
        script: engine.errors.script,
        event: engine.errors.event,
        storage: engine.errors.storage,
        form: engine.errors.form,
      })}`,
      `§7${t(language, "diag.menuItem", {
        status: !inventoryAvailable
          ? `§8${t(language, "common.notAvailable")}`
          : hasMenuItem(player)
            ? `§a${t(language, "diag.statusOk")}`
            : `§c${t(language, "diag.statusMissing")}`,
      })}`,
      `§7${t(language, "diag.command", { list: commandList })}`,
      `§8${t(language, "diag.commandNote")}`,
      `§7${t(language, "diag.locator", {
        status: isLocatorSupported(player)
          ? `§a${t(language, "diag.statusOk")}`
          : `§c${t(language, "diag.statusUnsupported")}`,
      })}`,
      `§7${t(language, "diag.waypoints", {
        count: waypointCount ?? `§8${t(language, "common.notAvailable")}`,
      })} §8| §7${t(language, "diag.online", {
        count: onlineCount ?? `§8${t(language, "common.notAvailable")}`,
      })}`,
      `§7${t(language, "diag.session", {
        duration: formatSessionDuration(getSessionSeconds(player.id)),
      })}`,
      `§8${t(language, "diag.uptime", { ticks: engine.currentTick })}`,
      emptyLine(),
      `§7§l${t(language, "diag.featuresTitle")}`,
      ...snapshot.features.map((row) => featureLine(row, language)),
      `§8${t(language, "diag.summary", {
        summary: summarizeStatuses(snapshot.summary),
      })}`,
      emptyLine(),
      `§7§l${t(language, "diag.capabilitiesTitle")}`,
      `§8${t(language, "diag.apiAvailable", { count: capabilities.available.length, list: joinShort(capabilities.available) })}`,
      `§8${t(language, "diag.apiUnavailable", { count: capabilities.unavailable.length, list: joinShort(capabilities.unavailable) })}`,
      `§8${t(language, "diag.apiUnknown", { count: capabilities.unknown.length, list: joinShort(capabilities.unknown) })}`,
      emptyLine(),
      recent
        ? `§c${t(language, "diag.recentError", {
            error: `${recent.category}: ${recent.message}`,
          })}`
        : `§8${t(language, "diag.noErrors")}`,
      `§8${t(language, "diag.testScope")}`,
      `§8${t(language, "diag.reportNote")}`,
      `§8${t(language, "diag.footer")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "diag.title")))
      .body(body)
      .button(`§b${t(language, "diag.refresh")}`)
      .button(`§b${t(language, "diag.export")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    if (response.selection === 0) {
      refreshPlayerCompatibility(player);
      send(player, t(language, "diag.refreshed"));
      continue;
    }
    if (response.selection === 1) {
      await openScreen("settings.diagnostics.export", player);
      continue;
    }
    return;
  }
}

async function diagnosticsExportScreen(player) {
  if (!player.isValid) return;
  const settings = getSettings(player);
  const language = settings.language;
  const snapshot = getCompatibilitySnapshot(player, contextLines(player, settings));
  const report = formatCompatibilityReport(snapshot);
  const form = new ActionFormData()
    .title(formTitle(settings, t(language, "diag.exportTitle")))
    .body(t(language, "diag.exportBody", { report }))
    .button(`§b${t(language, "diag.sendReport")}`)
    .button(`§8${t(language, "common.back")}`);
  const response = await safeShow(player, () => form);
  if (!response || response.canceled) return;
  if (response.selection !== 0) return;
  try {
    const chunks = splitForChat(report, 230);
    for (const chunk of chunks) {
      player.sendMessage(`§8[ATLAS] §r${chunk}`);
    }
    markFeatureSuccess(player, "diagnostics", "report export");
    send(player, t(language, "diag.reportSent", { count: chunks.length }));
  } catch (error) {
    markFeatureError(player, "diagnostics", error, "form");
    send(player, t(language, "errors.form"));
  }
}

registerScreen("settings.diagnostics", diagnosticsScreen);
registerScreen("settings.diagnostics.export", diagnosticsExportScreen);
