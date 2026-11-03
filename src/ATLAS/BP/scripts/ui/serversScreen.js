/**
 * SERVER MANAGER: a validated, persistent address book.
 *
 * Minecraft's stable Script API has no networking, no server-list access and
 * no clipboard. This screen therefore never offers a fake CONNECT button.
 * It stores entries, keeps the player's own ordering/favourites and shows the
 * exact host/port to type into Minecraft's built-in Servers screen.
 */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { openScreen, registerScreen } from "./router.js";
import {
  confirmAction,
  emptyLine,
  formTitle,
  safeShow,
  send,
} from "./common.js";
import {
  getServerTarget,
  getServers,
  getSettings,
  saveServerTarget,
  saveServers,
} from "../store.js";
import { t } from "../i18n.js";
import {
  DEFAULT_SERVER_PORT,
  LIMITS,
  SERVER_CATEGORIES,
  SERVER_REGIONS,
} from "../config.js";
import {
  addServer,
  clearCurrent,
  createServer,
  findServer,
  formatServerTimestamp,
  markCurrent,
  moveServer,
  normalizeAddress,
  normalizePort,
  removeServer,
  serverAddress,
  toggleFavorite,
  updateServer,
} from "../servers.js";
import { sanitizeName } from "../util.js";

function categoryLabel(language, id) {
  return t(language, `servers.category.${id}`);
}

function regionLabel(language, id) {
  return t(language, `servers.region.${id}`);
}

function lastMarkedText(server, language) {
  const formatted = formatServerTimestamp(server.lastMarkedAt);
  if (!formatted) return `§8${t(language, "servers.neverMarked")}`;
  return `§7${t(language, "servers.lastMarked", { time: formatted })}`;
}

function isConsoleClient(player) {
  try {
    return player.clientSystemInfo?.platformType === "Console";
  } catch {
    return false;
  }
}

function serverButton(server) {
  const markers = [];
  if (server.favorite) markers.push("§e*");
  if (server.current) markers.push("§a>");
  const prefix = markers.length > 0 ? `${markers.join("")} ` : "";
  return `${prefix}§f${server.name} §8| §7${serverAddress(server)}`;
}

function persist(player, settings, list) {
  const saved = saveServers(player, list);
  if (!saved) {
    send(player, t(settings.language, "errors.storage"));
    return null;
  }
  return saved;
}

function readChoice(value, list) {
  if (!Number.isInteger(value) || value < 0 || value >= list.length) return list[list.length - 1];
  return list[value];
}

/**
 * Shows the add/edit form until the values validate or the player cancels.
 * Entering "host:port" in the address field gets a specific message instead
 * of being silently accepted.
 */
