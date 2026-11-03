# ATLAS CLIENT — Test Report

**Add-on version:** 1.0.0
**Archive:** `ATLAS.mcaddon`
**Target:** Minecraft Bedrock 26.60 (1.26.60)
**Official modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments required:** none

---

## 1. What was actually run

| Command | Result |
|---|---|
| `npm run typecheck` | **Passed.** The pack scripts were checked against the official 2.11.0 / 2.3.0 TypeScript definitions. |
| `npm test` | **Passed.** 12 tests: 11 unit/static tests + 1 integration test that exercised **56 native form flows** through mocked Minecraft APIs. |
| `npm run build` | **Passed.** Produced `ATLAS.mcaddon` with **40 files / 46.1 KiB** (42 ZIP entries including pack roots). |
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

## 3. Unit and model tests

Covered by `test/core.test.js`:

- English/Arabic dictionaries have identical keys and identical `{placeholder}` sets; all UI keys used by scripts exist.
- Four themes are complete, distinct and have valid Bedrock colour codes/RGB values.
- Compass bearings, eight-way cardinal labels, relative directions, 3D distance, Minecraft clock conversion (including midnight), coordinate formatting and K/D formatting.
- Name sanitisation removes section-sign codes, control characters and excess length.
- Settings validation clamps interval (5–40 ticks), alert threshold (2–19), rejects invalid themes/languages, drops unknown keys, and preserves the allowed toggle set.
- Settings code round-trips for all themes/languages; tampered, truncated and invalid codes are rejected; waypoint tracking is deliberately not exported.
- Waypoint CRUD, duplicate IDs, 30-item cap, death-point reuse, death-point rename, death-point recreation after rename, parsing invalid JSON/entries, serialisation round-trip.
- HUD composition: every toggle, compact mode, health bar, combat stats, Arabic labels, other-dimension waypoint, and the all-off case.
- Tracked waypoint distance/bearing and dimension handling.

## 4. Integration harness

`test/integration.test.js` bundles the real `scripts/main.js` with mock implementations of the official modules, then drives the actual forms and event handlers:

1. Startup registers `/atlas:menu` with permission `Any` and `cheatsRequired: false`.
2. Player spawn gives exactly one ATLAS item, sends the welcome title/chat and sets the action-bar HUD.
3. Using the custom item opens the main menu.
4. A simulated `UserBusy` response is retried and the menu opens on the next attempt.
5. Toggling Coordinates off persists the setting and rebuilds the HUD without the coordinate element.
6. `/atlas:menu` opens the same menu through a second entry point.
7. Theme picker applies Violet; four options are present.
8. Language picker switches all menus to Arabic, then back to English.
9. Adding a waypoint through the modal persists it, auto-tracks it and adds a locator-bar marker.
10. Renaming a waypoint updates the HUD tracker and survives a reload from storage.
11. Low-health alert fires once per low-health episode, plays the sound and resets after healing.
12. A player death updates deaths, updates the killer's kills, creates the automatic death waypoint and adds it to both players' locator bars.
13. Combat log shows persisted deaths, last-death data and the killer's name.
14. Diagnostics shows the real API/product versions and feature status.
15. Export produces an `ATLAS1-...` code and sends it to chat.
16. Import applies a valid Arabic/Emerald code.

No mocked warnings or form errors remained at the end of the run. That verifies control flow, not Minecraft rendering.

---

## 5. NOT tested

The following were **not** executed in this environment because Minecraft Bedrock, the iOS client, and a graphics stack are unavailable:

- Importing `ATLAS.mcaddon` into Minecraft on iPhone/iPad or any Bedrock client.
- Activating the packs in a real world.
- Actual rendering of ActionFormData/ModalFormData on iOS.
- Whether tapping/using the custom item triggers on a specific iPhone control scheme.
- Arabic glyph shaping and right-to-left line layout in Bedrock's proprietary form font.
- Visual appearance/position/colour of locator-bar waypoint markers.
- Low-health title animation and sound mixing.
- The item icon in the hotbar/inventory and form button icons.
- Multiplayer synchronisation and performance under many players.
- Behaviour on Minecraft versions other than 26.60.
- The custom item and the custom command on the real iOS chat/input path.
- A real `/scriptevent atlas:menu` or real `/atlas:menu` command entered from the iOS chat UI.

No claim is made that these were tested.

---

## 6. Manual test checklist for iPhone

Use Minecraft Bedrock **26.60+**.

- [ ] Open `ATLAS.mcaddon` in Files → Share → Minecraft; both packs appear in the import list.
- [ ] Activate **ATLAS CLIENT** (behavior) and **ATLAS CLIENT Resources** (resource) in world settings.
- [ ] Confirm no experiments are enabled.
- [ ] Enter world: ATLAS title/chat appears; ATLAS item is in the inventory.
- [ ] Use the ATLAS item → main menu opens.
- [ ] Close the menu and reopen with `/atlas:menu` (cheats off).
- [ ] Toggle each HUD element; verify the action-bar line changes.
- [ ] Switch all four themes; verify HUD/form accents and locator marker colour.
- [ ] Switch to Arabic; check every screen for readable RTL text and no overlap.
- [ ] Add a waypoint; verify distance/direction and locator marker.
- [ ] Rename, move, track, untrack and delete a waypoint; verify persistence after leaving/rejoining.
- [ ] Take damage below the alert threshold; verify title/sound only once.
- [ ] Die; verify the death point appears and kills/deaths update.
- [ ] Open combat log; verify stats and recent events.
- [ ] Export settings, then import the code; verify theme/language/toggles return.
- [ ] Reset settings; verify defaults.
- [ ] Open Diagnostics; verify scripts OK, item OK, locator supported.
- [ ] Enable Content Log GUI and confirm there are no ATLAS errors.

If any item fails, attach the Content Log output. Do not assume the automated tests prove in-game behaviour.

---

## 7. Limitations and alternatives

- **No clickable top-right HUD icon.** Bedrock add-ons cannot add native HUD widgets. Alternative: ATLAS item + `/atlas:menu`.
- **No ESC capture.** Keyboard input is not exposed to add-ons. Alternative: item + command.
- **HUD is an action-bar line, not a custom overlay.** Alternative: per-element toggles, compact mode, 5–40 tick refresh.
- **Themes cannot change native form backgrounds or Ore UI.** Text/HUD/locator colours only.
- **Waypoints are world-shared**, maximum 30, and stored in world dynamic properties. Death points are automatic.
- **Combat history/damage are session-only**; kills/deaths/last death are persisted.
- **No clipboard.** Settings code can be sent to chat or written down.
- **No X-ray/ESP/aimbot/auto-clicker**, by design.
- **No weather element** because the stable API has no reliable current-weather getter; day/time, difficulty, dimension and player count are shown instead.
- **No custom HUD font.** Bedrock's built-in font is used, so unsupported glyphs may render differently across platforms.

---

## 8. Why the previous build may have appeared empty

The repository contained no previous add-on files, only `README.md`, so the exact old failure could not be reproduced. This build reduces the common silent-failure causes:

- Correct Behavior Pack script module and `scripts/main.js` entry.
- Stable API dependencies matching the target game (no beta modules, no experiments).
- Both packs in one `.mcaddon`, with each manifest at the pack root.
- Explicit activation instructions for the Behavior and Resource packs.
- Two independent menu entry points: the custom item and a no-cheats custom command.
- A visible welcome title/chat so a loaded script is immediately observable.
- Diagnostics inside the menu and `[ATLAS] Scripts loaded` in the Content Log.
- A validator that checks the built ZIP, not only the source tree.

The remaining verification that matters is importing and using the file on the target iPhone.
