import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResponsiveLabels } from "../../../src/grammar/responsiveLabels.js";
import { evaluateResponsiveLayout,
  RESPONSIVE_ITERATIONS, RESPONSIVE_TOLERANCE } from "../../../src/layout/responsivePolicy.js";

const box = (left, right, top, bottom) => ({ left, right, top, bottom });
const frame = (offset = 0) => ({
  plot: box(20 + offset, 380, 20, 260),
  occupied: box(4, 396, 4, 296),
  lanes: [{ id: "footer", bounds: box(20 + offset, 380, 270, 290) },
    { id: "header", bounds: box(20, 380, 4, 16) }]
});
const options = { canvas: { width: 400, height: 300 }, minPlotSize: { width: 160, height: 120 } };
const evaluate = passes => evaluateResponsiveLayout(passes, options);

test("label intent owns the fixed sequence and explicit normalized candidates", () => {
  assert.deepEqual(normalizeResponsiveLabels({}), {
    sequence: ["wrap", "skip", "rotate"], maxLines: 2, skipStride: 2,
    rotationCandidates: [-Math.PI / 4, -Math.PI / 2]
  });
  const input = { sequence: ["wrap", "skip", "rotate"], maxLines: 3, skipStride: 4,
    rotationCandidates: [{ value: 90, unit: "degrees" }, -0] };
  const result = normalizeResponsiveLabels(input);
  assert.deepEqual(result.rotationCandidates, [Math.PI / 2, 0]);
  assert.equal(result.maxLines, 3);
  assert.equal(result.skipStride, 4);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.sequence));
  assert.ok(Object.isFrozen(result.rotationCandidates));
  input.sequence.reverse(); input.rotationCandidates[0].value = 180;
  assert.deepEqual(result.sequence, ["wrap", "skip", "rotate"]);
  assert.equal(result.rotationCandidates[0], Math.PI / 2);
});

test("the numeric limits have exact closed boundaries", () => {
  assert.equal(RESPONSIVE_ITERATIONS, 4);
  assert.equal(RESPONSIVE_TOLERANCE, 0.1);
  assert.equal(normalizeResponsiveLabels({ maxLines: 10000, skipStride: 10000 }).maxLines, 10000);
  for (const key of ["maxLines", "skipStride"]) for (const value of [null, undefined, 0, -1, 1.5, NaN, Infinity, "2", 10001]) {
    assert.throws(() => normalizeResponsiveLabels({ [key]: value }));
  }
  assert.throws(() => normalizeResponsiveLabels({ skipStride: 1 }), /at least 2/);
  for (const sequence of [null, [], ["wrap"], ["skip", "wrap", "rotate"], ["wrap", "skip", "rotate", "wrap"]]) {
    assert.throws(() => normalizeResponsiveLabels({ sequence }));
  }
  for (const rotationCandidates of [null, [], [0, -0], [1, 1], [NaN], [Infinity], ["90"],
    [{ value: Number.MAX_VALUE, unit: "degrees" }], Array(10001).fill(0)]) {
    assert.throws(() => normalizeResponsiveLabels({ rotationCandidates }));
  }
  assert.throws(() => normalizeResponsiveLabels({ maxLine: 2 }), /Unknown/);
});

test("all plain-data boundaries reject getters without executing them", () => {
  let reads = 0;
  const getter = () => { reads += 1; throw new Error("executed getter"); };
  const hostile = Object.defineProperty({}, "maxLines", { enumerable: true, get: getter });
  assert.throws(() => normalizeResponsiveLabels(hostile), /own data/);
  const array = [0]; Object.defineProperty(array, "0", { enumerable: true, get: getter });
  assert.throws(() => normalizeResponsiveLabels({ rotationCandidates: array }), /own data/);
  const rotation = Object.defineProperty({ unit: "degrees" }, "value", { enumerable: true, get: getter });
  assert.throws(() => normalizeResponsiveLabels({ rotationCandidates: [rotation] }), /own data/);
  assert.throws(() => normalizeResponsiveLabels({ [Symbol("unknown")]: 1 }), /own data/);
  assert.throws(() => normalizeResponsiveLabels(Object.defineProperty({}, "maxLines", { value: 2 })), /own data/);
  assert.throws(() => normalizeResponsiveLabels(Object.create({ maxLines: 2 })), /plain/);
  assert.throws(() => normalizeResponsiveLabels({ rotationCandidates: Array(1) }), /dense/);
  const sample = frame(); Object.defineProperty(sample.plot, "left", { enumerable: true, get: getter });
  assert.throws(() => evaluate([sample]), /own data/);
  assert.equal(reads, 0);
});

