# ATLAS CLIENT — Test Report

**Add-on version:** 1.1.0
**Archive:** `ATLAS.mcaddon`
**Target:** Minecraft Bedrock 26.60 (1.26.60)
**Official modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments required:** none

---

## 1. What was actually run

| Command | Result |
|---|---|
| `npm run typecheck` | **Passed.** The pack scripts were checked against the official 2.11.0 / 2.3.0 TypeScript definitions. |
| `npm test` | **Passed.** 13 tests: 12 unit/static tests + 1 integration test that exercised **76 native form flows** through mocked Minecraft APIs. |
| `npm run build` | **Passed.** Produced `ATLAS.mcaddon` with **43 files / 56.5 KiB** (45 ZIP entries including pack roots). |
| `npm run validate` | **Passed.** Manifest, UUID, path, texture, language, import and ZIP checks. |

Environment: Linux, Node.js 24.22.1, TypeScript 5.9.3, esbuild 0.25.12. The mock harness is not Minecraft.

---

## 2. Static and structural validation

`npm run validate` checks:

- Both `manifest.json` files are valid JSON and use `format_version: 2`.
- Five UUIDs are valid v4 and unique: two pack headers, one data module, one script module, one resources module.
- `min_engine_version` is exactly `[1, 26, 60]`.
- Behavior Pack has `data` + `script` modules; script language is `javascript`; entry is `scripts/main.js` and the file exists.
- Resource Pack has a `resources` module.
- Dependencies use stable `@minecraft/server 2.11.0` and `@minecraft/server-ui 2.3.0`; no beta/preview versions.
- Behavior/resource packs declare each other's correct UUID and version.
- No experiment capability is declared.
- Item `atlas:client_token` exists, uses the declared icon, and the icon is mapped to an existing 32×32 PNG.
- All UI button textures exist, all PNG signatures and dimensions are correct, and both pack icons are 256×256.
- Both language files contain the item name; `languages.json` lists `en_US` and `ar_SA`.
- Every relative script import resolves; only the two allowed official modules are imported; no `eval`/`Function` construction.
- No legacy/forbidden names appear in pack files.
- The ZIP has no double nesting, no unexpected top-level files, no junk files, and every archived file matches its source byte-for-byte.
- The bundled entry performs **zero world reads/writes at module scope**, which avoids Script API v2 early-execution failures before `worldLoad`.

---

## 3. Unit and model tests

Covered by `test/core.test.js`:

- English/Arabic dictionaries have identical keys and identical `{placeholder}` sets; all UI keys used by scripts exist.
- Four themes are complete, distinct and have valid Bedrock colour codes/RGB values; all seven HUD accent colours are defined.
- Compass bearings, eight-way cardinal labels, relative directions, 3D distance, Minecraft clock conversion (including midnight), coordinate formatting and K/D formatting.
- Name sanitisation removes section-sign codes, control characters and excess length.
- Settings validation clamps HUD interval (5–40 ticks), health alert threshold (2–19), durability threshold (5–90 in steps of 5), rejects invalid themes/languages/HUD colours, drops unknown keys, and preserves the allowed toggle set.
- `ATLAS2-...` settings codes round-trip all 33 booleans, four themes, two languages, both thresholds, refresh interval and HUD colour. Tampered, truncated and invalid codes are rejected.
- Legacy `ATLAS1-...` codes still import the original 20 toggles; toggles added in 1.1.0 keep their defaults.
- Waypoint CRUD, duplicate IDs, 30-item cap, death-point reuse, death-point rename, death-point recreation after rename, parsing invalid JSON/entries, serialisation round-trip.
- HUD composition: every toggle, compact mode, health bar, combat stats, Arabic labels, other-dimension waypoint, and the all-off case.
- New live HUD text: WASD active/inactive states, observed CPS, LMB/RMB state, real armor durability (compact and detailed), per-piece armor toggles, low-armor colour, potion names/levels/durations, infinite effects, totem count, and honest `--` output when the input/status APIs are unavailable.
- Effect duration formatting (`1:02`, infinity, zero) and known/unknown effect names.
- Tracked waypoint distance/bearing and dimension handling.

---

## 4. Integration harness

`test/integration.test.js` bundles the real `scripts/main.js` with mock implementations of the official modules, then drives the actual forms and event handlers:

