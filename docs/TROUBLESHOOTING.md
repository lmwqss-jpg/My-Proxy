# ATLAS CLIENT — Troubleshooting

**Version:** 1.9.0
**Log prefix:** `[ATLAS]`
**First check:** Minecraft is 26.60 / `1.26.60` or newer and the Behavior Pack is active in the world.

> Automated tests cannot prove that a device imported the pack. Use the Content Log and the exact messages below.

---

## 1. Turn on Content Log

1. Open **Settings → Creator**.
2. Enable **Content Log GUI** (or enable the content log in the launcher/console).
3. Enter the world.
4. Look for these lines, in order:

```text
[ATLAS] Scripts loaded: v1.9.0 | target Minecraft 1.26.60 | server 2.11.0 | ui 2.3.0
[ATLAS] Event handlers registered: 10.
[ATLAS] HUD tick loop started.
[ATLAS] Custom command /atlas:menu registered (no cheats required); chat alias /menu.
[ATLAS] Custom command /atlas:atlas registered (no cheats required); chat alias /atlas.
[ATLAS] Boot sequence complete. Waiting for world load.
[ATLAS] World loaded; storage, locators and HUD initialized.
```

If the first line never appears, the script module did not load. Check the pack activation and the API versions before testing any feature.

---

## 2. The archive does not import / no packs appear

| Check | What to do |
|---|---|
| Game version | Update to 26.60 or newer. The manifest requires `min_engine_version [1, 26, 60]`. |
| Correct file | Use `ATLAS_CLIENT.mcaddon` from the project root or release. Do not rename a ZIP by hand. |
| Archive shape | `ATLAS_BP/manifest.json` and `ATLAS_RP/manifest.json` must be at the roots, not inside an extra folder. Run `npm run validate`. |
| Duplicate UUID | Remove older ATLAS packs with the same UUID, then import 1.9.0 again. |
| Device import | On PS5, local file import may not exist. Joining a world/Realm that already has the packs is the only alternative, and it is unverified. |
| Bedrock Arab | The Bedrock Arab import workflow was not tested. A file picker accepting the file is not proof of a successful import. |

---

## 3. Packs appear but nothing happens in-game

1. Verify **both** packs are active in the world. The Behavior Pack must be active; the Resource Pack alone cannot run scripts.
2. Check that no experiment is required. ATLAS uses stable APIs only.
3. Confirm the item is in the inventory, or type `/atlas` (or `/atlas:menu`).
4. Check the Content Log for `[ATLAS] Scripts loaded` and the two command-registration lines.
5. If the item is missing, open **Waypoints → Restore ATLAS item** or use `/atlas` / `/atlas:menu`.
6. If the item and commands both fail, the Behavior Pack or its script module did not load. Send the first `[ATLAS]` or `[Scripting]` error line from the Content Log.

### “Scripts v1.9.0 are running” does not appear

- The player already received that announcement for version 1.9.0. It is shown once per player/version.
- The world may still have an older pack active. Remove the old packs and activate 1.9.0.
- If no `[ATLAS]` log lines exist, the script module did not start.

### `/atlas` or `/atlas:menu` is missing

This is the failure reported in 1.6.0. Its root cause was that Bedrock **requires a namespace** in a custom command name, and 1.6.0 registered only `atlas:menu`; `/atlas` was never a registered name. 1.7.0+ registers `atlas:atlas` as well, which Bedrock exposes as `/atlas` (plus `/atlas:atlas`). `atlas:menu` also exposes `/menu`.

If the command is still missing in 1.9.0, check these causes in order:

1. **The world does not run ATLAS.** Activate the Behavior Pack in that world/Realm/server. On a public server, the server operator must install and allow the pack; a pack on your phone cannot register commands inside a remote server.
2. **The script did not load.** Look for `[ATLAS] Scripts loaded: v1.9.0` in Content Log. Without it, no command exists.
3. **The startup event did not reach the command registry.** Look for `Custom command registry is unavailable` or `Could not register /atlas`. The ATLAS item and the optional `/scriptevent atlas:menu` remain independent fallbacks.
4. **One name collided with another add-on.** ATLAS registers each name separately; check which `Custom command ... registered` lines appear. `/atlas:menu` remains canonical if `/atlas` is taken.
5. **The server blocks custom commands.** ATLAS cannot override server policy. Use the item if it is available.

