/** Minimal Minecraft API mock for the ATLAS integration harness. */

import { state } from "./state.js";

export class ItemStack {
  constructor(typeId, amount = 1, options = {}) {
    this.typeId = typeId;
    this.amount = amount;
    this.durability = options.durability
      ? { maxDurability: options.durability, damage: options.damage ?? 0 }
      : null;
  }

  getComponent(id) {
    if (id === "minecraft:durability" && this.durability) {
      return {
        maxDurability: this.durability.maxDurability,
        damage: this.durability.damage,
      };
    }
    return undefined;
  }
}

class Signal {
  constructor(name) {
    this.name = name;
  }

  subscribe(callback) {
    state.events[this.name].push(callback);
    return callback;
  }

  unsubscribe(callback) {
    const index = state.events[this.name].indexOf(callback);
    if (index >= 0) state.events[this.name].splice(index, 1);
  }
}

class MockContainer {
  constructor() {
    this.size = 36;
    this.items = new Map();
  }

  getItem(slot) {
    return this.items.get(slot);
  }

  addItem(stack) {
    for (let slot = 0; slot < this.size; slot++) {
      if (!this.items.has(slot)) {
        this.items.set(slot, stack);
        return undefined;
      }
    }
    return stack;
  }

  setItem(slot, stack) {
    if (stack === undefined) this.items.delete(slot);
    else this.items.set(slot, stack);
  }
}

class MockDimension {
  constructor(id) {
    this.id = id;
  }
}

class MockLocatorBar {
  constructor() {
    this.maxCount = 5;
    this.waypoints = new Set();
  }

  get count() {
    return this.waypoints.size;
  }

  addWaypoint(waypoint) {
    if (!waypoint || waypoint.isValid === false) throw new Error("Invalid waypoint");
    if (this.waypoints.has(waypoint)) throw new Error("Waypoint already exists");
    if (this.waypoints.size >= this.maxCount) throw new Error("Waypoint limit exceeded");
    this.waypoints.add(waypoint);
  }

  hasWaypoint(waypoint) {
    return this.waypoints.has(waypoint);
  }

  getAllWaypoints() {
    return [...this.waypoints];
  }

  removeWaypoint(waypoint) {
    if (!this.waypoints.has(waypoint)) throw new Error("Waypoint not found");
    this.waypoints.delete(waypoint);
  }

  removeAllWaypoints() {
    this.waypoints.clear();
  }
}

export class LocationWaypoint {
  constructor(dimensionLocation, textureSelector, color) {
    this.dimensionLocation = dimensionLocation;
    this.textureSelector = textureSelector;
    this.color = color;
    this.isEnabled = true;
    this.isValid = true;
  }

  getDimensionLocation() {
    return this.dimensionLocation;
  }

  setDimensionLocation(location) {
    this.dimensionLocation = location;
  }

  remove() {
    this.isValid = false;
    for (const player of state.players) {
      player.locatorBar?.waypoints.delete(this);
    }
  }
}

export class Player {
  constructor(id, name, dimensionId = "minecraft:overworld") {
    this.id = id;
    this.name = name;
    this.typeId = "minecraft:player";
    this.isValid = true;
    this.location = { x: 10.5, y: 64, z: -3.5 };
    this.dimension = new MockDimension(dimensionId);
    this.level = 12;
    this.health = 20;
    this.gameMode = "Survival";
    this.dynamic = new Map();
    this.messages = [];
    this.sounds = [];
    this.titles = [];
    this.actionBars = [];
    this.inventory = new MockContainer();
    this.locatorBar = new MockLocatorBar();
    this.effects = [];
    this.equipment = new Map();
    this.input = { x: 0, y: 0 };
    this.inputInfo = {
      getMovementVector: () => ({ ...this.input }),
    };
    this.onScreenDisplay = {
      setActionBar: (text) => {
        this.actionBars.push(text);
        state.actionBars.push({ player: this, text });
      },
      setTitle: (text, options) => {
        this.titles.push({ text, options });
        state.titles.push({ player: this, text, options });
      },
    };
  }

  getComponent(id) {
    if (id === "minecraft:health") {
      return {
        currentValue: this.health,
        effectiveMax: 20,
        defaultValue: 20,
      };
    }
    if (id === "minecraft:inventory") {
      return { container: this.inventory };
    }
    if (id === "minecraft:equippable") {
      return {
        getEquipment: (slot) => this.equipment.get(slot),
      };
    }
    return undefined;
  }

