# ATLAS CLIENT 1.7.0 — Full Test Report

**Add-on version:** 1.7.0
**Archive:** `ATLAS.mcaddon` (single BP + RP)
**Target:** Minecraft Bedrock 26.60 / `1.26.60`+
**Script modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments:** none
**Report scope:** automated/static tests actually run for 1.7.0. Device and in-game tests are listed separately as **NOT TESTED**.

> This is not a claim that the add-on works on iPhone, PS5, Mega10 or inside a real Minecraft client. No such test environment was available here.

---

## 1. Environment and commands actually run

Linux, Node.js 24.22.1, npm 11.19.1, TypeScript 5.9.3, esbuild 0.25.12.

| Command | Result | Evidence |
|---|---|---|
| `npm ci` | PASS | 8 packages installed, 0 vulnerabilities |
| `npm run typecheck` | PASS | pack scripts checked against the official 2.11.0 / 2.3.0 types |
| `npm test` | PASS | **27 tests**: 26 unit/static (including 6 command-registration tests) + 1 integration test with **279 native form flows** |
| `npm run build` | PASS | `ATLAS.mcaddon`, **51 files, 94.5 KiB**, 53 ZIP entries including pack roots |
| `npm run validate` | PASS | **6 checks**: manifests, 5 JSON files, item/PNG/texture references, localisation, 34 scripts/imports, ZIP |
| `npm run check` | PASS | the four commands above in sequence |
| `unzip -l ATLAS.mcaddon` | PASS | `ATLAS_BP/` and `ATLAS_RP/` manifests, `scripts/main.js`, item and textures at the expected roots |
| `unzip -t ATLAS.mcaddon` | PASS | archive integrity: no compressed-data errors |
| `git diff --check` | PASS | no whitespace errors |

The integration harness loads the real bundled `scripts/main.js` against mock Minecraft APIs. It is a control-flow/data-contract test, **not** a Minecraft rendering test.

---

## 2. A. Project audit

| # | Check | Result | Detail |
|---|---|---|---|
| A1 | All project files inspected | PASS | source, manifests, item, textures, language files, scripts, tests, build/validation scripts and docs |
| A2 | All JSON files parse | PASS | 5 JSON files in BP/RP; validator now parses every one, not only manifests |
| A3 | Behavior Pack manifest | PASS | format 2, data + script modules, entry `scripts/main.js`, metadata at root, `product_type: "addon"` |
| A4 | Resource Pack manifest | PASS | format 2, resources module, `pack_scope: "world"` |
| A5 | UUIDs | PASS | 5 valid unique v4 UUIDs (2 pack headers, 3 modules); no duplicates |
| A6 | Dependencies and API versions | PASS | BP depends on RP and stable `@minecraft/server 2.11.0` / `@minecraft/server-ui 2.3.0`; RP depends on BP; no beta/preview |
| A7 | Missing files | PASS | script entry, item definition, texture map, icons, language file and pack icons all exist |
| A8 | Paths | PASS | all relative imports resolve; item texture references resolve; archive paths are not nested |
| A9 | Old code conflicts | PASS | version 1.7.0 aligns across `package.json`, manifests, dependency versions and runtime; ATLAS1 and older ATLAS2 codes still import |

Static forbidden checks also passed: no `eval`/`new Function`, no experiment or `script_eval` capability, no unsupported `ar_SA` locale, no legacy branding in pack files.

---

## 3. B. Command entry points and menu tests

### B.1 Command registration