Neither `/atlas` nor `/atlas:menu` requires cheats or operator permissions (`permissionLevel: Any`, `cheatsRequired: false`). The optional `/scriptevent atlas:menu` **does** require cheats and is not a replacement for the custom commands.

**Diagnostics:** open **Settings → Diagnostics**. The Commands line lists the names the game accepted. **EXPORT DIAGNOSTICS** includes an `Entry points:` line. If it says `not registered` while the script log is present, the command registry did not accept the names on that server build.

---

## 4. HUD problems

### No HUD line

- All HUD elements may be off. Open **HUD → Enable all HUD elements**.
- The action bar can be covered by another add-on or by a full-screen screen. Close chat, pause menus and other forms.
- Check that the Behavior Pack is running (`[ATLAS] HUD tick loop started`).
- On some screens the native action bar is hidden by Minecraft itself; the add-on cannot draw over the pause menu.

### Coordinates, health or compass missing

1.9.0 hides an element when the API cannot provide a real value. It does not show `0/20`, `null` or a fake north. If all three are missing while other elements remain, check the Content Log for an API error. In normal survival play these values come from `Player`, `minecraft:health` and `getViewDirection()`.

### WASD does not light up

WASD reflects `Player.inputInfo.getMovementVector()`. Move with the left stick, touch controls or keyboard. Standing still is not a key press. If the API is unavailable, the HUD shows `WASD --` rather than inventing a direction.

### CPS stays at 0

CPS counts **game-reported actions**: attacks on entities/blocks, block/entity interactions and item uses in the last 20 ticks. Clicking empty air is not exposed by the API. CPS 0 after only empty-air clicks is expected.

LMB/RMB are action indicators, not physical mouse-button states. On PS5 they follow the game's attack/interact actions.

### Armor icons or vertical position

Unsupported. The action bar renders text only, so ATLAS uses H and C L B labels with real durability and percentages. There is no fake icon or position control.

### Armor shows `--`

The slot is empty, or the item has no readable `minecraft:durability` component. ATLAS does not invent a value.

### Totem count does not change

- Totems in the main inventory and offhand are counted. Shulker boxes and other containers are not scanned.
- Inventory changes force an immediate HUD rebuild in 1.9.0. If the count still looks wrong, rejoin and check again.
- On servers that block inventory access, the counter hides rather than showing a false zero.

### Potion durations look wrong

Durations are real ticks from `Player.getEffects()`. Infinite effects show `∞`. A server can change or remove effects; the HUD follows the API result. If effects cannot be read, the panel is hidden.

### ESPCHEST shows nothing

- ESPCHEST records only containers you actually open/interact with. Opening a chest, barrel, shulker box, furnace, hopper, dropper, dispenser, brewing stand, crafter or decorated pot adds an entry.
- No entry means no container interaction has been recorded for this player yet.
- It does not scan through walls, unloaded chunks or hidden containers. That limit is intentional, not a bug.
- If the log cannot be saved, ATLAS reports a storage error; the screen never invents entries.

### A section is missing from the menu

- The installed pack may still be 1.6.0 or older. Import 1.9.0, remove the old pack from the world, and reactivate it.
- Check `Scripts v1.9.0 are running` in chat or `[ATLAS] Scripts loaded: v1.9.0` in Content Log.
- The 1.9.0 menu is: HOME, HUD, VISUAL, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS, TOTEMS, COMBAT, WAYPOINTS, ESPCHEST, SERVER MANAGER, SETTINGS, DIAGNOSTICS, ABOUT.

### Low-durability alert repeats or does not fire

- Only equipped armor and the held item are monitored. Tools stored in the inventory are not scanned.
- The alert fires once per low episode per item. Re-equipping the same low item can count as a new episode.
- Check **HUD editor → Low durability alert** and the threshold (5–90%).

---

## 4A. Diagnostics and compatibility status

Open **Settings → Diagnostics**. It reads the current session, not a cached text file.

| Status | What it means | What to do |
|---|---|---|
| `WORKING` | A real operation succeeded in this session | none |
| `LIMITED` | It works with a documented scope or a missing optional API | read the parenthesised reason |
| `READY` | Required APIs exist, but the feature has not run yet | open the section and use it once |
| `UNAVAILABLE` | A required API is missing in this environment | check the listed API and server rules; other features should still work |
| `ERROR` | The last operation failed | read the last error, rejoin, then retry |
| `NOT TESTED` | No player/session was probed | join the world, or tap **Refresh compatibility** |

