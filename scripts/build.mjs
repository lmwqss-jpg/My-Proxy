/** Builds the single importable ATLAS.mcaddon archive. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BP_SRC = path.join(ROOT, "src/ATLAS/BP");
const RP_SRC = path.join(ROOT, "src/ATLAS/RP");
const BUILD = path.join(ROOT, "build");
const OUTPUT = path.join(ROOT, "ATLAS.mcaddon");

function walk(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name === "Thumbs.db") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, base));
    else if (entry.isFile()) result.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return result;
}

execFileSync(process.execPath, [path.join(ROOT, "scripts/generate-assets.mjs")], {
  stdio: "inherit",
});

fs.rmSync(BUILD, { recursive: true, force: true });
fs.rmSync(OUTPUT, { force: true });
fs.mkdirSync(BUILD, { recursive: true });
fs.cpSync(BP_SRC, path.join(BUILD, "ATLAS_BP"), { recursive: true });
fs.cpSync(RP_SRC, path.join(BUILD, "ATLAS_RP"), { recursive: true });

const entries = new Map();
for (const [folder, source] of [
  ["ATLAS_BP", BP_SRC],
  ["ATLAS_RP", RP_SRC],
]) {
  entries.set(`${folder}/`, new Uint8Array(0));
  for (const relative of walk(source).sort()) {
    entries.set(`${folder}/${relative}`, fs.readFileSync(path.join(source, relative)));
  }
}

const archive = zipSync(Object.fromEntries(entries), { level: 9 });
fs.writeFileSync(OUTPUT, archive);

const count = [...entries.keys()].filter((key) => !key.endsWith("/")).length;
console.log(
  `Built ${path.basename(OUTPUT)} (${count} files, ${(archive.length / 1024).toFixed(1)} KiB)`,
);
