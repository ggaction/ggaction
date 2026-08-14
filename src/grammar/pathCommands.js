import { freezeOwned, isPlainObject } from "../core/immutable.js";
import { validateGeneratedItemLimit } from "../core/validation.js";

const COMMAND_KEYS = Object.freeze({
  M: Object.freeze(["op", "x", "y"]),
  L: Object.freeze(["op", "x", "y"]),
  C: Object.freeze(["op", "x1", "y1", "x2", "y2", "x", "y"]),
  Z: Object.freeze(["op"])
});

function validateCommand(command, index) {
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

export function validatePathCommands(commands) {
  if (!Array.isArray(commands) || commands.length < 2) {
    throw new TypeError("path.commands must contain at least two commands.");
  }
  validateGeneratedItemLimit(commands.length, "path.commands length");
  commands.forEach(validateCommand);
  if (commands[0].op !== "M") {
    throw new Error("path.commands must start with M.");
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
  validateGeneratedItemLimit(
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
