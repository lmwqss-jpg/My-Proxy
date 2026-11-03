# ATLAS CLIENT — Technical Audit (1.4.0, with 1.5.0 and 1.6.0 addenda)

**Repository:** `lmwqss-jpg/My-Proxy`
**Audited version:** 1.3.0 working tree, before the 1.4.0 changes
**Delivered versions:** 1.4.0, 1.5.0 and 1.6.0
**Target:** Minecraft Bedrock 26.60 / `[1, 26, 60]`, stable Script API
**Automated audit:** `npm run typecheck`, `npm test`, `npm run build`, `npm run validate`

> This audit is based on the repository contents and automated checks. It is not an in-game test report. Client rendering, device input, PS5 import and public-server behaviour remain unverified.

---

## 1. Repository map

```text
ATLAS.mcaddon                     single generated add-on (BP + RP)
src/ATLAS/BP/manifest.json        Behavior Pack: data + script modules
src/ATLAS/BP/items/               atlas:client_token item definition
src/ATLAS/BP/scripts/main.js      script entry point
src/ATLAS/BP/scripts/config.js    version, limits, toggle list, defaults
src/ATLAS/BP/scripts/events.js    world/player event wiring
src/ATLAS/BP/scripts/compatibility.js      runtime compatibility engine
src/ATLAS/BP/scripts/compatibilityModel.js pure statuses/report model
src/ATLAS/BP/scripts/hud.js       HUD loop, alerts, live snapshot
src/ATLAS/BP/scripts/hudData.js   armor, effects, totems
src/ATLAS/BP/scripts/hudFormat.js pure action-bar text composition
src/ATLAS/BP/scripts/input.js     movement vector, observed CPS/LMB/RMB
src/ATLAS/BP/scripts/containers.js interaction-based container log model
src/ATLAS/BP/scripts/store.js     dynamic-property persistence
src/ATLAS/BP/scripts/settings.js  validation and ATLAS2/ATLAS1 codes
src/ATLAS/BP/scripts/waypoints.js waypoint model and 30-item limit
src/ATLAS/BP/scripts/locator.js   official locator-bar markers
src/ATLAS/BP/scripts/ui/          native ActionForm/ModalForm screens
src/ATLAS/BP/scripts/ui/statusScreens.js HOME/PLAYER/MOVEMENT/ARMOR/ITEMS/POTIONS/TOTEMS
src/ATLAS/BP/scripts/ui/espchestScreen.js ESPCHEST log, detail and clear screens
src/ATLAS/RP/manifest.json        Resource Pack: textures and language file
scripts/build.mjs                 produces ATLAS.mcaddon
scripts/validate.mjs              static pack/archive validator
test/                             Node unit tests + mocked Minecraft harness
docs/                             packaging, device and test documentation
```

The pack has no website, no external runtime and no client injection. Everything runs inside the Bedrock Script API when the world activates the Behavior Pack.

---

## 2. Current architecture

1. **One import file.** `scripts/build.mjs` copies `src/ATLAS/BP` and `src/ATLAS/RP` into `ATLAS_BP/` and `ATLAS_RP/` at the root of a ZIP that is written as `ATLAS.mcaddon`. Each pack keeps `manifest.json` at its own root.
2. **Behavior Pack.** It contains a `data` module, the item definition and a `script` module whose entry is `scripts/main.js`. It depends on the Resource Pack and the stable `@minecraft/server 2.11.0` / `@minecraft/server-ui 2.3.0` modules.
3. **Resource Pack.** It is world-scoped (`pack_scope: "world"`), contains the item texture, UI icons and `en_US.lang`, and depends on the Behavior Pack version.
4. **Early execution is respected.** Module-scope code only registers subscriptions and starts the HUD loop. World storage is first touched from `worldLoad` or after a timeout, never during script loading.
5. **HUD surface.** The only persistent text surface available to official add-ons is `Player.onScreenDisplay.setActionBar`. The HUD is composed as a colour-coded string and refreshed at a configurable 5–40 tick interval.
6. **Input.** W/A/S/D comes from `Player.inputInfo.getMovementVector()`. CPS and LMB/RMB come from real game events (`entityHitEntity`, `entityHitBlock`, block/entity interaction, item use). No input is simulated.
7. **Persistence.** Settings, combat totals and the last death are player dynamic properties; waypoints are world dynamic properties. Settings are validated and normalised on every read.
8. **UI.** All menus are native Bedrock forms. There is no Ore UI modification, no clickable HUD widget and no ESC capture. The 1.4.0 main menu exposes HOME, ESPCHEST, HUD, VISUAL, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS, TOTEMS, COMBAT, WAYPOINTS, SETTINGS, DIAGNOSTICS and ABOUT.
9. **Container log.** ESPCHEST is interaction-based. `playerInteractWithBlock` records known container blocks with real coordinates in per-player dynamic properties; the screen never scans hidden blocks or contents.
9. **Entry points.** The ATLAS item (`atlas:client_token`) and `/atlas:menu` (permission `Any`, `cheatsRequired: false`). `/scriptevent atlas:menu` remains an optional cheats-only fallback.

