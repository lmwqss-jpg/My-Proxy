/**
 * Shared state for the Node.js integration harness. A global singleton is used
 * so the bundled add-on and the test module see the same objects even though
 * esbuild inlines the mock modules into the bundle.
 */

function createState() {
  return {
    currentTick: 0,
    players: [],
    worldProps: new Map(),
    forms: [],
    uiQueue: [],
    responses: [],
    tasks: [],
    timeouts: [],
    intervals: [],
    startupHandlers: [],
    startupFired: false,
    commands: new Map(),
    commandRegistrations: 0,
    events: {
      playerSpawn: [],
      playerLeave: [],
      itemUse: [],
      entityDie: [],
      entityHurt: [],
      playerDimensionChange: [],
      playerButtonInput: [],
      entityHitBlock: [],
      entityHitEntity: [],
      playerInteractWithBlock: [],
      playerInteractWithEntity: [],
      playerInventoryItemChange: [],
      scriptEventReceive: [],
      worldLoad: [],
    },
    errors: [],
    warnings: [],
    titles: [],
    actionBars: [],
    chat: [],
    day: 3,
    timeOfDay: 6000,
    difficulty: "Normal",
    nextTimeoutId: 1,
    worldReads: 0,
    worldWrites: 0,
  };
}

export const state =
  globalThis.__ATLAS_QA_STATE__ ?? (globalThis.__ATLAS_QA_STATE__ = createState());

export function resetState() {
  state.currentTick = 0;
  state.players.length = 0;
  state.worldProps.clear();
  state.forms.length = 0;
  state.uiQueue.length = 0;
  state.responses.length = 0;
  state.tasks.length = 0;
  state.timeouts.length = 0;
  state.commands.clear();
  state.commandRegistrations = 0;
  state.startupFired = false;
  state.errors.length = 0;
  state.warnings.length = 0;
  state.titles.length = 0;
  state.actionBars.length = 0;
  state.chat.length = 0;
  state.day = 3;
  state.timeOfDay = 6000;
  state.difficulty = "Normal";
}

export function fireStartup() {
  if (state.startupFired) return;
  state.startupFired = true;
  const registry = {
    registerCommand(spec, callback) {
      state.commandRegistrations += 1;
      state.commands.set(spec.name, { spec, callback });
      // Bedrock automatically exposes the un-namespaced alias in chat. Model
      // it so tests can resolve `/atlas` exactly as a player types it.
      const alias = spec.name.includes(":") ? spec.name.split(":")[1] : null;
      if (alias && !state.commands.has(alias)) {
        state.commands.set(alias, { spec, callback, aliasOf: spec.name });
      }
    },
    registerEnum() {},
  };
  for (const handler of state.startupHandlers) {
    handler({ customCommandRegistry: registry });
  }
}

export function emit(name, event) {
  for (const handler of state.events[name] ?? []) handler(event);
}

export function runTasks() {
  let guard = 0;
  while (state.tasks.length > 0 && guard++ < 200) {
    const task = state.tasks.shift();
    try {
      task();
    } catch (error) {
      state.errors.push(error);
    }
  }
}

export function advanceTicks(count) {
  for (let i = 0; i < count; i++) {
    state.currentTick++;
    const due = state.timeouts.filter((entry) => entry.at <= state.currentTick);
    state.timeouts = state.timeouts.filter((entry) => entry.at > state.currentTick);
    for (const entry of due) {
      try {
        entry.callback();
      } catch (error) {
        state.errors.push(error);
      }
    }
    for (const interval of [...state.intervals]) {
      if (state.currentTick % interval.every === 0) {
        try {
          interval.callback();
        } catch (error) {
          state.errors.push(error);
        }
      }
    }
    runTasks();
  }
}

export function nextResponse(form) {
  const responder = state.uiQueue.shift();
  if (!responder) {
    return { canceled: true, cancelationReason: "UserClosed" };
  }
  try {
    const response = typeof responder === "function" ? responder(form) : responder;
    state.responses.push({ form, response });
    return response ?? { canceled: true, cancelationReason: "UserClosed" };
  } catch (error) {
    state.errors.push(error);
    return { canceled: true, cancelationReason: "UserClosed" };
  }
}