| # | Test | Result | Detail |
|---|---|---|---|
| B1 | `/atlas:menu` is registered | PASS (harness) | name `atlas:menu`, permission `Any`, `cheatsRequired: false` |
| B2 | `/atlas` is registered | PASS (harness) | name `atlas:atlas`; the mock resolves the un-namespaced alias `/atlas` |
| B3 | `/menu` alias is available | PASS (harness) | automatic alias of `atlas:menu` |
| B4 | Both commands open the main menu | PASS (harness) | `/atlas` and `/atlas:menu` callbacks return success and open the main form on the next tick |
| B5 | Non-player origin | PASS (command suite) | console origin returns `Failure` with an in-game message; an `initiator` player is accepted |
| B6 | Name collision | PASS (command suite) | when `atlas:atlas` is rejected, `/atlas:menu` and `/menu` stay registered and the failure is logged |
| B7 | Missing command registry | PASS (command suite) | no exception, zero registrations, warning logged |
| B8 | No duplicate registration | PASS (harness + suite) | exactly 2 registrations, one per name; a repeated startup event and a second `registerCommands()` call do nothing |
| B9 | Command names in diagnostics | PASS (harness) | DIAGNOSTICS lists `/atlas` and `/atlas:menu`; the exported report contains an `Entry points:` line |

Registration marks the command capability available; the feature becomes `WORKING` only after the real command callback runs. The command suite bundles the real `scripts/commands.js` against the mock registry. The `/atlas` alias relies on **documented Bedrock behavior** (Bedrock Wiki, *Custom Commands*: Minecraft registers the un-namespaced version of a custom command in chat). It was verified in the mock, **not typed into a real Minecraft client**, and the underlying `CustomCommand` reference from Microsoft only confirms that the registered name requires a namespace.

### B.2 Menu control flow

| # | Test | Result | Detail |
|---|---|---|---|
| B10 | Open and close the menu | PASS (harness) | item, `/atlas:menu`, `/atlas` and close button exercised |
| B11 | Navigate every section | PASS (harness) | all 16 sections opened and returned to the main menu |
| B12 | No freeze while opening forms | PASS (harness) | **279** sequential forms handled; no unresolved UI queue |
| B13 | Handle form failure | PASS (harness) | `UserBusy` retry path and form error message covered |
| B14 | No duplicate listeners or menus | PASS (harness) | expected listener counts; double item use opens one menu |

`/atlas` and `/atlas:menu` require no cheats or operator permissions. Commands exist only while ATLAS is installed and active in the world; a server that does not run the pack cannot expose them, and ATLAS does not claim otherwise.

---

## 4. C. Every ATLAS UI section

Each section was opened from the real main menu and exited back to it. Section controls were also exercised.

| Section | Result | What was verified |
|---|---|---|
| HOME | PASS (harness) | live summary, HUD preview, session shortcut |
| ESPCHEST | PASS (harness) | real container entries, detail, dedupe, remove, clear |
| HUD | PASS (harness) | element toggles, editor, options, all-on/all-off |
| VISUAL | PASS (harness) | player/world/health/combat/locator toggles |
| PLAYER | PASS (harness) | real name/health/coords/dimension/mode/level/session/K-D; toggles persist |
| MOVEMENT | PASS (harness) | WASD state, CPS, LMB/RMB state; toggles persist |
| ARMOR | PASS (harness) | four pieces, real durability/percentages; piece toggle; threshold modal |
| ITEMS | PASS (harness) | main/offhand item, durability, totem count; toggles persist |
| POTIONS | PASS (harness) | active effect name/level/duration; toggle persists |
| TOTEMS | PASS (harness) | real count; toggle persists |
| COMBAT | PASS (harness) | stats, last death, combat log, reset path, alert settings |
| WAYPOINTS | PASS (harness) | add/list/detail/rename/track/delete/death point |
| SERVER MANAGER | PASS (harness) | add/edit/delete/order/favourite/manual current; validation; Direct Join; guide; persistence after rejoin |
| SETTINGS | PASS (harness) | theme, language, save, export, import, reset, diagnostics/about links |
| DIAGNOSTICS | PASS (harness) | real product/API versions, locator state, session duration, server ticks |
| ABOUT | PASS (harness) | version and official limits |

---

## 5. D. ON/OFF behavior

