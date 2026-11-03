# ATLAS CLIENT — Test Report

**Add-on version:** 1.2.0
**Archive:** `ATLAS.mcaddon`
**Target:** Minecraft Bedrock 26.60 (1.26.60)
**Official modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments required:** none
**Device checklists:** [`DEVICE_TESTING.md`](DEVICE_TESTING.md) — iPhone, PS5 and public-server test plans

---

## 1. What was actually run

| Command | Result |
|---|---|
| `npm run typecheck` | **Passed.** The pack scripts were checked against the official 2.11.0 / 2.3.0 TypeScript definitions. |
| `npm test` | **Passed.** 13 tests: 12 unit/static tests + 1 integration test that exercised **81 native form flows** through mocked Minecraft APIs, including a leave/rejoin settings reload and an ATLAS1 import. |
| `npm run build` | **Passed.** Produced `ATLAS.mcaddon` with **42 files / 57.4 KiB** (44 ZIP entries including pack roots). |
| `npm run validate` | **Passed.** Manifest, UUID, version, metadata, `pack_scope`, texture, language, import and ZIP checks. |
| `mct validate all` (official Minecraft Creator Tools 0.20.0) | **Passed, exit 0.** No manifest/UUID/module/format errors. Remaining messages are warnings that UI button textures are not linked to items, because forms reference them by path. |
| Bedrock Dedicated Server 1.26.60.6 | **Script load verified.** The server loaded the Behavior Pack and logged, without script errors: `Scripts loaded: v1.2.0`, `Event handlers registered: 9`, `HUD tick loop started`, `Custom command /atlas:menu registered`, `Boot sequence complete`, `World loaded`. No player joined, so no UI was rendered. |

Environment: Linux, Node.js 24.22.1, TypeScript 5.9.3, esbuild 0.25.12, Minecraft Bedrock Dedicated Server 1.26.60.6 (Linux). The mock harness is not a client; the BDS run is a real Minecraft server runtime but has no GUI.

---

## 2. Static and structural validation

`npm run validate` checks:

- Both `manifest.json` files are valid JSON and use `format_version: 2`.
- Five UUIDs are valid v4 and unique: two pack headers, one data module, one script module, one resources module.
- `min_engine_version` is exactly `[1, 26, 60]`.
- `package.json`, both manifest headers, all manifest modules and the runtime `ADDON_VERSION` agree on **1.2.0**.
- Behavior Pack has `data` + `script` modules; script language is `javascript`; entry is `scripts/main.js` and the file exists.
- Resource Pack has a `resources` module.
- Dependencies use stable `@minecraft/server 2.11.0` and `@minecraft/server-ui 2.3.0`; no beta/preview versions.
- Behavior/resource packs declare each other's correct UUID and version.
- No experiment capability is declared.
- `metadata` is a top-level section (not nested in `header`) and declares `product_type: "addon"`.
- The Resource Pack declares `header.pack_scope: "world"` as required for a cooperative add-on.
- Item `atlas:client_token` uses format version `1.26.60`, the declared icon, and an existing 32×32 PNG.
- `item_texture.json` uses the current array schema for `textures`.
- Textures live under the creator namespace folder `textures/atlas/common/`, not the generic `items`/`ui` folders.
- All UI button textures exist, all PNG signatures and dimensions are correct, and both pack icons are 256×256.
- `languages.json` lists `en_US` only. Bedrock has no Arabic game locale; Arabic is an in-add-on language handled by `i18n.js`.
- The add-on version is **1.2.0** in both manifests, so Minecraft replaces 1.0.0/1.1.0 installations instead of keeping a cached build.
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
- Legacy `ATLAS1-...` codes still import the original 20 toggles; toggles added after the legacy format keep their defaults.
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
25. A legacy `ATLAS1-...` code imports through the real Settings → Import form, restores the original 20 toggles and keeps the newer panels at their defaults.
26. Leaving and rejoining reloads a distinct stored settings state from player storage instead of reusing the old cache.
27. A version announcement (`Scripts v1.2.0 are running`) is shown once per player/version and is not repeated on rejoin.

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
| Settings persistence | **Verified in harness; device check pending** | Every change writes to the player's dynamic properties. The harness clears the cache on leave and reloads the saved values on rejoin. A real world close/reopen with **Save & Quit** still needs device verification. |
| Legacy ATLAS1 import | **Verified in harness; device check pending** | The Import form accepts `ATLAS1-...`, restores the original 20 toggles and saves them as the current schema; new panels keep defaults and the next export is `ATLAS2-...`. |
| Font size / transparency / per-element position | **Unsupported** | Not exposed by the Script API; not represented by fake controls. |
| PS5 controller buttons | **Unverified / unsupported** | No API exposes PS5 button states. Movement vector and game-action events are device-independent in theory but were not tested on PS5. |
| Public servers (e.g. Mega10) | **Unverified; world-bound** | The pack must be installed in the world; a client cannot inject it into someone else's server. If it is installed, the server may block commands, the locator bar or storage. No server was tested. |
| Existing HUD / Visual / PvP / Utilities / Settings | **Preserved** | Previous features, themes, languages, waypoints, combat stats, import/export and diagnostics remain and are covered by the tests above. |

