# Changelog

All notable changes to ATLAS CLIENT are recorded here. The archive is a single `ATLAS.mcaddon` containing the Behavior Pack and Resource Pack.

---

## 1.6.0 — Universal compatibility release

### Added

- **ATLAS UNIVERSAL COMPATIBILITY ENGINE** (`scripts/compatibility.js`) and a pure feature-status model (`scripts/compatibilityModel.js`).
- Per-feature states: `WORKING`, `LIMITED`, `READY`, `UNAVAILABLE`, `ERROR` and `NOT TESTED`. `WORKING` requires a real successful operation in the current script session; `NOT TESTED` is never counted as success.
- Lifecycle handling for `worldLoad`, player join, respawn, leave, dimension change and a deferred world-ready fallback. Reinitialization keeps settings, waypoints and the ESPCHEST log, and does not add duplicate listeners, tick loops or commands.
- Capability gating in the HUD, armor alerts and health alerts so a missing optional API disables only that element.
- Bounded error tracking by category (script, event, storage, form) with a last-check tick and recent-error list.
- **DIAGNOSTICS** now lists every feature status, required/optional API gaps, engine counters and reinitialization counts.
- **EXPORT DIAGNOSTICS** produces a copyable chat report in bounded chunks; the report contains no passwords, tokens or Microsoft account data.
- Unit tests for the feature/status model, report formatting and chat chunking; integration coverage for diagnostics export and for a second `worldLoad` plus respawn without duplicated listeners.

### Changed

- Version bumped to **1.6.0** in `package.json`, both manifests, module versions, dependency versions and the runtime.
- All 1.5.0 HUD, input, armor, effects, totems, waypoints, ESPCHEST, combat, Server Manager, themes, Arabic/English, settings and diagnostics behavior is preserved.
- `ATLAS2` settings codes and legacy `ATLAS1` import remain compatible.

### Verification

- `npm run typecheck` — passed.
- `npm test` — 20 tests passed, including 278 mocked form flows.
- `npm run build` — produced a 51-file `ATLAS.mcaddon` (92.4 KiB).
- `npm run validate` — passed 6 checks, including every JSON file, manifests, UUIDs, textures, imports and ZIP contents.
- **Not tested inside Minecraft, on iPhone, PS5, a Realm or a public server.** See [`TEST_REPORT.md`](TEST_REPORT.md) and [`COMPATIBILITY.md`](COMPATIBILITY.md).

---

## 1.5.0 — Server Manager release

### Added

- **SERVER MANAGER** section in `/atlas:menu`, kept separate from the rest of the client.
- Per-player server address book with add, edit, delete, reorder, favourites, category and region label.
- Validation for IPv4 addresses, domain names and ports 1–65535; duplicate host/port and blank names are rejected.
- Manual **current server** mark with a UTC last-marked timestamp, plus a **Direct Join** form that remembers the last address and port.
- **Connection guide** with the exact host/port and the official manual steps, plus **Send address to chat** because add-ons have no clipboard access.
- One dedicated `atlas_servers` menu icon.
- Unit tests for the server model and integration coverage for add/edit/delete/order/favourite/mark, invalid input, duplicates, Direct Join and persistence after leave/rejoin.
- [`docs/SERVERS.md`](SERVERS.md) with the supported scope, platform steps and limitations.

### Explicitly not added

- No CONNECT button, auto-reconnect switch or fake ONLINE/OFFLINE/ping/player-count/version data. Minecraft's stable Script API has no networking, server-list, transfer or connection-observation API for world add-ons. `@minecraft/server-admin.transferPlayer` is dedicated-server-only, experimental and unavailable on clients/Realms, so it is not used.
- No clipboard control and no way to open Minecraft's Add Server screen.
- No Microsoft-login, allow-list, anti-cheat or PS5 restriction bypass. PS5 has no Add Server button; SERVER MANAGER cannot change the console UI.

### Changed

- Version bumped to **1.5.0** in `package.json`, both manifests, module versions and the runtime.
- All 1.4.0 HUD, input, armor, effects, totems, waypoints, ESPCHEST, combat, themes, Arabic/English, diagnostics and settings behavior is preserved. Settings codes remain `ATLAS2-...` with legacy `ATLAS1-...` import; server data is stored separately.

### Verification

- `npm run typecheck` — passed.
- `npm test` — 16 tests passed, including 271 mocked form flows.
- `npm run build` — produced a 48-file `ATLAS.mcaddon` (78.5 KiB).
- `npm run validate` — passed 6 checks, including every JSON file, manifests, UUIDs, textures, imports and ZIP contents.
- **Not tested inside Minecraft, on iPhone, on PS5 or on any public server.** See [`TEST_REPORT.md`](TEST_REPORT.md).

---

## 1.4.0 — full-testing release

### Added

- Complete main-menu sections: **HOME, ESPCHEST, HUD, VISUAL, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS, TOTEMS, COMBAT, WAYPOINTS, SETTINGS, DIAGNOSTICS, ABOUT**.
- **ESPCHEST** container log: records only containers the player actually opens, with type, dimension, coordinates, distance and direction. Deduplicates the same block, keeps 20 entries per player, and supports remove/clear. It is not a wall scanner and does not read contents.
- HOME summary and quick controls, PLAYER status, MOVEMENT input state, ARMOR detail and threshold, ITEMS hands/totems, POTIONS effect list and TOTEMS counter.
- Offhand item information for the ITEMS screen.
- Validator now parses every JSON file in both packs.
- Tests for all 15 menu sections, command/event registration counts, duplicate menu protection, container dedupe/remove/clear, per-section controls and the armor threshold modal.

