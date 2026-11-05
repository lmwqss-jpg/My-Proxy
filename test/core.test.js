import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADDON_VERSION,
  ARMOR_PIECES,
  DEFAULT_SETTINGS,
  HUD_COLOR_IDS,
  LANGUAGE_IDS,
  LIMITS,
  MENU_COMMANDS,
  THEME_IDS,
  TOGGLE_PATHS,
} from "../src/ATLAS/BP/scripts/config.js";
import { t, TRANSLATIONS, translationKeys } from "../src/ATLAS/BP/scripts/i18n.js";
import { getTheme, THEMES, themeNameKey } from "../src/ATLAS/BP/scripts/themes.js";
import {
  bearingBetween,
  bearingFromView,
  cardinalKey,
  distance3,
  formatCoord,
  formatKd,
  formatSessionDuration,
  formatTimestamp,
  gameClock,
  getPath,
  relativeDirectionKey,
  sanitizeName,
  setPath,
  toBase36,
} from "../src/ATLAS/BP/scripts/util.js";
import {
  normalizeSettings,
  settingsFromCode,
  settingsToCode,
  toggleSetting,
} from "../src/ATLAS/BP/scripts/settings.js";
import {
  addWaypoint,
  createWaypoint,
  filterWaypoints,
  findWaypoint,
  moveWaypoint,
  normalizeWaypoint,
  parseWaypoints,
  removeWaypoint,
  renameWaypoint,
  serializeWaypoints,
  upsertDeathWaypoint,
  waypointDisplayName,
} from "../src/ATLAS/BP/scripts/waypoints.js";
import {
  CONTAINER_DUPLICATE_WINDOW_MS,
  containerKey,
  containerLabel,
  isContainerBlock,
  normalizeContainerEntry,
  parseContainers,
  recordContainer,
  removeContainer,
  serializeContainers,
} from "../src/ATLAS/BP/scripts/containers.js";
import {
  buildHudPreview,
  buildHudSegments,
  dimensionLabel,
  effectLabel,
  formatEffectDuration,
  formatEffectLevel,
  trackedWaypointSnapshot,
} from "../src/ATLAS/BP/scripts/hudFormat.js";
import {
  addServer,
  clearCurrent,
  createServer,
  filterServers,
  findServer,
  formatServerTimestamp,
  markCurrent,
  moveServer,
  normalizeAddress,
  normalizePort,
  normalizeServer,
  normalizeServerTarget,
  parseServers,
  removeServer,
  sameTarget,
  serverAddress,
  serializeServers,
  toggleFavorite,
  updateServer,
} from "../src/ATLAS/BP/scripts/servers.js";
import {
  buildCompatibilitySummary,
  buildFeatureRow,
  CAPABILITY_IDS,
  computeFeatureStatus,
  FEATURE_DEFINITIONS,
  FEATURE_STATUS,
  featureById,
  featureIdForScreen,
  formatCompatibilityReport,
  splitForChat,
} from "../src/ATLAS/BP/scripts/compatibilityModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");

const SNAPSHOT = {
  name: "Alex",
  health: 14,
  maxHealth: 20,
  location: { x: 10.7, y: 64.2, z: -3.9 },
  dimensionId: "minecraft:overworld",
  view: { x: 0, y: 0, z: -1 },
  day: 5,
  timeOfDay: 6000,
  difficulty: "Normal",
  playerCount: 2,
  level: 12,
  gameMode: "Survival",
  kills: 3,
  deaths: 1,
  trackedWaypoint: {
    name: "Base",
    sameDimension: true,
    distance: 120.4,
    bearing: 90,
  },
  input: {
    wasd: { forward: true, back: false, left: false, right: true },
    cps: 3,
    left: true,
    right: false,
  },
  armor: [
    {
      ...ARMOR_PIECES[0],
      empty: false,
      typeId: "minecraft:diamond_helmet",
      durability: { remaining: 300, max: 363, percent: (300 / 363) * 100 },
    },
    {
      ...ARMOR_PIECES[1],
      empty: false,
      typeId: "minecraft:diamond_chestplate",
      durability: { remaining: 528, max: 528, percent: 100 },
    },
    { ...ARMOR_PIECES[2], empty: true, typeId: null, durability: null },
    {
      ...ARMOR_PIECES[3],
      empty: false,
      typeId: "minecraft:iron_boots",
      durability: { remaining: 20, max: 195, percent: (20 / 195) * 100 },
    },
  ],
  effects: [
    { typeId: "minecraft:speed", duration: 1234, amplifier: 1 },
    { typeId: "minecraft:night_vision", duration: -1, amplifier: 0 },
  ],
  totems: 2,
  sessionSeconds: 125,
};

test("i18n dictionaries have identical keys and placeholders", () => {
  const enKeys = translationKeys("en").sort();
  const arKeys = translationKeys("ar").sort();
  assert.deepEqual(arKeys, enKeys);
  for (const key of enKeys) {
    const en = TRANSLATIONS.en[key];
    const ar = TRANSLATIONS.ar[key];
    assert.ok(en.length > 0, `empty English value: ${key}`);
    assert.ok(ar.length > 0, `empty Arabic value: ${key}`);
    assert.equal(placeholders(ar), placeholders(en), `placeholder mismatch: ${key}`);
  }
  assert.match(t("ar", "utilities.added", { name: "القاعدة" }), /القاعدة/);
  assert.equal(t("xx", "common.on"), "ON");
  assert.equal(t("en", "missing.key"), "missing.key");
});

test("all literal translation keys used by scripts exist", () => {
  const root = path.join(__dirname, "../src/ATLAS/BP/scripts");
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(root);
  const missing = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*[^,()]+,\s*"([^"]+)"/g)) {
      if (!TRANSLATIONS.en[match[1]]) missing.add(match[1]);
    }
    for (const match of source.matchAll(/"theme\.(atlas|emerald|violet|ember)"/g)) {
      if (!TRANSLATIONS.en[match[0].slice(1, -1)]) missing.add(match[0].slice(1, -1));
    }
  }
  assert.deepEqual([...missing], []);
  for (const id of THEME_IDS) assert.ok(TRANSLATIONS.en[themeNameKey(id)]);
});

