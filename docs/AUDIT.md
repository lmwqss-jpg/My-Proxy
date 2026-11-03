# ATLAS CLIENT — Technical Audit (1.3.0)

**Repository:** `lmwqss-jpg/My-Proxy`
**Audited version:** 1.2.0 working tree, before the 1.3.0 changes
**Delivered version:** 1.3.0
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
src/ATLAS/BP/scripts/hud.js       HUD loop, alerts, live snapshot
src/ATLAS/BP/scripts/hudData.js   armor, effects, totems
src/ATLAS/BP/scripts/hudFormat.js pure action-bar text composition
src/ATLAS/BP/scripts/input.js     movement vector, observed CPS/LMB/RMB
src/ATLAS/BP/scripts/store.js     dynamic-property persistence
src/ATLAS/BP/scripts/settings.js  validation and ATLAS2/ATLAS1 codes
src/ATLAS/BP/scripts/waypoints.js waypoint model and 30-item limit
src/ATLAS/BP/scripts/locator.js   official locator-bar markers
src/ATLAS/BP/scripts/ui/          native ActionForm/ModalForm screens
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
8. **UI.** All menus are native Bedrock forms. There is no Ore UI modification, no clickable HUD widget and no ESC capture.
9. **Entry points.** The ATLAS item (`atlas:client_token`) and `/atlas:menu` (permission `Any`, `cheatsRequired: false`). `/scriptevent atlas:menu` remains an optional cheats-only fallback.

---

## 3. Feature inventory after 1.3.0

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

## 5. 1.3.0 changes and rationale

1. **Session information** — the HUD previously showed only server/diagnostic ticks. A real per-player session timer is now available as an opt-in `hud.session` element. It resets on leave/rejoin and is separate from world uptime.
2. **Honest degradation** — optional reads (health, view direction, dimension, world day/time, difficulty, player count, level, game mode) are wrapped individually. If one API is unavailable, only its element disappears. The HUD no longer renders a fabricated `0/20` health value or a fake north compass when the data is missing.
3. **Faster totem refresh** — inventory-change events request a HUD rebuild at most once per 5 ticks, so the totem count does not wait for a 40-tick interval but bursts of drag/transfer events cannot force a rebuild every tick.
4. **HUD editor coverage** — the session timer and the Visual/PvP action-bar elements are reachable from the same editor as the live panels.
5. **Diagnostics** — shows the actual player session duration and labels `system.currentTick` correctly as server ticks.
6. **Home summary** — the main menu shows the player name, world day and online count where available.
7. **Compatibility** — the new toggle is appended to the existing ATLAS2 bit layout. Old ATLAS2 and ATLAS1 codes still import; new toggles stay off because their previous bit value was zero.
8. **Documentation** — installation, troubleshooting, changelog, limitations and this audit are now separate maintained documents.

No working feature was removed, and no unsupported feature was added.

---

## 6. Unsupported by the official platform

The following remain impossible for an ordinary Bedrock add-on and are documented instead of imitated:

- Clickable top-right HUD icon or arbitrary HUD layout.
- ESC interception or replacing the native pause menu.
- Ore UI / native form background modification.
- Per-element font size, transparency or position.
- Item icons inside the action bar.
- Raw keyboard, mouse or controller button streams.
- Counting clicks that the game does not report (for example clicks into empty air).
- Reading all stored tools for durability (only equipped armor and the held item are visible).
- X-ray, ESP through walls, aimbot, auto-clicker or combat automation.

PS5 compatibility is not claimed. The code is device-independent, but local import, controller navigation, Arabic shaping and real rendering were not exercised on a PS5.