test("one measured pass requests another without assuming convergence", () => {
  const input = frame(), before = structuredClone(input), result = evaluate([input]);
  assert.equal(result.status, "continue");
  assert.equal(result.reason, "measuring");
  assert.equal(result.iterations, 1);
  assert.equal(result.change, null);
  assert.deepEqual(result.requiredBounds, box(0, 400, 0, 300));
  assert.deepEqual(input, before);
  input.plot.left = 200; input.lanes.reverse();
  assert.equal(result.snapshot.plot.left, 20);
  assert.equal(result.snapshot.lanes[0].id, "footer");
  assert.ok(Object.isFrozen(result.snapshot.lanes[0].bounds));
});

test("a literal measured contraction converges in three passes", () => {
  const result = evaluate([frame(0), frame(1), frame(1.05)]);
  assert.equal(result.status, "satisfied");
  assert.equal(result.reason, "converged");
  assert.equal(result.iterations, 3);
  assert.ok(Math.abs(result.change - 0.05) < 1e-12);
  assert.deepEqual(result.snapshot.plot, box(21.05, 380, 20, 260));
  assert.deepEqual(result.requiredPlotSize, { width: 160, height: 120 });
});

test("the tolerance is inclusive and all concrete lanes participate", () => {
  const base = frame(), at = frame(), above = frame();
  base.lanes[0].bounds.left = 0;
  at.lanes[0].bounds.left = 0.1;
  above.lanes[0].bounds.left = 0.1 + Number.EPSILON;
  assert.equal(evaluate([base, at]).status, "satisfied");
  assert.equal(evaluate([base, above]).status, "continue");
  const occupied = frame(); occupied.occupied.left = 4.2;
  assert.equal(evaluate([frame(), occupied]).status, "continue");
});

test("an A-B-A layout oscillation fails with its current required bounds", () => {
  const result = evaluate([frame(0), frame(2), frame(0)]);
  assert.equal(result.status, "unsatisfied");
  assert.equal(result.reason, "oscillation");
  assert.equal(result.iterations, 3);
  assert.equal(result.change, 2);
  assert.deepEqual(result.requiredBounds, box(0, 400, 0, 300));
  assert.equal(evaluate([frame(0), frame(2), frame(4), frame(2)]).reason, "oscillation");
});

test("four distinct unresolved passes fail rather than silently accepting a fifth", () => {
  const result = evaluate([frame(0), frame(1), frame(2), frame(3)]);
  assert.equal(result.status, "unsatisfied");
  assert.equal(result.reason, "iteration-limit");
  assert.equal(result.iterations, 4);
  assert.equal(result.change, 1);
  assert.throws(() => evaluate(Array(5).fill(frame())), /one through 4/);
});

test("stable topology compares ids rather than input enumeration order", () => {
  const reordered = frame(); reordered.lanes.reverse();
  assert.equal(evaluate([frame(), reordered]).status, "satisfied");
  const renamed = frame(); renamed.lanes[0].id = "source-note";
  assert.equal(evaluate([frame(), renamed]).change, null);
  assert.equal(evaluate([frame(), renamed]).status, "continue");
  assert.equal(evaluate([frame(), renamed, renamed]).status, "satisfied");
  const fewer = frame(); fewer.lanes.pop();
  assert.equal(evaluate([frame(), fewer]).change, null);
  const empty = frame(); empty.lanes = [];
  assert.equal(evaluate([empty, empty]).status, "satisfied");
});

