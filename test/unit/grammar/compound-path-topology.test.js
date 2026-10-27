import assert from "node:assert/strict";
import test from "node:test";
import { buildCompoundPathCommands, resolvePathSubpaths } from "../../../src/grammar/pathTopology.js";
import { MAX_PATH_COMMANDS } from "../../../src/grammar/pathCommands.js";
import { resolvePathCommandBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { signedPolygonArea } from "../../oracles/geometry.js";
import {
  outer, hole, island, outerCommands, reversedHoleCommands, islandCommands, cubicCommands
} from "../../../examples/compound-path/coordinates.js";

test("preserves three separate rings and their authored winding", () => {
  const commands = buildCompoundPathCommands([outerCommands, reversedHoleCommands, islandCommands]);
  assert.deepEqual(resolvePathSubpaths(commands), [
    { start: 0, end: 4, closed: true }, { start: 5, end: 9, closed: true },
    { start: 10, end: 14, closed: true }
  ]);
  const rings = resolvePathSubpaths(commands).map(({ start, end }) =>
    commands.slice(start, end).map(({ x, y }) => [x, y]));
  assert.equal(signedPolygonArea(outer) - signedPolygonArea(hole), 84);
  assert.equal(signedPolygonArea(island), 4);
  assert.deepEqual(rings.map(signedPolygonArea), [100, -16, 4]);
  assert.equal(rings.reduce((area, ring) => area + signedPolygonArea(ring), 0), 88);
  assert.deepEqual(resolvePathCommandBounds(commands), { left: 0, right: 14, top: 0, bottom: 10 });
});

test("keeps open curves, closed point paths and consecutive moves distinct", () => {
  const commands = [...cubicCommands, { op: "M", x: 20, y: 2 }, { op: "Z" },
    { op: "M", x: 30, y: 3 }, { op: "M", x: 40, y: 4 }];
  assert.deepEqual(resolvePathSubpaths(commands), [
    { start: 0, end: 1, closed: false }, { start: 2, end: 3, closed: true },
    { start: 4, end: 4, closed: false }, { start: 5, end: 5, closed: false }
  ]);
  assert.deepEqual(resolvePathCommandBounds(cubicCommands), { left: 0, right: 10, top: 0, bottom: 7.5 });
  assert.deepEqual(resolvePathSubpaths([{ op: "M", x: 0, y: 0 }]), [{ start: 0, end: 0, closed: false }]);
});

test("copies every command and freezes the result without modifying caller input", () => {
  const input = structuredClone([outerCommands, cubicCommands]);
  const snapshot = structuredClone(input);
  const commands = buildCompoundPathCommands(input);
  assert.deepEqual(input, snapshot);
  assert.ok(Object.isFrozen(commands) && commands.every(Object.isFrozen));
  assert.notEqual(commands[0], input[0][0]);
  input[0][0].x = 999;
  assert.equal(commands[0].x, 0);
  const subpaths = resolvePathSubpaths(commands);
  assert.ok(Object.isFrozen(subpaths) && subpaths.every(Object.isFrozen));
});

test("rejects missing moves and commands after closure at their exact index", () => {
  for (const [commands, index] of [
    [[{ op: "L", x: 1, y: 1 }], 0],
    [[{ op: "Z" }], 0],
    [[{ op: "M", x: 0, y: 0 }, { op: "Z" }, { op: "L", x: 1, y: 1 }], 2],
    [[{ op: "M", x: 0, y: 0 }, { op: "Z" }, { op: "Z" }], 2]
  ]) assert.throws(() => resolvePathSubpaths(commands), error => {
    assert.match(error.message, new RegExp(`commands\\[${index}\\]`));
    return true;
  });
});

test("rejects unknown, nonfinite, sparse and accessor-bearing commands", () => {
  for (const command of [
    { op: "Q", x: 1, y: 1 }, { op: "L", x: Infinity, y: 1 },
    { op: "M", x: 1, y: 1, extra: 0 }, { op: "C", x: 1, y: 1 },
    { op: "Z", x: 1 }, null, ["M", 0, 0],
    { op: "L", x: 1, y: 1, [Symbol("extra")]: 0 },
    Object.defineProperty({ op: "L", x: 1, y: 1 }, "extra", { value: true }),
    Object.defineProperty({ op: "L", y: 1 }, "x", { get() { throw new Error("accessor executed"); }, enumerable: true })
  ]) assert.throws(() => resolvePathSubpaths([{ op: "M", x: 0, y: 0 }, command]), error => {
    assert.match(error.message, /commands\[1\]/);
    assert.doesNotMatch(error.message, /accessor executed/);
    return true;
  });
  assert.throws(() => resolvePathSubpaths(new Array(2)), /dense/);
  assert.throws(() => resolvePathSubpaths(Object.assign([{ op: "M", x: 0, y: 0 }], { extra: true })), /dense/);
  const accessor = [{ op: "M", x: 0, y: 0 }];
  Object.defineProperty(accessor, "0", { get() { throw new Error("array accessor executed"); } });
  assert.throws(() => resolvePathSubpaths(accessor), /dense/);
});

test("applies the existing command limit to the complete compound path", () => {
  const points = Array.from({ length: MAX_PATH_COMMANDS }, (_, x) => ({ op: "M", x, y: 0 }));
  assert.equal(resolvePathSubpaths(points).length, MAX_PATH_COMMANDS);
  assert.throws(() => resolvePathSubpaths([...points, { op: "M", x: 0, y: 0 }]), /30000/);
  const subpaths = points.map(command => [command]);
  assert.equal(buildCompoundPathCommands(subpaths).length, MAX_PATH_COMMANDS);
  assert.throws(() => buildCompoundPathCommands([...subpaths, [{ op: "M", x: 0, y: 0 }]]), /30000/);
});

test("requires nonempty individual subpaths when building a compound path", () => {
  for (const input of [undefined, {}, [], [null], [[]], new Array(1)]) {
    assert.throws(() => buildCompoundPathCommands(input));
  }
  assert.throws(() => buildCompoundPathCommands([[...outerCommands, ...islandCommands]]), /one subpath/);
  assert.throws(() => resolvePathSubpaths([]), /at least one/);
  assert.throws(() => resolvePathSubpaths(null), /at least one/);
});
