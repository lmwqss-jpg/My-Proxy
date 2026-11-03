# ATLAS CLIENT — Known Limitations

**Version:** 1.3.0
**Platform:** Minecraft Bedrock 26.60 / `1.26.60`+
**Status:** automated checks pass; in-game, iPhone, PS5 and public-server behaviour are not verified for this build.

This document separates **unsupported by the official platform**, **implemented with a narrower scope**, and **not yet tested**.

---

## 1. Unsupported by the Bedrock Script API

| Request | Why it cannot be done | What ATLAS does instead |
|---|---|---|
| Clickable icon at the top-right | Add-ons cannot create native HUD widgets or intercept their taps | ATLAS item + `/atlas:menu` |
| ESC opens the menu | Add-ons cannot read keyboard input or the pause menu | Item and custom command |
| Replace or modify Ore UI / native pause menu | Ore UI is not exposed to ordinary add-ons | Native Bedrock forms, separate from the pause menu |
| Multi-line HUD with free positioning | The only persistent text surface is the action bar | One colour-coded action-bar line with per-element toggles |
| Per-element position, font size, transparency | Not exposed by the Script API | Compact/detailed text, accent colours, per-element toggles |
| Armor/item icons in the HUD | The action bar is text-only | H/C/L/B labels with real durability and percentages |
| Vertical armour position / top-right armour HUD | No layout API | Armor text in the action-bar line, per-piece toggles |
| Raw keyboard, mouse or controller button stream | Not exposed to add-ons | WASD from the movement vector; CPS/LMB/RMB from game action events |
| Counting clicks into empty air | The game does not report them | CPS counts only attacks, interactions and item uses |
| Reading all stored tool durability | Only equipped armor and the held item are exposed | Low-durability monitoring is scoped to those items |
| Clipboard copy | Add-ons have no clipboard access | Settings code can be sent to chat or written down |
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
- **Locator bar.** Uses Minecraft's official locator bar. It can be hidden by the world's player-waypoint setting or unsupported on a client.
- **Totem counter.** Main inventory plus offhand only; shulker boxes and other containers are not scanned.
- **Session timer.** Starts when the player is first seen by the script in the current session; it is not a persisted play-time statistic.

---

## 3. Not tested in this build

The following are **unverified**, not proven working:

- Importing `ATLAS.mcaddon` into Minecraft on iPhone, iPad, Android, Windows, PS5 or a console.
- Activating both packs in a real client world.
- Rendering of native Bedrock forms, titles, action-bar text and locator markers.
- Touch and controller navigation.
- Real WASD movement vectors, attack/interact events and CPS values.
- Real armor, effect and totem updates in a live world.
- Arabic glyph shaping and right-to-left layout in the Bedrock form font.
- Item icon in the hotbar/inventory and form button icons.
- Settings persistence after a real **Save & Quit** and world reopen.
- Entering an `ATLAS1`/`ATLAS2` code on a device keyboard.
- Opening the menu from the item or `/atlas:menu` on PS5.
- PS5 local import, or joining a packed world/Realm from PS5.
- Bedrock Arab import workflow.
- Mega10 or any public server.
- Performance with many players, long HUD lines or slow devices.
- Minecraft versions other than 26.60.

The BDS evidence recorded for 1.2.0 proved script startup and event registration on a server runtime. It did not render a player UI and is not repeated for 1.3.0 in this environment.

---

## 4. Explicitly not included

ATLAS CLIENT does not contain and will not add:

- X-ray, ESP through walls or chest/content scanning.
- Aimbot, kill aura or automated attacks.
- Auto Clicker or simulated input.
- Bypasses for server anti-cheat, command permissions, locator restrictions or dynamic-property restrictions.

These are not “missing features”; they conflict with the official API and the project's stated scope.

---

## 5. Platform statements

- **PS5:** primary target for development, but **not tested**. The code does not use device-specific input APIs. Whether PS5 can import a local file or join a packed world is unknown.
- **iPhone:** supported target, not tested for 1.3.0. Touch item use and Arabic shaping need a device check.
- **Public servers:** the pack is world-bound. If the server does not contain and allow it, no feature runs.
- **Mega10:** not tested. No compatibility is claimed.

For the exact device steps, use [`DEVICE_TESTING.md`](DEVICE_TESTING.md). For the automated evidence, use [`TEST_REPORT.md`](TEST_REPORT.md).
