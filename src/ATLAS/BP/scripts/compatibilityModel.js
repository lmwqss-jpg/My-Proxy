/**
 * Pure compatibility model: feature definitions, capability names and status
 * reduction. No Minecraft API imports, so every rule can be unit-tested.
 *
 * Status meanings:
 *   READY        required APIs exist, the feature has not run yet this session
 *   WORKING      a real operation succeeded this session
 *   LIMITED      it works, but a documented scope or an optional API restricts it
 *   UNAVAILABLE  a required API is missing in this environment
 *   ERROR        the last operation failed and no later success was recorded
 *   NOT TESTED   no player/session has been probed yet, so nothing is claimed
 *
 * WORKING is only reported after an actual operation (form opened, HUD drawn,
 * data stored, container recorded) succeeded in this script session.
 */

export const FEATURE_STATUS = Object.freeze({
  READY: "READY",
  WORKING: "WORKING",
  LIMITED: "LIMITED",
  UNAVAILABLE: "UNAVAILABLE",
  ERROR: "ERROR",
  NOT_TESTED: "NOT TESTED",
});

export const STATUS_ORDER = Object.freeze([
  FEATURE_STATUS.WORKING,
  FEATURE_STATUS.LIMITED,
  FEATURE_STATUS.READY,
  FEATURE_STATUS.UNAVAILABLE,
  FEATURE_STATUS.ERROR,
  FEATURE_STATUS.NOT_TESTED,
]);

/** Capability ids are stable and used by diagnostics and tests. */
export const CAPABILITY_IDS = Object.freeze([
  "scripts",
  "engine",
  "forms",
  "forms.modal",
  "command",
  "events.worldLoad",
  "events.spawn",
  "events.itemUse",
  "events.interact",
  "events.damage",
  "events.inventory",
  "events.scriptEvent",
  "world.api",
  "world.clock",
  "world.dynamic",
  "player.session",
  "player.dynamic",
  "player.health",
  "player.equipment",
  "player.inventory",
  "player.effects",
  "player.input",
  "player.actionBar",
  "player.view",
  "player.gameMode",
  "player.locator",
]);

/**
 * @typedef {Object} FeatureDefinition
 * @property {string} id
 * @property {string} labelKey
 * @property {readonly string[]} require
 * @property {readonly string[]} optional
 * @property {string|null} scopeKey
 * @property {boolean} [global]
 */

/**
 * Feature definitions map one-to-one to the visible ATLAS sections plus the
 * two entry points. `scopeKey` marks a feature whose supported scope is
 * narrower than the original request (for example action-bar-only HUD).
 */
