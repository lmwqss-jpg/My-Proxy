# ATLAS CLIENT — Test Report

**Add-on version:** 1.3.0
**Archive:** `ATLAS.mcaddon`
**Target:** Minecraft Bedrock 26.60 (1.26.60)
**Official modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments required:** none
**Device checklists:** [`DEVICE_TESTING.md`](DEVICE_TESTING.md) — iPhone, PS5 and public-server plans
**Technical audit:** [`AUDIT.md`](AUDIT.md)
**Known limitations:** [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md)

---

## 1. What was actually run for 1.3.0

| Command | Result |
|---|---|
| `npm run typecheck` | **Passed.** The pack scripts were checked against the official 2.11.0 / 2.3.0 TypeScript definitions. |
| `npm test` | **Passed.** 13 tests: 12 unit/static tests plus one integration test that exercised **85 native form flows** through mocked Minecraft APIs. |
| `npm run build` | **Passed.** Produced `ATLAS.mcaddon` with **42 files / 58.9 KiB** (44 ZIP entries including pack roots). |
| `npm run validate` | **Passed (5 checks).** Manifest, UUID, version, metadata, `pack_scope`, texture, language, import and ZIP checks. |

Environment: Linux, Node.js 24.22.1, TypeScript 5.9.3, esbuild 0.25.12.

### Earlier real-runtime evidence (1.2.0, not 1.3.0)

A previous release build was loaded on **Bedrock Dedicated Server 1.26.60.6**. The console showed `[ATLAS] Scripts loaded`, all nine event registrations, HUD loop start, `/atlas:menu` registration and `worldLoad` without script errors. No player joined, so no form, HUD or locator rendering was observed.

The 1.2.0 archive was also checked with Microsoft's Minecraft Creator Tools during that release. **1.3.0 was not re-run on BDS or with Creator Tools in this environment**, and no claim is made that it was.

---

## 2. Static and structural validation

`npm run validate` checks:

- Both `manifest.json` files are valid JSON and use `format_version: 2`.
- Five UUIDs are valid v4 and unique: two pack headers, one data module, one script module, one resources module.
- `min_engine_version` is exactly `[1, 26, 60]`.
- `package.json`, both manifest headers, all manifest modules, the BP dependency version, the RP dependency version and the runtime `ADDON_VERSION` agree on **1.3.0**.
- Behavior Pack has `data` + `script` modules; script language is `javascript`; entry is `scripts/main.js` and the file exists.
- Resource Pack has a `resources` module and `header.pack_scope: "world"`.
- Dependencies use stable `@minecraft/server 2.11.0` and `@minecraft/server-ui 2.3.0`; no beta/preview versions.
- Behavior and Resource Packs declare each other's correct UUID and version.
- No experiment or `script_eval` capability is declared.
- `metadata` is top-level and declares `product_type: "addon"`.
- Item `atlas:client_token` uses format version `1.26.60`, the declared icon, and an existing 32×32 PNG.
- `item_texture.json` uses the current array schema; textures live under `textures/atlas/common/`.
- All UI button textures exist, all PNG signatures and dimensions are correct, and both pack icons are 256×256.
- `languages.json` lists `en_US` only. Bedrock has no Arabic game locale; Arabic is handled by `i18n.js`.
- Every relative script import resolves; only the two allowed official modules are imported; no `eval`/`Function` construction.
- No legacy/forbidden names appear in pack files.
- The ZIP has no double nesting, no unexpected top-level files, no junk files, and every archived file matches its source byte-for-byte.
- The bundled entry performs **zero world reads/writes at module scope**, avoiding Script API v2 early-execution failures before `worldLoad`.

---

## 3. Unit and model tests

Covered by `test/core.test.js`:

