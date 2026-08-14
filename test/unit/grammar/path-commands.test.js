import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLinearPathCommands,
  validatePathCommands
} from "../../../src/grammar/pathCommands.js";

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
    [[{ op: "M", x: 0, y: 0 }], /at least two commands/],
    [[{ op: "L", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }], /start with M/],
    [[{ op: "M", x: 0, y: 0 }, { op: "M", x: 1, y: 1 }], /only one initial M/],
    [[{ op: "M", x: 0, y: 0 }, { op: "Z" }], /at least one L or C/],
    [[{ op: "M", x: 0, y: 0 }, { op: "Z" }, { op: "L", x: 1, y: 1 }], /Z must be the final/],
    [[{ op: "M", x: 0, y: 0 }, { op: "Q", x: 1, y: 1 }], /M, L, C, or Z/],
    [[{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1, extra: true }], /invalid properties/],
    [[{ op: "M", x: 0, y: 0 }, { op: "C", x1: 1, y1: 2, x2: 3, y2: 4, x: NaN, y: 5 }], /must be a finite number/]
  ]) {
    assert.throws(() => validatePathCommands(commands), message);
  }
});

test("bounds explicit and generated path command arrays", () => {
  const points = Array.from(
    { length: 10_000 },
    (_, index) => ({ x: index, y: index % 2 })
  );
  assert.equal(buildLinearPathCommands(points).length, 10_000);
  assert.throws(
    () => buildLinearPathCommands(points, { close: true }),
    /Linear path command count must not exceed 10000/
  );
  assert.throws(
    () => validatePathCommands([
      { op: "M", x: 0, y: 0 },
      ...Array.from({ length: 10_000 }, (_, index) => ({
        op: "L", x: index + 1, y: 0
      }))
    ]),
    /path.commands length must not exceed 10000/
  );
});