### Fixed

- ITEMS now shows `Not available` instead of `Empty` when the equippable API cannot be read.
- Container detail no longer fails when the view-direction API is unavailable; distance and cardinal direction remain real.
- Removed a non-container block from the recognized container list.

### Changed

- Internal section titles now use the requested names: **Combat** and **Waypoints** (the existing PvP/Utilities screens and behavior are preserved).
- Version bumped to **1.4.0** in both manifests, modules, dependencies, `package.json` and the runtime.

### Compatibility

- Settings codes remain `ATLAS2-...`; legacy `ATLAS1-...` and older `ATLAS2` codes still import.
- Existing HUD, input, armor, effects, totems, waypoints, combat, themes, Arabic/English, diagnostics and import/export behavior is preserved.
- No experiments, no new pack UUIDs, no beta APIs.

### Verification

- `npm run typecheck` — passed.
- `npm test` — 14 tests passed, including 198 mocked form flows.
- `npm run build` — produced a 45-file `ATLAS.mcaddon` (67.9 KiB).
- `npm run validate` — passed 6 checks, including every JSON file, manifests, UUIDs, textures, imports and ZIP contents.
- **Not tested inside Minecraft, on iPhone, on PS5 or on Mega10.** See [`TEST_REPORT.md`](TEST_REPORT.md).

---

## 1.3.0 — development release

### Added

- **Session timer HUD element** (`hud.session`). It measures real time since the player joined and resets on leave/rejoin. It is opt-in so older settings codes keep their layout.
- **Home summary** in the main menu: player name, world day and online player count where available.
- **Session duration** in Diagnostics, separate from server ticks.
- **HUD editor coverage** for the session timer and the Visual/PvP action-bar elements.
- **Technical audit**, installation guide, troubleshooting guide and known-limitations document.

### Changed

- Optional player/world reads are guarded independently. A missing health, view, dimension, world-time, difficulty, player-count, level or game-mode API now hides only that element instead of blanking the HUD.
- Health is no longer shown as `0/20` when the health component cannot be read.
- Totem counts rebuild on inventory changes, coalescing bursts within a 5-tick window.
- Diagnostics now labels `system.currentTick` as server ticks.
- Version bumped to **1.3.0** in both manifests, modules, dependencies, `package.json` and the runtime.

### Compatibility

- Settings codes remain `ATLAS2-...`. The new toggle is appended to the existing bit layout; older ATLAS2 codes import with it off.
- Legacy `ATLAS1-...` codes still import the original 20 toggles.
- No experiments, no beta APIs, no new pack UUIDs.
- Existing HUD, armor, effects, waypoints, combat, themes, Arabic/English and settings features are preserved.

### Verification

- `npm run typecheck` — passed.
- `npm test` — 13 tests passed, including 85 mocked form flows.
- `npm run build` — produced a 42-file `ATLAS.mcaddon` (58.9 KiB).
- `npm run validate` — passed manifest, UUID, texture, language, import and archive checks.
- **Not tested inside Minecraft, on iPhone, on PS5, on Mega10 or with a real Bedrock client.** See [`TEST_REPORT.md`](TEST_REPORT.md).

---

## 1.2.0

### Fixed

- Moved `metadata` to the manifest root and added `product_type: "addon"`.
- Added `pack_scope: "world"` to the Resource Pack.
- Corrected the item texture schema and moved icons under `textures/atlas/common/`.
- Removed the unsupported `ar_SA` locale entry; Arabic remains an in-add-on language.
- Updated the item format to `1.26.60`.
- Made every event subscription independent so one unavailable event cannot stop the command/menu.
- Guarded locator-bar access and deferred world storage access until `worldLoad`.
- Added one startup confirmation per player/version and stage logs.
- Bumped the pack version so Minecraft replaces cached older packs.

### Added

- Startup fingerprint and Content Log diagnostics.
- iPhone, PS5 and public-server test checklists.
- Automated leave/rejoin settings reload and legacy `ATLAS1` import tests.
- Version consistency checks in the validator.

---

## 1.1.0

### Added

- WASD movement panel from the official movement vector.
- Observed CPS counter and LMB/RMB action indicators.
- Armor HUD with real durability, percentages and per-piece toggles.
- Potion effects HUD and totem counter.
- Low-durability alert with threshold and optional sound.
- HUD editor with panel toggles, accent colour, threshold and reset.
- `ATLAS2` settings codes; legacy `ATLAS1` import retained.

---

## 1.0.0

### Added

- Initial single-file ATLAS CLIENT add-on.
- Action-bar HUD: coordinates, health, name, world day/time, dimension, compass and tracked waypoint.
- Waypoints with create/rename/move/delete/track, world storage and a 30-item limit.
- Official locator-bar markers.
- Low-health alert, automatic death point and persisted kills/deaths/K/D.
- Four themes, English/Arabic, settings code export/import, diagnostics.
- ATLAS item and no-cheats `/atlas:menu` entry points.