test("stable overflow includes every guide even if occupied bounds omitted it", () => {
  const sample = frame();
  sample.lanes[0].bounds = box(-7, 410, 270, 320);
  const result = evaluate([sample, sample]);
  assert.equal(result.reason, "insufficient-space");
  assert.deepEqual(result.requiredBounds, box(-7, 410, 0, 320));
  assert.equal(result.status, "unsatisfied");
  assert.deepEqual(options.canvas, { width: 400, height: 300 });
});

test("minimum plot size reports its independent exact missing extent", () => {
  const sample = frame(); sample.plot = box(20, 120, 20, 100);
  const result = evaluate([sample, sample]);
  assert.equal(result.reason, "insufficient-space");
  assert.deepEqual(result.requiredBounds, box(0, 460, 0, 340));
  const exact = frame(); exact.plot = box(20, 180, 20, 140);
  assert.equal(evaluate([exact, exact]).status, "satisfied");
});

test("plot and occupied extents outside a fixed Canvas cannot pass", () => {
  for (const property of ["plot", "occupied"]) for (const side of ["left", "right", "top", "bottom"]) {
    const sample = frame(); sample[property][side] = { left: -1, right: 401, top: -1, bottom: 301 }[side];
    assert.equal(evaluate([sample, sample]).reason, "insufficient-space");
  }
});

test("invalid shapes and arithmetic overflow never become geometry", () => {
  for (const passes of [null, [], Array(1), [null], [{ ...frame(), extra: 1 }]]) assert.throws(() => evaluate(passes));
  for (const property of ["canvas", "minPlotSize"]) for (const value of [null, {}, { width: 0, height: 1 }, { width: 1, height: Infinity }]) {
    assert.throws(() => evaluateResponsiveLayout([frame()], { ...options, [property]: value }));
  }
  for (const value of [null, {}, box(NaN, 30, 0, 1), box(30, 20, 0, 1), box(0, 0, 0, 1), box(-Number.MAX_VALUE, Number.MAX_VALUE, 0, 1)]) {
    assert.throws(() => evaluate([{ ...frame(), plot: value }]));
  }
  const zero = frame(); zero.occupied = box(-0, 0, -0, 0);
  assert.equal(Object.is(evaluate([zero, zero]).snapshot.occupied.left, -0), false);
  const duplicate = frame(); duplicate.lanes[1].id = duplicate.lanes[0].id;
  assert.throws(() => evaluate([duplicate]), /distinct/);
  assert.throws(() => evaluate([{ ...frame(), lanes: [{ id: "", bounds: box(0, 1, 0, 1) }] }]), /non-empty/);
  assert.throws(() => evaluate([{ ...frame(), lanes: Array(10001).fill({ id: "x", bounds: box(0, 1, 0, 1) }) }]), /must not exceed/);
  assert.throws(() => evaluateResponsiveLayout([frame()], { canvas: { width: Number.MAX_VALUE, height: 300 }, minPlotSize: { width: Number.MAX_VALUE, height: 120 } }), /finite/);
});

test("a huge finite translation cannot produce an infinite convergence metric", () => {
  const a = frame(), b = frame();
  a.occupied = box(-1e308, -1e308, 0, 1); b.occupied = box(1e308, 1e308, 0, 1);
  const result = evaluate([a, b]);
  assert.equal(result.change, null);
  assert.equal(result.status, "continue");
  assert.ok(Object.values(result.requiredBounds).every(Number.isFinite));
});

test("containment admits floating point rotation roundoff but never a visible subpixel crop", () => {
  const roundoff = frame(); roundoff.occupied.left = -Number.EPSILON * 4;
  assert.equal(evaluate([roundoff, roundoff]).status, "satisfied");
  const crop = frame(); crop.occupied.left = -0.001;
  assert.equal(evaluate([crop, crop]).reason, "insufficient-space");
});