async function serverForm(player, settings, existing, defaults) {
  const language = settings.language;
  let current = {
    name: existing?.name ?? defaults?.name ?? "",
    address: existing?.address ?? defaults?.address ?? "",
    port: String(existing?.port ?? defaults?.port ?? DEFAULT_SERVER_PORT),
    description: existing?.description ?? defaults?.description ?? "",
    category: existing?.category ?? defaults?.category ?? "other",
    region: existing?.region ?? defaults?.region ?? "other",
  };
  while (true) {
    if (!player.isValid) return null;
    const form = new ModalFormData()
      .title(
        formTitle(
          settings,
          t(language, existing ? "servers.edit" : "servers.add"),
        ),
      )
      .textField(t(language, "servers.name"), t(language, "servers.namePlaceholder"), {
        defaultValue: current.name,
      })
      .textField(t(language, "servers.address"), "play.example.com / 203.0.113.10", {
        defaultValue: current.address,
      })
      .textField(t(language, "servers.port"), String(DEFAULT_SERVER_PORT), {
        defaultValue: current.port,
      })
      .textField(t(language, "servers.description"), t(language, "servers.descriptionPlaceholder"), {
        defaultValue: current.description,
      })
      .dropdown(
        t(language, "servers.category"),
        SERVER_CATEGORIES.map((id) => categoryLabel(language, id)),
        { defaultValueIndex: Math.max(0, SERVER_CATEGORIES.indexOf(current.category)) },
      )
      .dropdown(
        t(language, "servers.region"),
        SERVER_REGIONS.map((id) => regionLabel(language, id)),
        { defaultValueIndex: Math.max(0, SERVER_REGIONS.indexOf(current.region)) },
      )
      .submitButton(t(language, "common.save"));

    const response = await safeShow(player, () => form);
    if (!response || response.canceled || !response.formValues) return null;
    const [nameRaw, addressRaw, portRaw, descriptionRaw, categoryIndex, regionIndex] =
      response.formValues;

    current = {
      name: typeof nameRaw === "string" ? nameRaw : "",
      address: typeof addressRaw === "string" ? addressRaw.trim() : "",
      port: typeof portRaw === "string" ? portRaw.trim() : String(portRaw ?? ""),
      description: typeof descriptionRaw === "string" ? descriptionRaw : "",
      category: readChoice(categoryIndex, SERVER_CATEGORIES),
      region: readChoice(regionIndex, SERVER_REGIONS),
    };

    const name = sanitizeName(current.name, "", LIMITS.serverNameLength);
    if (!name) {
      send(player, t(language, "servers.invalidName"));
      continue;
    }
    if (current.address.includes(":")) {
      const looksLikePort = /^[^:]+:\d+$/.test(current.address);
      send(
        player,
        t(language, looksLikePort ? "servers.errorAddressPort" : "servers.ipv6Unsupported"),
      );
      continue;
    }
    const address = normalizeAddress(current.address);
    if (!address) {
      send(player, t(language, "servers.invalidAddress"));
      continue;
    }
    const port = normalizePort(current.port);
    if (port === null) {
      send(player, t(language, "servers.invalidPort"));
      continue;
    }
    return {
      name,
      address,
      port,
      description: sanitizeName(
        current.description,
        "",
        LIMITS.serverDescriptionLength,
      ),
      category: current.category,
      region: current.region,
    };
  }
}

async function addServerFlow(player, settings, defaults) {
  const language = settings.language;
  if (getServers(player).length >= LIMITS.servers) {
    send(player, t(language, "servers.limit", { max: LIMITS.servers }));
    return null;
  }
  const values = await serverForm(player, settings, null, defaults);
  if (!values) return null;
  const server = createServer(values);
  const result = addServer(getServers(player), server);
  if (!result.added) {
    const key =
      result.reason === "duplicateAddress"
        ? "servers.duplicate"
        : result.reason === "limit"
          ? "servers.limit"
          : "errors.storage";
    send(player, t(language, key, { max: LIMITS.servers }));
    return null;
  }
  const saved = persist(player, settings, result.list);
  if (!saved) return null;
  send(player, t(language, "servers.saved"));
  return findServer(saved, server.id);
}

async function editServerFlow(player, settings, server) {
  const language = settings.language;
  const values = await serverForm(player, settings, server);
  if (!values) return null;
  const result = updateServer(getServers(player), server.id, values);
  if (!result.updated) {
    send(
      player,
      t(
        language,
        result.reason === "duplicateAddress" ? "servers.duplicate" : "errors.storage",
      ),
    );
    return null;
  }
  const saved = persist(player, settings, result.list);
  if (!saved) return null;
  send(player, t(language, "servers.updated"));
  return findServer(saved, server.id);
}

function sendAddress(player, language, name, address, port) {
  send(player, t(language, "servers.chatLine", { name, address: `${address}:${port}` }));
}

