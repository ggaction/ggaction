import { freezeOwned, isOwned, isPlainObject } from "../core/immutable.js";
import { validateGeneratedItemLimit } from "../core/validation.js";

export const MAX_PATH_COMMANDS = 30_000;
export const MAX_DECLARED_PATH_COMMANDS = 200_000;

export function validatePathCapacity(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_DECLARED_PATH_COMMANDS) {
    throw new RangeError("Path maxCommands must be an integer from 1 to 200000.");
  }
  return value;
}

// A declaration applies only to this path, never to clips or other generators.
export function pathCommandCapacity(properties) {
  const descriptor = Object.getOwnPropertyDescriptor(properties, "maxCommands");
  if (descriptor === undefined) {
    if ("maxCommands" in properties) throw new TypeError("Path maxCommands requires an own property.");
    return MAX_PATH_COMMANDS;
  }
  if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
    throw new TypeError("Path maxCommands requires an enumerable own data property.");
  }
  return validatePathCapacity(descriptor.value);
}

export function validatePathCommandCount(count, label, maximum = MAX_PATH_COMMANDS) {
  return validateGeneratedItemLimit(count, label, validatePathCapacity(maximum));
}

const COMMAND_KEYS = Object.freeze({
  M: Object.freeze(["op", "x", "y"]),
  L: Object.freeze(["op", "x", "y"]),
  C: Object.freeze(["op", "x1", "y1", "x2", "y2", "x", "y"]),
  Z: Object.freeze(["op"])
});

export function validatePathCommand(command, index) {
  if (!isPlainObject(command) || !Object.hasOwn(COMMAND_KEYS, command.op)) {
    throw new TypeError(
      `path.commands[${index}] must be an M, L, C, or Z command.`
    );
  }
  const expected = COMMAND_KEYS[command.op];
  const keys = Object.keys(command);
  if (
    keys.length !== expected.length ||
    !expected.every(key => Object.hasOwn(command, key))
  ) {
    throw new TypeError(
      `path.commands[${index}] has invalid properties for ${command.op}.`
    );
  }
  for (const key of expected) {
    if (key !== "op" && !Number.isFinite(command[key])) {
      throw new TypeError(
        `path.commands[${index}].${key} must be a finite number.`
      );
    }
  }
  return command;
}


const topologyCache = new WeakMap();

function dense(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${label} must contain at least one entry.`);
  }
  if (Reflect.ownKeys(values).length !== values.length + 1) {
    throw new TypeError(`${label} must be a dense array without extra properties.`);
  }
  for (let index = 0; index < values.length; index += 1) {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(values, String(index)) ?? {}, "value")) {
      throw new TypeError(`${label} must be a dense array without accessors.`);
    }
  }
}

function commandShape(command, index) {
  if (!isPlainObject(command) || Reflect.ownKeys(command).length !== Object.keys(command).length || Reflect.ownKeys(command).some(key =>
    typeof key !== "string" || !Object.hasOwn(Object.getOwnPropertyDescriptor(command, key), "value"))) {
    throw new TypeError(`path.commands[${index}] must have only own data properties.`);
  }
  validatePathCommand(command, index);
}

// Canonical command grammar shared by edits, geometry, clipping and persistence.
export function resolvePathSubpaths(commands, maximum = MAX_PATH_COMMANDS) {
  if (!Array.isArray(commands)) throw new TypeError("path.commands must contain at least one entry.");
  validatePathCommandCount(commands.length, "path.commands length", maximum);
  if (topologyCache.has(commands)) return topologyCache.get(commands);
  dense(commands, "path.commands");
  const subpaths = [];
  let start;
  let closed = false;
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    commandShape(command, index);
    if (command.op === "M") {
      if (start !== undefined) subpaths.push(freezeOwned({ start, end: index - 1, closed }));
      start = index;
      closed = false;
    } else {
      if (start === undefined || closed) {
        throw new Error(`path.commands[${index}] requires M before a new subpath.`);
      }
      if (command.op === "Z") closed = true;
    }
  }
  subpaths.push(freezeOwned({ start, end: commands.length - 1, closed }));
  const result = freezeOwned(subpaths);
  if (isOwned(commands)) topologyCache.set(commands, result);
  return result;
}

export function buildCompoundPathCommands(subpaths) {
  dense(subpaths, "Path subpaths");
  let count = 0;
  for (const commands of subpaths) {
    dense(commands, "Subpath commands");
    count += commands.length;
    validatePathCommandCount(count, "Compound path command count");
    if (resolvePathSubpaths(commands).length !== 1) {
      throw new Error("Each path builder input must describe exactly one subpath.");
    }
  }
  return freezeOwned(subpaths.flatMap(commands => commands.map(command => freezeOwned({ ...command }))));
}

export function validatePathFillRule(value) {
  if (value !== "nonzero" && value !== "evenodd") throw new TypeError("Path fillRule must be nonzero or evenodd.");
  return value;
}
