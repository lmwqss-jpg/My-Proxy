# ATLAS CLIENT — Server Manager

**Version:** 1.5.0
**Target:** Minecraft Bedrock 26.60 / `1.26.60`+
**Official APIs:** `@minecraft/server 2.11.0`, `@minecraft/server-ui 2.3.0`

This document explains exactly what **SERVER MANAGER** does, what Minecraft does not allow an add-on to do, and how to connect with the saved address on each platform.

---

## 1. What it is

SERVER MANAGER is a **validated, persistent server address book** inside `/atlas:menu`.

It stores the details you type, keeps your order, favourites, category and region, and shows the exact host and port to enter in Minecraft's own server screen. It does **not** open a network connection, join a world or change the game's current server. No CONNECT button is shown because a button that cannot connect would be fake.

| Works in ATLAS | Does not work, and why |
|---|---|
| Add, edit and delete servers | Start a connection to a server (no networking API) |
| Validate IPv4/domain and port 1–65535 | Read Minecraft's server list or current server |
| Save up to 40 entries per player | Show real ONLINE/OFFLINE state, ping, version or player count |
| Reorder, favourite, categorise and set a region label | Auto-reconnect or transfer the player (game-owned) |
| Remember the last Direct Join address | Copy to the clipboard (no clipboard API) |
| Mark one entry as “current” manually, with a timestamp | Detect that you actually joined that server |
| Show the official `Play → Servers → Add Server` steps | Open that screen or press its buttons for you |
| Send the address to chat for manual copying | Bypass Microsoft sign-in, server protection or PS5 restrictions |

The region (EU, ASIA, NA, SA, ME, OTHER) is only a label for organising your list. It does not change the server's region or route your connection.

---

## 2. Official API evidence

Checked against the installed `@minecraft/server 2.11.0` and `@minecraft/server-ui 2.3.0` definitions:

- There is no `fetch`, socket, WebSocket, HTTP, server-list, join or transfer API in `@minecraft/server`.
- `Player.clientSystemInfo` describes the **device**, not the server. `SystemInfo` only exposes `memoryTier`.
- Forms can display and collect text, but cannot launch a server or navigate the game menu.
- The only official player-transfer function is `@minecraft/server-admin.transferPlayer`. That module is **Bedrock Dedicated Server only**, experimental, unavailable in Minecraft clients and Realms, and not part of this stable add-on. Using it would require beta APIs and a server-admin environment, so ATLAS does not include it.
- Add-ons have no clipboard access. “Send address to chat” is the supported way to surface the text for manual copying.

This is a platform boundary, not a missing ATLAS feature. A companion smartphone/PC app or a DNS proxy is outside the add-on and is not included or verified.

---

## 3. Entry format and validation

Each saved entry contains:

| Field | Rule |
|---|---|
| Name | Required, 1–32 characters after removing colour codes |
| Address | IPv4 (`203.0.113.10`) or domain (`play.example.com`), lowercase-normalised |
| Port | Integer 1–65535; the Bedrock default is `19132` |
| Description | Optional, up to 80 characters |
| Category | Public, Private, Friends, Realm, Dedicated, Other |
| Region | EU, ASIA, NA, SA, ME, Other (label only) |
| Favourite | Stored boolean |
| Marked current | At most one entry, set manually |
| Last marked | Timestamp written when you mark an entry |

Rejected input:

- `http://` or `https://` in the address, spaces, paths or `@`.
- `host:19132` in the address field — the form asks for the port separately and shows a dedicated message.
- Invalid IPv4 octets, single-label hosts, malformed labels and numeric TLDs.
- Ports outside 1–65535.
- A duplicate address + port, or a blank name.
- More than 40 entries.

There is one deliberate omission: **IPv6 is not accepted**. Bedrock's `Add Server` field and port handling differ between platforms, so 1.5.0 validates IPv4 and domain names only instead of pretending every IPv6 form works.

---

## 4. Storage

- Entries are stored in the **player's dynamic property** `atlas:servers` as JSON.
- The last Direct Join target is stored in `atlas:server_target`.
- Data is per player and follows that player's world data. It is not uploaded anywhere and no network request is made.
- Up to 40 entries are kept. Ordering, favourites, category, region and the manual current mark are saved immediately.
- Deleting an entry removes only the saved record. It does not touch the world, the server or Minecraft's own server list.
- If a world/server blocks or resets dynamic properties, ATLAS cannot persist the list. That limitation is the same one that applies to ATLAS settings and waypoints.

