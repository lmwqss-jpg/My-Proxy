/**
 * End-to-end harness: bundles the real script entry with mock Minecraft
 * modules, then drives the actual forms, settings, HUD, waypoints and events.
 *
 * This is not a substitute for launching Minecraft. It verifies the control
 * flow and data contracts that failed silently in previous pack builds.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

import { EquipmentSlot, ItemStack, Player } from "./mocks/server.js";
import {
  advanceTicks,
  emit,
  fireStartup,
  resetState,
  runTasks,
  state,
} from "./mocks/state.js";
import { normalizeSettings, settingsToCode } from "../src/ATLAS/BP/scripts/settings.js";
import { ADDON_VERSION, LANGUAGE_IDS, THEME_IDS, TOGGLE_PATHS } from "../src/ATLAS/BP/scripts/config.js";
import { getPath, toBase36 } from "../src/ATLAS/BP/scripts/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MENU_ITEM_ID = "atlas:client_token";

const click = (pattern) => (form) => {
  const index = form.buttons.findIndex((button) =>
    pattern instanceof RegExp ? pattern.test(button) : button.includes(pattern),
  );
  if (index < 0) {
    throw new Error(`No button matching ${pattern} in: ${form.buttons.join(" | ")}`);
  }
  return { canceled: false, selection: index };
};

const modal = (...values) => () => ({ canceled: false, formValues: values });
const close = () => ({ canceled: true, cancelationReason: "UserClosed" });

function legacySettingsCode(settings) {
  const value = normalizeSettings(settings);
  const themeIndex = THEME_IDS.indexOf(value.theme);
  const languageIndex = LANGUAGE_IDS.indexOf(value.language);
  let mask = 0;
  TOGGLE_PATHS.slice(0, 20).forEach((path, index) => {
    if (getPath(value, path) === true) mask += 2 ** index;
  });
  const body = `${themeIndex}${languageIndex}${toBase36(value.hud.interval - 5, 1)}${toBase36(value.pvp.alertThreshold - 2, 1)}${toBase36(mask, 4)}`;
  let checksum = 0;
  for (const character of body) {
    checksum = (checksum + character.charCodeAt(0)) % 1296;
  }
  return `ATLAS1-${body}${toBase36(checksum, 2)}`;
}

function queue(...responses) {
  state.uiQueue.push(...responses);
}

async function settle() {
  for (let i = 0; i < 80; i++) {
    runTasks();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (state.uiQueue.length === 0 && state.tasks.length === 0) break;
  }
}

function assertClean() {
  assert.deepEqual(state.errors.map(String), [], "mock/UI errors");
  assert.deepEqual(state.warnings, [], "add-on warnings");
  assert.equal(state.uiQueue.length, 0, "unconsumed form responses");
}

function openWithItem(player) {
  emit("itemUse", { itemStack: new ItemStack(MENU_ITEM_ID, 1), source: player });
  advanceTicks(1);
}

function openWithCommand(player) {
  const command = state.commands.get("atlas:menu");
  assert.ok(command, "custom command was not registered");
  const result = command.callback({ sourceEntity: player, sourceType: "Entity" });
  assert.equal(result.status, 0);
  advanceTicks(1);
}

test("ATLAS CLIENT control flow with mocked Minecraft APIs", async () => {
  const originalWarn = console.warn;
  console.warn = (...args) => state.warnings.push(args.map(String).join(" "));

  const outfile = path.join(os.tmpdir(), `atlas-integration-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, "src/ATLAS/BP/scripts/main.js")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "node20",
    outfile,
    logLevel: "silent",
    alias: {
      "@minecraft/server": path.join(__dirname, "mocks/server.js"),
      "@minecraft/server-ui": path.join(__dirname, "mocks/server-ui.js"),
    },
  });

  try {
    await import(`${pathToFileURL(outfile).href}?v=${Date.now()}`);
    const earlyWorldReads = state.worldReads;
    const earlyWorldWrites = state.worldWrites;
    resetState();
    assert.equal(earlyWorldReads, 0, "module scope must not read world data in early execution");
    assert.equal(earlyWorldWrites, 0, "module scope must not write world data in early execution");
    assert.ok(state.startupHandlers.length > 0, "startup event was not subscribed");
    fireStartup();
    emit("worldLoad", {});

    const player = new Player("player-1", "Alex");
    state.players.push(player);
    emit("playerSpawn", { player, initialSpawn: true });
    advanceTicks(30);
    await settle();

    const command = state.commands.get("atlas:menu");
    assert.ok(command);
    assert.equal(command.spec.permissionLevel, 0);
    assert.equal(command.spec.cheatsRequired, false);
    assert.equal(state.commandRegistrations, 1, "command registered more than once");
    assert.equal(state.commands.size, 1);
    assert.ok(state.startupFired);
    const consoleCommand = command.callback({ sourceEntity: undefined, sourceType: "Server" });
    assert.equal(consoleCommand.status, 1);
    assert.match(consoleCommand.message, /in-game/);
    const eventListeners = {
      worldLoad: 1,
      playerSpawn: 1,
      playerLeave: 1,
      itemUse: 2,
      entityDie: 1,
      entityHurt: 1,
      playerDimensionChange: 1,
      playerInventoryItemChange: 1,
      scriptEventReceive: 1,
      entityHitEntity: 1,
      entityHitBlock: 1,
      playerInteractWithBlock: 2,
      playerInteractWithEntity: 1,
    };
    for (const [name, expected] of Object.entries(eventListeners)) {
      assert.equal(state.events[name].length, expected, `wrong listener count for ${name}`);
    }
    assert.equal(player.inventory.items.size, 1, "menu item was not given");
    assert.equal([...player.inventory.items.values()][0].typeId, MENU_ITEM_ID);
    assert.ok(player.titles.some((entry) => entry.text.includes("ATLAS CLIENT")));
    assert.ok(player.messages.some((message) => message.includes("/atlas:menu")));
    assert.ok(player.messages.some((message) => message.includes(`Scripts v${ADDON_VERSION} are running`)));
    assert.equal(player.dynamic.get("atlas:boot_version"), ADDON_VERSION);
    assert.ok((player.actionBars.at(-1) ?? "").includes("10 64 -4"));
    assert.ok((player.actionBars.at(-1) ?? "").includes("20/20"));

    // Open through the item, toggle coordinates off, then close.
    queue(
      click(/HUD/),
      click(/Coordinates/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.ok(state.forms.some((form) => form.type === "action" && form.buttons.some((b) => /Visual/.test(b))));
    const afterHud = JSON.parse(player.dynamic.get("atlas:settings"));
    assert.equal(afterHud.hud.coords, false);
    assert.ok(!(player.actionBars.at(-1) ?? "").includes("10 64 -4"));
    assert.ok((player.actionBars.at(-1) ?? "").includes("20/20"));

    // The session timer is opt-in and uses real elapsed ticks.
    queue(
      click(/HUD/),
      click(/Session timer/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).hud.session, true);
    assert.match(player.actionBars.at(-1) ?? "", /Session §f\d+:\d{2}/);

    // Two item uses in the same tick cannot stack two menus.
    const formsBeforeDoubleUse = state.forms.length;
    queue(click(/Close/));
    emit("itemUse", { itemStack: new ItemStack(MENU_ITEM_ID, 1), source: player });
    emit("itemUse", { itemStack: new ItemStack(MENU_ITEM_ID, 1), source: player });
    advanceTicks(1);
    await settle();
    assertClean();
    assert.equal(state.forms.length, formsBeforeDoubleUse + 1);

    // Open through the custom command as a second, independent entry point.
    queue(click(/Close/));
    openWithCommand(player);
    await settle();
    assertClean();
    assert.ok(state.forms.at(-1).title.includes("ATLAS"));
    assert.ok(state.forms.at(-1).buttons.some((b) => /Close/.test(b)));

    // Every main-menu section exists and returns to the main menu.
    const formsBeforeSections = state.forms.length;
    const sections = [
      [/Home§r/, "Home"],
      [/ESPCHEST§r/, "ESPCHEST"],
      [/HUD§r/, "HUD"],
      [/Visual§r/, "Visual"],
      [/Player§r/, "Player"],
      [/Movement§r/, "Movement"],
      [/Armor§r/, "Armor"],
      [/Items§r/, "Items"],
      [/Potions§r/, "Potions"],
      [/Totems§r/, "Totems"],
      [/Combat§r/, "Combat"],
      [/Waypoints§r/, "Waypoints"],
      [/Settings§r/, "Settings"],
      [/Diagnostics§r/, "Diagnostics"],
      [/About ATLAS CLIENT§r/, "About ATLAS CLIENT"],
    ];
    for (const [pattern] of sections) {
      queue(click(pattern), click(/Back/));
    }
    queue(click(/Close/));
    openWithItem(player);
    await settle();
    assertClean();
    const sectionForms = state.forms.slice(formsBeforeSections);
    for (const [, title] of sections) {
      assert.ok(
        sectionForms.some((form) => form.title?.includes(title)),
        `section did not open: ${title}`,
      );
    }

    // ESPCHEST records real container interactions only and persists them.
    emit("playerInteractWithBlock", {
      player,
      isFirstEvent: true,
      block: {
        typeId: "minecraft:chest",
        location: { x: 12, y: 64, z: -5 },
        dimension: player.dimension,
      },
    });
    emit("playerInteractWithBlock", {
      player,
      isFirstEvent: true,
      block: {
        typeId: "minecraft:barrel",
        location: { x: 15, y: 64, z: -5 },
        dimension: player.dimension,
      },
    });
    emit("playerInteractWithBlock", {
      player,
      isFirstEvent: true,
      block: {
        typeId: "minecraft:stone",
        location: { x: 18, y: 64, z: -5 },
        dimension: player.dimension,
      },
    });
    await settle();
    const containerLog = JSON.parse(player.dynamic.get("atlas:containers"));
    assert.equal(containerLog.length, 2);
    assert.equal(containerLog[0].typeId, "minecraft:barrel");

    // Re-opening the same chest refreshes one entry instead of duplicating it.
    emit("playerInteractWithBlock", {
      player,
      isFirstEvent: true,
      block: {
        typeId: "minecraft:chest",
        location: { x: 12, y: 64, z: -5 },
        dimension: player.dimension,
      },
    });
    await settle();
    const dedupedLog = JSON.parse(player.dynamic.get("atlas:containers"));
    assert.equal(dedupedLog.length, 2);
    assert.equal(dedupedLog[0].typeId, "minecraft:chest");

    queue(
      click(/ESPCHEST/),
      click(/Barrel/),
      click(/Remove entry/),
      click(/Remove entry/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const detailForm = state.forms.find((form) => form.title?.includes("Container details"));
    assert.ok(detailForm);
    assert.match(detailForm.body, /15 64 -5/);
    const afterRemove = JSON.parse(player.dynamic.get("atlas:containers"));
    assert.equal(afterRemove.length, 1);
    assert.equal(afterRemove[0].typeId, "minecraft:chest");

    // Clearing the log removes only ATLAS history, never world blocks.
    queue(
      click(/ESPCHEST/),
      click(/Clear container log/),
      click(/Clear container log/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.deepEqual(JSON.parse(player.dynamic.get("atlas:containers")), []);

    // A busy client (for example the chat screen still closing) is retried,
    // then the menu opens normally on the next attempt.
    const formsBeforeBusy = state.forms.length;
    queue(
      () => ({ canceled: true, cancelationReason: "UserBusy" }),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    advanceTicks(10);
    await settle();
    assertClean();
    assert.equal(state.forms.length, formsBeforeBusy + 2);

    // Real armor, effects, totems, input and durability alert.
    player.equipment.set(
      EquipmentSlot.Head,
      new ItemStack("minecraft:diamond_helmet", 1, { durability: 363, damage: 20 }),
    );
    player.equipment.set(
      EquipmentSlot.Chest,
      new ItemStack("minecraft:diamond_chestplate", 1, { durability: 528 }),
    );
    player.equipment.set(
      EquipmentSlot.Feet,
      new ItemStack("minecraft:iron_boots", 1, { durability: 195, damage: 190 }),
    );
    player.equipment.set(
      EquipmentSlot.Mainhand,
      new ItemStack("minecraft:diamond_sword", 1, { durability: 1561, damage: 1500 }),
    );
    player.effects = [
      { typeId: "minecraft:speed", duration: 1234, amplifier: 1, isValid: true },
      { typeId: "minecraft:night_vision", duration: -1, amplifier: 0, isValid: true },
    ];
    player.inventory.setItem(0, new ItemStack("minecraft:totem_of_undying", 2));
    player.input = { x: -1, y: 1 };
    advanceTicks(10);
    await settle();
    let liveBar = player.actionBars.at(-1) ?? "";
    assert.match(liveBar, /CPS §f\d+/);
    assert.match(liveBar, /§lW/);
    assert.match(liveBar, /§lD/);
    assert.match(liveBar, /H §f343 §a94%/);
    assert.match(liveBar, /C §f528 §a100%/);
    assert.match(liveBar, /B §f5 §c3%/);
    assert.match(liveBar, /Speed II§r §f1:02/);
    assert.match(liveBar, /Night Vision§r §f∞/);
    assert.match(liveBar, /Totem §f2/);
    assert.ok(player.messages.some((message) => /Low durability/.test(message)));

    // Inventory changes rebuild the HUD immediately so the totem count cannot
    // lag behind the configured refresh interval.
    player.inventory.setItem(1, new ItemStack("minecraft:totem_of_undying", 1));
    emit("playerInventoryItemChange", { player });
    await settle();
    assert.match(player.actionBars.at(-1) ?? "", /Totem §f3/);
    assert.ok(player.sounds.some((sound) => sound.soundId === "note.bass"));

    // A burst of inventory events is coalesced: two changes in the same tick
    // produce one rebuild, not one per event.
    advanceTicks(5);
    await settle();
    const barsBeforeBurst = player.actionBars.length;
    player.inventory.setItem(2, new ItemStack("minecraft:totem_of_undying", 1));
    emit("playerInventoryItemChange", { player });
    emit("playerInventoryItemChange", { player });
    await settle();
    assert.equal(player.actionBars.length, barsBeforeBurst + 1);
    assert.match(player.actionBars.at(-1) ?? "", /Totem §f4/);
    const warningCount = player.messages.filter((message) => /Low durability/.test(message)).length;
    assert.equal(warningCount, 1);

    // A real attack and interaction are counted as observed clicks.
    emit("entityHitEntity", { damagingEntity: player, hitEntity: {} });
    emit("playerInteractWithBlock", { player, isFirstEvent: true });
    // Move one refresh interval, then force a rebuild from a real inventory
    // event while the observed action is still inside the indicator window.
    advanceTicks(5);
    player.inventory.setItem(3, new ItemStack("minecraft:stone", 1));
    emit("playerInventoryItemChange", { player });
    await settle();
    liveBar = player.actionBars.at(-1) ?? "";
    const observedCps = Number((liveBar.match(/CPS §f(\d+)/) ?? [])[1]);
    assert.ok(observedCps >= 2, `observed CPS was ${observedCps}`);
    assert.match(liveBar, /§lLMB/);
    assert.match(liveBar, /§lRMB/);
    assert.equal(player.messages.filter((message) => /Low durability/.test(message)).length, 1);

    // An unavailable optional API removes only its own HUD element. It must
    // not throw away the rest of the line or invent a neutral value.
    const originalView = player.getViewDirection;
    const originalGameMode = player.getGameMode;
    const originalEffects = player.effects;
    player.getViewDirection = () => { throw new Error("unsupported view API"); };
    player.getGameMode = () => { throw new Error("unsupported game mode API"); };
    player.effects = [];
    advanceTicks(10);
    await settle();
    const degradedBar = player.actionBars.at(-1) ?? "";
    assert.match(degradedBar, /H §f343/);
    assert.doesNotMatch(degradedBar, /null|undefined|NaN/);
    assert.doesNotMatch(degradedBar, /§b[NSWE]/);
    player.getViewDirection = originalView;
    player.getGameMode = originalGameMode;
    player.effects = originalEffects;
    advanceTicks(10);
    await settle();

    // HUD editor persists per-piece toggles immediately.
    queue(
      click(/^\s*(?:§.)*HUD/),
      click(/HUD editor/),
      click(/Helmet/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).hud.armorHelmet, false);
    assert.doesNotMatch(player.actionBars.at(-1) ?? "", /H §f343/);

    // HUD colour is a real text colour change, saved immediately.
    queue(
      click(/HUD/),
      click(/HUD editor/),
      click(/HUD accent color/),
      modal(5),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).hud.color, "red");
    assert.match(player.actionBars.at(-1) ?? "", /§c§lD/);

    // Resetting the HUD layout restores defaults without touching theme/language.
    queue(
      click(/HUD/),
      click(/HUD editor/),
      click(/Reset HUD layout/),
      click(/Reset HUD layout/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const resetHud = JSON.parse(player.dynamic.get("atlas:settings"));
    assert.equal(resetHud.hud.armorHelmet, true);
    assert.equal(resetHud.hud.color, "theme");
    assert.equal(resetHud.hud.durabilityThreshold, 20);
    assert.equal(resetHud.theme, "atlas");
    assert.match(player.actionBars.at(-1) ?? "", /H §f343/);

    // Theme picker: choose Violet (index 2), then return.
    queue(click(/Settings/), click(/Theme/), modal(2), click(/Back/), click(/Close/));
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).theme, "violet");
    const themeForm = state.forms.find((form) => form.type === "modal" && form.fields[0]?.items?.length === 4);
    assert.ok(themeForm, "theme picker did not contain four themes");

    // Language picker: Arabic, then back to English.
    queue(
      click(/Settings/),
      click(/Language/),
      modal(1),
      click(/Back|رجوع/),
      click(/Close|إغلاق/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).language, "ar");
    assert.ok(state.forms.some((form) => form.buttons?.some((b) => /الإعدادات/.test(b))));

    queue(
      click(/الإعدادات/),
      click(/اللغة/),
      modal(0),
      click(/Back|رجوع/),
      click(/Close|إغلاق/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    assert.equal(JSON.parse(player.dynamic.get("atlas:settings")).language, "en");

    // Add a waypoint through the modal, which should also become the HUD target.
    queue(
      click(/Waypoints/),
      click(/Add waypoint here/),
      modal("Base"),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const waypointList = JSON.parse(state.worldProps.get("atlas:waypoints"));
    assert.equal(waypointList.length, 1);
    assert.equal(waypointList[0].name, "Base");
    assert.equal(waypointList[0].dimensionId, "minecraft:overworld");
    const afterAdd = JSON.parse(player.dynamic.get("atlas:settings"));
    assert.equal(afterAdd.waypoints.trackedId, waypointList[0].id);
    assert.equal(player.locatorBar.waypoints.size, 1);
    assert.ok((player.actionBars.at(-1) ?? "").includes("Base"));

    // Rename it through the detail screen.
    queue(
      click(/Waypoints/),
      click(/Waypoints/),
      click(/Base/),
      click(/Rename/),
      modal("HQ"),
      click(/Back/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const renamed = JSON.parse(state.worldProps.get("atlas:waypoints"));
    assert.equal(renamed.length, 1);
    assert.equal(renamed[0].name, "HQ");
    assert.ok((player.actionBars.at(-1) ?? "").includes("HQ"));

    // Low-health alert fires once per low-health episode.
    player.health = 5;
    advanceTicks(5);
    await settle();
    assert.ok(player.titles.some((entry) => entry.text.includes("LOW HEALTH")));
    assert.ok(player.sounds.some((sound) => sound.soundId === "note.pling"));
    assert.equal(player.titles.filter((entry) => entry.text.includes("LOW HEALTH")).length, 1);
    player.health = 20;
    advanceTicks(5);
    player.health = 4;
    advanceTicks(5);
    await settle();
    assert.equal(player.titles.filter((entry) => entry.text.includes("LOW HEALTH")).length, 2);

    // A player kill updates both combat records and creates a death waypoint.
    const killer = new Player("player-2", "Steve");
    state.players.push(killer);
    emit("entityDie", {
      deadEntity: player,
      damageSource: { cause: "entityAttack", damagingEntity: killer },
    });
    advanceTicks(1);
    await settle();
    assertClean();
    assert.equal(player.dynamic.get("atlas:deaths"), 1);
    assert.equal(killer.dynamic.get("atlas:kills"), 1);
    const withDeath = JSON.parse(state.worldProps.get("atlas:waypoints"));
    assert.equal(withDeath.length, 2);
    assert.ok(withDeath.some((waypoint) => waypoint.kind === "death"));
    assert.equal(player.locatorBar.waypoints.size, 2);
    assert.ok(player.dynamic.get("atlas:last_death"));

    // Combat log displays the persisted stats and the death event.
    queue(
      click(/Combat/),
      click(/Combat log/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const combatForm = state.forms.find((form) => form.body?.includes("Recent combat"));
    assert.ok(combatForm);
    assert.match(combatForm.body, /Deaths: §f1/);
    assert.match(combatForm.body, /Last death/);
    assert.match(combatForm.body, /Steve/);

    // Diagnostics exposes the real target versions and feature status.
    queue(
      click(/Settings/),
      click(/Diagnostics/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const diagForm = state.forms.find((form) => form.title?.includes("Diagnostics"));
    assert.ok(diagForm);
    assert.match(diagForm.body, /1\.26\.60/);
    assert.match(diagForm.body, /2\.11\.0/);
    assert.match(diagForm.body, /2\.3\.0/);
    assert.match(diagForm.body, /Session duration: \d+:\d{2}/);

    // Export produces a code; send it to chat.
    queue(
      click(/Settings/),
      click(/Export/),
      click(/Send code to chat/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const exportForm = state.forms.find((form) => form.title?.includes("Export settings"));
    assert.ok(exportForm);
    assert.match(exportForm.body, /ATLAS2-/);
    assert.ok(player.messages.some((message) => message.includes("ATLAS2-")));

    // Import a valid Arabic/Emerald settings code.
    const importCode = settingsToCode(normalizeSettings({ theme: "emerald", language: "ar" }));
    queue(
      click(/Settings/),
      click(/Import/),
      modal(importCode),
      click(/Back|رجوع/),
      click(/Close|إغلاق/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const imported = JSON.parse(player.dynamic.get("atlas:settings"));
    assert.equal(imported.theme, "emerald");
    assert.equal(imported.language, "ar");
    assert.ok(state.forms.some((form) => form.buttons?.some((b) => /الإعدادات/.test(b))));

    // A legacy ATLAS1 code imports through the same form and is saved as the
    // current schema. Toggles added after the legacy format keep their defaults.
    const legacy = normalizeSettings({
      theme: "violet",
      language: "ar",
      hud: { coords: false, compact: false },
      pvp: { alertThreshold: 8 },
    });
    const legacyCode = legacySettingsCode(legacy);
    assert.match(legacyCode, /^ATLAS1-[0-9a-z]{10}$/);
    queue(
      click(/الإعدادات/),
      click(/استيراد/),
      modal(legacyCode),
      click(/رجوع|Back/),
      click(/إغلاق|Close/),
    );
    openWithItem(player);
    await settle();
    assertClean();
    const legacyImported = JSON.parse(player.dynamic.get("atlas:settings"));
    assert.equal(legacyImported.theme, "violet");
    assert.equal(legacyImported.language, "ar");
    assert.equal(legacyImported.hud.coords, false);
    assert.equal(legacyImported.hud.compact, false);
    assert.equal(legacyImported.pvp.alertThreshold, 8);
    assert.equal(legacyImported.hud.durabilityAlert, true);
    assert.ok(player.messages.some((message) => /تم استيراد الإعدادات/.test(message)));
    assert.match(player.actionBars.at(-1) ?? "", /الصحة/);

    // Snapshot the values written by the UI, then leave and change the stored
    // JSON to a distinct state. A rejoin must read that storage instead of
    // reusing the old in-memory cache. This is the data path used when a world
    // is closed and opened again.
    const savedDynamic = new Map(player.dynamic);
    const savedBeforeLeave = JSON.parse(savedDynamic.get("atlas:settings"));
    assert.equal(savedBeforeLeave.theme, "violet");
    assert.equal(savedBeforeLeave.language, "ar");
    assert.equal(savedBeforeLeave.hud.coords, false);
    assert.equal(savedBeforeLeave.pvp.alertThreshold, 8);
    const waypointCount = JSON.parse(state.worldProps.get("atlas:waypoints")).length;
    emit("playerLeave", { playerId: player.id, playerName: player.name });
    player.isValid = false;
    const leavingIndex = state.players.indexOf(player);
    if (leavingIndex >= 0) state.players.splice(leavingIndex, 1);
    const reopenedSettings = normalizeSettings({
      ...savedBeforeLeave,
      theme: "ember",
      language: "en",
      hud: { ...savedBeforeLeave.hud, coords: true, interval: 20 },
    });
    savedDynamic.set("atlas:settings", JSON.stringify(reopenedSettings));
    const returning = new Player(player.id, player.name);
    for (const [key, value] of savedDynamic) returning.dynamic.set(key, value);
    state.players.push(returning);
    emit("playerSpawn", { player: returning, initialSpawn: true });
    advanceTicks(30);
    await settle();
    assertClean();
    const reloaded = JSON.parse(returning.dynamic.get("atlas:settings"));
    assert.equal(reloaded.theme, "ember");
    assert.equal(reloaded.language, "en");
    assert.equal(reloaded.hud.coords, true);
    assert.equal(reloaded.hud.compact, false);
    assert.equal(reloaded.hud.interval, 20);
    assert.equal(reloaded.pvp.alertThreshold, 8);
    assert.equal(reloaded.hud.durabilityAlert, true);
    assert.match(returning.actionBars.at(-1) ?? "", /Health/);
    assert.match(returning.actionBars.at(-1) ?? "", /20\/20/);
    assert.equal(JSON.parse(state.worldProps.get("atlas:waypoints")).length, waypointCount);
    assert.ok(!returning.messages.some((message) => message.includes(`Scripts v${ADDON_VERSION} are running`)));

    // 1.4.0 section controls: each screen writes the setting it describes.
    const controls = [
      [/Movement§r/, /CPS counter/, "hud.cps"],
      [/Armor§r/, /Helmet/, "hud.armorHelmet"],
      [/Player§r/, /Player name/, "hud.name"],
      [/Potions§r/, /Potion effects HUD/, "hud.potions"],
      [/Items§r/, /Totem counter/, "hud.totems"],
      [/Totems§r/, /Totem counter/, "hud.totems"],
    ];
    for (const [section, control, path] of controls) {
      const before = JSON.parse(returning.dynamic.get("atlas:settings"));
      const oldValue = path.split(".").reduce((value, key) => value?.[key], before);
      queue(click(section), click(control), click(/Back/), click(/Close/));
      openWithItem(returning);
      await settle();
      assertClean();
      const changed = JSON.parse(returning.dynamic.get("atlas:settings"));
      assert.equal(
        path.split(".").reduce((value, key) => value?.[key], changed),
        !oldValue,
        `control did not persist: ${path}`,
      );
      // Restore so the screens continue from a known layout.
      queue(click(section), click(control), click(/Back/), click(/Close/));
      openWithItem(returning);
      await settle();
      assertClean();
      const restored = JSON.parse(returning.dynamic.get("atlas:settings"));
      assert.equal(
        path.split(".").reduce((value, key) => value?.[key], restored),
        oldValue,
        `control did not restore: ${path}`,
      );
    }

    // Home's session shortcut and the Armor threshold modal are real controls.
    queue(click(/Home§r/), click(/Session timer/), click(/Back/), click(/Close/));
    openWithItem(returning);
    await settle();
    assertClean();
    assert.equal(JSON.parse(returning.dynamic.get("atlas:settings")).hud.session, true);

    queue(
      click(/Armor§r/),
      click(/Durability alert threshold/),
      modal(45),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(returning);
    await settle();
    assertClean();
    assert.equal(JSON.parse(returning.dynamic.get("atlas:settings")).hud.durabilityThreshold, 45);

    queue(
      click(/Armor§r/),
      click(/Durability alert threshold/),
      modal(20),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(returning);
    await settle();
    assertClean();
    assert.equal(JSON.parse(returning.dynamic.get("atlas:settings")).hud.durabilityThreshold, 20);

    // Missing equippable data must not turn the ITEMS screen into a fake empty hand.
    const originalGetComponent = returning.getComponent.bind(returning);
    returning.getComponent = (id) =>
      id === "minecraft:equippable" ? undefined : originalGetComponent(id);
    const formsBeforeItems = state.forms.length;
    queue(click(/Items§r/), click(/Back/), click(/Close/));
    openWithItem(returning);
    await settle();
    assertClean();
    const degradedItems = state.forms
      .slice(formsBeforeItems)
      .find((form) => form.title?.includes("Items"));
    assert.ok(degradedItems);
    assert.match(degradedItems.body, /Not available/);
    assert.doesNotMatch(degradedItems.body, /Main hand: §8Empty/);
    returning.getComponent = originalGetComponent;

    // A container detail still shows real coordinates/distance when the view API fails.
    emit("playerInteractWithBlock", {
      player: returning,
      isFirstEvent: true,
      block: {
        typeId: "minecraft:barrel",
        location: { x: 20, y: 64, z: -5 },
        dimension: returning.dimension,
      },
    });
    await settle();
    const originalDetailView = returning.getViewDirection.bind(returning);
    returning.getViewDirection = () => {
      throw new Error("unsupported view API");
    };
    const formsBeforeDetail = state.forms.length;
    queue(
      click(/ESPCHEST§r/),
      click(/Barrel/),
      click(/Back/),
      click(/Back/),
      click(/Close/),
    );
    openWithItem(returning);
    await settle();
    assertClean();
    const degradedDetail = state.forms
      .slice(formsBeforeDetail)
      .find((form) => form.title?.includes("Container details"));
    assert.ok(degradedDetail);
    assert.match(degradedDetail.body, /20 64 -5/);
    returning.getViewDirection = originalDetailView;

    originalWarn(`Integration harness complete: ${state.forms.length} forms exercised.`);
  } finally {
    console.warn = originalWarn;
  }
});