- English/Arabic dictionaries have identical keys and identical `{placeholder}` sets; every key used by scripts exists.
- Four themes are complete, distinct and have valid Bedrock colour codes/RGB values; all seven HUD accent colours are defined.
- Compass bearings, eight-way cardinal labels, relative directions, 3D distance, Minecraft clock conversion, coordinate formatting, K/D formatting and **session duration formatting**.
- Name sanitisation removes section-sign codes, control characters and excess length.
- Settings validation clamps HUD interval (5–40 ticks), health alert threshold (2–19), durability threshold (5–90 in steps of 5), rejects invalid themes/languages/HUD colours, drops unknown keys and preserves the allowed toggle set. The new session toggle normalises to **off** by default.
- `ATLAS2-...` settings codes round-trip all **34** booleans, four themes, two languages, both thresholds, refresh interval and HUD colour. Tampered, truncated and invalid codes are rejected.
- A simulated **1.2.0 ATLAS2 code containing only 33 toggles** still imports, and the new session toggle stays off.
- Legacy `ATLAS1-...` codes still import the original 20 toggles; toggles added later keep their defaults.
- Waypoint CRUD, duplicate IDs, 30-item cap, death-point reuse, death-point rename, death-point recreation after rename, parsing invalid JSON/entries and serialisation round-trip.
- HUD composition: every toggle, compact/detailed mode, health bar, combat stats, Arabic labels, other-dimension waypoint and the all-off case.
- New live HUD text: WASD active/inactive states, observed CPS, LMB/RMB state, real armor durability, per-piece armor toggles, low-armor colour, potion names/levels/durations, infinite effects, totem count and honest `--` output when input/status APIs are unavailable.
- Session timer output (`2:05`) and its opt-in behaviour.
- Missing optional values (health, view, dimension, day, time, difficulty, player count, level, game mode, session) produce no fabricated values and do not blank unrelated HUD elements.
- Effect duration formatting, known/unknown effect names, tracked waypoint distance/bearing and dimension labels.

---

## 4. Integration harness

`test/integration.test.js` bundles the real `scripts/main.js` with mock implementations of the official modules, then drives the actual forms and events:

1. Startup registers `/atlas:menu` with permission `Any` and `cheatsRequired: false`.
2. Player spawn gives exactly one ATLAS item, sends the welcome title/chat and sets the action-bar HUD.
3. Using the custom item opens the main menu.
4. A simulated `UserBusy` response is retried and the menu opens on the next attempt.
5. Toggling Coordinates off persists the setting and rebuilds the HUD without coordinates.
6. The opt-in session timer appears as real elapsed time and is saved.
7. `/atlas:menu` opens the same menu through a second entry point.
8. Equipped armor with real damage values appears as H/C/L/B with durability and percentages.
9. Active speed/night-vision effects appear with level and remaining time.
10. Two totems in the inventory produce a count of two.
11. Adding a third totem fires `playerInventoryItemChange` and updates the HUD; a same-tick burst of inventory events is coalesced into one rebuild.
12. Movement input lights W and D; a held item below the threshold produces one low-durability chat warning and sound.
13. A real attack and block interaction update the observed CPS and LMB/RMB indicators; the durability warning does not repeat.
14. An unavailable view/game-mode API removes only the compass/player details; the rest of the HUD remains and no `null`, `NaN` or fake direction is shown.
15. The HUD editor persists a per-piece armor toggle immediately.
16. The HUD editor changes the accent colour and persists it immediately.
17. The HUD editor reset restores panel defaults without changing theme or language.
18. Theme picker applies Violet; four options are present.
19. Language picker switches all menus to Arabic, then back to English.
20. Adding a waypoint through the modal persists it, auto-tracks it and adds a locator-bar marker.
21. Renaming a waypoint updates the HUD tracker and survives a reload from storage.
22. Low-health alert fires once per low-health episode, plays the sound and resets after healing.
23. A player death updates deaths, updates the killer's kills, creates the automatic death waypoint and adds it to both players' locator bars.
24. Combat log shows persisted deaths, last-death data and the killer's name.
25. Diagnostics shows the real API/product versions, session duration and server ticks.
26. Export produces an `ATLAS2-...` code and sends it to chat.
27. Import applies a valid Arabic/Emerald code.
28. A legacy `ATLAS1-...` code imports through the real Settings → Import form, restores the original 20 toggles and keeps the newer panels at their defaults.
29. Leaving and rejoining reloads a distinct stored settings state from player storage instead of reusing the old cache.
30. A version announcement (`Scripts v1.3.0 are running`) is shown once per player/version and is not repeated on rejoin.

