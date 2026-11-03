/**
 * Static pack validation and archive inspection.
 *
 * This checks everything that can be checked without launching Minecraft:
 * manifest shape, UUIDs, module/API versions, entry and import paths, item and
 * texture references, language files, PNG headers, and the final ZIP layout.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BP = path.join(ROOT, "src/ATLAS/BP");
const RP = path.join(ROOT, "src/ATLAS/RP");
const ARTIFACT = path.join(ROOT, "ATLAS.mcaddon");
const TARGET_GAME = [1, 26, 60];
const SERVER_VERSION = "2.11.0";
const SERVER_UI_VERSION = "2.3.0";

const errors = [];
const checks = [];
const fail = (message) => errors.push(message);
const ok = (message) => checks.push(message);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Invalid JSON: ${path.relative(ROOT, file)} (${error.message})`);
    return null;
  }
}

function walk(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, base));
    else if (entry.isFile()) result.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return result;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableVersion(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((n) => Number.isInteger(n) && n >= 0)) {
    fail(`${label} must be a three-integer version array`);
  }
}

function pngInfo(file) {
  try {
    const buffer = fs.readFileSync(file);
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
      fail(`Not a PNG: ${path.relative(ROOT, file)}`);
      return null;
    }
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  } catch (error) {
    fail(`Cannot read PNG ${path.relative(ROOT, file)}: ${error.message}`);
    return null;
  }
}

const bpManifest = readJson(path.join(BP, "manifest.json"));
const rpManifest = readJson(path.join(RP, "manifest.json"));

const allUuids = new Set();
function checkManifest(manifest, label, expectedType) {
  if (!manifest) return;
  if (manifest.format_version !== 2) fail(`${label}: format_version must be 2`);
  if (!manifest.header) return fail(`${label}: missing header`);
  if (!UUID_V4.test(manifest.header.uuid ?? "")) fail(`${label}: invalid header UUID`);
  if (allUuids.has(manifest.header.uuid)) fail(`${label}: duplicate UUID ${manifest.header.uuid}`);
  allUuids.add(manifest.header.uuid);
  stableVersion(manifest.header.version, `${label} header.version`);
  if (JSON.stringify(manifest.header.min_engine_version) !== JSON.stringify(TARGET_GAME)) {
    fail(
      `${label}: min_engine_version must be [${TARGET_GAME.join(", ")}], got ${JSON.stringify(manifest.header.min_engine_version)}`,
    );
  }
  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
    fail(`${label}: no modules`);
    return;
  }
  const types = new Set();
  for (const module of manifest.modules) {
    types.add(module.type);
    if (!UUID_V4.test(module.uuid ?? "")) fail(`${label}: invalid module UUID`);
    if (allUuids.has(module.uuid)) fail(`${label}: duplicate module UUID ${module.uuid}`);
    allUuids.add(module.uuid);
    stableVersion(module.version, `${label} module.version`);
    if (module.type === "script") {
      if (module.language !== "javascript") fail(`${label}: script language must be javascript`);
      if (module.entry !== "scripts/main.js") fail(`${label}: script entry must be scripts/main.js`);
      if (!fs.existsSync(path.join(BP, module.entry))) fail(`${label}: script entry file is missing`);
    }
  }
  if (!types.has(expectedType)) fail(`${label}: missing ${expectedType} module`);
  if (Array.isArray(manifest.capabilities) && manifest.capabilities.includes("experiments")) {
    fail(`${label}: experiments must not be required`);
  }
  if (Array.isArray(manifest.capabilities) && manifest.capabilities.includes("script_eval")) {
    fail(`${label}: script_eval capability is not allowed`);
  }
  if (label === "RP manifest" && !types.has("resources")) fail("RP: missing resources module");
  if (manifest.header.name === undefined || manifest.header.description === undefined) {
    fail(`${label}: missing name/description`);
  }
}

checkManifest(bpManifest, "BP manifest", "data");
if (bpManifest) {
  if (!(bpManifest.modules ?? []).some((m) => m.type === "script")) fail("BP manifest: no script module");
  const dependencies = bpManifest.dependencies ?? [];
  const server = dependencies.find((d) => d.module_name === "@minecraft/server");
  const ui = dependencies.find((d) => d.module_name === "@minecraft/server-ui");
  if (server?.version !== SERVER_VERSION) fail(`BP: expected @minecraft/server ${SERVER_VERSION}`);
  if (ui?.version !== SERVER_UI_VERSION) fail(`BP: expected @minecraft/server-ui ${SERVER_UI_VERSION}`);
  for (const dep of dependencies) {
    if (String(dep.version).includes("beta") || String(dep.version).includes("preview")) {
      fail("BP: beta/preview dependencies are not allowed");
    }
  }
  const rpDependency = dependencies.find((d) => d.uuid);
  if (!rpManifest?.header || rpDependency?.uuid !== rpManifest.header.uuid) {
    fail("BP: dependency on the resource pack UUID is missing or wrong");
  } else if (JSON.stringify(rpDependency.version) !== JSON.stringify(rpManifest.header.version)) {
    fail("BP: resource-pack dependency version does not match");
  }
}
checkManifest(rpManifest, "RP manifest", "resources");
if (rpManifest) {
  const bpDependency = (rpManifest.dependencies ?? []).find((d) => d.uuid);
  if (!bpManifest?.header || bpDependency?.uuid !== bpManifest.header.uuid) {
    fail("RP: dependency on the behavior pack UUID is missing or wrong");
  } else if (JSON.stringify(bpDependency.version) !== JSON.stringify(bpManifest.header.version)) {
    fail("RP: behavior-pack dependency version does not match");
  }
}
ok(`manifests parsed, ${allUuids.size} unique UUIDs`);

// Item definition and texture wiring.
const itemFile = path.join(BP, "items/atlas_client.json");
const item = readJson(itemFile);
const itemId = item?.["minecraft:item"]?.description?.identifier;
if (itemId !== "atlas:client_token") fail(`item identifier must be atlas:client_token, got ${itemId}`);
const iconKey = item?.["minecraft:item"]?.components?.["minecraft:icon"];
if (iconKey !== "atlas:client_token") fail("item icon key mismatch");
const textureJson = readJson(path.join(RP, "textures/item_texture.json"));
const itemTexture = textureJson?.texture_data?.["atlas:client_token"]?.textures;
if (itemTexture !== "textures/items/atlas_client") fail("item texture mapping is wrong");
const itemPng = pngInfo(path.join(RP, "textures/items/atlas_client.png"));
if (itemPng && (itemPng.width !== 32 || itemPng.height !== 32)) fail("item texture should be 32x32");
for (const icon of fs.readdirSync(path.join(RP, "textures/ui"))) {
  if (!icon.endsWith(".png")) continue;
  const info = pngInfo(path.join(RP, "textures/ui", icon));
  if (info && (info.width !== 32 || info.height !== 32)) fail(`UI icon ${icon} should be 32x32`);
}
const packIcon = pngInfo(path.join(BP, "pack_icon.png"));
if (packIcon && (packIcon.width !== 256 || packIcon.height !== 256)) fail("pack icon should be 256x256");
pngInfo(path.join(RP, "pack_icon.png"));
ok("item, texture and icon references resolved");

// Localisation.
const langEn = fs.readFileSync(path.join(RP, "texts/en_US.lang"), "utf8");
const langAr = fs.readFileSync(path.join(RP, "texts/ar_SA.lang"), "utf8");
if (!/^item\.atlas:client_token=/m.test(langEn)) fail("en_US.lang has no item name");
if (!/^item\.atlas:client_token=/m.test(langAr)) fail("ar_SA.lang has no item name");
const languages = readJson(path.join(RP, "texts/languages.json"));
if (!Array.isArray(languages) || !languages.includes("en_US") || !languages.includes("ar_SA")) {
  fail("texts/languages.json must list en_US and ar_SA");
}
ok("localisation files present");

// Script imports, UI icon references and forbidden branding.
const scriptFiles = walk(path.join(BP, "scripts")).filter((file) => file.endsWith(".js"));
const scriptSet = new Set(scriptFiles);
const allowedExternal = new Set(["@minecraft/server", "@minecraft/server-ui"]);
for (const relative of scriptFiles) {
  const source = fs.readFileSync(path.join(BP, "scripts", relative), "utf8");
  const importPattern = /import\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.startsWith(".")) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
      if (!scriptSet.has(resolved)) fail(`${relative}: missing import target ${specifier} (${resolved})`);
    } else if (!allowedExternal.has(specifier)) {
      fail(`${relative}: disallowed module import ${specifier}`);
    }
  }
  for (const match of source.matchAll(/textures\/ui\/[a-z0-9_/-]+/g)) {
    if (!fs.existsSync(path.join(RP, `${match[0]}.png`))) {
      fail(`${relative}: missing UI texture ${match[0]}.png`);
    }
  }
  if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) fail(`${relative}: dynamic code execution is not allowed`);
}
for (const root of [BP, RP]) {
  for (const relative of walk(root)) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    if (/ESPchest|Atlas Edition|\bV3\b/.test(source)) {
      fail(`Forbidden legacy branding found in ${path.relative(ROOT, path.join(root, relative))}`);
    }
  }
}
ok(`${scriptFiles.length} script files and their imports resolved`);

// Final archive.
if (!fs.existsSync(ARTIFACT)) {
  fail("ATLAS.mcaddon is missing; run npm run build first");
} else {
  let archive;
  try {
    archive = unzipSync(fs.readFileSync(ARTIFACT));
  } catch (error) {
    fail(`ATLAS.mcaddon is not a valid zip: ${error.message}`);
  }
  if (archive) {
    const names = Object.keys(archive);
    for (const [root, source] of [
      ["ATLAS_BP", BP],
      ["ATLAS_RP", RP],
    ]) {
      if (!archive[`${root}/manifest.json`]) fail(`archive: missing ${root}/manifest.json`);
      for (const relative of walk(source)) {
        const key = `${root}/${relative}`;
        if (!archive[key]) {
          fail(`archive: missing ${key}`);
          continue;
        }
        const sourceBuffer = fs.readFileSync(path.join(source, relative));
        if (!Buffer.from(archive[key]).equals(sourceBuffer)) fail(`archive: stale file ${key}`);
      }
    }
    const expected = new Set(["ATLAS_BP/", "ATLAS_RP/"]);
    for (const [root, source] of [
      ["ATLAS_BP", BP],
      ["ATLAS_RP", RP],
    ]) {
      for (const relative of walk(source)) expected.add(`${root}/${relative}`);
    }
    for (const name of names) {
      if (!expected.has(name)) {
        fail(`archive: unexpected entry ${name}`);
      }
      if (name.includes("__MACOSX") || name.endsWith(".DS_Store")) fail(`archive: junk file ${name}`);
    }
    const zipBp = JSON.parse(Buffer.from(archive["ATLAS_BP/manifest.json"]).toString("utf8"));
    const zipRp = JSON.parse(Buffer.from(archive["ATLAS_RP/manifest.json"]).toString("utf8"));
    if (zipBp.header.uuid !== bpManifest?.header.uuid) fail("archive: BP UUID differs from source");
    if (zipRp.header.uuid !== rpManifest?.header.uuid) fail("archive: RP UUID differs from source");
    if (!archive["ATLAS_BP/scripts/main.js"]) fail("archive: script entry missing");
    if (!archive["ATLAS_BP/items/atlas_client.json"]) fail("archive: item JSON missing");
    ok(`archive has ${names.length} entries and no nested or junk paths`);
  }
}

if (errors.length > 0) {
  console.error(`\nATLAS pack validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`ATLAS pack validation passed (${checks.length} checks):`);
for (const check of checks) console.log(`- ${check}`);
