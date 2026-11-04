# ATLAS CLIENT 1.8.0 — Full Test Report

**Add-on version:** 1.8.0\
**Archive:** `ATLAS.mcaddon` (one Behavior Pack + one Resource Pack)\
**Target:** Minecraft Bedrock 26.60 / `1.26.60`+\
**Script modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`\
**Experiments:** none\
**Report scope:** static checks, the Node.js harness, official Creator Tools validation, and a real Bedrock Dedicated Server 1.26.60.6 run. **No iPhone, PS5, Realm, public-server or player-UI test was performed.** Those rows say **NOT TESTED** on purpose.

> This report separates three different things: code that was executed, a real
> Minecraft **server** runtime, and a real Minecraft **client**. A successful
> simulated form flow is not a device test, and a BDS startup test does not prove
> that a form renders on a phone or console.

---

## 1. Environment and commands actually run

Linux, Node.js 24.x, npm 11.x, TypeScript 5.9.x, esbuild 0.25.x, Minecraft
Bedrock Dedicated Server 1.26.60.6 (Linux), Minecraft Creator Tools 0.20.0.

| Command | Result | Evidence |
|---|---|---|
| `npm ci` | PASS | 8 packages installed, 0 vulnerabilities |
| `npm run typecheck` | PASS | every pack script checked against the official 2.11.0 / 2.3.0 types |
| `npm test` | PASS | **27 tests**: 26 unit/static tests plus one integration test with **292 native form flows** |
| `npm run build` | PASS | `ATLAS.mcaddon`, **51 files, 95.0 KiB**, 53 ZIP entries including pack roots |
| `npm run validate` | PASS | **6 checks**: manifests, every JSON file, item/PNG/texture references, localisation, 34 scripts/imports, ZIP |
| `npm run check` | PASS | typecheck + tests + build + validate, in that order |
| `unzip -t ATLAS.mcaddon` | PASS | archive integrity: no compressed-data errors |
| `unzip -l ATLAS.mcaddon` | PASS | `ATLAS_BP/` and `ATLAS_RP/` manifests, `scripts/main.js`, item and textures at the expected roots |
| `mct validate addon --if ATLAS.mcaddon` | PASS | official Creator Tools: 0 errors, 0 warnings, 0 recommendations; 51 content files, 7 content folders, 5 UUIDs |
| `git diff HEAD --check` | PASS | no whitespace errors |
| BDS 1.26.60.6 startup | PASS | pack stack loaded, scripts started, 10 event handlers, both commands registered, `worldLoad` received |
| BDS command resolution | PASS | `/atlas`, `/atlas:atlas`, `/atlas:menu` and `/menu` all resolved to the ATLAS callback |
| BDS `reload` × 3 | PASS | each reload registered exactly once and produced no script error |
| BDS ~64-second soak | PASS | RSS stable at ~459 MB; no add-on errors; CPU ~4.4% with no players |

The BDS run is a **server runtime** test. It cannot open forms or render a HUD
because no client was connected. See section 12 for the exact boundary.

---

## 2. A. Project audit

| # | Check | Result | Detail |
|---|---|---|---|
| A1 | Project files inspected | PASS | manifests, item, textures, language files, all 34 scripts, tests, build/validation scripts and documentation |
| A2 | All JSON files parse | PASS | 5 JSON files in BP/RP; the validator parses every one, not only manifests |
| A3 | Behavior Pack manifest | PASS | format 2, data + script modules, entry `scripts/main.js`, metadata at root, `product_type: "addon"` |
| A4 | Resource Pack manifest | PASS | format 2, resources module, `pack_scope: "world"` |
| A5 | UUIDs | PASS | 5 valid unique v4 UUIDs (2 pack headers, 3 modules); no duplicates |
| A6 | Dependencies and API versions | PASS | BP → RP and stable `@minecraft/server 2.11.0` / `@minecraft/server-ui 2.3.0`; RP → BP; no beta/preview |
| A7 | Missing files | PASS | script entry, item, texture map, icons, language file and pack icons all exist |
| A8 | Paths | PASS | relative imports resolve; item texture references resolve; archive paths are not nested |
| A9 | Old code conflicts | PASS | version 1.8.0 is consistent in `package.json`, both manifests, modules, dependencies and runtime; `ATLAS1` and older `ATLAS2` codes still import |

Static forbidden checks passed: no `eval`/`new Function`, no experiment or
`script_eval` capability, no unsupported `ar_SA` locale, no legacy branding in
pack files.

---

## 3. B. Command entry points and menu tests

### B.1 Registration and real BDS resolution

| # | Test | Result | Detail |
|---|---|---|---|
| B1 | `atlas:menu` registered | PASS (harness + BDS) | permission `Any`, `cheatsRequired: false` |
| B2 | `atlas:atlas` registered | PASS (harness + BDS) | provides the un-namespaced `/atlas` chat alias |
| B3 | `/menu` alias | PASS (harness + BDS) | automatic alias of `atlas:menu` |
| B4 | All four names reach the callback | PASS (harness + BDS) | BDS resolved `atlas`, `atlas:atlas`, `atlas:menu` and `menu`; each returned the expected in-game-only response from the console |
| B5 | Each name opens the main menu | PASS (harness) | command suite invokes every accepted name and sees a main form |
| B6 | Non-player origin | PASS (harness) | console origin returns `Failure` with a readable message; an `initiator` player is accepted |
| B7 | Name collision | PASS (harness) | when `atlas:atlas` is rejected, `atlas:menu` and `/menu` stay registered and the failure is logged |
| B8 | Missing command registry | PASS (harness) | no exception, zero registrations, warning logged |
| B9 | No duplicate registration | PASS (harness + BDS) | exactly 2 registrations; repeated startup/reload and a second `registerCommands()` do nothing |
| B10 | Command names in diagnostics | PASS (harness) | DIAGNOSTICS and the exported report list the accepted names and aliases |

Registration marks the command capability available. The feature becomes
`WORKING` only after the real command callback runs. BDS console execution
proves the names resolve, but it cannot prove a player's chat autocomplete or a
form opening on a device; those remain **NOT TESTED**.

### B.2 Menu control flow

| # | Test | Result | Detail |
|---|---|---|---|
| B11 | Open and close the menu | PASS (harness) | item, `/atlas:menu`, `/atlas` and the close button exercised |
| B12 | Navigate every section | PASS (harness) | all 16 main-menu entries opened and returned to the main menu |
| B13 | No freeze while opening forms | PASS (harness) | **292** sequential forms handled; no unresolved UI queue |
| B14 | Busy client retry | PASS (harness) | `UserBusy` retried, then opened normally |
| B15 | Form API failure | PASS (harness) | a thrown `show()` is reported once, closes that screen, records `ERROR` against the section, and leaves the main menu usable |
| B16 | No duplicate listeners or menus | PASS (harness + BDS) | expected listener counts; double item use opens one menu; BDS reloads keep 10 event handlers and 2 registrations |

Commands exist only while ATLAS is installed and active in the world. A public
server that does not run the pack cannot expose them, and ATLAS does not claim
otherwise.

---

## 4. C. Every ATLAS UI section

Each section was opened from the real main menu and exited back to it. Section
controls were also exercised.

| Section | Result | What was verified |
|---|---|---|
| HOME | PASS (harness) | live summary, HUD preview, session shortcut |
| ESPCHEST | PASS (harness) | real container entries, detail, dedupe, remove, clear |
| HUD | PASS (harness) | element toggles, editor, options, all-on/all-off |
| VISUAL | PASS (harness) | player/world/health/combat/locator toggles |
| PLAYER | PASS (harness) | name/health/coords/dimension/mode/level/session/K-D; toggles persist |
| MOVEMENT | PASS (harness) | WASD state, CPS, LMB/RMB state; toggles persist |
| ARMOR | PASS (harness) | four pieces, real durability/percentages; piece toggle; threshold modal |
| ITEMS | PASS (harness) | main/offhand item, durability, totem count; toggles persist |
| POTIONS | PASS (harness) | active effect name/level/duration; toggle persists |
| TOTEMS | PASS (harness) | real count; toggle persists |
| COMBAT | PASS (harness) | stats, last death, combat log, reset path, alert settings |
| WAYPOINTS | PASS (harness) | add/list/detail/rename/track/delete/death point; detail survives a missing view API |
| SERVER MANAGER | PASS (harness) | add/edit/delete/order/favourite/manual current; validation; Direct Join; guide; persistence after rejoin |
| SETTINGS | PASS (harness) | theme, language, save, export, import, reset, diagnostics/about links |
| DIAGNOSTICS | PASS (harness) | product/API versions, per-feature status, locator state, session duration, server ticks, export |
| ABOUT | PASS (harness) | version and official limits |

---

## 5. D. ON/OFF behavior

| Test | Result | Detail |
|---|---|---|
| Enable a feature and verify it appears | PASS (harness) | HUD panels, session timer, per-piece armor, visual/PvP elements |
| Disable a feature and verify it stops | PASS (harness) | disabled panels disappear from the action bar immediately |
| Re-enable it | PASS (harness) | restored without a restart |
| No duplicated events | PASS (harness + BDS) | exact listener counts; inventory bursts coalesced; duplicate menu use blocked; BDS reload counts unchanged |
| Other features unaffected | PASS (harness) | toggling one panel/control left unrelated toggles and HUD elements intact |
| One feature fails independently | PASS (harness) | a form failure marks only that section; a broken player does not stop locator sync for other players or the delayed spawn setup |

---

## 6. E. Settings persistence

| Test | Result | Detail |
|---|---|---|
| Change settings, close and reopen the menu | PASS (harness) | settings remain in player dynamic properties |
| Leave the world and rejoin | PASS (harness) | cache is cleared; changed settings JSON is reloaded; waypoints, containers, servers and Direct Join target survive |
| Section controls persist | PASS (harness) | CPS, helmet, player name, potions, totems, session and armor threshold round-trip |
| Current `ATLAS2` codes | PASS (unit) | all current toggles and thresholds round-trip |
| Older `ATLAS2` codes | PASS (unit) | 33-toggle codes import; the newer session toggle stays off |
| Legacy `ATLAS1` codes | PASS (unit + harness) | original 20 toggles restored; newer panels keep defaults |
| Invalid/tampered codes | PASS (unit) | rejected without changing saved settings |

Real **Save & Quit** persistence on a phone/console/realm remains **NOT TESTED**.

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

The HUD is an action-bar line. Free positioning, font size, opacity, armor icons
and per-element placement are not exposed by the stable Script API and are not
claimed.

---

## 8. G. Other systems

| System | Result | Detail |
|---|---|---|
| ESPCHEST | PASS (harness) | only opened containers; stone ignored; duplicate chest refreshed; remove/clear; per-player storage |
| Armor | PASS (harness) | real equipment/damage values; per-piece visibility; threshold modal |
| Effects | PASS (harness) | real active effects, duration and amplifier |
| Totems | PASS (harness) | inventory + offhand; null vs real zero distinguished |
| Waypoints | PASS (unit + harness) | CRUD, move, track, 30 cap, death point, world storage, locator markers in mock, detail without view API |
| Session timer | PASS (unit + harness) | starts at join, resets on leave/rejoin |
| PvP statistics | PASS (harness) | kills/deaths/K-D, last death, damage/history scoped to session |
| Alerts | PASS (harness) | low health once per episode; low durability once per low episode; optional sounds |
| Arabic / English | PASS (unit + harness) | identical key sets, matching placeholders, Arabic form flow and Arabic HUD labels |
| Themes | PASS (unit) | four complete palettes and HUD colours |
| Settings import/export | PASS (harness) | ATLAS2 export, valid import, invalid rejection, ATLAS1 import |
| SERVER MANAGER model | PASS (unit) | IPv4/domain/port validation, invalid rejection, normalisation, duplicate host/port and id rejection, 40-entry cap, order/favourite/current rules, JSON round-trip, UTC timestamp |
| SERVER MANAGER forms | PASS (harness) | add two entries with custom port; edit; delete; reorder; favourite; manual current; rejected `host:port`, bad host, bad port and duplicate; Direct Join invalid+valid; last target saved; guide shows host/port and `Add Server`; entries survive leave/rejoin |

**SERVER MANAGER limitation:** it is an address book, not a connector. It cannot
start a connection, observe ONLINE/OFFLINE state, ping a server, read player
counts/version, auto-reconnect, access the clipboard or open Minecraft's Add
Server screen. PS5 has no Add Server button.

**ESPCHEST limitation:** it records only containers the player actually opens. It
does not scan hidden containers, unloaded chunks or contents through walls, and
it does not modify the world.

---

## 8A. H. Compatibility engine, diagnostics and recovery

| # | Test | Result | Detail |
|---|---|---|---|
| X1 | Feature definitions are unique and complete | PASS (unit) | every required/optional capability exists; screen-to-feature mapping covers section and detail screens |
| X2 | Status reduction | PASS (unit) | `READY` before use, `WORKING` only after a real success, `ERROR` after a later failure, `UNAVAILABLE` for a missing required API, `NOT TESTED` for an unprobed capability, `LIMITED` for documented scope |
| X3 | Report contents | PASS (unit) | version, feature statuses, entry points, API lists, stored-data context, bounded errors |
| X4 | Chat chunking | PASS (unit) | long reports split below the chat limit without an oversized message |
| X5 | Second `worldLoad` and respawn | PASS (harness) | exactly two command registrations and unchanged listener counts; settings, waypoints and containers remain; no repeated boot message |
| X6 | Diagnostics screen | PASS (harness) | real per-feature statuses, command entry points, capability counts, session duration and error counters |
| X7 | Export diagnostics | PASS (harness) | form shows the real report; sending it adds copyable chat chunks and a message count |
| X8 | Capability gating | PASS (harness + unit) | missing optional view/game-mode/effects APIs hide only their elements |
| X9 | Form failure is not a success | PASS (harness) | a thrown form API call is reported, recorded as `ERROR` for that section and no longer counted as a completed screen |
| X10 | Optional view API in waypoint detail | PASS (harness) | distance and cardinal bearing remain; only the relative left/right label is omitted |
| X11 | Per-player locator isolation | PASS (harness) | one player whose dimension cannot be read does not stop markers for other players |
| X12 | Delayed spawn isolation | PASS (harness) | a failure in the post-spawn setup is logged as an event error instead of becoming an unhandled timeout exception |
| X13 | Entry-point reporting | PASS (harness + BDS) | accepted command names and aliases come from the actual registry; BDS confirmed all four names |

`WORKING` in this table means the harness or BDS observed a successful operation.
It does not mean the feature was verified on a device.

---

## 9. I. Performance and stability

| Test | Result | Detail |
|---|---|---|
| Errors during a full flow | PASS (harness) | zero mock/UI errors; expected warnings are asserted and cleared per recovery test |
| Repeated data updates | PASS (harness) | 292 form actions and repeated HUD updates without failure |
| Leave/join | PASS (harness) | state caches cleared, settings and waypoints reloaded |
| No duplicate listeners | PASS (harness + BDS) | expected subscription counts; BDS reload keeps 10 handlers |
| No duplicate command | PASS (harness + BDS) | exactly two registrations, one per name, even after three server reloads |
| Inventory bursts | PASS (harness) | two same-tick inventory changes produce one HUD rebuild |
| Missing optional APIs | PASS (harness) | HUD and screens omit unavailable values and do not crash |
| Container log cap | PASS (unit) | 20 entries maximum; oldest entries drop |
| Server list cap | PASS (unit) | 40 entries maximum; extra add is rejected |
| Server cache cleanup | PASS (harness) | entries reload from dynamic properties after leave/rejoin; no stale cache |
| HUD refresh | PASS (harness) | configurable 5–40 ticks; default 5 |
| BDS memory/CPU soak | PASS (BDS) | ~64 s, three reloads: RSS 458,980 → 459,144 KB (stable); ~4.4% CPU with no players; no add-on errors |

No long multiplayer session or device soak was possible. The BDS soak has no
player, so it does not exercise forms, HUD rendering or per-player storage.

---

## 10. J. Build and archive

`npm run build` produced:

- `ATLAS.mcaddon` with **51 files, 95.0 KiB, 53 ZIP entries**.
- `ATLAS_BP/manifest.json`, `ATLAS_BP/scripts/main.js`, `ATLAS_BP/items/atlas_client.json`.
- `ATLAS_RP/manifest.json`, textures (including `atlas_servers.png`), `texts/en_US.lang`, `texts/languages.json`.
- No nested pack folder, no `__MACOSX`, no `.DS_Store`, no stale archived files.
- Every archived file matches its source byte-for-byte.

`npm run validate` passed 6 checks and confirmed version 1.8.0, 5 unique UUIDs,
5 parsed JSON files, item/texture/PNG references, localisation and 34 script
import graphs. Official Creator Tools validated the same archive with **0
errors, 0 warnings, 0 recommendations**.

---

## 11. K. Real Minecraft Dedicated Server 1.26.60.6

This was a genuine Bedrock **server** runtime, not a mock.

| Test | Result | Evidence |
|---|---|---|
| Pack discovery and version | PASS | `Pack Stack - [00] ATLAS CLIENT ... version: 1.8.0`; no "pack not found" warning |
| Script startup | PASS | `[ATLAS] Scripts loaded: v1.8.0 ... server 2.11.0 | ui 2.3.0`; compatibility engine, HUD loop and 10 event handlers started |
| Command registration | PASS | both `atlas:menu` and `atlas:atlas` registered with no cheats; console resolved `/atlas`, `/atlas:atlas`, `/atlas:menu` and `/menu` |
| World load | PASS | `[ATLAS] World loaded; storage, locators and HUD initialized` |
| Console origin handling | PASS | all four names returned the expected "Run this command in-game as a player" response instead of a command error |
| `/reload` | PASS | three reloads, each with 2 registrations, 10 event handlers and a new `worldLoad`; no duplicate or script exception |
| Soak | PASS | ~64 s, stable RSS, no add-on errors |
| Player UI / forms / HUD | NOT TESTED | BDS has no client; no player was connected |
| Per-player settings/waypoints after real quit | NOT TESTED | requires a real client and player |

The BDS result proves that the archive loads, the script module starts against
the official 2.11.0 API, events register, and the command names are real on
1.26.60.6. It does **not** prove rendering, touch/controller input, Arabic
shaping, item use or per-player persistence on a device.

---

## 12. L. Real Minecraft client and devices

| Platform / environment | Result | Note |
|---|---|---|
| Bedrock Dedicated Server 1.26.60.6 | PASS (startup/commands/reload/soak) | see section 11 |
| Minecraft Bedrock client | NOT TESTED | no client or graphics stack in this environment |
| iPhone / iPad | NOT TESTED | import, touch item use, Arabic shaping and Save & Quit persistence need device checks |
| PS5 | NOT TESTED | primary target; local import, controller input and custom-server entry (PS5 has no Add Server button) are unverified |
| Bedrock Arab | NOT TESTED | file-picker flow and real import are unverified |
| Realm | NOT TESTED | owner-side pack installation and commands are unverified |
| Private / public server (Mega10) | NOT TESTED | no authorized access; server rules may block packs, commands or storage |

No compatibility claim is made for any device or public server.

---

## 13. M. Defects found and fixed

| Defect | Impact | Fix | Re-tested |
|---|---|---|---|
| Form API failure looked like a user cancel | DIAGNOSTICS could record a section as `WORKING` even though its form never opened | `safeShow` throws `FormShowError`; the router records `ERROR`; the menu remains usable | form-failure integration flow |
| Waypoint detail called `getViewDirection()` without a guard | the whole detail screen could fail on a client without view data | distance and cardinal bearing remain; only the relative label is omitted | waypoint-detail integration flow |
| `syncAllLocators()` had no per-player guard | one broken player could stop marker creation for later players | each player is isolated; the rest continue | two-player locator integration flow |
| Delayed spawn setup was outside the event guard | an optional-API error after spawn could become an unhandled timeout exception | the callback catches, logs and records an event error | broken-dimension spawn integration flow |
| ITEMS said `Empty` when the equippable API failed (1.4.0) | presented a missing API as a real empty hand | shows `Not available` | items integration flow |
| Container detail used `getViewDirection()` without a guard (1.4.0) | container detail could fail | distance/cardinal direction remain; relative label omitted | container detail integration flow |
| `/atlas` answered **Command Not Found** (1.7.0) | 1.6.0 registered only `atlas:menu` | register `atlas:atlas` so Bedrock exposes `/atlas`; register each name once and independently | command suite + integration + BDS resolution |

No known failing product assertion remained in the final run. The harness still
cannot reproduce a real device render or a player's Save & Quit.

---

## 14. Feature status summary

| Feature | Status | Scope |
|---|---|---|
| Main menu and 16 sections | PASS (harness) | native forms; device render unverified |
| `/atlas`, `/atlas:atlas`, `/atlas:menu`, `/menu` | PASS (harness + BDS) | no cheats; BDS resolution confirmed; device chat/autocomplete unverified |
| HUD text | PASS (harness) | action bar only; no positioning/size/opacity |
| WASD | PARTIAL | movement vector, not physical keys; device unverified |
| CPS / LMB / RMB | PARTIAL | game-reported actions only; empty-air clicks unavailable |
| Armor durability | PASS (harness) | equipped armor and held item only |
| Potions / totems | PASS (harness) | API values; device unverified |
| Low health / durability alerts | PASS (harness) | scoped and one per low episode |
| Waypoints | PASS (harness) | 30 per world, world-shared |
| ESPCHEST | PASS (harness) | interaction log only; no hidden-container scan |
| SERVER MANAGER | PASS (harness) / NOT CONNECTED | validated address book and guides; no connection, status or auto-reconnect by design |
| Settings / ATLAS1 + ATLAS2 | PASS (harness) | dynamic properties; server may block |
| Arabic / English | PASS (unit + harness) | device shaping unverified |
| Universal compatibility engine | PASS (unit + harness) / PARTIAL (BDS) | BDS startup and commands verified; no player UI |
| Diagnostics export | PASS (harness) | chat chunks; no clipboard |
| PS5 / iPhone / client / Mega10 | NOT TESTED | no compatibility claim |

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
6. Expected Content Log lines: `[ATLAS] Scripts loaded: v1.8.0`, `[ATLAS] Compatibility engine initialized`, `[ATLAS] Event handlers registered: 10`, `[ATLAS] Custom command /atlas:menu registered`, `[ATLAS] Custom command /atlas:atlas registered`, `[ATLAS] World loaded`.
7. Expected chat line once per player/version: `Scripts v1.8.0 are running`.

A successful BDS boot with those lines is evidence of the same startup path, but
still not evidence that a phone or console renders the forms.

Detailed device steps: [`DEVICE_TESTING.md`](DEVICE_TESTING.md). Installation:
[`INSTALL.md`](INSTALL.md). Troubleshooting: [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).
Limits: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

---

## 17. Final verdict

- **Automated/static:** PASS.
- **Mocked Minecraft control flow:** PASS.
- **Real Bedrock Dedicated Server 1.26.60.6:** PASS for startup, event registration, command resolution, reload and a short soak.
- **Real player UI, iPhone, PS5, Realm, Bedrock Arab, Mega10:** **NOT TESTED**.
- **Release status:** 1.8.0 is ready for device testing. `npm run check` and a BDS startup are not a substitute for a real client render test.
