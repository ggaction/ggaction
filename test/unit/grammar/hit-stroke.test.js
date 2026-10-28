import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { flattenPathCommands } from "../../../src/grammar/pathGeometry.js";
import { prepareHitStroke, hitStrokeDistance, MAX_HIT_STROKE_WORK } from "../../../src/grammar/hitStroke.js";

const line = [{ op: "M", x: 10, y: 20 }, { op: "L", x: 30, y: 20 }];
const corner = [...line, { op: "L", x: 30, y: 40 }];
const shape = (commands, style) => prepareHitStroke(flattenPathCommands(commands), { width: 4, ...style });
const inside = (parts, x, y, slop = 0) => hitStrokeDistance(parts, { x, y }) <= slop;

test("butt, round and square caps retain literal painted endpoints and CSS slop", () => {
  const butt = shape(line), round = shape(line, { lineCap: "round" }), square = shape(line, { lineCap: "square" });
  assert.equal(inside(butt, 9, 20), false); assert.equal(inside(butt, 9, 20, 1), true);
  assert.equal(inside(round, 9, 20), true); assert.equal(inside(round, 8.5, 18.5), false);
  assert.equal(inside(square, 8.5, 18.5), true); assert.equal(inside(square, 7.9, 20), false);
  assert.equal(hitStrokeDistance(butt, { x: 20, y: 26 }), 4);
  assert.equal(inside(butt, 20, 26, 3), false); assert.equal(inside(butt, 20, 26, 6), true);
});

test("miter, bevel and round joins use their actual outer corner and miter limit", () => {
  const miter = shape(corner), bevel = shape(corner, { lineJoin: "bevel" }), round = shape(corner, { lineJoin: "round" });
  assert.equal(inside(miter, 31.8, 18.2), true);
  assert.equal(inside(bevel, 31.8, 18.2), false); assert.equal(inside(round, 31.8, 18.2), false);
  assert.equal(inside(round, 31.3, 18.7), true); assert.equal(inside(bevel, 31.3, 18.7), false);
  assert.equal(inside(shape(corner, { miterLimit: 1 }), 31.8, 18.2), false);
  const reversed = shape([{ op: "M", x: 30, y: 40 }, { op: "L", x: 30, y: 20 }, { op: "L", x: 10, y: 20 }]);
  assert.equal(inside(reversed, 31.8, 18.2), true);
});

test("dash gaps, odd patterns, zero entries and subpath resets preserve literal intervals", () => {
  const dashed = shape(line, { width: 2, dash: [4, 4] });
  for (const x of [10, 12, 14, 18, 20, 22, 26, 28, 30]) assert.equal(inside(dashed, x, 20), true, `${x}`);
  for (const x of [15, 16, 17, 23, 24, 25]) assert.equal(inside(dashed, x, 20), false, `${x}`);
  assert.equal(inside(dashed, 16, 20, 1), false); assert.equal(inside(dashed, 16, 20, 2), true);
  const odd = shape(line, { width: 2, dash: [3] });
  assert.equal(inside(odd, 11, 20), true); assert.equal(inside(odd, 14, 20), false); assert.equal(inside(odd, 17, 20), true);
  assert.equal(inside(shape(line, { dash: [0, 0] }), 16, 20), true);
  const dots = shape(line, { width: 2, dash: [0, 4], lineCap: "round" });
  assert.equal(inside(dots, 10, 20), true); assert.equal(inside(dots, 12, 20), false); assert.equal(inside(dots, 14, 20), true);
  const two = shape([...line, { op: "M", x: 11, y: 30 }, { op: "L", x: 31, y: 30 }], { width: 2, dash: [4, 4] });
  assert.equal(inside(two, 12, 30), true); assert.equal(inside(two, 16, 30), false);
});

test("closed seams join continuous paint while explicit gaps retain caps", () => {
  const commands = [...corner, { op: "L", x: 10, y: 40 }, { op: "Z" }];
  const solid = shape(commands, { lineCap: "butt" });
  assert.equal(inside(solid, 8.5, 18.5), true); assert.equal(inside(solid, 20, 30), false);
  const fullDash = shape(commands, { dash: [100, 10], lineCap: "butt" });
  assert.equal(inside(fullDash, 8.5, 18.5), true);
  const seam = shape(commands, { dash: [30, 20], lineCap: "butt" });
  assert.equal(inside(seam, 8.5, 18.5), true);
  assert.equal(inside(seam, 30, 35), false);
});

