import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SETTINGS,
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
  gameClock,
  relativeDirectionKey,
  sanitizeName,
  setPath,
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
  assert.equal("extra" in normalized, false);
  assert.equal(normalizeSettings({ hud: { interval: 7 } }).hud.interval, 5);
  assert.equal(normalizeSettings({ pvp: { alertThreshold: -2 } }).pvp.alertThreshold, 2);
  assert.equal(toggleSetting(normalizeSettings({}), "hud.coords", false).hud.coords, false);
  assert.equal(toggleSetting(normalizeSettings({}), "unknown.path", false).hud.coords, true);
});

test("settings codes round-trip and reject damage", () => {
  for (const theme of THEME_IDS) {
    for (const language of LANGUAGE_IDS) {
      const settings = normalizeSettings({ theme, language });
      settings.hud.interval = 40;
      settings.pvp.alertThreshold = 2;
      TOGGLE_PATHS.forEach((path, index) => setPath(settings, path, index % 2 === 0));
      const code = settingsToCode(settings);
      assert.match(code, /^ATLAS1-[0-9a-z]{10}$/);
      assert.ok(code.length <= LIMITS.settingsCodeLength);
      const restored = settingsFromCode(code);
      assert.ok(restored);
      assert.equal(restored.theme, theme);
      assert.equal(restored.language, language);
      assert.equal(restored.hud.interval, 40);
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
  assert.equal(base.length, 17);
  assert.equal(settingsFromCode("nope"), null);
  assert.equal(settingsFromCode(`${base.slice(0, -1)}${base.endsWith("0") ? "1" : "0"}`), null);
  assert.equal(settingsFromCode(`${base}!`), null);
  const tracked = normalizeSettings({ waypoints: { trackedId: "w_abc" } });
  assert.equal(settingsFromCode(settingsToCode(tracked)).waypoints.trackedId, null);
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

  for (const path of [
    "hud.coords",
    "hud.health",
    "hud.name",
    "hud.worldInfo",
    "hud.dimension",
    "hud.compass",
    "hud.waypoint",
    "visual.playerInfo",
    "visual.worldInfo",
    "visual.healthBar",
    "visual.stats",
    "pvp.showHealth",
  ]) {
    setPath(settings, path, false);
  }
  assert.deepEqual(buildHudSegments(SNAPSHOT, settings, "atlas"), []);
  assert.equal(buildHudPreview(SNAPSHOT, settings, "atlas"), "All HUD elements are off.");
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
