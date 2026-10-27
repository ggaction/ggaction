import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLinearPathCommands,
  validateLegacyPathCommands,
  validatePathCommands
} from "../../../src/grammar/pathCommands.js";
import { freezeOwned } from "../../../src/core/immutable.js";

test("builds immutable open and closed linear command paths", () => {
  const points = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }];
  const open = buildLinearPathCommands(points);
  const closed = buildLinearPathCommands(points, { close: true });

  assert.deepEqual(open, [
    { op: "M", x: 1, y: 2 },
    { op: "L", x: 3, y: 4 },
    { op: "L", x: 5, y: 6 }
  ]);
  assert.deepEqual(closed, [...open, { op: "Z" }]);
  assert.equal(Object.isFrozen(closed), true);
  assert.equal(Object.isFrozen(closed[0]), true);
  assert.notEqual(open[0], points[0]);
});

test("accepts exact M, L, C, and final Z command schemas", () => {
  const commands = [
    { op: "M", x: 0, y: 1 },
    { op: "L", x: 2, y: 3 },
    { op: "C", x1: 4, y1: 5, x2: 6, y2: 7, x: 8, y: 9 },
    { op: "Z" }
  ];

  assert.equal(validatePathCommands(commands), commands);
});

test("rejects malformed points, commands, sequences, and close options", () => {
  assert.throws(() => buildLinearPathCommands([{ x: 1, y: 2 }]), /at least two/);
  assert.throws(
    () => buildLinearPathCommands([{ x: 1, y: 2 }, { x: 3, y: 4 }], { close: "yes" }),
    /close must be a boolean/
  );
  for (const [commands, message] of [
    [[], /at least one/],
    [[{ op: "L", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }], /requires M/],
    [[{ op: "M", x: 0, y: 0 }, { op: "Z" }, { op: "L", x: 1, y: 1 }], /requires M/],
    [[{ op: "M", x: 0, y: 0 }, { op: "Q", x: 1, y: 1 }], /M, L, C, or Z/],
    [[{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1, extra: true }], /invalid properties/],
    [[{ op: "M", x: 0, y: 0 }, { op: "C", x1: 1, y1: 2, x2: 3, y2: 4, x: NaN, y: 5 }], /must be a finite number/]
  ]) {
    assert.throws(() => validatePathCommands(commands), message);
  }
});

test("bounds explicit and generated path command arrays", () => {
  const points = Array.from(
    { length: 30_000 },
    (_, index) => ({ x: index, y: index % 2 })
  );
  assert.equal(buildLinearPathCommands(points).length, 30_000);
  assert.throws(
    () => buildLinearPathCommands(points, { close: true }),
    /Linear path command count must not exceed 30000/
  );
  assert.throws(
    () => validatePathCommands([
      { op: "M", x: 0, y: 0 },
      ...Array.from({ length: 30_000 }, (_, index) => ({
        op: "L", x: index + 1, y: 0
      }))
    ]),
    /path.commands length must not exceed 30000/
  );
});

test("a single move retains a position without inventing a line segment", () => {
  const commands = [{ op: "M", x: 12, y: 34 }];
  assert.equal(validatePathCommands(commands), commands);
});

test("legacy paths retain single moves and open or closed single-subpath geometry", () => {
  const move = { op: "M", x: 1, y: 2 };
  const line = { op: "L", x: 4, y: 5 };
  const cubic = { op: "C", x1: 2, y1: 3, x2: 3, y2: 4, x: 4, y: 5 };
  for (const commands of [[move], [move, line], [move, cubic, { op: "Z" }]]) {
    const before = structuredClone(commands);
    assert.equal(validateLegacyPathCommands(commands), commands);
    assert.deepEqual(commands, before);
    const owned = freezeOwned(commands.map(command => freezeOwned({ ...command })));
    assert.equal(validateLegacyPathCommands(owned), owned);
    assert.equal(validateLegacyPathCommands(owned), owned);
  }
});

test("legacy paths reject compound topology and misplaced closing commands", () => {
  const move = { op: "M", x: 1, y: 2 };
  const line = { op: "L", x: 4, y: 5 };
  for (const [commands, message] of [
    [undefined, /at least one/],
    [[], /at least one/],
    [[line], /start with M/],
    [[move, line, move], /one subpath/],
    [[move, { op: "Z" }], /at least one L or C/],
    [[move, line, { op: "Z" }, line], /final command/]
  ]) assert.throws(() => validateLegacyPathCommands(commands), message);
});

test("legacy validation rechecks mutable caller-owned commands", () => {
  const commands = [{ op: "M", x: 1, y: 2 }, { op: "L", x: 4, y: 5 }];
  assert.equal(validateLegacyPathCommands(commands), commands);
  commands.push({ op: "M", x: 6, y: 7 });
  assert.throws(() => validateLegacyPathCommands(commands), /one subpath/);
});