/** Shown after Direct Join validation and from a saved entry. */
async function connectionGuide(player, entry, allowSave) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const consoleClient = isConsoleClient(player);
    const body = [
      `§f${entry.name}`,
      `§7${t(language, "servers.address")}: §f${entry.address}`,
      `§7${t(language, "servers.port")}: §f${entry.port}`,
      emptyLine(),
      `§7${t(language, "servers.guideBody", {
        address: entry.address,
        port: entry.port,
      })}`,
      emptyLine(),
      `§8${t(language, "servers.guideFriends")}`,
      consoleClient ? `§8${t(language, "servers.consoleNote")}` : "",
      `§8${t(language, "servers.clipboardNote")}`,
    ].filter((line) => line.length > 0).join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "servers.guideTitle")))
      .body(body);
    if (allowSave) form.button(`§a${t(language, "servers.saveAs")}`);
    form
      .button(`§b${t(language, "servers.sendChat")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    const saveIndex = allowSave ? 0 : -1;
    if (saveIndex >= 0 && selection === saveIndex) {
      await addServerFlow(player, settings, {
        name: entry.name,
        address: entry.address,
        port: entry.port,
      });
      return;
    }
    if (selection === saveIndex + 1) {
      sendAddress(player, language, entry.name, entry.address, entry.port);
      continue;
    }
    return;
  }
}

async function directJoinScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const target = getServerTarget(player);
    const body = [
      `§7${t(language, "servers.directBody")}`,
      emptyLine(),
      target
        ? `§7${t(language, "servers.lastTarget", {
            address: `${target.address}:${target.port}`,
          })}`
        : `§8${t(language, "servers.noLastTarget")}`,
      emptyLine(),
      `§8${t(language, "servers.scope")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "servers.directTitle")))
      .body(body)
      .button(`§a${t(language, "servers.enterAddress")}`);
    if (target) form.button(`§b${t(language, "servers.guideButton")}`);
    form.button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection === 0) {
      const targetValues = await directTargetForm(player, settings, target);
      if (!targetValues) continue;
      if (!saveServerTarget(player, targetValues)) {
        send(player, t(language, "errors.storage"));
        continue;
      }
      await connectionGuide(
        player,
        { name: targetValues.address, address: targetValues.address, port: targetValues.port },
        true,
      );
      continue;
    }
    if (target && selection === 1) {
      await connectionGuide(
        player,
        { name: target.address, address: target.address, port: target.port },
        true,
      );
      continue;
    }
    return;
  }
}

/** Two-field Direct Join form: address and port only, as requested. */
async function directTargetForm(player, settings, target) {
  const language = settings.language;
  let address = target?.address ?? "";
  let port = String(target?.port ?? DEFAULT_SERVER_PORT);
  while (true) {
    if (!player.isValid) return null;
    const form = new ModalFormData()
      .title(formTitle(settings, t(language, "servers.directTitle")))
      .textField(t(language, "servers.address"), "play.example.com / 203.0.113.10", {
        defaultValue: address,
      })
      .textField(t(language, "servers.port"), String(DEFAULT_SERVER_PORT), {
        defaultValue: port,
      })
      .submitButton(t(language, "servers.guideButton"));
    const response = await safeShow(player, () => form);
    if (!response || response.canceled || !response.formValues) return null;
    address = typeof response.formValues[0] === "string" ? response.formValues[0].trim() : "";
    port = typeof response.formValues[1] === "string" ? response.formValues[1].trim() : "";
    if (address.includes(":")) {
      const looksLikePort = /^[^:]+:\d+$/.test(address);
      send(
        player,
        t(language, looksLikePort ? "servers.errorAddressPort" : "servers.ipv6Unsupported"),
      );
      continue;
    }
    const normalizedAddress = normalizeAddress(address);
    if (!normalizedAddress) {
      send(player, t(language, "servers.invalidAddress"));
      continue;
    }
    const normalizedPort = normalizePort(port);
    if (normalizedPort === null) {
      send(player, t(language, "servers.invalidPort"));
      continue;
    }
    return { address: normalizedAddress, port: normalizedPort };
  }
}

