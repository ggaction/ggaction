import assert from "node:assert/strict";
import test from "node:test";
import { validateFillPaint, validateConcreteFillPaint, resolveFillPaint, translateFillPaint } from "../../../src/grammar/paint.js";
import { patternFillGeometry, validatePatternWork } from "../../../src/grammar/patterns.js";
import { MAX_WORK_ITEMS } from "../../../src/core/validation.js";

const bounds = { left: 10, right: 30, top: 20, bottom: 40 };
const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, radius: .5,
  stops: [{ offset: 0, color: "#f008" }, { offset: 1, color: "steelblue" }] };

test("authored patterns resolve explicit plot and object origins once without retaining mutable inputs", () => {
  const input = { type: "pattern", style: "cross", phase: [-1, 9] };
  const normalized = validateFillPaint(input);
  const concrete = resolveFillPaint(input, { bounds, plotOrigin: [100, 200] });
  assert.deepEqual(concrete, { type: "pattern", style: "cross", pitch: 8, strokeWidth: 1,
    phase: [7, 1], foreground: "#000000", background: "transparent", origin: { x: 107, y: 201 } });
  assert.equal(normalized.coordinateSpace, "plot");
  assert.equal(validateConcreteFillPaint(concrete), concrete);
  assert.deepEqual(resolveFillPaint({ ...input, coordinateSpace: "object" }, { bounds }).origin, { x: 17, y: 21 });
  input.phase[0] = 0;
  assert.deepEqual(concrete.phase, [7, 1]);
  assert.ok(Object.isFrozen(concrete) && Object.isFrozen(concrete.origin));
  assert.throws(() => resolveFillPaint(input, { bounds }), /explicit plot/);
  assert.throws(() => validateConcreteFillPaint(input), /normalized options/);
  assert.throws(() => validateFillPaint(concrete), /origin/);
  assert.throws(() => validateConcreteFillPaint({ ...concrete, phase: [-1, 1] }), /normalized/);
  assert.throws(() => validateConcreteFillPaint({ ...concrete, origin: { x: Infinity, y: 0 } }), /finite/);
  assert.throws(() => resolveFillPaint(input, { bounds: { ...bounds, right: 0 } }), /ordered/);
});

test("materialized origin translations preserve phase and reject overflow", () => {
  const concrete = resolveFillPaint({ type: "pattern" }, { bounds, plotOrigin: [0, 0] });
  assert.equal(translateFillPaint(concrete, 0, 0), concrete);
  assert.equal(translateFillPaint("red", 10, 20), "red");
  assert.deepEqual(translateFillPaint(concrete, -10, 20).origin, { x: -10, y: 20 });
  assert.deepEqual(concrete.origin, { x: 0, y: 0 });
  assert.throws(() => translateFillPaint({ ...concrete, origin: { x: Number.MAX_VALUE, y: 0 } }, Number.MAX_VALUE, 0), /finite/);
});

test("radial fills normalize the focal point and enforce object-unit points and shared colors", () => {
  const normalized = validateFillPaint(radial);
  assert.deepEqual(normalized.focal, { x: .5, y: .5 });
  assert.ok(Object.isFrozen(normalized.stops[0]));
  assert.deepEqual(validateConcreteFillPaint(normalized), normalized);
  assert.throws(() => validateConcreteFillPaint(radial), /explicit focal/);
  for (const value of [{ ...radial, center: { x: 1.1, y: .5 } }, { ...radial, focal: { x: 1, y: 1 } },
    { ...radial, radius: 0 }, { ...radial, stops: [{ offset: 0, color: "currentColor" }, { offset: 1, color: "blue" }] }]) {
    assert.throws(() => validateFillPaint(value));
  }
  assert.equal(validateFillPaint({ ...radial, focal: { x: 0, y: .5 } }).focal.x, 0);
});

test("new paint boundaries do not invoke own or inherited accessors", () => {
  let calls = 0;
  const getter = () => { calls += 1; return 1; };
  assert.throws(() => validateFillPaint({ get type() { return getter(); } }), /data properties/);
  assert.throws(() => resolveFillPaint({ type: "pattern" }, { bounds: { get left() { return getter(); } } }), /data properties/);
  const descriptors = Object.getOwnPropertyDescriptors(Object.prototype);
  try {
    for (const key of ["pitch", "radius", "left", "focal"]) Object.defineProperty(Object.prototype, key, { configurable: true, get: getter });
    assert.equal(validateFillPaint({ type: "pattern" }).pitch, 8);
    assert.throws(() => validateFillPaint({ type: "radial-gradient", center: { x: 0, y: 0 }, stops: radial.stops }), /requires radius/);
    assert.throws(() => patternFillGeometry({}, { right: 1, top: 0, bottom: 1 }, [0, 0]), /finite/);
  } finally {
    for (const key of ["pitch", "radius", "left", "focal"]) {
      delete Object.prototype[key]; if (descriptors[key]) Object.defineProperty(Object.prototype, key, descriptors[key]);
    }
  }
  assert.equal(calls, 0);
});

test("bounded pattern lowering emits literal winding, zero ink and unique lattice dots", () => {
  const solid = patternFillGeometry({}, bounds, [0, 0]);
  assert.deepEqual(solid, { commands: [{ op: "M", x: 10, y: 20 }, { op: "L", x: 30, y: 20 },
    { op: "L", x: 30, y: 40 }, { op: "L", x: 10, y: 40 }, { op: "Z" }], tiles: 1, workItems: 5 });
  assert.deepEqual(patternFillGeometry({ style: "cross", strokeWidth: 0 }, bounds, [0, 0]), { commands: [], tiles: 0, workItems: 0 });
  assert.deepEqual(patternFillGeometry({}, { ...bounds, right: 10 }, [0, 0]), { commands: [], tiles: 0, workItems: 0 });
  const dots = patternFillGeometry({ style: "dots", pitch: 10, strokeWidth: 2 }, bounds, [0, 0]);
  assert.equal(dots.tiles, 16);
  assert.equal(dots.commands.length, 96);
  const moves = dots.commands.filter(command => command.op === "M");
  assert.equal(new Set(moves.map(command => `${command.x},${command.y}`)).size, 16);
  assert.deepEqual(moves[0], { op: "M", x: 0, y: 9 });
  assert.ok(Object.isFrozen(dots.commands) && Object.isFrozen(dots.commands[0]));
  const horizontal = patternFillGeometry({ style: "horizontal", pitch: 10, strokeWidth: 2 }, bounds, [0, 0]);
  assert.deepEqual(horizontal.commands.slice(0, 5), [{ op: "M", x: 0, y: 10 }, { op: "L", x: 10, y: 10 },
    { op: "L", x: 10, y: 11 }, { op: "L", x: 0, y: 11 }, { op: "Z" }]);
});

test("pattern repeat allocation, command and cumulative work limits fail before enumeration", () => {
  assert.throws(() => patternFillGeometry({ style: "dots", pitch: .01, strokeWidth: .001 }, bounds, [0, 0]), /tile count/);
  assert.throws(() => patternFillGeometry({ style: "cross", pitch: .4, strokeWidth: .1 }, bounds, [0, 0]), /command count/);
  assert.throws(() => patternFillGeometry({ style: "dots", pitch: 1e-300, strokeWidth: 1e-301 }, bounds, [0, 0]), /integer precision/);
  assert.doesNotThrow(() => validatePatternWork(MAX_WORK_ITEMS));
  assert.throws(() => validatePatternWork(MAX_WORK_ITEMS + 1), /must not exceed/);
});