---

## 6. NOT tested

The following were **not** executed in this environment because the iOS/PS5 clients and a graphics stack are unavailable. A headless BDS run proves script startup only; it does not render forms or simulate touch/controller input.

- Importing `ATLAS.mcaddon` into Minecraft on iPhone/iPad, PS5, or any Bedrock client.
- Activating the packs in a real client world (the BDS world used development pack folders).
- A player joining; therefore no welcome message, item give, custom command execution or form response was observed in a real client.
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
- Closing and reopening a real world, including **Save & Quit** and player dynamic-property persistence on iOS/PS5.
- Entering an actual old `ATLAS1-...` code on a device keyboard.
- Importing `ATLAS.mcaddon` on PS5, or joining a packed world/Realm from PS5.
- Mega10 or any other public server.
- Whether a long HUD line wraps or is truncated on a narrow screen; disable unused panels if it does.

No claim is made that these were tested.

---

## 7. Device test checklists

The detailed, step-by-step plans are in [`DEVICE_TESTING.md`](DEVICE_TESTING.md):

- **iPhone:** install, activation, startup, HUD/input, armor/effects/totems, waypoints, Arabic, settings persistence, legacy ATLAS1 import and diagnostics.
- **PS5:** join a packed world if local import is unavailable, controller navigation, movement vector, action indicators, readability and persistence.
- **Public servers:** which features can work when the world owns the pack, and why nothing runs on a server that does not contain it.

Do not start the device pass until these automated checks pass. During the pass, fill in the result template and attach the Content Log for any failure. A feature that was not exercised stays **not tested**; the mock harness does not prove in-game rendering or device input.

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

## 9. What changed for the reported launch failure

The 1.0.0/1.1.0 package could be rejected or partly ignored for several concrete reasons found by Microsoft's official validator and the 26.60.6 runtime:

| Problem in the old package | Effect | Fix in 1.2.0 |
|---|---|---|
| `metadata` was nested inside `header` | Authors/product type were invisible to pack tooling; invalid placement | Moved `metadata` to the manifest root and added `product_type: "addon"` |
| Resource Pack had no `pack_scope` | Cooperative add-on validation error; the RP could be applied as a global pack without the BP | Added `header.pack_scope: "world"` |
| `item_texture.json` used a string for `textures` | Official schema warning; item icon may not resolve | Changed to the current array form |
| Icon files were in generic `textures/items` and `textures/ui` | Cooperative add-on validation errors | Moved to `textures/atlas/common/` and updated every reference |
| `languages.json` advertised `ar_SA` | Unsupported Bedrock locale warning; the file is not a valid game locale | Removed it; Arabic remains selectable inside ATLAS |
| Item used `format_version 1.21.70` | Old item format on a 1.26.60 target | Updated to `1.26.60` |
| `header.version` was 1.1.0 | A cached 1.0.0 pack could remain in a world | Bumped to 1.2.0 and documented deleting old packs |
| One unavailable event could abort all later subscriptions | Menu item/command could stop registering | Each event now subscribes independently and logs failures |
| Locator API was used at module scope | A client without that API could fail before any HUD/menu code ran | The locator API is accessed lazily and guarded |
| No visible proof of script startup after an update | Players could not tell whether the new build loaded | One chat line per player/version plus boot-stage Content Log lines |

The exact error message on the reporter's iPhone was not provided, so these are the verified load/validation defects we could fix, not a claim to have matched an unseen log. The 1.2.0 build does load its scripts, register all nine events, register `/atlas:menu` and receive `worldLoad` on a real Minecraft Bedrock 1.26.60.6 server. Client rendering, item use and touch/controller input still require the iPhone/PS5 pass.