| Test | Result | Detail |
|---|---|---|
| Enable a feature and verify it appears | PASS (harness) | HUD panels, session timer, per-piece armor, visual/PvP elements |
| Disable a feature and verify it stops | PASS (harness) | disabled panels disappear from the action bar immediately |
| Re-enable it | PASS (harness) | restored without a restart |
| No duplicated events | PASS (harness) | exact listener counts; inventory bursts coalesced; duplicate menu use blocked |
| Other features unaffected | PASS (harness) | toggling one panel/control left unrelated toggles and HUD elements intact |

---

## 6. E. Settings persistence

| Test | Result | Detail |
|---|---|---|
| Change settings, close and reopen the menu | PASS (harness) | settings remain in player dynamic properties |
| Leave the world and rejoin | PASS (harness) | cache is cleared; changed settings JSON is reloaded; waypoints and the ESPCHEST container log survive |
| New 1.4.0 section controls persist | PASS (harness) | CPS, helmet, player name, potions, totems, session and armor threshold round-trip |
| Old ATLAS2 codes | PASS (unit) | 33-toggle and current codes import; new session toggle stays off for old codes |
| Legacy ATLAS1 codes | PASS (unit + harness) | original 20 toggles restored; newer panels keep defaults |
| Invalid/tampered codes | PASS (unit) | rejected without changing saved settings |

---

## 7. F. HUD

| Test | Result | Detail |
|---|---|---|
| Each element independently | PASS (unit + harness) | coordinates, health, name, world, dimension, compass, waypoint, session, WASD, CPS, clicks, armor, potions, totems, visual stats |
| Toggle every element on/off | PASS (unit + harness) | all-on, all-off, per-element toggles and reset |
| XYZ / health / name / world / dimension / compass | PASS (unit + harness) | real snapshot values; Arabic labels checked |
| Missing data does not fake values | PASS (unit + harness) | missing health/view/dimension/day/time/mode/combat storage hides only that element; no `null`/`NaN`/fake north or fake K/D |
| Armor durability | PASS (harness) | real remaining/max/percent, low color and per-piece toggles |
| Potions | PASS (harness) | real duration/amplifier, infinite `∞`, expired effects disappear |
| Totems | PASS (harness) | main inventory + offhand, updates on inventory event |
| CPS/LMB/RMB | PASS (harness) | real game events only; empty-air clicks cannot be counted |
| All HUD off | PASS (unit) | action bar becomes empty and preview says all elements are off |
| Session timer | PASS (unit + harness) | opt-in, real elapsed ticks, resets on rejoin |

---

## 8. G. Other systems

| System | Result | Detail |
|---|---|---|
| ESPCHEST | PASS (harness) | only opened containers; stone ignored; duplicate chest refreshed; remove/clear; per-player storage |
| Armor | PASS (harness) | real equipment/damage values; per-piece visibility; threshold modal |
| Effects | PASS (harness) | real active effects, duration and amplifier |
| Totems | PASS (harness) | inventory + offhand; null vs real zero distinguished |
| Waypoints | PASS (unit + harness) | CRUD, move, track, 30 cap, death point, world storage, locator markers in mock |
| Session timer | PASS (unit + harness) | starts at join, resets on leave/rejoin |
| PvP statistics | PASS (harness) | kills/deaths/K-D, last death, damage/history scoped to session |
| Alerts | PASS (harness) | low health once per episode; low durability once per low episode; optional sounds |
| Arabic / English | PASS (unit + harness) | identical key sets, matching placeholders, RTL/Arabic form flow and Arabic HUD labels |
| Themes | PASS (unit) | four complete palettes and HUD colours |
| Settings import/export | PASS (harness) | ATLAS2 export, valid import, invalid rejection, ATLAS1 import |
| SERVER MANAGER model | PASS (unit) | IPv4/domain/port validation, invalid rejection, normalisation, duplicate host/port and id rejection, 40-entry cap, order/favourite/current rules, JSON round-trip, UTC timestamp |
| SERVER MANAGER forms | PASS (harness) | add two entries with custom port; edit; delete; reorder; favourite; manual current; rejected `host:port`, bad host, bad port and duplicate; Direct Join invalid+valid; last target saved; guide shows host/port and `Add Server`; entries survive leave/rejoin |

