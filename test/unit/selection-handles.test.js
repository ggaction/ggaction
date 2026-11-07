import test from "node:test";
import assert from "node:assert/strict";
import { projectSelectionHandles } from "../../src/grammar/selectionHandles.js";

const bounds = { x: 20, y: 10, width: 200, height: 100 };
const linear = { type: "linear", domain: [0, 100], range: [20, 220] };
const input = (region, extra = {}) => ({ region, channels: { x: "x" }, scales: { x: linear }, bounds, ...extra });

test("selection handles forward authored bounds and preserve inclusivity without reading selected items", () => {
  const request = input({ x: { ranges: [{ min: 10, max: 40, minInclusive: false }] } }), before = structuredClone(request);
  const result = projectSelectionHandles(request);
  assert.deepEqual(result.handles, [{ handle: "x-min", point: { x: 40, y: 60 } }, { handle: "x-max", point: { x: 100, y: 60 } }]);
  assert.equal(result.region.x.ranges[0].minInclusive, false);
  assert.ok(Object.isFrozen(result.handles[0].point)); assert.deepEqual(request, before);
  const reversed = projectSelectionHandles(input(request.region, { scales: { x: { ...linear, range: [220, 20] } } }));
  assert.deepEqual(reversed.handles.map(value => value.point.x), [200, 140]);
});

test("xy corners and side centers retain domain endpoint names under reversed ranges", () => {
  const result = projectSelectionHandles(input({ x: { ranges: [{ min: 10, max: 40 }] }, y: { ranges: [{ min: 20, max: 60 }] } }, {
    channels: { x: "x", y: "y" }, scales: { x: linear, y: { type: "linear", domain: [0, 100], range: [110, 10] } }
  }));
  assert.equal(result.handles.length, 8);
  assert.deepEqual(result.handles.find(value => value.handle === "x-min-y-min").point, { x: 40, y: 90 });
  assert.deepEqual(result.handles.find(value => value.handle === "y-max").point, { x: 70, y: 50 });
});

test("log and epoch time use native forward math and literal domain units", () => {
  const log = projectSelectionHandles(input({ x: { ranges: [{ min: 10, max: 100 }] } }, {
    scales: { x: { type: "log", domain: [1, 1000], range: [0, 300], base: 10 } }
  }));
  assert.deepEqual(log.handles.map(value => value.point.x), [100, 200]);
  const origin = 1709251200000, day = 86400000;
  const time = projectSelectionHandles(input({ x: { ranges: [{ min: origin + day / 2, max: origin + day }] } }, {
    scales: { x: { type: "time", domain: [origin, origin + 2 * day], range: [20, 220] } }
  }));
  assert.deepEqual(time.handles.map(value => value.point.x), [70, 120]);
});

test("typed categorical runs use native band extents and never bridge missing categories", () => {
  const scale = { type: "band", domain: [1, "1", false], range: [0, 300], step: 100, bandwidth: 80,
    start: 10, paddingInner: .2, paddingOuter: .1, align: .5 };
  const project = values => projectSelectionHandles(input({ x: { values } }, { scales: { x: scale } }));
  assert.deepEqual(project(["1"]).handles.map(value => value.point.x), [110, 190]);
  assert.equal(project([1, false]), null); assert.equal(project(["missing"]), null); assert.equal(project([]), null);
  assert.deepEqual(project([1, "1"]).handles.map(value => value.point.x), [10, 190]);
});

test("empty, mismatched and degenerate regions do not invent an arbitrary handle", () => {
  assert.equal(projectSelectionHandles(input({ x: { ranges: [] } })), null);
  assert.equal(projectSelectionHandles(input({ y: { ranges: [{ min: 1, max: 2 }] } })), null);
  assert.equal(projectSelectionHandles(input({ x: { ranges: [{ min: -1, max: 10 }] } })), null);
  assert.throws(() => projectSelectionHandles(input({ x: { ranges: [{ min: 10, max: 10 }] } })), /ambiguous/);
  assert.throws(() => projectSelectionHandles(input({ x: { values: ["a"] } }, {
    scales: { x: { type: "point", domain: ["a"], range: [0, 100], step: 100, bandwidth: 0, start: 50, padding: .5, align: .5 } }
  })), /ambiguous/);
});

test("directed theta endpoints retain a wrapped native arc and reject contradictory saved angles", () => {
  const scale = { type: "linear", domain: [0, 360], range: [0, 360] };
  const request = { channels: { theta: "theta" }, scales: { theta: scale }, bounds,
    polarFrame: { centerX: 100, centerY: 100, availableRadius: 50 },
    region: { theta: { ranges: [{ min: 0, max: 90 }, { min: 270, max: 360 }] } } };
  const result = projectSelectionHandles(request);
  assert.deepEqual(result.angles, [270, 90]);
  assert.deepEqual(result.handles.map(value => value.point.x), [50, 150]);
  assert.ok(result.handles.every(value => Math.abs(value.point.y - 100) < 1e-12));
  assert.equal(projectSelectionHandles({ ...request, screenAngles: [0, Math.PI / 2] }), null);
  assert.deepEqual(projectSelectionHandles({ ...request, screenAngles: [3 * Math.PI / 2, Math.PI / 2] }), result);
});