test("native stroke independently agrees on interior cap, join and dash probes", () => {
  const probes = [[8, 18], [9, 20], [11, 20], [15, 20], [21, 20], [31, 18], [31, 19], [30, 35], [28, 41]];
  for (const commands of [line, corner]) for (const lineCap of ["butt", "round", "square"]) for (const lineJoin of ["miter", "round", "bevel"]) {
    for (const dash of [[], [6, 8]]) {
      const canvas = createCanvas(64, 64), context = canvas.getContext("2d"), parts = shape(commands, { lineCap, lineJoin, dash });
      context.strokeStyle = "black"; context.lineWidth = 4; context.lineCap = lineCap; context.lineJoin = lineJoin; context.setLineDash(dash);
      context.beginPath();
      for (const c of commands) c.op === "M" ? context.moveTo(c.x, c.y) : context.lineTo(c.x, c.y);
      context.stroke();
      for (const [x, y] of probes) {
        const alpha = context.getImageData(x, y, 1, 1).data[3];
        if (alpha !== 0 && alpha !== 255) continue;
        assert.equal(inside(parts, x + 0.5, y + 0.5), alpha === 255, `${commands.length}/${lineCap}/${lineJoin}/${dash}/${x},${y}`);
      }
    }
  }
});

test("zero width, lone moves and zero-length drawable paths have explicit behavior", () => {
  assert.equal(shape(line, { width: 0 }).length, 0);
  assert.equal(shape([{ op: "M", x: 10, y: 20 }], { lineCap: "round" }).length, 0);
  const zero = [{ op: "M", x: 10, y: 20 }, { op: "L", x: 10, y: 20 }];
  assert.equal(shape(zero).length, 0);
  assert.equal(inside(shape(zero, { lineCap: "round" }), 10, 20), true);
  assert.equal(inside(shape(zero, { lineCap: "square" }), 11.5, 21.5), true);
  assert.equal(inside(shape(zero, { lineCap: "round", dash: [2, 2] }), 10, 20), true);
  assert.equal(hitStrokeDistance(shape(line, { width: 0 }), { x: 10, y: 20 }), Infinity);
});

test("malformed, inherited and accessor inputs fail before reading executable properties", () => {
  for (const style of [{ width: NaN }, { width: -1 }, { width: 1, dash: null }, { width: 1, dash: [1, NaN] },
    { width: 1, dash: [-1] }, { width: 1, lineCap: "invalid" }, { width: 1, lineJoin: "invalid" },
    { width: 1, miterLimit: 0 }, { width: 1, extra: true }]) assert.throws(() => shape(line, style));
  let calls = 0;
  assert.throws(() => prepareHitStroke(flattenPathCommands(line), { get width() { calls++; return 1; } }));
  const invalid = { subpaths: [{ points: [{ get x() { calls++; return 1; }, y: 0 }], closed: false, hasSegments: true }] };
  assert.throws(() => prepareHitStroke(invalid, { width: 1 })); assert.equal(calls, 0);
  assert.throws(() => prepareHitStroke({ subpaths: [], diagnostics: [{}] }, { width: 1 }), /incomplete/);
  assert.throws(() => prepareHitStroke({ subpaths: [{ points: [], closed: false, hasSegments: true }] }, { width: 1 }));
  assert.throws(() => hitStrokeDistance([], { x: 0, y: 0 }), /prepared/);
  assert.throws(() => hitStrokeDistance(shape(line), { x: NaN, y: 0 }), /finite/);
});

test("dash work and finite coordinate budgets reject before unbounded splitting", () => {
  assert.throws(() => shape(line, { dash: new Array(1025).fill(1) }), /1024/);
  assert.throws(() => shape(line, { dash: [1e308, 1e308] }), /finite/);
  assert.throws(() => shape(line, { dash: [1e-12, 1e-12] }), /budget/);
  assert.throws(() => prepareHitStroke({ subpaths: new Array(MAX_HIT_STROKE_WORK + 1) }, { width: 1 }), /budget/);
  const huge = [{ op: "M", x: -1e308, y: 0 }, { op: "L", x: 1e308, y: 0 }];
  assert.throws(() => shape(huge), /finite/);
  const point = [{ op: "M", x: 1e308, y: 1e308 }, { op: "L", x: 1e308, y: 1e308 }];
  assert.throws(() => shape(point, { width: 1.7e308, lineCap: "round" }), /bounds/);
});

test("prepared footprints preserve caller-owned geometry and are deeply immutable", () => {
  const geometry = structuredClone(flattenPathCommands(corner)), style = { width: 4, dash: [5, 3] }, before = structuredClone({ geometry, style });
  const parts = prepareHitStroke(geometry, style);
  assert.deepEqual({ geometry, style }, before); assert.ok(Object.isFrozen(parts));
  assert.ok(Object.isFrozen(parts[0]) && Object.isFrozen(parts[0].points) && Object.isFrozen(parts[0].points[0]));
  geometry.subpaths[0].points[0].x = 999; style.dash[0] = 999;
  assert.equal(inside(parts, 12, 20), true);
});