  getViewDirection() {
    return { x: 0, y: 0, z: -1 };
  }

  getGameMode() {
    return this.gameMode;
  }

  getEffects() {
    return this.effects;
  }

  getDynamicProperty(key) {
    return this.dynamic.get(key);
  }

  setDynamicProperty(key, value) {
    if (value === undefined) this.dynamic.delete(key);
    else this.dynamic.set(key, value);
  }

  sendMessage(message) {
    this.messages.push(message);
    state.chat.push({ player: this, message });
  }

  playSound(soundId, options) {
    this.sounds.push({ soundId, options });
  }
}

export const world = {
  afterEvents: {
    worldLoad: new Signal("worldLoad"),
    playerSpawn: new Signal("playerSpawn"),
    playerLeave: new Signal("playerLeave"),
    itemUse: new Signal("itemUse"),
    entityDie: new Signal("entityDie"),
    entityHurt: new Signal("entityHurt"),
    playerDimensionChange: new Signal("playerDimensionChange"),
    playerButtonInput: new Signal("playerButtonInput"),
    entityHitBlock: new Signal("entityHitBlock"),
    entityHitEntity: new Signal("entityHitEntity"),
    playerInteractWithBlock: new Signal("playerInteractWithBlock"),
    playerInteractWithEntity: new Signal("playerInteractWithEntity"),
    playerInventoryItemChange: new Signal("playerInventoryItemChange"),
  },
  beforeEvents: {},
  getPlayers() {
    state.worldReads++;
    return state.players.filter((player) => player.isValid);
  },
  getAllPlayers() {
    return this.getPlayers();
  },
  getDynamicProperty(key) {
    state.worldReads++;
    return state.worldProps.get(key);
  },
  setDynamicProperty(key, value) {
    state.worldWrites++;
    if (value === undefined) state.worldProps.delete(key);
    else state.worldProps.set(key, value);
  },
  getDay() {
    state.worldReads++;
    return state.day;
  },
  getTimeOfDay() {
    state.worldReads++;
    return state.timeOfDay;
  },
  getDifficulty() {
    state.worldReads++;
    return state.difficulty;
  },
  getDefaultSpawnLocation() {
    return { x: 0, y: 64, z: 0 };
  },
  getDimension(id) {
    return new MockDimension(id);
  },
  sendMessage(message) {
    state.chat.push({ player: null, message });
  },
};

export const system = {
  get currentTick() {
    return state.currentTick;
  },
  run(callback) {
    state.tasks.push(callback);
  },
  runTimeout(callback, ticks) {
    const id = state.nextTimeoutId++;
    state.timeouts.push({ id, at: state.currentTick + Math.max(0, ticks ?? 0), callback });
    return id;
  },
  runInterval(callback, ticks) {
    const id = state.nextTimeoutId++;
    state.intervals.push({ id, every: Math.max(1, ticks ?? 1), callback });
    return id;
  },
  clearRun() {},
  beforeEvents: {
    startup: {
      subscribe(callback) {
        state.startupHandlers.push(callback);
        return callback;
      },
    },
  },
  afterEvents: {
    scriptEventReceive: new Signal("scriptEventReceive"),
  },
};

export const CommandPermissionLevel = {
  Any: 0,
  GameDirectors: 1,
  Admin: 2,
  Host: 3,
  Owner: 4,
};

export const CustomCommandStatus = { Success: 0, Failure: 1 };

export const WaypointTexture = {
  Circle: "minecraft:circle",
  SmallSquare: "minecraft:small_square",
  SmallStar: "minecraft:small_star",
  Square: "minecraft:square",
};

export const EquipmentSlot = {
  Head: "Head",
  Chest: "Chest",
  Legs: "Legs",
  Feet: "Feet",
  Mainhand: "Mainhand",
  Offhand: "Offhand",
};

export const GameMode = {
  Survival: "Survival",
  Creative: "Creative",
  Adventure: "Adventure",
  Spectator: "Spectator",
};

export const Difficulty = {
  Peaceful: "Peaceful",
  Easy: "Easy",
  Normal: "Normal",
  Hard: "Hard",
};