test("themes are complete and unique", () => {
  assert.deepEqual(Object.keys(THEMES).sort(), [...THEME_IDS].sort());
  assert.equal(getTheme("invalid").id, "atlas");
  const labels = new Set();
  for (const id of THEME_IDS) {
    const theme = getTheme(id);
    assert.match(theme.accent, /^§[0-9a-f]$/);
    assert.match(theme.bright, /^§[0-9a-f]$/);
    assert.ok(theme.RGB.red >= 0 && theme.RGB.red <= 1);
    assert.ok(theme.RGB.green >= 0 && theme.RGB.green <= 1);
    assert.ok(theme.RGB.blue >= 0 && theme.RGB.blue <= 1);
    labels.add(theme.accent);
  }
  assert.equal(labels.size, 4);
});

test("geometry, compass and clock helpers", () => {
  assert.equal(bearingBetween({ x: 0, z: 0 }, { x: 0, z: -10 }), 0);
  assert.equal(bearingBetween({ x: 0, z: 0 }, { x: 10, z: 0 }), 90);
  assert.equal(bearingBetween({ x: 0, z: 0 }, { x: 0, z: 10 }), 180);
  assert.equal(bearingBetween({ x: 0, z: 0 }, { x: -10, z: 0 }), 270);
  assert.equal(bearingFromView({ x: 0, y: 0, z: -1 }), 0);
  assert.equal(bearingFromView({ x: 1, y: 0, z: 0 }), 90);
  assert.equal(cardinalKey(0), "dir.short.n");
  assert.equal(cardinalKey(45), "dir.short.ne");
  assert.equal(cardinalKey(359), "dir.short.n");
  assert.equal(cardinalKey(225, false), "dir.sw");
  assert.equal(relativeDirectionKey(0, 0), "relative.ahead");
  assert.equal(relativeDirectionKey(90, 0), "relative.right");
  assert.equal(relativeDirectionKey(180, 0), "relative.behind");
  assert.equal(relativeDirectionKey(270, 0), "relative.left");
  assert.equal(relativeDirectionKey(45, 0), "relative.frontRight");
  assert.equal(relativeDirectionKey(315, 0), "relative.frontLeft");
  assert.equal(distance3({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
  assert.equal(gameClock(0).text, "06:00");
  assert.equal(gameClock(6000).text, "12:00");
  assert.equal(gameClock(18000).text, "00:00");
  assert.equal(gameClock(23999).text, "05:59");
  assert.equal(formatCoord(-0.2), "-1");
  assert.equal(formatCoord(1.26, true), "1.3");
  assert.equal(formatKd(3, 0), "3");
  assert.equal(formatKd(3, 2), "1.50");
  assert.equal(formatSessionDuration(0), "0:00");
  assert.equal(formatSessionDuration(61), "1:01");
  assert.equal(formatSessionDuration(3661), "1:01:01");
  assert.equal(formatSessionDuration(undefined), "--");
  assert.equal(formatSessionDuration(-1), "--");
  assert.equal(formatTimestamp(1700000100000), "2023-11-14 22:15 UTC");
  assert.equal(formatTimestamp(null), null);
  assert.equal(formatTimestamp(Number.MAX_VALUE), null);
});

test("names are sanitised", () => {
  assert.equal(sanitizeName("  §cBase\nMine  ", "Fallback"), "Base Mine");
  assert.equal(sanitizeName("", "Fallback"), "Fallback");
  assert.equal(sanitizeName("A".repeat(80), "Fallback", 10), "A".repeat(10));
});

test("settings normalisation clamps and discards unknown values", () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  const normalized = normalizeSettings({
    theme: "nope",
    language: "fr",
    hud: { coords: false, interval: 38, unknown: true },
    pvp: { alertThreshold: 99 },
    waypoints: { trackedId: "x".repeat(100) },
    extra: "ignored",
  });
  assert.equal(normalized.theme, "atlas");
  assert.equal(normalized.language, "en");
  assert.equal(normalized.hud.coords, false);
  assert.equal(normalized.hud.interval, 40);
  assert.equal(normalized.pvp.alertThreshold, 19);
  assert.equal(normalized.waypoints.trackedId, null);
  assert.equal(normalized.hud.color, "theme");
  assert.equal(normalized.hud.durabilityThreshold, 20);
  assert.equal("extra" in normalized, false);
  assert.equal(normalizeSettings({ hud: { interval: 7 } }).hud.interval, 5);
  assert.equal(normalizeSettings({ pvp: { alertThreshold: -2 } }).pvp.alertThreshold, 2);
  assert.equal(normalizeSettings({ hud: { color: "red" } }).hud.color, "red");
  assert.equal(normalizeSettings({ hud: { color: "nope" } }).hud.color, "theme");
  assert.equal(normalizeSettings({ hud: { durabilityThreshold: 97 } }).hud.durabilityThreshold, 90);
  assert.equal(normalizeSettings({ hud: { durabilityThreshold: 7 } }).hud.durabilityThreshold, 5);
  assert.equal(normalizeSettings({ hud: { durabilityThreshold: 22 } }).hud.durabilityThreshold, 20);
  assert.equal(normalizeSettings({ hud: { session: true } }).hud.session, true);
  assert.equal(normalizeSettings({}).hud.session, false);
  assert.equal(toggleSetting(normalizeSettings({}), "hud.coords", false).hud.coords, false);
  assert.equal(toggleSetting(normalizeSettings({}), "unknown.path", false).hud.coords, true);
});

test("settings codes round-trip and reject damage", () => {
  for (const theme of THEME_IDS) {
    for (const language of LANGUAGE_IDS) {
      const settings = normalizeSettings({ theme, language });
      settings.hud.interval = 40;
      settings.hud.durabilityThreshold = 85;
      settings.hud.color = "red";
      settings.pvp.alertThreshold = 2;
      TOGGLE_PATHS.forEach((path, index) => setPath(settings, path, index % 2 === 0));
      const code = settingsToCode(settings);
      assert.match(code, /^ATLAS2-[0-9a-z]{15}$/);
      assert.ok(code.length <= LIMITS.settingsCodeLength);
      const restored = settingsFromCode(code);
      assert.ok(restored);
      assert.equal(restored.theme, theme);
      assert.equal(restored.language, language);
      assert.equal(restored.hud.interval, 40);
      assert.equal(restored.hud.durabilityThreshold, 85);
      assert.equal(restored.hud.color, "red");
      assert.equal(restored.pvp.alertThreshold, 2);
      for (const path of TOGGLE_PATHS) {
        assert.equal(
          // Compare using the same dotted paths exposed by the settings UI.
          JSON.stringify(path.split(".").reduce((value, key) => value?.[key], restored)),
          JSON.stringify(path.split(".").reduce((value, key) => value?.[key], settings)),
        );
      }
      assert.equal(settingsFromCode(code.toUpperCase()).theme, theme);
    }
  }
  const base = settingsToCode(normalizeSettings({}));
  assert.equal(base.length, 22);
  assert.equal(settingsFromCode("nope"), null);
  assert.equal(settingsFromCode(`${base.slice(0, -1)}${base.endsWith("0") ? "1" : "0"}`), null);
  assert.equal(settingsFromCode(`${base}!`), null);
  const tracked = normalizeSettings({ waypoints: { trackedId: "w_abc" } });
  assert.equal(settingsFromCode(settingsToCode(tracked)).waypoints.trackedId, null);

  // ATLAS1 codes from the previous release still import the original 20
  // toggles; new panels keep their defaults.
  const legacySettings = normalizeSettings({ theme: "violet", language: "ar" });
  legacySettings.hud.coords = false;
  legacySettings.hud.durabilityAlert = false;
  const themeIndex = THEME_IDS.indexOf(legacySettings.theme);
  const languageIndex = LANGUAGE_IDS.indexOf(legacySettings.language);
  let legacyMask = 0;
  TOGGLE_PATHS.slice(0, 20).forEach((path, index) => {
    if (getPath(legacySettings, path) === true) legacyMask += 2 ** index;
  });
  const legacyBody = `${themeIndex}${languageIndex}${toBase36(legacySettings.hud.interval - 5, 1)}${toBase36(legacySettings.pvp.alertThreshold - 2, 1)}${toBase36(legacyMask, 4)}`;
  let legacyChecksum = 0;
  for (const character of legacyBody) {
    legacyChecksum = (legacyChecksum + character.charCodeAt(0)) % 1296;
  }
  const legacyCode = `ATLAS1-${legacyBody}${toBase36(legacyChecksum, 2)}`;
  const legacyRestored = settingsFromCode(legacyCode);
  assert.ok(legacyRestored);
  assert.equal(legacyRestored.theme, "violet");
  assert.equal(legacyRestored.language, "ar");
  assert.equal(legacyRestored.hud.coords, false);
  // This toggle was added after ATLAS1 and is not encoded by the old code.
  assert.equal(legacyRestored.hud.durabilityAlert, true);
  assert.equal(settingsFromCode(`${legacyCode.slice(0, -1)}x`), null);

  // A 1.2.0 ATLAS2 code only contains the first 33 toggles. The new session
  // toggle must stay off instead of being decoded from an absent bit.
  const oldSettings = normalizeSettings({ theme: "ember" });
  let oldMask = 0;
  TOGGLE_PATHS.slice(0, TOGGLE_PATHS.length - 1).forEach((path, index) => {
    if (getPath(oldSettings, path) === true) oldMask += 2 ** index;
  });
  const oldBody = `${THEME_IDS.indexOf(oldSettings.theme)}${LANGUAGE_IDS.indexOf(oldSettings.language)}${toBase36(oldSettings.hud.interval - 5, 1)}${toBase36(oldSettings.pvp.alertThreshold - 2, 1)}${toBase36((oldSettings.hud.durabilityThreshold - 5) / 5, 1)}${HUD_COLOR_IDS.indexOf(oldSettings.hud.color)}${toBase36(oldMask, 7)}`;
  let oldChecksum = 0;
  for (const character of oldBody) {
    oldChecksum = (oldChecksum + character.charCodeAt(0)) % 1296;
  }
  const oldCode = `ATLAS2-${oldBody}${toBase36(oldChecksum, 2)}`;
  const oldRestored = settingsFromCode(oldCode);
  assert.ok(oldRestored);
  assert.equal(oldRestored.theme, "ember");
  assert.equal(oldRestored.hud.session, false);
});

test("waypoint model validates, caps and updates the death point", () => {
  const waypoint = createWaypoint({
    name: "  §aBase\n",
    dimensionId: "minecraft:overworld",
    x: 1.5,
    y: 64,
    z: -2.5,
  });
  assert.ok(waypoint);
  assert.equal(waypoint.name, "Base");
  assert.equal(waypoint.kind, "custom");
  assert.equal(normalizeWaypoint({ ...waypoint, dimensionId: "bad dimension" }), null);
  assert.equal(normalizeWaypoint({ ...waypoint, x: NaN }), null);
  assert.equal(createWaypoint({ name: "x", dimensionId: "minecraft:overworld", x: NaN, y: 1, z: 1 }), null);

  const list = [waypoint];
  assert.equal(addWaypoint(list, waypoint).added, false);
  const added = addWaypoint(list, createWaypoint({
    name: "Mine",
    dimensionId: "minecraft:nether",
    x: 0,
    y: 32,
    z: 0,
  }));
  assert.equal(added.added, true);
  assert.equal(added.list.length, 2);

  const renamed = renameWaypoint(added.list, waypoint.id, "HQ");
  assert.equal(findWaypoint(renamed, waypoint.id).name, "HQ");
  assert.equal(renameWaypoint(added.list, waypoint.id, "§c").length, 2);
  assert.equal(findWaypoint(renameWaypoint(added.list, waypoint.id, "§c"), waypoint.id).name, "Base");

  const moved = moveWaypoint(renamed, waypoint.id, {
    dimensionId: "minecraft:the_end",
    x: 8,
    y: 70,
    z: 9,
  });
  assert.equal(findWaypoint(moved, waypoint.id).dimensionId, "minecraft:the_end");
  assert.equal(removeWaypoint(moved, waypoint.id).length, 1);
  assert.equal(findWaypoint(added.list, "missing"), null);

  let capped = [];
  for (let i = 0; i < LIMITS.waypoints; i++) {
    capped = addWaypoint(capped, createWaypoint({
      name: `W${i}`,
      dimensionId: "minecraft:overworld",
      x: i,
      y: 64,
      z: 0,
    })).list;
  }
  assert.equal(capped.length, LIMITS.waypoints);
  const overflow = addWaypoint(capped, createWaypoint({
    name: "overflow",
    dimensionId: "minecraft:overworld",
    x: 0,
    y: 0,
    z: 0,
  }));
  assert.equal(overflow.added, false);
  assert.equal(overflow.reason, "limit");

  const serialized = serializeWaypoints(added.list);
  assert.deepEqual(parseWaypoints(serialized), added.list);
  assert.deepEqual(parseWaypoints("not json"), []);
  assert.deepEqual(parseWaypoints([{ garbage: true }]), []);
  const duplicates = parseWaypoints([waypoint, waypoint]);
  assert.equal(duplicates.length, 1);
});

test("waypoint search matches stored fields without changing the list", () => {
  const base = {
    dimensionId: "minecraft:overworld",
    y: 64,
    z: -30,
    createdAt: 1,
  };
  const list = [
    createWaypoint({ ...base, id: "w_base", name: "Base", x: 100 }),
    createWaypoint({ ...base, id: "w_mine", name: "Mine", x: 200, dimensionId: "minecraft:nether" }),
    createWaypoint({ ...base, id: "w_empty", name: "", x: 300, kind: "death" }),
  ];
  assert.equal(filterWaypoints(list, ""), list);
  assert.deepEqual(filterWaypoints(list, "base").map((entry) => entry.id), ["w_base"]);
  assert.deepEqual(filterWaypoints(list, "NETHER").map((entry) => entry.id), ["w_mine"]);
  assert.deepEqual(filterWaypoints(list, "200").map((entry) => entry.id), ["w_mine"]);
  assert.deepEqual(filterWaypoints(list, "death").map((entry) => entry.id), ["w_empty"]);
  assert.deepEqual(filterWaypoints(list, "missing"), []);
  assert.deepEqual(filterWaypoints(null, "base"), []);
  // Searching never mutates or re-orders the stored list.
  assert.equal(list[0].id, "w_base");
});

test("automatic death waypoint is reused and can be renamed", () => {
  const first = upsertDeathWaypoint([], {
    dimensionId: "minecraft:overworld",
    x: 1,
    y: 2,
    z: 3,
  });
  assert.equal(first.created, true);
  assert.equal(first.waypoint.kind, "death");
  assert.equal(first.waypoint.id, "atlas_death");
  assert.equal(waypointDisplayName(first.waypoint, t, "ar"), "نقطة الموت");

  const second = upsertDeathWaypoint(first.list, {
    dimensionId: "minecraft:overworld",
    x: 9,
    y: 8,
    z: 7,
  });
  assert.equal(second.created, false);
  assert.equal(second.list.length, 1);
  assert.equal(second.waypoint.x, 9);

  const renamed = renameWaypoint(second.list, first.waypoint.id, "Home");
  assert.equal(findWaypoint(renamed, first.waypoint.id).kind, "custom");
  const third = upsertDeathWaypoint(renamed, {
    dimensionId: "minecraft:nether",
    x: 4,
    y: 5,
    z: 6,
  });
  assert.equal(third.created, true);
  assert.equal(third.list.length, 2);
  assert.notEqual(third.waypoint.id, first.waypoint.id);
  assert.equal(third.waypoint.kind, "death");
  assert.equal(new Set(third.list.map((entry) => entry.id)).size, 2);
  const fourth = upsertDeathWaypoint(third.list, {
    dimensionId: "minecraft:nether",
    x: 5,
    y: 6,
    z: 7,
  });
  assert.equal(fourth.created, false);
  assert.equal(fourth.list.length, 2);
  assert.equal(fourth.waypoint.x, 5);
});

test("HUD text obeys toggles, theme and language", () => {
  const settings = normalizeSettings({});
  const text = buildHudSegments(SNAPSHOT, settings, "atlas").join("");
  assert.match(text, /ATLAS/);
  assert.match(text, /10 64 -4/);
  assert.match(text, /14\/20/);
  assert.match(text, /Overworld/);
  assert.match(text, /N/);
  assert.match(text, /Base/);
  assert.match(text, /120m/);
  assert.match(text, /§bE/);
  assert.doesNotMatch(text, /Alex/);
  // Live panels read real values from the snapshot.
  assert.match(text, /§lW/);
  assert.match(text, /§lD/);
  assert.match(text, /CPS §f3/);
  assert.match(text, /LMB/);
  assert.match(text, /H §f300/);
  assert.match(text, /C §f528/);
  assert.match(text, /L §8--/);
  assert.match(text, /B §f20/);
  assert.match(text, /Speed II/);
  assert.match(text, /1:02/);
  assert.match(text, /Night Vision/);
  assert.match(text, /∞/);
  assert.match(text, /Totem §f2/);
  assert.doesNotMatch(text, /Session/);

  const withSession = normalizeSettings({});
  withSession.hud.session = true;
  assert.match(buildHudSegments(SNAPSHOT, withSession, "atlas").join(""), /Session §f2:05/);

  const arabic = normalizeSettings({ language: "ar" });
  arabic.hud.compact = false;
  const arabicText = buildHudSegments(SNAPSHOT, arabic, "emerald").join("");
  assert.match(arabicText, /الإحداثيات/);
  assert.match(arabicText, /العالم العلوي/);
  assert.match(arabicText, /شمال/);

  const visual = normalizeSettings({});
  visual.hud.coords = false;
  visual.hud.health = false;
  visual.hud.dimension = false;
  visual.hud.compass = false;
  visual.hud.waypoint = false;
  visual.visual.playerInfo = true;
  visual.visual.worldInfo = true;
  visual.visual.healthBar = true;
  visual.visual.stats = true;
  visual.pvp.showHealth = true;
  const visualText = buildHudSegments(SNAPSHOT, visual, "violet").join("");
  assert.match(visualText, /Level/);
  assert.match(visualText, /12/);
  assert.match(visualText, /Players/);
  assert.match(visualText, /Difficulty/);
  assert.match(visualText, /\[#######---\]/);
  assert.match(visualText, /§7K §f3/);
  assert.match(visualText, /§7D §f1/);
  assert.match(visualText, /K\/D/);
  assert.match(visualText, /3.00/);
  assert.match(visualText, /PvP/);
  const noStatsText = buildHudSegments(
    { ...SNAPSHOT, kills: null, deaths: null },
    visual,
    "violet",
  ).join("");
  assert.doesNotMatch(noStatsText, /K\/D/);
  assert.doesNotMatch(noStatsText, /null|undefined|NaN/);

  for (const path of TOGGLE_PATHS) {
    setPath(settings, path, false);
  }
  assert.deepEqual(buildHudSegments(SNAPSHOT, settings, "atlas"), []);
  assert.equal(buildHudPreview(SNAPSHOT, settings, "atlas"), "All HUD elements are off.");

  // Each live panel can be hidden independently without touching the others.
  const panels = normalizeSettings({});
  panels.hud.wasd = false;
  panels.hud.cps = false;
  panels.hud.clickIndicators = false;
  const withoutInput = buildHudSegments(SNAPSHOT, panels, "atlas").join("");
  assert.doesNotMatch(withoutInput, /CPS/);
  assert.doesNotMatch(withoutInput, /LMB/);
  panels.hud.armor = false;
  panels.hud.potions = false;
  panels.hud.totems = false;
  const withoutLive = buildHudSegments(SNAPSHOT, panels, "atlas").join("");
  assert.doesNotMatch(withoutLive, /Speed/);
  assert.doesNotMatch(withoutLive, /Totem/);
  assert.doesNotMatch(withoutLive, /H §f300/);
});

test("live HUD values are real and degrade honestly", () => {
  const settings = normalizeSettings({});
  assert.equal(formatEffectDuration(1234), "1:02");
  assert.equal(formatEffectDuration(-1), "∞");
  assert.equal(formatEffectDuration(0), "0:00");
  assert.equal(effectLabel("minecraft:speed", "en"), "Speed");
  assert.equal(effectLabel("minecraft:speed", "ar"), "السرعة");
  assert.equal(effectLabel("minecraft:custom_effect", "en"), "Custom Effect");
  assert.equal(formatEffectLevel(0), "I");
  assert.equal(formatEffectLevel(1), "II");
  assert.equal(formatEffectLevel(12), "x13");
  assert.equal(formatEffectLevel(undefined), "--");

  const unknownInput = {
    ...SNAPSHOT,
    input: { wasd: null, cps: 0, left: false, right: false },
  };
  const text = buildHudSegments(unknownInput, settings, "atlas").join("");
  assert.match(text, /WASD --/);
  assert.match(text, /CPS §f0/);

  const unavailableStatus = {
    ...SNAPSHOT,
    armor: null,
    effects: null,
    totems: null,
  };
  const hidden = buildHudSegments(unavailableStatus, settings, "atlas").join("");
  assert.doesNotMatch(hidden, /H §f300/);
  assert.doesNotMatch(hidden, /Speed/);
  assert.doesNotMatch(hidden, /Totem/);
  assert.equal(HUD_COLOR_IDS.length, 7);

  const detailed = normalizeSettings({});
  detailed.hud.armorDetail = true;
  assert.match(
    buildHudSegments(SNAPSHOT, detailed, "atlas").join(""),
    /H §f300§8\/§7363 §a83%/,
  );

  const noHelmet = normalizeSettings({});
  noHelmet.hud.armorHelmet = false;
  assert.doesNotMatch(buildHudSegments(SNAPSHOT, noHelmet, "atlas").join(""), /H §f300/);

  // Missing optional APIs must remove their own element, not fabricate a value
  // or blank the whole HUD.
  const unavailable = normalizeSettings({});
  unavailable.hud.session = true;
  unavailable.visual.playerInfo = true;
  unavailable.visual.worldInfo = true;
  unavailable.visual.healthBar = true;
  unavailable.pvp.showHealth = true;
  const missingBar = buildHudSegments(
    {
      ...SNAPSHOT,
      health: null,
      maxHealth: null,
      view: null,
      dimensionId: null,
      day: null,
      timeOfDay: null,
      difficulty: null,
      playerCount: null,
      level: null,
      gameMode: null,
      sessionSeconds: undefined,
      trackedWaypoint: null,
    },
    unavailable,
    "atlas",
  ).join("");
  assert.match(missingBar, /10 64 -4/);
  assert.doesNotMatch(missingBar, /null|undefined|NaN/);
  assert.doesNotMatch(missingBar, /14\/20|PvP|Level|Players|Difficulty|Session|Overworld/);

  const withoutCompass = buildHudSegments(
    { ...SNAPSHOT, view: null, effects: null, trackedWaypoint: null },
    normalizeSettings({}),
    "atlas",
  ).join("");
  assert.doesNotMatch(withoutCompass, /§b[NSWE]/);
});

test("tracked waypoint handles dimensions and labels", () => {
  const waypoint = { x: 0, y: 64, z: -100, dimensionId: "minecraft:overworld" };
  const same = trackedWaypointSnapshot({ x: 0, y: 64, z: 0 }, "minecraft:overworld", waypoint, "Base");
  assert.equal(same.sameDimension, true);
  assert.equal(Math.round(same.distance), 100);
  assert.equal(same.bearing, 0);
  const other = trackedWaypointSnapshot({ x: 0, y: 64, z: 0 }, "minecraft:nether", waypoint, "Base");
  assert.equal(other.sameDimension, false);
  assert.equal(other.distance, null);
  assert.equal(dimensionLabel("minecraft:the_end", "en"), "The End");
  assert.equal(dimensionLabel("minecraft:nether", "ar"), "العالم السفلي");
  assert.equal(dimensionLabel("custom:dim", "en"), "custom:dim");
});

test("container log validates real container interactions and caps entries", () => {
  assert.equal(isContainerBlock("minecraft:chest"), true);
  assert.equal(isContainerBlock("minecraft:trapped_chest"), true);
  assert.equal(isContainerBlock("minecraft:undyed_shulker_box"), true);
  assert.equal(isContainerBlock("minecraft:barrel"), true);
  assert.equal(isContainerBlock("minecraft:stone"), false);
  assert.equal(isContainerBlock("custom:chest"), true);
  assert.equal(isContainerBlock(undefined), false);
  assert.equal(containerLabel("minecraft:trapped_chest"), "Trapped Chest");

  const entry = normalizeContainerEntry({
    typeId: "minecraft:chest",
    dimensionId: "minecraft:overworld",
    x: 10.9,
    y: 64.2,
    z: -3.7,
  });
  assert.ok(entry);
  assert.equal(entry.x, 10);
  assert.equal(entry.y, 64);
  assert.equal(entry.z, -4);
  assert.equal(
    containerKey(entry),
    "minecraft:overworld|10|64|-4",
  );
  assert.equal(normalizeContainerEntry({ ...entry, typeId: "minecraft:stone" }), null);
  assert.equal(normalizeContainerEntry({ ...entry, dimensionId: "bad dimension" }), null);
  assert.equal(normalizeContainerEntry({ ...entry, x: NaN }), null);

  const recorded = recordContainer([], entry, 1234);
  assert.equal(recorded.added, true);
  assert.equal(recorded.list.length, 1);
  assert.equal(recorded.entry.seenAt, 1234);

  const refreshed = recordContainer(recorded.list, { ...entry, typeId: "minecraft:barrel" }, 5678);
  assert.equal(refreshed.added, false);
  assert.equal(refreshed.list.length, 1);
  assert.equal(refreshed.list[0].typeId, "minecraft:barrel");
  assert.equal(refreshed.list[0].seenAt, 5678);

  let list = [];
  for (let i = 0; i < LIMITS.containers + 3; i++) {
    list = recordContainer(
      list,
      {
        typeId: "minecraft:barrel",
        dimensionId: "minecraft:overworld",
        x: i,
        y: 64,
        z: 0,
      },
      1000 + i,
    ).list;
  }
  assert.equal(list.length, LIMITS.containers);
  assert.equal(list[0].x, LIMITS.containers + 2);
  const parsed = parseContainers(serializeContainers(list));
  assert.deepEqual(parsed, list);
  assert.deepEqual(parseContainers("not json"), []);
  assert.deepEqual(parseContainers([{ garbage: true }]), []);
  assert.deepEqual(parseContainers([entry, entry]).length, 1);
  assert.equal(removeContainer(list, containerKey(list[0])).length, LIMITS.containers - 1);
});

test("recent duplicate container interactions are suppressed across the list", () => {
  const chest = {
    typeId: "minecraft:chest",
    dimensionId: "minecraft:overworld",
    x: 10,
    y: 64,
    z: -3,
  };
  const barrel = { ...chest, typeId: "minecraft:barrel", x: 12 };
  let list = recordContainer([], chest, 1000).list;
  list = recordContainer(list, barrel, 1500).list;
  assert.equal(list.length, 2);

  // A repeated chest event is suppressed even though barrel is the newest
  // entry; the old code only checked the newest record.
  const repeated = recordContainer(list, chest, 2000);
  assert.equal(repeated.added, false);
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.list.length, 2);
  assert.equal(repeated.list[0].typeId, "minecraft:barrel");
  assert.equal(repeated.list.find((entry) => entry.typeId === "minecraft:chest").seenAt, 1000);

  // Outside the dedupe window the same block is a new real opening and moves
  // to the top without creating a duplicate row.
  const later = recordContainer(list, chest, 1000 + CONTAINER_DUPLICATE_WINDOW_MS + 1);
  assert.equal(later.duplicate, false);
  assert.equal(later.added, false);
  assert.equal(later.list.length, 2);
  assert.equal(later.list[0].typeId, "minecraft:chest");
  assert.equal(later.list[0].seenAt, 1000 + CONTAINER_DUPLICATE_WINDOW_MS + 1);

  // A different block type at the same position is not a duplicate of the
  // old type and updates the stored row.
  const changed = recordContainer(later.list, { ...chest, typeId: "minecraft:barrel" }, 9000);
  assert.equal(changed.duplicate, false);
  assert.equal(changed.list.length, 2);
  assert.equal(changed.list[0].typeId, "minecraft:barrel");
});

test("server addresses and ports are validated, not guessed", () => {
  assert.equal(normalizeAddress("play.example.com"), "play.example.com");
  assert.equal(normalizeAddress("  PLAY.Example.COM  "), "play.example.com");
  assert.equal(normalizeAddress("203.0.113.10"), "203.0.113.10");
  assert.equal(normalizeAddress("0.0.0.0"), "0.0.0.0");
  assert.equal(normalizeAddress("255.255.255.255"), "255.255.255.255");
  for (const invalid of [
    "",
    "   ",
    "256.1.1.1",
    "1.2.3",
    "1.2.3.4.5",
    "01.2.3.999",
    "http://example.com",
    "https://example.com/path",
    "example.com:19132",
    "[2001:db8::1]",
    "bad_host.com",
    "-bad.example.com",
    "example..com",
    "localhost",
    "example.c",
    "example.123",
    "host name.com",
    "user@example.com",
  ]) {
    assert.equal(normalizeAddress(invalid), null, `accepted invalid address: ${invalid}`);
  }

  assert.equal(normalizePort("19132"), 19132);
  assert.equal(normalizePort(" 19132 "), 19132);
  assert.equal(normalizePort(19133), 19133);
  assert.equal(normalizePort("65535"), 65535);
  for (const invalid of ["", "0", "65536", "-1", "19a", "1.5", 0, 65536, 1.5, null, undefined]) {
    assert.equal(normalizePort(invalid), null, `accepted invalid port: ${invalid}`);
  }

  const server = createServer({
    id: "s_test",
    now: 1700000000000,
    name: "  §cMy   Server ",
    address: "Play.Example.COM",
    port: "19132",
    description: "Main world",
    category: "public",
    region: "eu",
    favorite: true,
  });
  assert.ok(server);
  assert.equal(server.name, "My Server");
  assert.equal(server.address, "play.example.com");
  assert.equal(server.port, 19132);
  assert.equal(server.favorite, true);
  assert.equal(server.current, false);
  assert.equal(server.createdAt, 1700000000000);
  assert.equal(server.lastMarkedAt, null);
  assert.equal(serverAddress(server), "play.example.com:19132");
  assert.equal(sameTarget(server, { address: "play.example.com", port: 19132 }), true);
  assert.equal(sameTarget(server, { address: "play.example.com", port: 19133 }), false);

  const roundTrip = parseServers(serializeServers([server]));
  assert.deepEqual(roundTrip, [server]);
  assert.equal(normalizeServer({ ...server, port: "0" }), null);
  assert.equal(normalizeServer({ ...server, name: "   " }), null);
  assert.equal(normalizeServer({ ...server, id: "bad id" }), null);
  assert.equal(normalizeServer({ ...server, category: "unknown" }).category, "other");
  assert.equal(normalizeServer({ ...server, region: "unknown" }).region, "other");
});

test("server registry keeps order, favourites and one manual current entry", () => {
  const base = {
    now: 1700000000000,
    port: 19132,
    category: "public",
    region: "eu",
  };
  const a = createServer({ ...base, id: "s_a", name: "Alpha", address: "a.example.com" });
  const b = createServer({ ...base, id: "s_b", name: "Beta", address: "b.example.com" });
  let list = [];
  assert.equal(addServer(list, a).added, true);
  list = addServer(list, a).list;
  list = addServer(list, b).list;
  assert.deepEqual(list.map((server) => server.name), ["Alpha", "Beta"]);

  assert.deepEqual(addServer(list, b).reason, "duplicate");
  assert.deepEqual(
    addServer(list, createServer({ ...base, id: "s_c", name: "Copy", address: "a.example.com" })).reason,
    "duplicateAddress",
  );
  assert.deepEqual(addServer(list, null).reason, "invalid");

  list = toggleFavorite(list, "s_b");
  assert.equal(findServer(list, "s_b").favorite, true);

  list = markCurrent(list, "s_b", 1700000100000);
  assert.equal(findServer(list, "s_b").current, true);
  assert.equal(findServer(list, "s_a").current, false);
  assert.equal(findServer(list, "s_b").lastMarkedAt, 1700000100000);
  assert.equal(formatServerTimestamp(1700000100000), "2023-11-14 22:15 UTC");
  assert.equal(formatServerTimestamp(null), null);
  assert.equal(formatServerTimestamp(Number.MAX_VALUE), null);
  assert.equal(formatServerTimestamp(-1), null);

  list = markCurrent(list, "s_a", 1700000200000);
  assert.equal(findServer(list, "s_a").current, true);
  assert.equal(findServer(list, "s_b").current, false);
  // JSON storage cannot contain two current entries.
  assert.equal(parseServers(serializeServers(list)).filter((server) => server.current).length, 1);
  assert.equal(parseServers(serializeServers([{ ...list[0], current: true }, { ...list[1], current: true }])).filter((server) => server.current).length, 1);

  list = clearCurrent(list);
  assert.equal(list.some((server) => server.current), false);

  list = moveServer(list, "s_b", -1);
  assert.deepEqual(list.map((server) => server.name), ["Beta", "Alpha"]);
  assert.equal(moveServer(list, "s_b", -1), list);
  assert.equal(moveServer(list, "s_a", 1), list);

  const edited = updateServer(list, "s_a", { name: "Gamma", address: "c.example.com" });
  assert.equal(edited.updated, true);
  assert.equal(findServer(edited.list, "s_a").name, "Gamma");
  assert.equal(findServer(edited.list, "s_a").address, "c.example.com");
  assert.equal(updateServer(edited.list, "s_a", { address: "b.example.com" }).reason, "duplicateAddress");
  assert.equal(updateServer(edited.list, "missing", { name: "x" }).reason, "notFound");
  assert.equal(updateServer(edited.list, "s_a", { name: "   " }).reason, "invalid");

  assert.equal(removeServer(edited.list, "s_b").length, 1);
  assert.equal(findServer(removeServer(edited.list, "s_b"), "s_b"), null);

  assert.deepEqual(parseServers("not json"), []);
  assert.deepEqual(parseServers({ servers: [] }), []);
  assert.deepEqual(parseServers([{ garbage: true }, a, a]).length, 1);
  assert.equal(
    parseServers([
      { ...a, current: true },
      { ...b, current: true },
    ]).filter((server) => server.current).length,
    1,
  );

  let many = [];
  for (let i = 0; i < LIMITS.servers; i++) {
    many = addServer(
      many,
      createServer({
        ...base,
        id: `s_${i}`,
        name: `Server ${i}`,
        address: `10.0.${Math.floor(i / 250)}.${i % 250}`,
      }),
    ).list;
  }
  assert.equal(many.length, LIMITS.servers);
  assert.equal(
    addServer(many, createServer({ ...base, id: "s_extra", name: "Extra", address: "extra.example.com" })).reason,
    "limit",
  );

  assert.deepEqual(normalizeServerTarget('{"address":"Play.Example.com","port":"19132"}'), {
    address: "play.example.com",
    port: 19132,
  });
  assert.equal(normalizeServerTarget("bad json"), null);
  assert.equal(normalizeServerTarget({ address: "bad host", port: 19132 }), null);
});

test("server search matches name, address and labels without mutating order", () => {
  const base = {
    now: 1700000000000,
    port: 19132,
    category: "public",
    region: "eu",
  };
  const list = [
    createServer({ ...base, id: "s_a", name: "Alpha", address: "play.alpha.example" }),
    createServer({ ...base, id: "s_b", name: "Beta", address: "beta.example", category: "private", region: "asia" }),
    createServer({ ...base, id: "s_c", name: "Gamma", address: "203.0.113.10" }),
  ];
  assert.equal(filterServers(list, ""), list);
  assert.deepEqual(filterServers(list, "alpha").map((entry) => entry.id), ["s_a"]);
  assert.deepEqual(filterServers(list, "203.0.113").map((entry) => entry.id), ["s_c"]);
  assert.deepEqual(filterServers(list, "private").map((entry) => entry.id), ["s_b"]);
  assert.deepEqual(filterServers(list, "ASIA").map((entry) => entry.id), ["s_b"]);
  assert.deepEqual(filterServers(list, "missing"), []);
  assert.deepEqual(filterServers(null, "alpha"), []);
  assert.deepEqual(list.map((entry) => entry.id), ["s_a", "s_b", "s_c"]);
});

test("compatibility feature definitions cover every section and capability", () => {
  const ids = new Set();
  for (const definition of FEATURE_DEFINITIONS) {
    assert.ok(definition.id.length > 0);
    assert.equal(ids.has(definition.id), false, `duplicate feature id ${definition.id}`);
    ids.add(definition.id);
    assert.match(definition.labelKey, /^compat\.feature\./);
    assert.ok(TRANSLATIONS.en[definition.labelKey], `missing EN label ${definition.labelKey}`);
    assert.ok(TRANSLATIONS.ar[definition.labelKey], `missing AR label ${definition.labelKey}`);
    if (definition.scopeKey) {
      assert.ok(TRANSLATIONS.en[definition.scopeKey], `missing EN scope ${definition.scopeKey}`);
      assert.ok(TRANSLATIONS.ar[definition.scopeKey], `missing AR scope ${definition.scopeKey}`);
    }
    for (const capability of definition.require) {
      assert.ok(CAPABILITY_IDS.includes(capability), `unknown required capability ${capability}`);
    }
    for (const capability of definition.optional) {
      assert.ok(CAPABILITY_IDS.includes(capability), `unknown optional capability ${capability}`);
    }
  }
  assert.equal(ids.size, FEATURE_DEFINITIONS.length);
  assert.equal(featureIdForScreen("main"), "menu");
  assert.equal(featureIdForScreen("espchest.detail"), "espchest");
  assert.equal(featureIdForScreen("utilities.detail"), "waypoints");
  assert.equal(featureIdForScreen("utilities.list"), "waypoints");
  assert.equal(featureIdForScreen("pvp.log"), "combat");
  assert.equal(featureIdForScreen("settings.diagnostics.export"), "diagnostics");
  assert.equal(featureIdForScreen("unknown.screen"), null);

  // Every real registerScreen id must map to a feature, otherwise router.js
  // cannot record its success/error in diagnostics.
  const uiDir = path.join(__dirname, "../src/ATLAS/BP/scripts/ui");
  const registered = new Set();
  for (const file of fs.readdirSync(uiDir).filter((name) => name.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(uiDir, file), "utf8");
    for (const match of source.matchAll(/registerScreen\("([^"]+)"/g)) {
      registered.add(match[1]);
    }
  }
  assert.ok(registered.size > 0);
  for (const screenId of registered) {
    assert.ok(
      featureIdForScreen(screenId),
      `registered screen has no compatibility feature: ${screenId}`,
    );
  }
});

test("menu commands expose both the namespaced name and chat alias", () => {
  assert.equal(MENU_COMMANDS.length, 2);
  const names = new Set();
  const aliases = new Set();
  for (const entry of MENU_COMMANDS) {
    assert.match(entry.name, /^atlas:[a-z]+$/);
    assert.match(entry.chatAlias, /^[a-z]+$/);
    // Bedrock derives the chat alias from the part after the namespace.
    assert.equal(entry.name.split(":")[1], entry.chatAlias);
    assert.equal(typeof entry.primary, "boolean");
    names.add(entry.name);
    aliases.add(entry.chatAlias);
  }
  assert.equal(names.size, 2);
  assert.equal(aliases.size, 2);
  assert.ok(MENU_COMMANDS[0].primary);
  assert.ok(MENU_COMMANDS.some((entry) => entry.chatAlias === "atlas"));
});

test("compatibility statuses only claim WORKING after a real success", () => {
  const allAvailable = Object.fromEntries(CAPABILITY_IDS.map((id) => [id, true]));
  const armor = featureById("armor");
  const servers = featureById("servers");
  const visual = featureById("visual");

  let result = computeFeatureStatus(armor, allAvailable, null);
  assert.equal(result.status, FEATURE_STATUS.READY);

  result = computeFeatureStatus(armor, allAvailable, { lastSuccessTick: 10 });
  assert.equal(result.status, FEATURE_STATUS.WORKING);

  result = computeFeatureStatus(armor, allAvailable, {
    lastSuccessTick: 10,
    lastError: { tick: 11, category: "script", message: "broken" },
  });
  assert.equal(result.status, FEATURE_STATUS.ERROR);
  assert.equal(result.lastError.message, "broken");

  result = computeFeatureStatus(armor, allAvailable, {
    lastSuccessTick: 12,
    lastError: { tick: 11, category: "script", message: "recovered" },
  });
  assert.equal(result.status, FEATURE_STATUS.WORKING);

  result = computeFeatureStatus(armor, { ...allAvailable, "player.equipment": false }, null);
  assert.equal(result.status, FEATURE_STATUS.UNAVAILABLE);
  assert.deepEqual(result.missing, ["player.equipment"]);

  const unknown = { ...allAvailable };
  delete unknown["player.equipment"];
  result = computeFeatureStatus(armor, unknown, null);
  assert.equal(result.status, FEATURE_STATUS.NOT_TESTED);
  assert.deepEqual(result.unknown, ["player.equipment"]);

  result = computeFeatureStatus(visual, { ...allAvailable, "player.locator": false }, null);
  assert.equal(result.status, FEATURE_STATUS.LIMITED);
  assert.deepEqual(result.optionalMissing, ["player.locator"]);

  result = computeFeatureStatus(servers, allAvailable, { lastSuccessTick: 4 });
  assert.equal(result.status, FEATURE_STATUS.LIMITED);
  assert.equal(result.scopeKey, "compat.scope.servers");
});

test("compatibility report lists status, API gaps and stored counts", () => {
  const allAvailable = Object.fromEntries(CAPABILITY_IDS.map((id) => [id, true]));
  const armor = buildFeatureRow(featureById("armor"), allAvailable, { lastSuccessTick: 7 });
  const servers = buildFeatureRow(featureById("servers"), allAvailable, null);
  const summary = buildCompatibilitySummary([armor, servers]);
  const text = formatCompatibilityReport({
    version: ADDON_VERSION,
    gameVersion: "1.26.60",
    serverModule: "2.11.0",
    uiModule: "2.3.0",
    engine: {
      worldLoads: 2,
      reinitCount: 2,
      lastReinitReason: "worldLoad",
      lastCheckTick: 90,
      uptimeTicks: 900,
      errors: { script: 1, event: 0, storage: 2, form: 0 },
      recentErrors: [{ tick: 80, category: "storage", message: "blocked" }],
    },
    entryPoints: {
      commands: [
        { name: "atlas:menu", chatAlias: "menu", primary: true },
        { name: "atlas:atlas", chatAlias: "atlas", primary: false },
      ],
      item: "atlas:client_token",
      scriptEvent: "atlas:menu",
    },
    features: [armor, servers],
    capabilities: CAPABILITY_IDS.map((id) => ({
      id,
      available: id === "player.input" ? false : id === "player.locator" ? null : true,
    })),
    summary,
    contextLines: ["Stored data: waypoints 3 | containers 1 | servers 2"],
  });
  assert.match(text, new RegExp(`ATLAS DIAGNOSTICS v${ADDON_VERSION.replace(/\./g, "\\.")}`));
  assert.match(text, /Entry points: \/atlas:menu \(chat \/menu\), \/atlas:atlas \(chat \/atlas\)/);
  assert.match(text, /WORKING \(1\): armor/);
  assert.match(text, /servers: LIMITED/);
  assert.match(text, /documented scope limit/);
  assert.match(text, /API unavailable \(1\): player\.input/);
  assert.match(text, /API not probed \(1\): player\.locator/);
  assert.match(text, /Stored data: waypoints 3/);
  assert.match(text, /storage @80: blocked/);
  assert.doesNotMatch(text, /password|microsoft account/i);
});

test("long reports split into bounded chat chunks", () => {
  const text = `${"A".repeat(450)}\nshort line\n${"B".repeat(120)}`;
  const chunks = splitForChat(text, 100);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.length <= 100, `chunk was ${chunk.length}`);
  assert.ok(chunks.join("").includes("A".repeat(450)));
  assert.ok(chunks.join("").includes("short line"));
});
