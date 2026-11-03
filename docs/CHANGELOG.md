# Changelog

All notable changes to ATLAS CLIENT are recorded here. The archive is a single `ATLAS.mcaddon` containing the Behavior Pack and Resource Pack.

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