---

## 3. Feature inventory after 1.4.0

| Area | Implemented | Verification level |
|---|---|---|
| Coordinates, health, name, dimension, compass, world day/time, waypoint distance/direction | Yes | Harness + static |
| Session timer (opt-in), player count/difficulty, game mode/level | Yes | Harness + static for session; delegated to Visual for player/world details |
| WASD movement panel | Yes, from movement vector | Harness; real device unverified |
| CPS + LMB/RMB indicators | Yes, from observed game events | Harness; real device unverified |
| Armor HUD with real durability, percentages, low-durability colour | Yes | Harness + static |
| Per-piece armor toggles | Yes | Harness |
| Potion effects with duration and amplifier | Yes | Harness + static |
| Totem count (inventory + offhand) | Yes, inventory refresh coalesced to 5 ticks | Harness |
| Low-durability alert, threshold, optional sound, one warning per low episode | Yes | Harness |
| Waypoints create/rename/move/delete/track, 30 limit, world storage | Yes | Unit + harness |
| Automatic death point | Yes | Harness |
| Official locator-bar markers | Yes, feature-detected | Mock only; real client unverified |
| Low-health alert, threshold, sound, title | Yes | Harness |
| Kills/deaths/K/D persisted; session damage/history | Yes | Harness |
| Themes, English/Arabic, HUD editor, settings import/export, diagnostics | Yes | Unit + harness |
| ATLAS2 codes and legacy ATLAS1 import | Yes | Unit + harness |
| ESPCHEST interaction log (20 per player) | Yes; no hidden-container scanning | Unit + harness |
| HOME / PLAYER / MOVEMENT / ARMOR / ITEMS / POTIONS / TOTEMS screens | Yes, real API values and controls | Harness |
| Main-menu navigation for all 15 sections | Yes | Harness (198 forms) |
| PS5 / iPhone / Mega10 | Not tested | — |

---

## 4. Why the earlier build could fail to run

The 1.0.0 source is present in the repository history (commit `fbc32db`), together with the 1.1.0 and 1.2.0 changes. The exact Content Log from the reporter was not provided, so the precise device error cannot be reproduced or claimed. The old files do, however, contain concrete packaging and startup defects that can prevent an add-on from loading or behaving correctly.

| Defect | Consequence | Status |
|---|---|---|
| `metadata` nested inside `header` | Pack tooling cannot see authors/product type; cooperative validation fails | Fixed in 1.2.0 |
| Resource Pack missing `pack_scope` | Cooperative add-on validation error; wrong pack scope | Fixed in 1.2.0 |
| `item_texture.json.textures` was a string | Item icon can fail to resolve | Fixed in 1.2.0 |
| Textures under generic `items`/`ui` folders | Cooperative add-on validation errors | Fixed in 1.2.0 |
| `ar_SA` advertised as a game locale | Unsupported locale warning; Arabic is not a Bedrock game locale | Fixed in 1.2.0 |
| Old item format version | Item can be ignored on 1.26.60 | Fixed in 1.2.0 |
| One unavailable event aborted later subscriptions | Command/menu could stop registering | Fixed in 1.2.0 |
| Locator API touched too early | Client without the API could fail before HUD/menu load | Fixed in 1.2.0 |
| Locator classes imported as named bindings at module scope | A client without those exports can fail before the guarded runtime code runs | Changed to a namespace import and lazy texture lookup |
| No visible startup confirmation | Impossible to tell whether the new build loaded | Fixed in 1.2.0 |