No mocked warnings or form errors remained at the end of the run. That verifies control flow, not Minecraft rendering.

---

## 5. Feature status

| Feature | Status | What is real |
|---|---|---|
| WASD panel | **Works, device-dependent** | `Player.inputInfo.getMovementVector()` is read each HUD refresh. Active states reflect movement intent (WASD keys or left stick), not physical key events. |
| CPS counter | **Partial** | Counts real game-reported attacks, block/entity interactions and item uses in the last 20 ticks. Clicks into empty air cannot be observed. |
| LMB / RMB indicators | **Partial** | Lit by the same real game events; they are action indicators, not physical mouse-button states. |
| Armor durability | **Works** | Real equipped items, real `minecraft:durability` values, remaining/max durability, percentages, automatic refresh and per-piece toggles. |
| Armor icons / vertical position | **Unsupported** | The action bar is text-only and cannot be positioned. H/C/L/B labels carry the real values; no fake controls. |
| Potion effects | **Works** | `Player.getEffects()` names, amplifiers and remaining ticks. Infinite durations show `∞`. |
| Totem counter | **Works** | Main inventory plus offhand, counted by item type and stack amount; inventory refreshes are coalesced to at most one per 5 ticks. |
| Low durability alert | **Works, scoped** | Equipped armor and the held item. Threshold configurable, warning fires once per low episode, sound optional. Stored tools are not scanned. |
| Session timer | **Works in harness; device check pending** | Real elapsed ticks since the player joined, reset on leave/rejoin, opt-in and saved. |
| Optional API degradation | **Works in harness** | Missing health/view/world/player/game-mode data removes its own element instead of fabricating values. |
| HUD editor | **Works** | Panel/armor-piece/Visual/PvP switches, accent colour, durability threshold/sound, compact/detailed mode and reset. Changes save immediately. |
| Settings persistence | **Verified in harness; device check pending** | Every change writes to player dynamic properties. The harness clears the cache on leave and reloads the stored values on rejoin. |
| Legacy settings | **Verified in harness** | `ATLAS1` and older 33-toggle `ATLAS2` codes import; the new session toggle stays off. |
| Font size / transparency / per-element position | **Unsupported** | Not exposed by the Script API; no fake controls. |
| PS5 controller buttons | **Unverified / unsupported** | No API exposes physical PS5 button states. Movement vector and game-action events are device-independent in theory but were not tested on PS5. |
| Public servers | **Unverified; world-bound** | The pack must be installed in the world; a client cannot inject it. A server may block commands, locator or storage. |
| Existing HUD / Visual / PvP / Utilities / Settings | **Preserved** | Previous features, themes, languages, waypoints, combat stats, import/export and diagnostics remain and are covered by the tests above. |

---

## 6. NOT tested

The following were **not** executed for 1.3.0 because the iOS/PS5 clients and a graphics stack are unavailable:

- Importing `ATLAS.mcaddon` into Minecraft on iPhone/iPad, PS5 or any Bedrock client.
- Activating the packs in a real client world.
- A player joining; therefore no welcome message, item give, command execution or form response was observed in a real client.
- Actual rendering of ActionFormData/ModalFormData on iOS or PS5.
- Whether tapping/using the custom item triggers on a specific iPhone/PS5 control scheme.
- Arabic glyph shaping and right-to-left layout in Bedrock's form font.
- Visual appearance/position/colour of locator-bar waypoint markers.
- Low-health title animation, durability-alert sound mixing and HUD text at different screen sizes.
- The item icon in the hotbar/inventory and form button icons.
- Real WASD movement, real attack/interact events and real CPS counts on a device.
- Real armor durability changes, potion timing and totem inventory updates in a live world.
- The session timer across a real world close/reopen.
- Multiplayer synchronisation and performance under many players.
- Behaviour on Minecraft versions other than 26.60.
- The item and command on the real iOS/PS5 chat/input path.
- Closing and reopening a real world, including **Save & Quit** and dynamic-property persistence.
- Entering an old settings code on a device keyboard.
- Importing `ATLAS.mcaddon` on PS5, or joining a packed world/Realm from PS5.
- Bedrock Arab import workflow.
- Mega10 or any other public server.
- Whether a long HUD line wraps or is truncated on a narrow screen.

