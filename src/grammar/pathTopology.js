import { freezeOwned, isPlainObject } from "../core/immutable.js";
import { validatePathCommand, validatePathCommandCount } from "./pathCommands.js";

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

// Pure topology only. Public graphic validation continues to own the supported
// command grammar; adding this kernel does not change that public contract.
export function resolvePathSubpaths(commands) {
  dense(commands, "path.commands");
  validatePathCommandCount(commands.length, "path.commands length");
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
  return freezeOwned(subpaths);
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