1. Startup registers `/atlas:menu` with permission `Any` and `cheatsRequired: false`.
2. Player spawn gives exactly one ATLAS item, sends the welcome title/chat and sets the action-bar HUD.
3. Using the custom item opens the main menu.
4. A simulated `UserBusy` response is retried and the menu opens on the next attempt.
5. Toggling Coordinates off persists the setting and rebuilds the HUD without the coordinate element.
6. `/atlas:menu` opens the same menu through a second entry point.
7. Equipped armor with real damage values appears as H/C/L/B with durability and percentages.
8. Active speed/night-vision effects appear with level and remaining time.
9. Two totems in the inventory produce a count of two.
10. Movement input lights W and D; a held item below the threshold produces one low-durability chat warning and sound.
11. A real attack and block interaction update the observed CPS and LMB/RMB indicators; the durability warning does not repeat.
12. The HUD editor persists a per-piece armor toggle immediately.
13. The HUD editor changes the accent colour and persists it immediately.
14. The HUD editor reset restores panel defaults without changing theme or language.
15. Theme picker applies Violet; four options are present.
16. Language picker switches all menus to Arabic, then back to English.
17. Adding a waypoint through the modal persists it, auto-tracks it and adds a locator-bar marker.
18. Renaming a waypoint updates the HUD tracker and survives a reload from storage.
19. Low-health alert fires once per low-health episode, plays the sound and resets after healing.
20. A player death updates deaths, updates the killer's kills, creates the automatic death waypoint and adds it to both players' locator bars.
21. Combat log shows persisted deaths, last-death data and the killer's name.
22. Diagnostics shows the real API/product versions and feature status.
23. Export produces an `ATLAS2-...` code and sends it to chat.
24. Import applies a valid Arabic/Emerald code.

No mocked warnings or form errors remained at the end of the run. That verifies control flow, not Minecraft rendering.

---

## 5. Feature status

| Feature | Status | What is real |
|---|---|---|
| WASD panel | **Works, device-dependent** | `Player.inputInfo.getMovementVector()` is read each HUD refresh. Active states reflect movement intent (WASD keys, or the left stick on a controller). It is not a physical key event. |
| CPS counter | **Partial** | Counts real game-reported attacks, block/entity interactions and item uses in the last 20 ticks. Clicks into empty air cannot be observed, so a CPS of 0 does not always mean the mouse was not clicked. |
| LMB / RMB indicators | **Partial** | Lit by the same real game events. They are action indicators, not physical mouse-button states. |
| Armor durability | **Works** | Real equipped items, real `minecraft:durability` values, remaining/max durability, percentages, automatic refresh and per-piece toggles. |
| Armor icons | **Unsupported** | The action bar can only render text. H/C/L/B labels are used instead; no fake icons. |
| Armor vertical position / HUD position | **Unsupported** | The Script API has no API for moving action-bar text or creating a top-right HUD widget. No fake position controls are shown. |
| Potion effects | **Works** | `Player.getEffects()` names, amplifiers and remaining ticks. `getEffects()` only returns active effects; negative durations are shown as `∞`. |
| Totem counter | **Works** | Main inventory plus offhand, counted by item type and stack amount. |
| Low durability alert | **Works, scoped** | Equipped armor and the currently held item. Threshold is configurable, warning fires once per low episode, sound is optional. Stored tools that are not held are not scanned. |
| HUD editor | **Works** | Panel/armor-piece toggles, accent colour, durability threshold/sound, compact/detailed mode, reset. Changes save immediately. |
| Font size / transparency / per-element position | **Unsupported** | Not exposed by the Script API; not represented by fake controls. |
| PS5 controller buttons | **Unverified / unsupported** | No API exposes PS5 button states. Movement vector and game-action events are device-independent in theory but were not tested on PS5. |
| Public servers (e.g. Mega10) | **Unverified** | Activation, custom commands, locator bar and UI availability depend on the server. No server was tested. |
| Existing HUD / Visual / PvP / Utilities / Settings | **Preserved** | Previous features, themes, languages, waypoints, combat stats, import/export and diagnostics remain and are covered by the tests above. |

---

## 6. NOT tested

The following were **not** executed in this environment because Minecraft Bedrock, the iOS/PS5 clients, and a graphics stack are unavailable:

- Importing `ATLAS.mcaddon` into Minecraft on iPhone/iPad, PS5, or any Bedrock client.
- Activating the packs in a real world.
- Actual rendering of ActionFormData/ModalFormData on iOS or PS5.
- Whether tapping/using the custom item triggers on a specific iPhone/PS5 control scheme.
- Arabic glyph shaping and right-to-left line layout in Bedrock's proprietary form font.
- Visual appearance/position/colour of locator-bar waypoint markers.
- Low-health title animation, durability-alert sound mixing and all HUD text at different screen sizes.
- The item icon in the hotbar/inventory and form button icons.
- The real WASD movement vector, real attack/interact events and real CPS counts on a device.
- Real armor durability changes, potion timing and totem inventory updates in a live world.
- Multiplayer synchronisation and performance under many players.
- Behaviour on Minecraft versions other than 26.60.
- The custom item and the custom command on the real iOS/PS5 chat/input path.
- Mega10 or any other public server.
- Whether a long HUD line wraps or is truncated on a narrow screen; disable unused panels if it does.