/** @type {ReadonlyArray<Readonly<FeatureDefinition>>} */
export const FEATURE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "menu",
    labelKey: "compat.feature.menu",
    require: Object.freeze(["forms", "events.itemUse"]),
    optional: Object.freeze(["events.scriptEvent", "command"]),
    scopeKey: "compat.scope.menu",
  }),
  Object.freeze({
    id: "command",
    labelKey: "compat.feature.command",
    require: Object.freeze(["command"]),
    optional: Object.freeze([]),
    scopeKey: null,
    global: true,
  }),
  Object.freeze({
    id: "home",
    labelKey: "compat.feature.home",
    require: Object.freeze(["forms", "player.session"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "espchest",
    labelKey: "compat.feature.espchest",
    require: Object.freeze(["forms", "player.session", "events.interact", "player.dynamic"]),
    optional: Object.freeze([]),
    scopeKey: "compat.scope.espchest",
  }),
  Object.freeze({
    id: "hud",
    labelKey: "compat.feature.hud",
    require: Object.freeze(["player.session", "player.actionBar"]),
    optional: Object.freeze([]),
    scopeKey: "compat.scope.hud",
  }),
  Object.freeze({
    id: "visual",
    labelKey: "compat.feature.visual",
    require: Object.freeze(["forms", "player.session", "player.actionBar"]),
    optional: Object.freeze(["player.locator"]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "player",
    labelKey: "compat.feature.player",
    require: Object.freeze(["forms", "player.session"]),
    optional: Object.freeze(["player.health", "player.view", "player.gameMode", "world.clock"]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "movement",
    labelKey: "compat.feature.movement",
    require: Object.freeze(["forms", "player.session", "player.input"]),
    optional: Object.freeze([]),
    scopeKey: "compat.scope.input",
  }),
  Object.freeze({
    id: "armor",
    labelKey: "compat.feature.armor",
    require: Object.freeze(["forms", "player.session", "player.equipment"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "items",
    labelKey: "compat.feature.items",
    require: Object.freeze(["forms", "player.session", "player.equipment", "player.inventory"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "potions",
    labelKey: "compat.feature.potions",
    require: Object.freeze(["forms", "player.session", "player.effects"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "totems",
    labelKey: "compat.feature.totems",
    require: Object.freeze(["forms", "player.session", "player.inventory"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "combat",
    labelKey: "compat.feature.combat",
    require: Object.freeze(["forms", "player.session", "events.damage", "player.dynamic"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "waypoints",
    labelKey: "compat.feature.waypoints",
    require: Object.freeze(["forms", "player.session", "world.dynamic"]),
    optional: Object.freeze(["player.locator"]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "servers",
    labelKey: "compat.feature.servers",
    require: Object.freeze(["forms", "forms.modal", "player.session", "player.dynamic"]),
    optional: Object.freeze([]),
    scopeKey: "compat.scope.servers",
  }),
  Object.freeze({
    id: "settings",
    labelKey: "compat.feature.settings",
    require: Object.freeze(["forms", "forms.modal", "player.session", "player.dynamic"]),
    optional: Object.freeze(["world.dynamic"]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "diagnostics",
    labelKey: "compat.feature.diagnostics",
    require: Object.freeze(["forms", "engine", "player.session"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
  Object.freeze({
    id: "about",
    labelKey: "compat.feature.about",
    require: Object.freeze(["forms", "player.session"]),
    optional: Object.freeze([]),
    scopeKey: null,
  }),
]);

/** @type {Map<string, Readonly<FeatureDefinition>>} */
const FEATURE_BY_ID = new Map(
  FEATURE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

/** Screen ids are registered in ui/router.js; detail screens share a section. */
const SCREEN_FEATURES = Object.freeze({
  main: "menu",
  home: "home",
  espchest: "espchest",
  "espchest.detail": "espchest",
  hud: "hud",
  "hud.editor": "hud",
  visual: "visual",
  player: "player",
  movement: "movement",
  armor: "armor",
  items: "items",
  potions: "potions",
  totems: "totems",
  pvp: "combat",
  "pvp.log": "combat",
  utilities: "waypoints",
  "utilities.list": "waypoints",
  "utilities.detail": "waypoints",
  servers: "servers",
  "servers.detail": "servers",
  settings: "settings",
  "settings.export": "settings",
  "settings.import": "settings",
  "settings.diagnostics": "diagnostics",
  "settings.diagnostics.export": "diagnostics",
  "settings.about": "about",
});

export function featureById(id) {
  return FEATURE_BY_ID.get(id) ?? null;
}

export function featureIdForScreen(screenId) {
  if (typeof screenId !== "string") return null;
  return SCREEN_FEATURES[screenId] ?? null;
}

/**
 * Reduces a definition, a capability map (`true`/`false`/unknown) and the
 * per-feature runtime record to one status plus the evidence behind it.
 */
export function computeFeatureStatus(definition, capabilities, runtime) {
  const missing = [];
  const unknown = [];
  for (const capability of definition.require) {
    if (capabilities[capability] === false) missing.push(capability);
    else if (capabilities[capability] !== true) unknown.push(capability);
  }
  const optionalMissing = definition.optional.filter(
    (capability) => capabilities[capability] === false,
  );
  const successTick =
    runtime && Number.isFinite(runtime.lastSuccessTick) ? runtime.lastSuccessTick : null;
  const lastError = runtime?.lastError ?? null;
  const failed =
    lastError &&
    Number.isFinite(lastError.tick) &&
    (successTick === null || lastError.tick > successTick);

  let status;
  if (missing.length > 0) status = FEATURE_STATUS.UNAVAILABLE;
  else if (unknown.length > 0) status = FEATURE_STATUS.NOT_TESTED;
  else if (failed) status = FEATURE_STATUS.ERROR;
  else if (definition.scopeKey || optionalMissing.length > 0) status = FEATURE_STATUS.LIMITED;
  else if (successTick !== null) status = FEATURE_STATUS.WORKING;
  else status = FEATURE_STATUS.READY;

  return {
    id: definition.id,
    labelKey: definition.labelKey,
    status,
    required: definition.require,
    optional: definition.optional,
    missing,
    unknown,
    optionalMissing,
    scopeKey: definition.scopeKey,
    lastSuccessTick: successTick,
    lastCheckTick:
      runtime && Number.isFinite(runtime.lastCheckTick) ? runtime.lastCheckTick : null,
    lastError,
  };
}

/** Builds one diagnostics row for a feature. */
export function buildFeatureRow(definition, capabilities, runtime) {
  return computeFeatureStatus(definition, capabilities, runtime);
}

export function buildCompatibilitySummary(rows) {
  const summary = {};
  for (const status of STATUS_ORDER) summary[status] = 0;
  for (const row of rows) {
    summary[row.status] = (summary[row.status] ?? 0) + 1;
  }
  return summary;
}

export function summarizeStatuses(summary) {
  return STATUS_ORDER.filter((status) => summary[status] > 0)
    .map((status) => `${status}: ${summary[status]}`)
    .join(" | ");
}

function formatError(error) {
  if (!error) return "";
  const category = error.category ? `${error.category}` : "script";
  const message = typeof error.message === "string" ? error.message.slice(0, 160) : "";
  return `${category} @${error.tick}: ${message}`;
}

/**
 * Technical, copyable report for DIAGNOSTICS -> EXPORT DIAGNOSTICS.
 * It contains only add-on/API state and the user's own counts; no credentials,
 * Microsoft data, tokens or server passwords are read anywhere.
 */
export function formatCompatibilityReport(snapshot) {
  const engine = snapshot?.engine ?? {};
  const features = snapshot?.features ?? [];
  const capabilities = snapshot?.capabilities ?? [];
  const entryPoints = snapshot?.entryPoints ?? {};
  const summary = snapshot?.summary ?? buildCompatibilitySummary(features);
  const lines = [];

  lines.push(
    `ATLAS DIAGNOSTICS v${snapshot?.version ?? "?"} | Minecraft ${snapshot?.gameVersion ?? "?"} | server ${snapshot?.serverModule ?? "?"} | ui ${snapshot?.uiModule ?? "?"}`,
  );
  lines.push(
    `Environment: Bedrock Script API (device/console type is not exposed) | experiments: none`,
  );
  lines.push(
    `Engine: world loads ${engine.worldLoads ?? 0} | reinitializations ${engine.reinitCount ?? 0} (${engine.lastReinitReason ?? "none"}) | last check tick ${engine.lastCheckTick ?? "?"} | uptime ${engine.uptimeTicks ?? "?"} ticks`,
  );
  lines.push(
    `Errors: script ${engine.errors?.script ?? 0} | event ${engine.errors?.event ?? 0} | storage ${engine.errors?.storage ?? 0} | form ${engine.errors?.form ?? 0}`,
  );
  const commandText = Array.isArray(entryPoints.commands) && entryPoints.commands.length > 0
    ? entryPoints.commands
        .map((entry) => `/${entry.name} (chat /${entry.chatAlias})`)
        .join(", ")
    : "none registered";
  lines.push(
    `Entry points: ${commandText} | item ${entryPoints.item ?? "?"} | scriptevent ${entryPoints.scriptEvent ?? "?"}`,
  );
  lines.push(`Features: ${summarizeStatuses(summary)}`);
  lines.push("");

  // Working/ready rows are compact; every limited, unavailable, failed or
  // unprobed row keeps its evidence so the report stays copyable and short.
  for (const status of STATUS_ORDER) {
    const group = features.filter((row) => row.status === status);
    if (group.length === 0) continue;
    if (status === FEATURE_STATUS.WORKING || status === FEATURE_STATUS.READY) {
      lines.push(`${status} (${group.length}): ${group.map((row) => row.id).join(", ")}`);
      continue;
    }
    for (const row of group) {
      const details = [];
      if (row.missing?.length) details.push(`missing: ${row.missing.join(",")}`);
      if (row.unknown?.length) details.push(`not probed: ${row.unknown.join(",")}`);
      if (row.optionalMissing?.length) details.push(`limited by: ${row.optionalMissing.join(",")}`);
      if (row.scopeKey) details.push("documented scope limit");
      if (row.lastError) details.push(formatError(row.lastError));
      if (row.lastCheckTick !== null) details.push(`checked @${row.lastCheckTick}`);
      lines.push(
        `${row.id}: ${status}${details.length ? ` (${details.join("; ")})` : ""}`,
      );
    }
  }

  const available = capabilities.filter((entry) => entry.available === true).map((entry) => entry.id);
  const unavailable = capabilities.filter((entry) => entry.available === false).map((entry) => entry.id);
  const unknown = capabilities.filter((entry) => entry.available !== true && entry.available !== false)
    .map((entry) => entry.id);
  lines.push("");
  lines.push(`API available (${available.length}): ${available.join(", ") || "none"}`);
  lines.push(`API unavailable (${unavailable.length}): ${unavailable.join(", ") || "none"}`);
  lines.push(`API not probed (${unknown.length}): ${unknown.join(", ") || "none"}`);

  if (Array.isArray(snapshot?.contextLines) && snapshot.contextLines.length > 0) {
    lines.push("");
    lines.push(...snapshot.contextLines);
  }

  if (Array.isArray(engine.recentErrors) && engine.recentErrors.length > 0) {
    lines.push("");
    lines.push("Recent errors:");
    for (const error of engine.recentErrors) lines.push(`- ${formatError(error)}`);
  }

  return lines.join("\n");
}

/**
 * Splits a long report into chat-sized chunks without breaking a line when it
 * can be avoided. Minecraft chat is short; this is why the export uses several
 * messages instead of pretending a clipboard exists.
 */
export function splitForChat(text, limit = 220) {
  const source = typeof text === "string" ? text : "";
  const chunks = [];
  let current = "";
  const flush = () => {
    if (current.trim().length > 0) chunks.push(current);
    current = "";
  };
  for (const line of source.split("\n")) {
    if (line.length > limit) {
      flush();
      for (let index = 0; index < line.length; index += limit) {
        chunks.push(line.slice(index, index + limit));
      }
      continue;
    }
    const next = current.length === 0 ? line : `${current}\n${line}`;
    if (next.length > limit) {
      flush();
      current = line;
    } else {
      current = next;
    }
  }
  flush();
  return chunks;
}