No claim is made that these were tested.

---

## 7. Device test checklists

The detailed, step-by-step plans are in [`DEVICE_TESTING.md`](DEVICE_TESTING.md):

- **iPhone:** install, activation, startup, HUD/input, armor/effects/totems, session timer, waypoints, Arabic, settings persistence, legacy settings import and diagnostics.
- **PS5:** join a packed world if local import is unavailable, controller navigation, movement vector, action indicators, readability and persistence.
- **Public servers:** which features can work when the world owns the pack, and why nothing runs on a server that does not contain it.

Do not start the device pass until the automated checks pass. During the pass, fill in the result template and attach the Content Log for any failure. A feature that was not exercised stays **not tested**; the mock harness does not prove in-game rendering or device input.

---

## 8. Limitations and alternatives

- **No clickable top-right HUD icon.** Bedrock add-ons cannot add native HUD widgets. Alternative: ATLAS item + `/atlas:menu`.
- **No ESC capture.** Keyboard input is not exposed. Alternative: item + command.
- **HUD is an action-bar line, not a custom overlay.** Top-right placement, per-element position, font size, transparency and vertical armor position are not available. Alternative: per-element toggles, compact mode, accent colours and 5–40 tick refresh.
- **No armor/item icons in the HUD.** H/C/L/B labels carry the real values.
- **CPS and mouse indicators are partial.** Only game-reported clicks are visible. No auto-clicker or combat automation exists.
- **Themes cannot change native form backgrounds or Ore UI.** Text/HUD/locator colours only.
- **Waypoints are world-shared**, maximum 30, stored in world dynamic properties. Death points are automatic.
- **Combat history/damage are session-only**; kills/deaths/last death are persisted.
- **Session timer is session-only**, not a saved play-time total.
- **No clipboard.** Settings code can be sent to chat or written down.
- **No X-ray/ESP/aimbot/auto-clicker**, by design.
- **No weather element** because the stable API has no reliable current-weather getter.
- **Public servers can restrict packs or commands.** ATLAS does not bypass server rules or anti-cheat.

---

## 9. What changed for the reported launch failure

The 1.0.0/1.1.0 package could be rejected or partly ignored for several concrete reasons. The exact client error was never provided, so these are verified packaging/startup defects rather than a matched log.

| Problem in the old package | Effect | Fix |
|---|---|---|
| `metadata` nested inside `header` | Pack tooling cannot see authors/product type | Moved to the manifest root and added `product_type: "addon"` |
| Resource Pack had no `pack_scope` | Cooperative add-on validation error | Added `header.pack_scope: "world"` |
| `item_texture.json` used a string for `textures` | Item icon may not resolve | Changed to the current array schema |
| Icons in generic `textures/items` and `textures/ui` | Cooperative add-on validation errors | Moved to `textures/atlas/common/` |
| `languages.json` advertised `ar_SA` | Unsupported Bedrock locale warning | Removed; Arabic stays inside ATLAS |
| Item used `format_version 1.21.70` | Old item format on a 1.26.60 target | Updated to `1.26.60` |
| `header.version` was 1.1.0 | A cached older pack could remain | Version raised and old-pack deletion documented |
| One unavailable event aborted later subscriptions | Menu item/command could stop registering | Each event subscribes independently |
| Locator API used at module scope | A client without it could fail before load | Lazy, guarded access |
| No visible proof of startup | Players could not tell whether the build loaded | One chat line per player/version plus stage logs |

The 1.2.0 build loaded its scripts, registered all nine events, registered `/atlas:menu` and received `worldLoad` on a real Bedrock Dedicated Server 1.26.60.6. That is startup evidence only. Client rendering, item use and touch/controller input still require the iPhone/PS5 pass.
