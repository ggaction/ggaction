import test from "node:test";
import assert from "node:assert/strict";
import { resolveAxisTitleAlong } from "../../../src/grammar/axisGeometry.js";
import { resolveBandGridBoundaries } from "../../../src/grammar/gridGeometry.js";
import { parallelAxisPosition, resolveParallelGuideGeometry } from "../../../src/grammar/parallelGuides.js";

const band = { type: "band", domain: [1, "1"], range: [0, 40], step: 20,
  bandwidth: 20, start: 0, paddingInner: 0, paddingOuter: 0, align: .5 };
const member = (value, edge) => ({ value, edge });

test("shared band edges retain every typed member and the native first dash owner", () => {
  const values = [1, "1"], before = JSON.stringify([values, band]);
  assert.deepEqual(resolveBandGridBoundaries(values, band), [
    { position: 0, owner: 1, members: [member(1, "start")] },
    { position: 20, owner: 1, members: [member(1, "end"), member("1", "start")] },
    { position: 40, owner: "1", members: [member("1", "end")] }
  ]);
  const reverseSelection = resolveBandGridBoundaries(["1", 1], band);
  assert.equal(reverseSelection[1].owner, "1");
  assert.deepEqual(reverseSelection[1].members, [member("1", "start"), member(1, "end")]);
  assert.equal(JSON.stringify([values, band]), before);
});

test("band membership preserves reversed ranges, gaps, subsets and empty selection", () => {
  const reverse = { ...band, range: [40, 0], step: -20, start: 40 };
  assert.deepEqual(resolveBandGridBoundaries([1, "1"], reverse).map(value => value.position), [40, 20, 0]);
  assert.deepEqual(resolveBandGridBoundaries(["1"], band).map(value => value.position), [20, 40]);
  assert.deepEqual(resolveBandGridBoundaries([], band), []);
  const gap = { ...band, bandwidth: 10, paddingInner: .5 };
  assert.deepEqual(resolveBandGridBoundaries([1, "1"], gap).map(value => value.position), [0, 10, 20, 30]);
  assert.ok(resolveBandGridBoundaries([1, "1"], gap).every(value => value.members.length === 1));
  assert.throws(() => resolveBandGridBoundaries([false], band), /outside/);
});

test("axis title anchors keep native range roles and map quantitative values through the scale", () => {
  const scale = { type: "log", domain: [1, 1000], range: [20, 320], base: 10 };
  assert.equal(resolveAxisTitleAlong(scale, { at: "center" }), 170);
  assert.equal(resolveAxisTitleAlong(scale, { at: "start", alongOffset: -2 }), 18);
  assert.equal(resolveAxisTitleAlong(scale, { at: "end", alongOffset: 4 }), 324);
  assert.ok(Math.abs(resolveAxisTitleAlong(scale, { at: 10 }) - 120) < 1e-12);
  assert.throws(() => resolveAxisTitleAlong(scale, { at: 0 }), /inside/);
  assert.throws(() => resolveAxisTitleAlong(scale, { at: 1001 }), /inside/);
  assert.equal(resolveAxisTitleAlong(band, { at: 1 }), 10);
  assert.throws(() => resolveAxisTitleAlong(band, { at: 2 }), /inside/);
  const huge = { ...scale, range: [Number.MAX_VALUE / 2, Number.MAX_VALUE] };
  assert.equal(resolveAxisTitleAlong(huge, { at: "center" }), Number.MAX_VALUE * .75);
});

const bounds = { x: 20, y: 30, width: 400, height: 200 };
const axis = { field: "amount", x: 20, title: "Amount", config: {
  title: { offset: 12 }, ticks: { length: 6 }, labels: { offset: 9 }
}, ticks: { values: [0, 5], y: [230, 130] }, labels: { values: [0, 5], y: [230, 130], text: ["0", "5"] } };

test("Parallel axis slots and all native component geometry follow the declared field placement", () => {
  assert.deepEqual([0, 1, 2].map(index => parallelAxisPosition(bounds, index, 3)), [20, 220, 420]);
  // A prepared intermediate field slot is normalized layout meaning, not an item index key.
  assert.equal(parallelAxisPosition(bounds, .5, 3), 120);
  const before = JSON.stringify(axis);
  assert.deepEqual(resolveParallelGuideGeometry("line", [axis], bounds), { length: 1, x1: [20], y1: 30, x2: [20], y2: 230 });
  assert.deepEqual(resolveParallelGuideGeometry("ticks", [axis], bounds), { length: 2, x1: [17, 17], y1: [230, 130], x2: [23, 23], y2: [230, 130] });
  assert.deepEqual(resolveParallelGuideGeometry("labels", [axis], bounds), { length: 2, x: [11, 11], y: [230, 130], text: ["0", "5"], textAlign: "right", textBaseline: "middle" });
  assert.deepEqual(resolveParallelGuideGeometry("title", [axis], bounds), { length: 1, x: [20], y: 18, text: ["Amount"], textAlign: "center", textBaseline: "middle" });
  assert.equal(JSON.stringify(axis), before);
});

test("Parallel geometry preserves explicit per-field alignment and empty native collections", () => {
  const second = { ...axis, x: 420, title: "Ratio", config: {
    ...axis.config, title: { offset: 20, align: "left" }, labels: { offset: 12, align: "center" }
  } };
  const titles = resolveParallelGuideGeometry("title", [axis, second], bounds);
  assert.deepEqual(titles.y, [18, 10]);
  assert.deepEqual(titles.textAlign, ["center", "left"]);
  assert.deepEqual(resolveParallelGuideGeometry("labels", [second], bounds).textAlign, "center");
  assert.deepEqual(resolveParallelGuideGeometry("title", [], bounds), {
    length: 0, x: [], y: [], text: [], textAlign: [], textBaseline: "middle"
  });
  assert.equal(resolveParallelGuideGeometry("ticks", [{ ...axis, ticks: { values: [], y: [] } }], bounds).length, 0);
});