The remaining risk is not in the archive shape: it is whether the pack is activated in the world, whether the client supports the requested Script API versions, and whether the device allows local `.mcaddon` import. The troubleshooting guide lists the exact log lines to check.

---

## 5. 1.4.0 changes and rationale

1. **Complete menu structure** — HOME, ESPCHEST, HUD, VISUAL, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS, TOTEMS, COMBAT, WAYPOINTS, SETTINGS, DIAGNOSTICS and ABOUT are separate native screens. Existing HUD, Visual, PvP/Combat, Waypoints/Utilities, Settings and diagnostics behavior is preserved.
2. **ESPCHEST as a real feature** — because the API cannot discover hidden containers or read contents through walls, the implementation logs only containers the player actually opens. It stores type, dimension, coordinates and last-seen time per player, deduplicates the same block, caps the log at 20 and supports remove/clear. The screen states the limitation directly.
3. **Status screens** — player, movement, armor, items, potions and totems screens read the same live collectors as the HUD and expose the matching toggles. Unavailable components are shown as unavailable rather than fabricated.
4. **Offhand item information** — `collectEquipment` now also returns the offhand item for the ITEMS screen; the HUD behavior is unchanged.
5. **Hardening** — container recording is guarded per event, the new status screens handle missing equipment/inventory APIs, and container detail keeps a real distance/direction even if view-direction access fails.
6. **Tests and validation** — a 14th unit test covers the container model; the integration harness now checks all 15 menu sections, command/event registration counts, duplicate menu protection, container dedupe/remove/clear, per-section controls and the armor threshold modal. Validation parses every JSON file and checks version 1.4.0 across the package, manifests and runtime.

The 1.1.0–1.3.0 HUD/input/status/settings work described in the changelog remains in place. No working feature was removed.

## 6. Unsupported by the official platform

The following remain impossible for an ordinary Bedrock add-on and are documented instead of imitated:

- Connecting to, transferring to or observing an external server from a world add-on.
- Real server status, ping, version, player count or auto-reconnect.
- Clipboard copy or opening Minecraft's Add Server screen.
- Clickable top-right HUD icon or arbitrary HUD layout.
- ESC interception or replacing the native pause menu.
- Ore UI / native form background modification.
- Per-element font size, transparency or position.
- Item icons inside the action bar.
- Raw keyboard, mouse or controller button streams.
- Counting clicks that the game does not report (for example clicks into empty air).
- Reading all stored tools for durability (only equipped armor and the held item are visible).
- X-ray, ESP through walls, hidden-container scanning or reading container contents, aimbot, auto-clicker or combat automation. ESPCHEST is only a log of containers the player opened.

PS5 compatibility is not claimed. The code is device-independent, but local import, controller navigation, Arabic shaping and real rendering were not exercised on a PS5.


---

## 7. 1.5.0 addendum — SERVER MANAGER

### Decision

The request asked for a real connection system. The stable Script API has no networking, server-list, transfer or connection-observation API. The only official transfer function, `@minecraft/server-admin.transferPlayer`, is dedicated-server-only, experimental, unavailable on clients/Realms and incompatible with this pack's no-experiments requirement. A CONNECT button would therefore be fake, and the project spec explicitly forbids that.

The implementation is a **validated, persistent, per-player address book with manual connection guidance**:

1. **Model** (`servers.js`) — IPv4/domain and port validation, normalisation, JSON parsing/serialisation, duplicate-target rejection, 40-entry cap, ordering, favourites, one manual current entry with timestamp, last Direct Join target. It has no Minecraft imports and is unit-tested.
2. **Storage** (`store.js`) — `atlas:servers` and `atlas:server_target` player dynamic properties, separate from settings. A leave clears the cache so a rejoin reads storage again.
3. **UI** (`serversScreen.js`) — add/edit/delete, list/detail, guide, Direct Join, send-to-chat and manual current/favourite/order controls. Invalid submissions reopen the form with a specific message. The screen explicitly states that status is unknown and that no connection is attempted.
4. **Menu** — `SERVER MANAGER` is registered between Waypoints and Settings and uses its own generated icon. All existing sections remain.