**SERVER MANAGER limitation:** it is an address book, not a connector. It stores and validates entries but cannot start a connection, observe ONLINE/OFFLINE state, ping a server, read player counts/version, auto-reconnect, access the clipboard or open Minecraft's Add Server screen. PS5 has no Add Server button, so the guide cannot make a custom server joinable there.

**ESPCHEST limitation:** it records only containers the player actually opens. It does not scan hidden containers, unloaded chunks or contents through walls, and does not modify the world.

---

## 8A. Compatibility engine and diagnostics export (1.7.0)

| # | Test | Result | Detail |
|---|---|---|---|
| X1 | Feature definitions are unique and complete | PASS (unit) | 18 features; every required/optional capability exists; screen-to-feature mapping covers section and detail screens |
| X2 | Status reduction | PASS (unit) | `READY` before use, `WORKING` only after a real success, `ERROR` after a later failure, `UNAVAILABLE` for a missing required API, `NOT TESTED` for an unprobed capability, `LIMITED` for documented scope |
| X3 | Report contents | PASS (unit) | Version, feature statuses, entry points, API available/unavailable/not-probed lists, stored-data context, bounded errors |
| X4 | Chat chunking | PASS (unit) | Long reports split below 100/200 character limits without an oversized message |
| X5 | Second `worldLoad` and respawn | PASS (harness) | Exactly two command registrations (one per name) and unchanged listener counts; settings, waypoints and containers remain; no repeated boot message |
| X6 | Diagnostics screen | PASS (harness) | Real per-feature statuses, command entry points, `HUD: LIMITED`, `Settings: WORKING`, capability counts, session duration and error counters |
| X7 | Export diagnostics | PASS (harness) | Form shows the real report; sending it adds copyable chat chunks and a message count; no clipboard or fake success |
| X8 | Capability gating | PASS (harness + unit) | Missing optional view/game-mode/effects APIs hide only their elements; the rest of the HUD and menu continue |
| X9 | Error tracking | PASS (harness) | Router/HUD/store failures are counted by category without stopping other features |
| X10 | Entry-point reporting | PASS (harness + unit) | Accepted command names and aliases come from `MENU_COMMANDS`; a missing registry reports `not registered` in the report instead of claiming `/atlas` |

`WORKING` in this table means the harness observed a successful operation. It does not mean the feature was verified on a device.

## 9. H. Performance and stability

| Test | Result | Detail |
|---|---|---|
| Errors during a full flow | PASS (harness) | zero mock/UI errors and zero add-on warnings at the end of the flow |
| Repeated data updates | PASS (harness) | 100+ form actions and repeated HUD updates without failure |
| Leave/join | PASS (harness) | state caches cleared, settings and waypoints reloaded |
| No duplicate listeners | PASS (harness) | expected subscription counts for all 13 event signals used |
| No duplicate command | PASS (harness + suite) | exactly two registrations, one per name, even after repeated startup calls or menu/command use |
| Inventory bursts | PASS (harness) | two same-tick inventory changes produce one HUD rebuild |
| Missing optional APIs | PASS (harness) | HUD and new screens omit unavailable values and do not crash |
| Container log cap | PASS (unit) | 20 entries maximum; oldest entries drop |
| Server list cap | PASS (unit) | 40 entries maximum; extra add is rejected |
| Server cache cleanup | PASS (harness) | entries reload from dynamic properties after leave/rejoin; no stale cache |
| HUD refresh | PASS (harness) | configurable 5–40 ticks; default 5 |