---

## 5. Using the screen

Open `/atlas:menu` → **SERVER MANAGER**.

- **Add server** opens the six-field form (name, address, port, description, category, region). Invalid values reopen the form with a clear message; nothing invalid is saved.
- Selecting a saved server opens its details: real stored host/port, category, region, favourite state, manual current mark, last-marked time, and the connection guide.
- **Mark as current (manual)** records your own choice and time. It does not prove that you joined the server.
- **Move up / Move down** changes the saved order.
- **Delete server** asks for confirmation.
- **Direct join** asks for only address and port, validates both, remembers them and opens the same connection guide.
- **Send address to chat** prints `name | host:port` in chat. Clipboard access is unavailable to add-ons.
- **Connection guide** shows the copyable host/port and the platform steps.

The status line always says **Unknown — add-ons cannot observe connections**. ATLAS deliberately does not display ONLINE, OFFLINE, CONNECTING, player counts, version or ping values it cannot measure. There is no auto-reconnect setting because the game, not the add-on, owns the connection.

---

## 6. Connecting with the saved address

### iPhone, iPad, Android, Windows

1. Open Minecraft's **Play** screen.
2. Choose **Servers** → **Add Server**.
3. Enter the name, address and port saved in ATLAS.
4. Save, then join the server.

### PS5

PlayStation versions of Minecraft Bedrock **do not provide an Add Server button** in the Servers tab. ATLAS cannot add one, change the console menu or bypass this restriction. On PS5 the saved entry is an address book and reference only.

Use only platform-supported paths, such as joining a friend or a Realm you have been invited to. Do not treat ATLAS as proof that a PS5 can connect to a custom server. Third-party DNS/proxy workarounds exist, but they are outside ATLAS, unverified, and the user accepts their own network/security trade-offs.

### Realms, friends and cross-platform worlds

Their addresses are not published to add-ons. ATLAS can store a note, category and region for them, but you join from the Play/Friends/Realms interface. The add-on cannot invite you, accept an invite or read Realm connection details.

### Microsoft sign-in and server protection

Sign in through Minecraft itself. ATLAS does not collect credentials and cannot bypass authentication, allow-lists, anti-cheat, server permissions or region restrictions. A server that rejects custom packs can also block `/atlas:menu`, dynamic properties or the locator bar.

### Custom ports

Any valid port from 1 to 65535 can be saved and shown. Enter the same port in Minecraft's server form. A wrong port is a connection failure in Minecraft, not something ATLAS can detect or repair.

---

## 7. Troubleshooting

| Symptom | Meaning / action |
|---|---|
| “Enter a valid IPv4 address or domain” | Remove `http://`, spaces and paths. Use the port field for the port. |
| “Put the port in the port field” | The address contained `:`; split host and port. |
| “Port must be a number from 1 to 65535” | Use digits only; the Bedrock default is `19132`. |
| “This address and port are already saved” | Edit the existing entry instead of adding a duplicate. |
| “Server limit reached (40)” | Delete an unused entry. |
| List is empty after reinstalling | Entries live in player/world data, not in the `.mcaddon`. A new world/player starts empty. |
| Status is always Unknown | Expected: the Script API cannot observe connections or query servers. |
| Nothing happens after saving | That is intended. Open Minecraft's Play screen and enter the address manually. |

---

## 8. Test status

Covered by automated tests:

- Address/port validation, invalid input rejection and normalisation.
- Add/edit/delete, duplicate rejection, 40-entry limit, ordering, favourites, manual current mark and timestamp.
- Persistence through the player dynamic property and reload after leave/rejoin.
- Direct Join validation, last target persistence and duplicate handling.
- Guide text, missing server handling and the absence of fake connect/status data.
- The rest of the ATLAS menu still opens and settings still persist.

**Not tested:** a real Minecraft client, iPhone, PS5, Realms, Bedrock Arab or any public server. No connection is attempted by the add-on, so “connect success” is not a testable ATLAS result.