### Why no status or reconnect

A status manager that displayed ONLINE/OFFLINE/CONNECTING/RECONNECTING/ERROR would need to measure the server. The API can observe neither the current server nor an external endpoint, so the only honest value is **Unknown**. Auto-reconnect and retry counts are likewise game-owned; adding switches would mislead the user.

### Platform consequence

- iPhone/Android/Windows expose **Servers → Add Server**; the guide names the exact host and port to enter.
- PS5 does **not** expose an Add Server button. ATLAS cannot add one, and no PS5 compatibility is claimed.
- Friends/Realms addresses are not published to add-ons; those entries are organisational only.
- Microsoft sign-in, allow-lists, anti-cheat and server permissions remain outside the add-on.

### Verification

Unit tests cover the address model; the integration harness covers add/edit/delete/order/favourite/manual current, invalid addresses/ports, duplicates, Direct Join and reload after leave/rejoin. `npm run validate` checks the rebuilt archive. No real client, console or server was available, so device behavior remains **NOT TESTED**.


---

## 8. 1.6.0 addendum — Universal compatibility engine

### Decision

The request asked for ATLAS to work on any Minecraft Bedrock server and to report exactly what is supported. A world add-on cannot identify, query or connect to a server; the stable Script API exposes no networking, server-list or connection-observation API. Claiming universal server support or server status would be false.

The implementation therefore separates two concerns:

1. **Environment evidence.** The engine probes the actual Script API capabilities it can call. It records availability per player, not per server name.
2. **Feature status.** Each of the 18 visible sections/entry points is reduced to `WORKING`, `LIMITED`, `READY`, `UNAVAILABLE`, `ERROR` or `NOT TESTED` from those probes plus real runtime successes and failures.

### Architecture

- `compatibilityModel.js` is pure: feature definitions, capability ids, status reduction, summary, report formatting and chat chunking. It has no Minecraft imports and is unit-tested.
- `compatibility.js` is the runtime: module API probe, world probe after `worldLoad`, per-player probe on join/respawn/dimension change, lifecycle counters, bounded error history and report snapshots. It subscribes to no events, so `events.js` remains the only registration point and reinitialization cannot duplicate listeners.
- `events.js` calls the lifecycle hooks; `hud.js` uses capability gates before health, equipment, inventory, effects, input, view, game mode, world clock and player count; `router.js` records screen successes/errors; `store.js` records storage errors and successes.
- `diagnosticsScreen.js` shows feature rows, capability lists, reinitialization/error counters and exports a copyable report through chat chunks. It never reads passwords, tokens, server credentials or Microsoft account data.

### Status semantics

`WORKING` requires a recorded successful operation (form opened, action bar set, data stored, container recorded). `READY` means required APIs exist but the feature has not run. `NOT TESTED` means a required capability was never probed and is never counted as success. `LIMITED` covers documented scope limits (HUD action bar, movement vector, ESPCHEST opened-containers-only, Server Manager address book) and missing optional APIs. `UNAVAILABLE`/`ERROR` include the missing capability or last bounded error.

### Reinitialization guarantees

`worldLoad` increments the reinitialization count, proves world APIs by calling them, drops stale player state and re-syncs locators/HUD. Join/respawn re-probes only that player; leave deletes all per-player maps; dimension change re-probes and refreshes the HUD/locator. Settings, waypoints and the ESPCHEST log are not cleared. Guards in `initEvents`, `startHud`, `registerCommands` and `initCompatibilityEngine` prevent duplicate registration. The integration harness emits a second `worldLoad` plus a respawn and asserts unchanged listener/command counts.

### Verification

Unit tests cover feature definition integrity, every status transition, report contents and chat chunk bounds. The integration harness covers the diagnostics screen, **EXPORT DIAGNOSTICS**, capability-gated degradation, error counters and reinitialization without duplicate listeners. `npm run typecheck`, `npm test`, `npm run build` and `npm run validate` pass for 1.6.0.

### Not claimed

- No real iPhone, PS5, Realm, BDS or public-server test for 1.6.0.
- No server identity, ping, player count, version or connection state.
- No bypass of Microsoft login, allow-lists, anti-cheat or pack restrictions.
- Status values describe this script session; they are not device compatibility certificates.