No memory-leak or long-run soak test was possible outside Minecraft. The test covers listener registration and state cleanup, not hours of live play.

---

## 10. I. Build and archive

`npm run build` produced:

- `ATLAS.mcaddon` with 51 files, 94.5 KiB, 53 ZIP entries.
- `ATLAS_BP/manifest.json`, `ATLAS_BP/scripts/main.js`, `ATLAS_BP/items/atlas_client.json`.
- `ATLAS_RP/manifest.json`, textures (including `atlas_servers.png`), `texts/en_US.lang`, `texts/languages.json`.
- No nested pack folder, no `__MACOSX`, no `.DS_Store`, no stale archived files.
- Every archived file matches its source byte-for-byte.

`npm run validate` passed 6 checks and confirmed version 1.7.0, 5 unique UUIDs, 5 parsed JSON files, item/texture/PNG references, localisation and 34 script import graphs.

---

## 11. J. Real Minecraft client

**NOT TESTED.** No Minecraft Bedrock client, iPhone, PS5 or graphics stack was available in this environment.

Not verified:

- importing `ATLAS.mcaddon` on a device;
- activating both packs in a real world;
- rendering native forms, titles, action-bar HUD text, icons or locator markers;
- touch/controller navigation;
- real item use and `/atlas` / `/atlas:menu` / `/menu` in chat; the `/atlas` alias has not been typed into a real client;
- real armor/effect/totem/inventory updates;
- Arabic shaping and right-to-left layout;
- settings persistence after a real **Save & Quit**;
- ESPCHEST recording a real chest/barrel;
- SERVER MANAGER add/edit forms on a touch or controller keyboard, and the platform-specific connection guide;
- long HUD lines at different screen sizes.

The 1.2.0 build previously loaded its scripts and registered events on Bedrock Dedicated Server 1.26.60.6. That is historical startup evidence only; **1.7.0 was not run on BDS or in a client for this report.**

---

## 12. K. Devices and public servers

| Platform / environment | Result | Note |
|---|---|---|
| iPhone / iPad | NOT TESTED | import, touch item use, Arabic shaping and persistence need device checks |
| PS5 | NOT TESTED | primary target; local import, controller input and custom-server entry (PS5 has no Add Server button) are unverified |
| Bedrock Arab | NOT TESTED | file-picker flow and real import are unverified |
| Mega10 | NOT TESTED | public-server packs, commands and storage may be restricted |
| Bedrock Dedicated Server | NOT TESTED for 1.7.0 | no server binary in this environment |

No compatibility claim is made for any of these.

---

## 13. L. Defects found and fixed during 1.4.0–1.7.0 work

| Defect | Impact | Fix | Re-tested |
|---|---|---|---|
| ITEMS would say `Empty` if the equippable API failed | could present a missing API as a real empty hand | show `Not available` instead | items section integration flow |
| Container detail used `getViewDirection()` without a guard | detail could fail on a client without view data | distance/cardinal direction remain; relative label is omitted on failure | container detail integration flow |
| A non-container block (`beacon`) was in the recognition list | an interaction with a non-container could be logged as a container | removed; only real container types and chest/shulker variants are accepted | container unit test |
| `/atlas` answered **Command Not Found** | 1.6.0 registered only the namespaced `atlas:menu`; a bare `/atlas` was never a command | register `atlas:atlas` so Bedrock exposes `/atlas`; register each name once and independently; report accepted entry points in DIAGNOSTICS | command suite + integration harness; real client **NOT TESTED** |

No failing product assertion remained in the final automated run. The earlier `action indicator` test timing was corrected in the harness; it was a test-order issue, not a product defect. The 1.6.0 compatibility work found no regression in the existing sections; its new unit and harness cases are listed in section 8A. The 1.7.0 command fix is covered by the command suite and the integration harness.

---

## 14. Feature status summary

