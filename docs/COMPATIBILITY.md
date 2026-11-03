# ATLAS CLIENT 1.6.0 — Universal Compatibility

**Version:** 1.6.0
**Target:** Minecraft Bedrock 26.60 / `[1, 26, 60]`
**Script modules:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`
**Experiments:** none

This document describes the **ATLAS UNIVERSAL COMPATIBILITY ENGINE**, the
per-feature compatibility manager and what ATLAS can and cannot do when the
world is opened as a local world, Realm, private server, public server or
dedicated server.

> Automated and mocked checks pass for 1.6.0. **No 1.6.0 test was performed on
> iPhone, PS5, a Realm, Mega10, a public server or inside a real Minecraft
> client.** The tables below separate what was exercised in the harness from
> what still needs a device check.

---

## 1. Status meanings

| Status | Meaning |
|---|---|
| `WORKING` | A real operation succeeded in this script session: a form opened, the action bar was set, data was stored, a container was recorded. |
| `LIMITED` | The feature works, but its supported scope is narrower than the original request, or an optional API is missing. |
| `READY` | The required APIs were found, but that feature has not run since the last probe. |
| `UNAVAILABLE` | A required API is missing in this environment. The rest of the client keeps running. |
| `ERROR` | The last operation failed and no later success was recorded for that feature. |
| `NOT TESTED` | No player/session has been probed, so neither success nor failure is claimed. |

`WORKING` is never assigned from a static declaration. It requires a successful
operation recorded by the engine. `NOT TESTED` is never counted as a success.
The DIAGNOSTICS screen shows the same states the report uses.

---

## 2. Lifecycle and reinitialization

| Signal | What ATLAS does |
|---|---|
| Script module load | Probes module/API presence only. Reads no world or player storage. |
| `worldLoad` | Proves world APIs by calling them, clears stale player state, re-syncs locators and rebuilds the HUD. Counts one reinitialization. |
| Deferred fallback (40 ticks) | If `worldLoad` never arrived, probes world APIs once. |
| `playerSpawn` (initial) | Probes that player's APIs, reads settings, restores the menu item, starts the session timer and HUD. |
| `playerSpawn` (respawn) | Re-probes the player, clears the low-health episode, keeps settings, waypoints and the container log. |
| `playerLeave` | Deletes that player's cached settings, combat, container, server, input, HUD, locator and compatibility state. |
| Dimension change | Re-probes player APIs, updates locator markers and the HUD. No settings are reset. |
| `DIAGNOSTICS → Refresh compatibility` | Re-probes world and player APIs and refreshes the last-check tick. |

Event registration is guarded: calling `initEvents()`, `startHud()` or
`initCompatibilityEngine()` again does not add a second listener, tick loop or
command. The harness asserts that a second `worldLoad` plus a respawn leaves all
listener and command counts unchanged.

Minecraft does not expose a server identity, IP or connection-state API to world
add-ons. ATLAS therefore detects a **new environment** through `worldLoad`,
player join/respawn and dimension changes, not by pretending to know which
server it is on.

---

## 3. Feature compatibility matrix

`Required APIs` are checked before a feature is called. `Optional` APIs only
degrade that feature.

| Feature | Required APIs | Optional | Known scope | Harness |
|---|---|---|---|---|
| Menu entry | native forms | item-use event, script event, command | item or command; no overlay or ESC | PASS |
| `/atlas:menu` | custom command registry | — | unavailable before startup or on a client without custom commands | PASS |
| HOME | forms, player session | — | live values only | PASS |
| ESPCHEST | block-interaction event, player dynamic properties | — | only containers actually opened | PASS |
| HUD | action bar, player session | — | one action-bar line; no free positioning | PASS |
| VISUAL | forms, action bar, player session | locator bar | locator can be hidden by the world setting | PASS |
| PLAYER | forms, player session | health, view, game mode, world clock | missing values are omitted | PASS |
| MOVEMENT | forms, player session, movement vector | — | movement intent, not physical keys | PASS |
| ARMOR | forms, player session, equippable | — | equipped armor only | PASS |
| ITEMS | forms, player session, equippable, inventory | — | main hand, offhand and totem count | PASS |
| POTIONS | forms, player session, effects | — | active effects only | PASS |
| TOTEMS | forms, player session, inventory | — | main inventory plus offhand | PASS |
| COMBAT | forms, player session, damage events, player storage | — | only game-reported deaths/hurt | PASS |
| WAYPOINTS | forms, player session, world storage | locator bar | 30 world-shared waypoints | PASS |
| SERVER MANAGER | forms, modal forms, player session, player storage | — | address book only; no connection | PASS |
| SETTINGS | forms, modal forms, player session, player storage | world storage | `ATLAS2`, legacy `ATLAS1` | PASS |
| DIAGNOSTICS | forms, player session, engine | — | statuses describe this session only | PASS |
| ABOUT | forms, player session | — | version and limits | PASS |

The same row is shown in-game under **Settings → Diagnostics**. If a required
API is missing, only that feature reports `UNAVAILABLE`; the menu, HUD and other
features keep working.

---

## 4. Server environments

ATLAS is a **world-bound Behavior Pack**. It runs only where the world/server
already has the pack installed and active. It cannot inject itself into a
server from a player's device.

| Environment | What can work when the pack is active | What may be blocked | Tested in 1.6.0 |
|---|---|---|---|
| Local world | All feature categories | nothing by ATLAS | Harness only |
| Realm | HUD, settings, waypoints, container log, diagnostics | custom command, dynamic properties, locator bar, add-on policy | NOT TESTED |
| Private server | Same as local, depending on server policy | storage, commands, event availability | NOT TESTED |
| Public server | Only features the server allows | custom packs, `/atlas:menu`, storage, locator, combat events | NOT TESTED |
| Dedicated Bedrock Server | Same script runtime as BDS 1.26.60.6 | per-world pack activation, server settings | NOT TESTED for 1.6.0 |
| Cross-platform | Same features once the world has the pack | device UI differences, controller/touch behavior | NOT TESTED |
| Mega10 / other named servers | No special integration | no bypass of rules, anti-cheat or login | NOT TESTED |

What ATLAS never does: bypass Microsoft login, bypass allow-lists or server
protections, create a network connection, change the game's server, read hidden
containers, simulate clicks/attacks, or claim an ONLINE/OFFLINE state it cannot
observe.

On a server that blocks a specific API, DIAGNOSTICS reports that capability as
`UNAVAILABLE` and the corresponding feature as `UNAVAILABLE`/`LIMITED`. That is
a real environment result, not a compatibility claim.

---

## 5. Diagnostics export

1. Open `/atlas:menu` or use the ATLAS item.
2. Open **Settings → Diagnostics**.
3. Read the per-feature status, API list, reinitialization count and error
   counters.
4. Choose **EXPORT DIAGNOSTICS**.
5. Review the report in the form, then choose **Send report to chat**.

The report is sent in short chat chunks because add-ons have no clipboard
access. It contains the add-on/API versions, script-session statistics,
feature statuses, API availability, stored-data counts and bounded error
messages. It does not read passwords, tokens, server credentials or Microsoft
account data.

---

## 6. Remaining limits

- No server identity, IP, ping, player count, version or connection state is
  exposed by the stable Script API.
- HUD is one action-bar line. Top-right placement, free positioning, font
  size, opacity, item icons and vertical armor position are not available.
- WASD is the movement vector. CPS/LMB/RMB only count actions the game reports;
  clicks into empty air are not observable.
- ESPCHEST records opened containers, never hidden containers or contents.
- Public-server anti-cheat and pack restrictions apply. ATLAS contains no
  X-ray, ESP, aimbot, auto-clicker or combat automation.
- No 1.6.0 device, console, Realm or public-server test was performed. Treat
  the harness statuses as development evidence only.
