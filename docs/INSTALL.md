# ATLAS CLIENT 1.5.0 — Installation Guide

**Required game version:** Minecraft Bedrock 26.60 / `1.26.60` or newer
**Install file:** `ATLAS.mcaddon`
**Inside the archive:** `ATLAS_BP/` (Behavior Pack) and `ATLAS_RP/` (Resource Pack)
**Experiments:** none
**Cheats for `/atlas:menu`:** not required

> **PS5 is the primary target, but PS5 import and gameplay were not tested for this build.**
> The add-on itself is platform-independent and uses stable Script API calls. Do not assume that a PS5 file picker, import or local world installation works until you test it.

---

## 1. Check the archive first (optional)

From the project folder:

```bash
npm ci
npm run check
unzip -l ATLAS.mcaddon
```

`npm run check` runs typecheck, tests, the build and pack validation. `unzip -l` must show:

```text
ATLAS_BP/manifest.json
ATLAS_BP/scripts/main.js
ATLAS_BP/items/atlas_client.json
ATLAS_RP/manifest.json
ATLAS_RP/textures/item_texture.json
```

The manifests must be directly inside `ATLAS_BP/` and `ATLAS_RP/`. Do not unzip and re-zip the file by hand; the importer expects the `.mcaddon` archive.

---

## 2. Install on iPhone / iPad

1. Download `ATLAS.mcaddon` to the **Files** app.
2. Tap the file, choose **Share**, then **Minecraft**. If Minecraft opens directly, the import has started.
3. Wait until Minecraft reports that **both** packs were imported:
   - **ATLAS CLIENT** (Behavior Pack)
   - **ATLAS CLIENT Resources** (Resource Pack)
4. Create a test world or edit an existing one.
5. Open **Add-Ons → Behavior Packs → My Packs**, select **ATLAS CLIENT**, and activate it.
6. Open **Resource Packs → My Packs**, select **ATLAS CLIENT Resources**, and activate it.
7. Leave every experiment disabled.
8. Enter the world.

The Behavior Pack declares a dependency on the Resource Pack, so activating the Behavior Pack normally also pulls in the Resource Pack. Activating both explicitly makes the state visible in the world settings.

### First run

You should see:

- a one-time chat line `ATLAS | Scripts v1.5.0 are running.`
- the ATLAS CLIENT item in your inventory (if there is space)
- a HUD line in the action bar above the hotbar

Open the menu with the item or with:

```text
/atlas:menu
```

`/atlas:menu` has permission level `Any` and does not require cheats. The optional `/scriptevent atlas:menu` does require cheats.

The 1.5.0 menu contains: **HOME, ESPCHEST, HUD, VISUAL, PLAYER, MOVEMENT, ARMOR, ITEMS, POTIONS, TOTEMS, COMBAT, WAYPOINTS, SERVER MANAGER, SETTINGS, DIAGNOSTICS, ABOUT**.

**ESPCHEST** is a log of containers you actually open, not a wall scanner. Opening a chest/barrel/furnace/etc. records its type, position, distance and direction. It never reads hidden contents and does not change the world.

**SERVER MANAGER** is a per-player address book, not a connector. It validates and saves IPv4/domain addresses and ports, supports favourites/order/category/region and a manual current mark, and shows the exact host/port plus the official manual steps. It has no CONNECT button, no fake ONLINE/ping/player-count values and no auto-reconnect. On iPhone/iPad/Android/Windows, use Minecraft's **Servers → Add Server** screen. On PS5 there is no Add Server button; ATLAS cannot add one. See [`SERVERS.md`](SERVERS.md).

---

## 3. Install on Android, Windows or a Bedrock Dedicated Server

### Android

The Files app can usually hand the `.mcaddon` to Minecraft in the same way as on iPhone. Activate both packs in the world settings.

### Windows

Double-click `ATLAS.mcaddon`. Minecraft imports both packs. Then activate them in the world.

### Bedrock Dedicated Server

1. Extract the archive.
2. Copy `ATLAS_BP/` into `behavior_packs/`.
3. Copy `ATLAS_RP/` into `resource_packs/`.
4. Add both to the world's `world_behavior_packs.json` and `world_resource_packs.json`.
5. Restart the server and check the console for `[ATLAS] Scripts loaded: v1.5.0`.

The BDS has no player UI, so the HUD and forms cannot be visually verified there.

---

## 4. PS5 and Bedrock Arab

**No PS5 import or gameplay test was performed for 1.5.0.** The following are the only known paths, and all remain unverified:

1. **Local file import** — if your PS5 build offers a way to open a local `.mcaddon`, use the same activation steps as iPhone. Do not assume this exists.
2. **Join a packed world or Realm** — activate both packs on a world hosted from another device that can import them, then join from PS5. This depends on the world's pack settings and on the server allowing custom packs.
3. **Bedrock Arab workflow** — the specific Bedrock Arab import flow was not tested. A file picker accepting the file does not prove that Minecraft imported or activated both packs.

Before claiming compatibility, verify on the PS5:

- the file imports;
- both packs appear;
- both packs activate;
- the item is available;
- `[ATLAS] Scripts loaded: v1.5.0` appears in the log;
- `/atlas:menu` opens;
- the HUD renders;
- settings survive leaving and rejoining.

Until then, treat PS5 support as **untested**, not as working or broken.

---

## 5. Updating from 1.3.0, 1.2.0, 1.1.0 or 1.0.0

The pack UUIDs are stable, so a higher `header.version` replaces the older installation. The archive is version **1.5.0**.

1. Import the new `ATLAS.mcaddon`.
2. If the old packs remain listed in the world, remove them and add the 1.5.0 packs again.
3. Rejoin and look for `Scripts v1.5.0 are running`.

Settings are stored per player and world. They are kept when the pack version changes. Existing `ATLAS2` and `ATLAS1` settings codes remain importable. Server entries are stored separately from settings and are also kept across pack updates.

---

## 6. Uninstall

- Remove **ATLAS CLIENT** and **ATLAS CLIENT Resources** from the world's pack lists.
- Optionally delete the packs from **My Packs**.
- To remove stored ATLAS data, delete the world or clear the player/world dynamic properties. Removing the pack does not delete the world.

---

## 7. Important installation limits

- The add-on is **world-bound**. Activating it on your iPhone does not add it to someone else's public server.
- A public server such as Mega10 must already contain and allow the pack; otherwise nothing runs.
- The pack cannot modify Ore UI, draw a clickable top-right overlay or capture ESC.
- Arabic is selected inside ATLAS (**Settings → Language**). Bedrock does not provide an Arabic game locale.
- ESPCHEST records only containers the player opens; it cannot detect hidden containers or read contents through walls.
- SERVER MANAGER stores addresses only. It cannot connect, show real server status, auto-reconnect or access the clipboard, and PS5 has no Add Server button.
- `ATLAS.mcaddon` is the only file needed for a normal install. Do not install the Behavior Pack and Resource Pack from separate downloads.