**EXPORT DIAGNOSTICS** shows the full report and can send it to chat in a few messages. Add-ons cannot use the clipboard, so this is the supported copy path. The report contains no passwords, tokens, server credentials or Microsoft account data.

If the engine counters keep increasing after a rejoin, or a section stays `UNAVAILABLE` while the rest works, copy the report before changing the world. The `API unavailable` and `Recent errors` lines are the useful evidence.

---

## 5. Settings and persistence

### Settings reset after reopening the world

- Leave with **Save & Quit**, not by force-closing the app.
- Some servers block dynamic properties or reset worlds. In that environment settings cannot persist.
- Settings are per player and per world; a different world has different settings.

### Imported settings code is rejected

- Use an `ATLAS2-...` code from 1.1.0 or newer, or a legacy `ATLAS1-...` code.
- The code must be copied exactly, including all characters and line breaks removed.
- Tampered or truncated codes are rejected intentionally.
- Old codes do not contain newer panel toggles; those keep their defaults.

### Clipboard

Bedrock add-ons have no clipboard access. Use **Send code to chat** for settings or server addresses, or write them down.

### SERVER MANAGER

- **No CONNECT button is intentional.** Minecraft's stable Script API has no networking, server-list or transfer API. SERVER MANAGER is a validated address book with manual steps.
- **Status is always Unknown.** The add-on cannot observe connections, ping a server or read its version/player count, so it does not invent ONLINE/OFFLINE data.
- **No auto-reconnect.** The game owns the connection; there is no connection event to observe.
- **The address is rejected.** Remove `http://`, spaces and paths; put the port in the port field. IPv6 is not accepted in 1.9.0.
- **“Already saved”.** The same host and port exist; edit the existing entry instead of adding a duplicate.
- **No Add Server on PS5.** PlayStation Minecraft does not provide that button. ATLAS cannot add or bypass it; do not claim PS5 custom-server compatibility.
- **Connection guide shows the host/port but does nothing else.** Open Minecraft's Play → Servers → Add Server screen yourself (on platforms that have it).

### Legacy ATLAS1 code

Old codes restore the original 20 toggles, theme, language, interval and thresholds. Newer panels keep their defaults; the new HUD session timer stays off. Exporting again produces `ATLAS2-...`.

---

## 6. Arabic text

Arabic is selected inside ATLAS: **Settings → Language → العربية**. Bedrock does not have an Arabic game locale, so there is no `ar_SA` game language file. Form text is shaped by Minecraft's own font engine. If a specific string looks wrong on a device, record the screen and the exact string; source-level Arabic being correct does not prove the client renders it correctly.

---

## 7. PS5

- No PS5 import or gameplay test has been performed.
- If local import is unavailable, use a world/Realm that already has both packs active.
- Controller navigation uses native Bedrock forms.
- WASD follows the left-stick movement vector; there is no physical PS5 button API.
- Arabic shaping and TV readability need a real test.
- Do not report ATLAS as PS5-compatible until the checklist in [`DEVICE_TESTING.md`](DEVICE_TESTING.md) is completed.

---

## 8. Public servers (Mega10 and others)

ATLAS is a world add-on, not a client mod. If the world does not contain and allow the pack:

- no HUD, forms, waypoints, locator markers or settings run;
- `/atlas` and `/atlas:menu` do not exist;
- the player cannot inject the pack from their own device;
- SERVER MANAGER cannot connect to a server.

If the world does contain the pack, the server may still block custom commands, dynamic properties, locator bars or custom packs. ATLAS does not bypass server rules or anti-cheat. Mega10 was not tested.

---

## 9. What to include in a bug report

```text
Device:
Minecraft version:
World / Realm / server:
Pack versions visible in world settings:
Does [ATLAS] Scripts loaded: v1.9.0 appear?
Does `/atlas` open? Which command-registration lines appear?

For a compatibility problem, attach the **EXPORT DIAGNOSTICS** report and the Content Log lines starting with `[ATLAS]` or `[Scripting]`.
Content Log lines starting with [ATLAS] or [Scripting]:
Steps to reproduce:
Expected result:
Actual result:
Screenshot or video:
```

Without the Content Log line, a packaging or API failure cannot be diagnosed reliably.