async function serverDetail(player, payload) {
  const id = payload?.id;
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const list = getServers(player);
    const server = findServer(list, id);
    if (!server) {
      send(player, t(language, "servers.notFound"));
      return;
    }
    const body = [
      `§f§l${server.name}`,
      `§7${t(language, "servers.address")}: §f${server.address}`,
      `§7${t(language, "servers.port")}: §f${server.port}`,
      server.description
        ? `§7${t(language, "servers.description")}: §f${server.description}`
        : `§8${t(language, "servers.description")}: -`,
      `§7${t(language, "servers.category")}: §f${categoryLabel(language, server.category)} §8| §7${t(language, "servers.region")}: §f${regionLabel(language, server.region)}`,
      `§7${t(language, "servers.favorite")}: ${server.favorite ? `§a${t(language, "common.yes")}` : `§8${t(language, "common.no")}`}`,
      `§7${t(language, "servers.status")}: §8${t(language, "servers.statusUnknown")}`,
      `§7${t(language, "servers.current")}: ${server.current ? `§a${t(language, "servers.currentYes")}` : `§8${t(language, "servers.currentNo")}`}`,
      `§7${lastMarkedText(server, language)}`,
      emptyLine(),
      `§8${t(language, "servers.statusExplain")}`,
      `§8${t(language, "servers.regionNote")}`,
    ].join("\n");
    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "servers.detail")))
      .body(body)
      .button(`§b${t(language, "servers.guide")}`)
      .button(`§b${t(language, "servers.sendChat")}`)
      .button(
        server.current
          ? `§c${t(language, "servers.unmark")}`
          : `§a${t(language, "servers.mark")}`,
      )
      .button(
        server.favorite
          ? `§e${t(language, "servers.favoriteRemove")}`
          : `§7${t(language, "servers.favoriteAdd")}`,
      )
      .button(`§b${t(language, "servers.edit")}`)
      .button(`§7${t(language, "servers.moveUp")}`)
      .button(`§7${t(language, "servers.moveDown")}`)
      .button(`§c${t(language, "servers.delete")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection === 0) {
      await connectionGuide(player, server, false);
    } else if (selection === 1) {
      sendAddress(player, language, server.name, server.address, server.port);
    } else if (selection === 2) {
      const next = server.current
        ? clearCurrent(list)
        : markCurrent(list, server.id);
      if (!persist(player, settings, next)) return;
      send(
        player,
        t(
          language,
          server.current ? "servers.unmarked" : "servers.marked",
          { name: server.name },
        ),
      );
    } else if (selection === 3) {
      const next = toggleFavorite(list, server.id);
      if (!persist(player, settings, next)) return;
      send(
        player,
        t(language, server.favorite ? "servers.favoriteOff" : "servers.favoriteOn"),
      );
    } else if (selection === 4) {
      await editServerFlow(player, settings, server);
    } else if (selection === 5 || selection === 6) {
      const next = moveServer(list, server.id, selection === 5 ? -1 : 1);
      if (next === list) continue;
      if (!persist(player, settings, next)) return;
      send(player, t(language, "servers.moved"));
      return;
    } else if (selection === 7) {
      const confirmed = await confirmAction(
        player,
        settings,
        t(language, "servers.delete"),
        t(language, "servers.deleteConfirm", { name: server.name }),
        t(language, "servers.delete"),
      );
      if (!confirmed) continue;
      if (!persist(player, settings, removeServer(list, server.id))) return;
      send(player, t(language, "servers.deleted"));
      return;
    } else {
      return;
    }
  }
}

async function serversScreen(player) {
  while (true) {
    if (!player.isValid) return;
    const settings = getSettings(player);
    const language = settings.language;
    const list = getServers(player);
    const current = list.find((server) => server.current);
    const body = [
      `§7${t(language, "servers.body")}`,
      emptyLine(),
      `§7${t(language, "servers.count", { count: list.length })}`,
      current
        ? `§7${t(language, "servers.currentLabel", { name: current.name })}`
        : `§8${t(language, "servers.noCurrent")}`,
      emptyLine(),
      list.length === 0
        ? `§8${t(language, "servers.empty")}\n§8${t(language, "servers.scope")}`
        : `§8${t(language, "servers.scope")}`,
    ].join("\n");    const form = new ActionFormData()
      .title(formTitle(settings, t(language, "servers.title")))
      .body(body);
    for (const server of list) form.button(serverButton(server));
    form
      .button(`§a${t(language, "servers.add")}`)
      .button(`§b${t(language, "servers.direct")}`)
      .button(`§8${t(language, "common.back")}`);
    const response = await safeShow(player, () => form);
    if (!response || response.canceled) return;
    const selection = response.selection ?? -1;
    if (selection >= 0 && selection < list.length) {
      await openScreen("servers.detail", player, { id: list[selection].id });
      continue;
    }
    if (selection === list.length) {
      await addServerFlow(player, settings);
      continue;
    }
    if (selection === list.length + 1) {
      await directJoinScreen(player);
      continue;
    }
    return;
  }
}

registerScreen("servers", serversScreen);
registerScreen("servers.detail", serverDetail);
