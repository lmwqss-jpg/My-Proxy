# ATLAS CLIENT — Known Limitations

**Version:** 1.9.0
**Platform:** Minecraft Bedrock 26.60 / `1.26.60`+
**Status:** automated checks pass for 1.9.0. The retained BDS 1.26.60.6 startup/command evidence belongs to 1.8.0; the 1.9.0 player UI, iPhone, PS5, Realm and public-server behaviour are not verified.

This document separates **unsupported by the official platform**, **implemented with a narrower scope**, and **not yet tested**.

---

## 1. Unsupported by the Bedrock Script API

| Request | Why it cannot be done | What ATLAS does instead |
|---|---|---|
| Clickable icon at the top-right | Add-ons cannot create native HUD widgets or intercept their taps | ATLAS item + `/atlas` / `/atlas:menu` |
| ESC opens the menu | Add-ons cannot read keyboard input or the pause menu | Item and custom commands |
| Replace or modify Ore UI / native pause menu | Ore UI is not exposed to ordinary add-ons | Native Bedrock forms, separate from the pause menu |
| Multi-line HUD with free positioning | The only persistent text surface is the action bar | One colour-coded action-bar line with per-element toggles |
| Per-element position, font size, transparency | Not exposed by the Script API | Compact/detailed text, accent colours, per-element toggles |
| Armor/item icons in the HUD | The action bar is text-only | H/C/L/B labels with real durability and percentages |
| Vertical armour position / top-right armour HUD | No layout API | Armor text in the action-bar line, per-piece toggles |
| Raw keyboard, mouse or controller button stream | Not exposed to add-ons | WASD from the movement vector; CPS/LMB/RMB from game action events |
| Counting clicks into empty air | The game does not report them | CPS counts only attacks, interactions and item uses |
| Reading all stored tool durability | Only equipped armor and the held item are exposed | Low-durability monitoring is scoped to those items |
| A command without a namespace (`/atlas` alone) | Bedrock requires `namespace:name` in a registered custom command; an add-on cannot register a bare name | 1.7.0+ registers `atlas:atlas` so Minecraft exposes `/atlas`; `/atlas:menu` and `/menu` remain available. Commands exist only where the pack runs |
| Finding hidden containers or reading their contents through walls | Add-ons cannot scan arbitrary hidden blocks reliably and must not invent container data | **ESPCHEST** logs only containers the player actually opens, with real type/position/dimension/time/distance |
| Clipboard copy | Add-ons have no clipboard access | Settings and server addresses can be sent to chat or written down |
| Connecting to a saved server from the ATLAS UI | The Script API has no networking, server-list or transfer API for world add-ons | SERVER MANAGER stores validated addresses and shows the official manual steps; there is no fake CONNECT button |
| Real server status, ping, version or player count | Add-ons cannot query or observe external servers | Status is shown as **Unknown**; no invented ONLINE/OFFLINE data |
| Automatic reconnection | The game owns the network session and exposes no connection events | No auto-reconnect switch; reconnect from Minecraft's own UI |
| Opening Minecraft's Add Server screen | No API can open or control that screen | The guide names the exact host/port to type |
| PS5 custom-server entry | PlayStation Minecraft has no Add Server button | ATLAS stores the address but cannot change the console UI; PS5 remains unverified |
| Arabic as a game locale | Bedrock has no Arabic game locale | Arabic is selected inside ATLAS; the game font shapes the text |

---

## 2. Implemented with a narrower scope