| Feature | Status | Scope |
|---|---|---|
| Main menu and 16 sections | PASS (harness) | native forms; device render unverified |
| `/atlas` and `/atlas:menu` | PASS (harness) | no cheats; `/atlas` is Bedrock's automatic short alias; device command path unverified |
| HUD text | PASS (harness) | action bar only; no positioning/size/opacity |
| WASD | PARTIAL | movement vector, not physical keys; device unverified |
| CPS / LMB / RMB | PARTIAL | game-reported actions only; empty-air clicks unavailable |
| Armor durability | PASS (harness) | equipped armor and held item only |
| Potions / totems | PASS (harness) | API values; device unverified |
| Low health / durability alerts | PASS (harness) | scoped and one per low episode |
| Waypoints | PASS (harness) | 30 per world, world-shared |
| ESPCHEST | PASS (harness) | interaction log only; no hidden-container scan |
| SERVER MANAGER | PASS (harness) / NOT CONNECTED | validated address book and guides; no connection, status or auto-reconnect by design |
| Settings / ATLAS1+ATLAS2 | PASS (harness) | dynamic properties; server may block |
| Arabic / English | PASS (unit + harness) | device shaping unverified |
| Universal compatibility engine | PASS (unit + harness) | statuses and reinit; real environments NOT TESTED |
| Diagnostics export | PASS (harness) | chat chunks; no clipboard |
| PS5 / iPhone / Mega10 | NOT TESTED | no compatibility claim |

---

## 15. Known technical limits

- No clickable top-right icon, ESC capture, Ore UI editing or native pause-menu replacement.
- HUD is a single action-bar line; no free positioning, font size, opacity, vertical armor position or armor icons.
- No physical keyboard/mouse/PS5 button stream; no auto-clicker, aimbot, X-ray or hidden-container scan.
- ESPCHEST stores only opened containers and never their contents.
- CPS cannot count clicks into empty air because Minecraft does not report them.
- Totem count covers the main inventory and offhand only.
- Low-durability monitoring covers equipped armor and the held main-hand item only.
- Settings depend on dynamic properties; servers can block or reset them.
- Public servers must already contain and allow the pack. ATLAS does not bypass server rules.
- SERVER MANAGER never connects. Minecraft exposes no networking, server-list or connection-observation API to world add-ons; `@minecraft/server-admin.transferPlayer` is BDS-only and experimental.
- No clipboard API, no way to open the Add Server screen, and no PS5 Add Server button.
- IPv6 addresses are intentionally rejected; only IPv4 and domain names are validated.

---

## 16. Import and first run

1. Import `ATLAS.mcaddon` into Minecraft Bedrock 26.60+.
2. Activate **ATLAS CLIENT** (Behavior Pack) and **ATLAS CLIENT Resources** in the world.
3. Do not enable experiments.
4. Enter the world.
5. Open the menu with the **ATLAS CLIENT** item, `/atlas` or `/atlas:menu` (no cheats required); `/menu` is the automatic short form.
6. Expected Content Log lines: `[ATLAS] Scripts loaded: v1.7.0`, `[ATLAS] Compatibility engine initialized`, `[ATLAS] Event handlers registered: 10`, `[ATLAS] Custom command /atlas:menu registered`, `[ATLAS] Custom command /atlas:atlas registered`, `[ATLAS] World loaded`.
7. Expected chat line once per player/version: `Scripts v1.7.0 are running`.

Detailed device steps: [`DEVICE_TESTING.md`](DEVICE_TESTING.md). Installation: [`INSTALL.md`](INSTALL.md). Troubleshooting: [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md). Limits: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

---

## 17. Final verdict

- **Automated/static:** PASS.
- **Mocked Minecraft control flow:** PASS.
- **Real Minecraft/iPhone/PS5/BDS/Mega10:** **NOT TESTED**.
- **Release status:** ready for device testing, not proven in-game. Do not treat `npm run check` as in-game evidence.
