import { freezeOwned, isOwned, isPlainObject } from "../core/immutable.js";
import { resolvePathSubpaths, validatePathCommand, validatePathCommandCount } from "./pathTopology.js";
export { MAX_PATH_COMMANDS, validatePathCommandCount, validatePathFillRule } from "./pathTopology.js";

const validatedCommands = new WeakSet();
const validatedLegacyCommands = new WeakSet();

export function validateLegacyPathCommands(commands) {
  if (validatedLegacyCommands.has(commands)) return commands;
  if (!Array.isArray(commands) || commands.length < 1) {
    throw new TypeError("path.commands must contain at least one command.");
  }
  validatePathCommandCount(commands.length, "path.commands length");
  commands.forEach(validatePathCommand);
  if (commands[0].op !== "M") {
    throw new Error("path.commands must start with M.");
  }
  if (commands.length === 1) {
    if (isOwned(commands)) validatedLegacyCommands.add(commands);
    return commands;
  }
  if (commands.slice(1).some(command => command.op === "M")) {
    throw new Error("path.commands supports one subpath and only one initial M.");
  }
  if (!commands.some(command => command.op === "L" || command.op === "C")) {
    throw new Error("path.commands requires at least one L or C segment.");
  }
  const closeIndex = commands.findIndex(command => command.op === "Z");
  if (closeIndex !== -1 && closeIndex !== commands.length - 1) {
    throw new Error("path.commands Z must be the final command.");
  }
  if (isOwned(commands)) validatedLegacyCommands.add(commands);
  return commands;
}

function validatePoints(points) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      isPlainObject(point) &&
      Object.keys(point).length === 2 &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(
      "Linear path points must contain at least two finite { x, y } objects."
    );
  }
  return points;
}

export function buildLinearPathCommands(points, { close = false } = {}) {
  validatePoints(points);
  if (typeof close !== "boolean") {
    throw new TypeError("Linear path close must be a boolean.");
  }
  validatePathCommandCount(
    points.length + Number(close),
    "Linear path command count"
  );
  const commands = [
    { op: "M", x: points[0].x, y: points[0].y },
    ...points.slice(1).map(point => ({ op: "L", x: point.x, y: point.y }))
  ];
  if (close) commands.push({ op: "Z" });
  return freezeOwned(commands.map(command => freezeOwned(command)));
}

export function validatePathCommands(commands) {
  if (validatedCommands.has(commands)) return commands;
  resolvePathSubpaths(commands);
  if (isOwned(commands)) validatedCommands.add(commands);
  return commands;
}