- **HUD surface.** All elements share the action bar. A very long line may wrap or be truncated on a narrow screen. Turn off unused panels in **HUD → HUD editor**.
- **WASD.** The panel shows movement intent, not physical key events. On a controller it represents the left stick.
- **CPS / LMB / RMB.** These are observed game actions. They are not a raw input stream and do not count empty-air clicks.
- **Low-durability alert.** Equipped armor and the held main-hand item only. Inventory tools are not scanned.
- **Waypoints.** Maximum 30 per world, shared by players in that world. They are not per-player and are not transferred in settings codes.
- **Combat history.** Kills, deaths and the last death are persisted. Damage totals and recent event history are session-only.
- **Themes.** Form text colours, HUD accent and locator colours only; native form backgrounds and Ore UI cannot change.
- **Settings.** Player dynamic properties. Servers that block dynamic properties or reset worlds cannot persist them.
- **SERVER MANAGER.** A per-player address book of up to 40 entries. It validates IPv4/domain names and ports, remembers ordering, favourites, category, region, one manually marked current entry and the last Direct Join target. It does not connect, ping, detect a server or show its status. IPv6 is intentionally not accepted. The region label is organisational only.
- **Locator bar.** Uses Minecraft's official locator bar. It can be hidden by the world's player-waypoint setting or unsupported on a client.
- **Totem counter.** Main inventory plus offhand only; shulker boxes and other containers are not scanned.
- **Session timer.** Starts when the player is first seen by the script in the current session; it is not a persisted play-time statistic.
- **ESPCHEST.** Interaction-based, not a wall scanner. It stores up to 20 containers per player, only when the player opens/interacts with them. It does not read contents or detect containers that were never opened, are unloaded, or are out of reach. The log is cleared by the player and does not modify the world.
- **Status screens.** HOME, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS and TOTEMS show only API values. If a component is unavailable, the row says unavailable or is hidden; no placeholder stat is generated.
- **Compatibility status.** The engine can only observe the environment signals Minecraft exposes: world load, player join/respawn/leave and dimension change. It cannot identify a server, read its IP, ping it, or observe connection state. `WORKING`/`LIMITED` describe this script session after a real operation; `READY` is not a device-certification claim.

---

## 3. Not tested in this build

The following are **unverified**, not proven working:

- Importing `ATLAS_CLIENT.mcaddon` into Minecraft on iPhone, iPad, Android, Windows, PS5 or a console.
- Activating both packs in a real client world.
- Rendering of native Bedrock forms, titles, action-bar text and locator markers.
- Touch and controller navigation.
- Real WASD movement vectors, attack/interact events and CPS values.
- Real armor, effect and totem updates in a live world.
- ESPCHEST recording real chests/barrels and removing/clearing its log in a live world.
- Adding, editing, reordering, favouriting and deleting server entries on a device keyboard.
- Restoring server entries after a real world close/reopen and a player-data reset.
- The connection guide on iPhone, PS5 or any console, including whether that platform offers an Add Server path.
- Rendering and navigation of the HOME, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS and TOTEMS sections.
- Arabic glyph shaping and right-to-left layout in the Bedrock form font.
- Item icon in the hotbar/inventory and form button icons.
- Settings persistence after a real **Save & Quit** and world reopen.
- Per-feature compatibility statuses and the `EXPORT DIAGNOSTICS` chat report on a device.
- Entering an `ATLAS1`/`ATLAS2` code on a device keyboard.
- Opening the menu from the item, `/atlas` or `/atlas:menu` on PS5.
- The `/atlas` chat alias on a real Minecraft client; it is verified only against mock registration so far.
- PS5 local import, joining a packed world/Realm, or adding a custom server (PS5 has no Add Server button).
- Bedrock Arab import workflow.
- Mega10 or any public server.
- Performance with many players, long HUD lines or slow devices.
- Minecraft versions other than 26.60.

BDS 1.26.60.6 was run for 1.8.0 (not re-run for 1.9.0): the pack loaded, scripts started, both commands registered, all four command names resolved, three reloads stayed clean and a short soak had no add-on errors. It did not render a player UI and is not a client or device test.

---

## 4. Explicitly not included

ATLAS CLIENT does not contain and will not add:

- X-ray, ESP through walls, hidden-container scanning or reading container contents through walls. The ESPCHEST section is an interaction log, not an ESP.
- Aimbot, kill aura or automated attacks.
- Auto Clicker or simulated input.
- Bypasses for server anti-cheat, command permissions, locator restrictions or dynamic-property restrictions.

These are not “missing features”; they conflict with the official API and the project's stated scope.

---

## 5. Platform statements

- **PS5:** primary target for development, but **not tested**. The code does not use device-specific input APIs. Whether PS5 can import a local file or join a packed world is unknown. PS5 also lacks Minecraft's Add Server button, so SERVER MANAGER cannot make a custom server joinable there.
- **iPhone:** supported target, not tested for 1.9.0. Touch item use, Arabic shaping and the native Add Server flow need a device check.
- **Public servers:** the pack is world-bound. If the server does not contain and allow it, no feature runs.
- **Mega10:** not tested. No compatibility is claimed.

For the exact device steps, use [`DEVICE_TESTING.md`](DEVICE_TESTING.md). For the engine and environment matrix, use [`COMPATIBILITY.md`](COMPATIBILITY.md). For the automated evidence, use [`TEST_REPORT.md`](TEST_REPORT.md).
