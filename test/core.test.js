import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARMOR_PIECES,
  DEFAULT_SETTINGS,
  HUD_COLOR_IDS,
  LANGUAGE_IDS,
  LIMITS,
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
  buildHudPreview,
  buildHudSegments,
  dimensionLabel,
  effectLabel,
  formatEffectDuration,
  trackedWaypointSnapshot,
} from "../src/ATLAS/BP/scripts/hudFormat.js";

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