No claim is made that these were tested.

---

## 7. Manual test checklist

Use Minecraft Bedrock **26.60+**. Test on iPhone first; repeat on PS5 only if your setup allows importing packs.

- [ ] Open `ATLAS.mcaddon` in Files → Share → Minecraft; both packs appear in the import list.
- [ ] Activate **ATLAS CLIENT** (behavior) and **ATLAS CLIENT Resources** (resource) in world settings.
- [ ] Confirm no experiments are enabled.
- [ ] Enter world: ATLAS title/chat appears; ATLAS item is in the inventory.
- [ ] Use the ATLAS item → main menu opens.
- [ ] Close the menu and reopen with `/atlas:menu` (cheats off).
- [ ] Walk with keyboard/left stick; verify W/A/S/D light correctly.
- [ ] Attack a mob/block and interact with a block; verify CPS and LMB/RMB update, and that clicking empty air does not invent a click.
- [ ] Equip helmet, chestplate, leggings and boots; verify real durability and percentages.
- [ ] Damage armor; verify values update and low pieces turn red.
- [ ] Use **HUD → HUD editor** to hide one armor piece, change colour, change the durability threshold, and reset the layout.
- [ ] Apply a potion; verify name, level and remaining time; wait for expiry and verify it disappears.
- [ ] Put totems in the inventory and offhand; verify the count and updates after moving them.
- [ ] Bring armor/held item below the threshold; verify one warning and the optional sound.
- [ ] Toggle each HUD element; verify the action-bar line changes.
- [ ] Switch all four themes; verify HUD/form accents and locator marker colour.
- [ ] Switch to Arabic; check every screen for readable RTL text and no overlap.
- [ ] Add a waypoint; verify distance/direction and locator marker.
- [ ] Rename, move, track, untrack and delete a waypoint; verify persistence after leaving/rejoining.
- [ ] Take damage below the alert threshold; verify title/sound only once.
- [ ] Die; verify the death point appears and kills/deaths update.
- [ ] Open combat log; verify stats and recent events.
- [ ] Export settings, then import the `ATLAS2-...` code; verify theme/language/toggles/colour/threshold return.
- [ ] Reset settings; verify defaults.
- [ ] Open Diagnostics; verify scripts OK, item OK, locator supported.
- [ ] Enable Content Log GUI and confirm there are no ATLAS errors.
- [ ] On PS5, check movement indicators and menu controls without assuming untested behaviour.

If any item fails, attach the Content Log output. Do not assume the automated tests prove in-game behaviour.

---

## 8. Limitations and alternatives

- **No clickable top-right HUD icon.** Bedrock add-ons cannot add native HUD widgets. Alternative: ATLAS item + `/atlas:menu`.
- **No ESC capture.** Keyboard input is not exposed to add-ons. Alternative: item + command.
- **HUD is an action-bar line, not a custom overlay.** Top-right placement, per-element position, font size, transparency and vertical armor position are not available. Alternative: per-element toggles, compact mode, accent colours and 5–40 tick refresh.
- **No armor/item icons in the HUD.** The action bar is text-only. H/C/L/B labels carry the real values.
- **CPS and mouse indicators are partial.** Only game-reported clicks are visible. No auto-clicker, click simulation or combat automation exists.
- **Themes cannot change native form backgrounds or Ore UI.** Text/HUD/locator colours only.
- **Waypoints are world-shared**, maximum 30, and stored in world dynamic properties. Death points are automatic.
- **Combat history/damage are session-only**; kills/deaths/last death are persisted.
- **No clipboard.** Settings code can be sent to chat or written down.
- **No X-ray/ESP/aimbot/auto-clicker**, by design.
- **No weather element** because the stable API has no reliable current-weather getter; day/time, difficulty, dimension and player count are shown instead.
- **No custom HUD font.** Bedrock's built-in font is used, so unsupported glyphs may render differently across platforms.
- **Public servers can restrict packs or commands.** The add-on does not bypass server rules or anti-cheat.

---

## 9. Why the previous build may have appeared empty

The repository originally contained no previous add-on files, only `README.md`, so the exact old failure could not be reproduced. This build reduces the common silent-failure causes:

- Correct Behavior Pack script module and `scripts/main.js` entry.
- Stable API dependencies matching the target game (no beta modules, no experiments).
- Both packs in one `.mcaddon`, with each manifest at the pack root.
- Explicit activation instructions for the Behavior and Resource packs.
- Two independent menu entry points: the custom item and a no-cheats custom command.
- A visible welcome title/chat so a loaded script is immediately observable.
- Diagnostics inside the menu and `[ATLAS] Scripts loaded` in the Content Log.
- A validator that checks the built ZIP, not only the source tree.

The remaining verification that matters is importing and using the file on the target devices.
