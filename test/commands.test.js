/**
 * Command registration regression tests.
 *
 * Bedrock requires a namespace in a custom command name and exposes the
 * un-namespaced alias in chat. These tests boot the real commands.js against
 * the mock registry, including a name collision and a missing registry, so a
 * `/atlas` regression cannot hide behind a passing build.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

import { Player } from "./mocks/server.js";
import { advanceTicks, resetState, state } from "./mocks/state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
let caseId = 0;

async function loadCommandsModule() {
  const id = caseId++;
  const outfile = path.join(os.tmpdir(), `atlas-commands-${process.pid}-${id}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, "src/ATLAS/BP/scripts/commands.js")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "node20",
    outfile,
    logLevel: "silent",
    alias: {
      "@minecraft/server": path.join(__dirname, "mocks/server.js"),
      "@minecraft/server-ui": path.join(__dirname, "mocks/server-ui.js"),
    },
  });
  return import(`${pathToFileURL(outfile).href}?v=${id}`);
}

function mockRegistry(options = {}) {
  return {
    registerCommand(spec, callback) {
      if (options.fail?.includes(spec.name)) {
        throw new Error(`command ${spec.name} already exists`);
      }
      state.commandRegistrations += 1;
      state.commands.set(spec.name, { spec, callback });
      const alias = spec.name.split(":")[1];
      if (alias && !state.commands.has(alias)) {
        state.commands.set(alias, { spec, callback, aliasOf: spec.name });
      }
    },
    registerEnum() {},
  };
}

/** Loads a fresh module instance and fires one startup event. */
async function boot(options = {}) {
  resetState();
  state.startupHandlers.length = 0;
  const module = await loadCommandsModule();
  module.registerCommands();
  assert.equal(state.startupHandlers.length, 1, "startup must be subscribed once");
  const registry = options.registry === null ? undefined : options.registry ?? mockRegistry(options);
  for (const handler of state.startupHandlers) {
    handler({ customCommandRegistry: registry });
  }
  return module;
}

function silenceConsole() {
  const original = { log: console.log, warn: console.warn };
  const lines = [];
  console.log = (...args) => lines.push(args.map(String).join(" "));
  console.warn = (...args) => lines.push(args.map(String).join(" "));
  return {
    lines,
    restore() {
      console.log = original.log;
      console.warn = original.warn;
    },
  };
}

test("registers /atlas:menu and /atlas with no-cheats permissions", async () => {
  const output = silenceConsole();
  try {
    await boot();
    assert.equal(state.commandRegistrations, 2, "both names must be registered once");
    for (const name of ["atlas:menu", "atlas:atlas", "menu", "atlas"]) {
      assert.ok(state.commands.has(name), `missing command ${name}`);
    }
    assert.equal(state.commands.get("atlas").aliasOf, "atlas:atlas");
    assert.equal(state.commands.get("menu").aliasOf, "atlas:menu");
    for (const entry of state.commands.values()) {
      assert.equal(entry.spec.permissionLevel, 0, "permission level must be Any");
      assert.equal(entry.spec.cheatsRequired, false);
    }
    assert.deepEqual(output.lines.filter((line) => line.includes("Could not")), []);
  } finally {
    output.restore();
  }
});

test("every accepted command name opens the main menu", async () => {
  const output = silenceConsole();
  try {
    await boot();
    const player = new Player("player-command-1", "Alex");
    state.players.push(player);
    for (const name of ["atlas:menu", "atlas:atlas", "menu", "atlas"]) {
      const before = state.forms.length;
      const result = state.commands.get(name).callback({
        sourceEntity: player,
        sourceType: "Entity",
      });
      assert.equal(result.status, 0, `${name} did not succeed`);
      advanceTicks(1);
      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(
        state.forms.length > before,
        `${name} did not open the main menu`,
      );
      assert.ok(state.forms.at(-1).title.includes("ATLAS CLIENT"));
    }
  } finally {
    output.restore();
  }
});

test("a command-name collision disables only that alias", async () => {
  const output = silenceConsole();
  try {
    await boot({ fail: ["atlas:atlas"] });
    assert.equal(state.commandRegistrations, 1);
    assert.ok(state.commands.has("atlas:menu"));
    assert.ok(state.commands.has("menu"));
    assert.ok(!state.commands.has("atlas:atlas"));
    assert.ok(!state.commands.has("atlas"));
    assert.ok(output.lines.some((line) => line.includes("Could not register /atlas:atlas")));
  } finally {
    output.restore();
  }
});

test("a missing registry does not throw and registers nothing", async () => {
  const output = silenceConsole();
  try {
    await boot({ registry: null });
    assert.equal(state.commandRegistrations, 0);
    assert.equal(state.commands.size, 0);
    assert.ok(output.lines.some((line) => line.includes("registry is unavailable")));
  } finally {
    output.restore();
  }
});

test("non-player origins fail safely and an initiator player is accepted", async () => {
  const output = silenceConsole();
  try {
    await boot();
    const command = state.commands.get("atlas:menu");
    const server = command.callback({ sourceEntity: undefined });
    assert.equal(server.status, 1);
    assert.match(server.message, /in-game/);

    const player = new Player("player-command-2", "Steve");
    state.players.push(player);
    const viaInitiator = command.callback({ sourceEntity: undefined, initiator: player });
    assert.equal(viaInitiator.status, 0);
    advanceTicks(1);
  } finally {
    output.restore();
  }
});

test("a repeated startup event and a second registerCommands call do nothing", async () => {
  const output = silenceConsole();
  try {
    const module = await boot();
    const before = state.commandRegistrations;
    module.registerCommands();
    assert.equal(state.startupHandlers.length, 1);
    state.startupHandlers[0]({ customCommandRegistry: mockRegistry() });
    assert.equal(state.commandRegistrations, before);
  } finally {
    output.restore();
  }
});
