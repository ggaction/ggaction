import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResponsiveCanvas, validateResponsiveCanvasState } from "../../../src/grammar/responsiveCanvas.js";
import { normalizeResponsiveLabels, validateResponsiveLabelState } from "../../../src/grammar/responsiveLabels.js";

const box = (left = 20, right = 380, top = 20, bottom = 280) => ({ left, right, top, bottom });
const canvas = { width: 400, height: 300 };
const config = () => ({ margin: { left: 20, right: 20, top: 20, bottom: 20 }, responsive: normalizeResponsiveCanvas({}),
  responsiveResult: { status: "satisfied", reason: "converged", iterations: 2, change: 0,
    requiredBounds: box(0, 400, 0, 300), requiredPlotSize: { width: 160, height: 120 },
    snapshot: { plot: box(), occupied: box(), lanes: [{ id: "x", bounds: box(20, 380, 280, 295) }] } } });
const labels = () => ({ rotation: 0, responsive: normalizeResponsiveLabels({}),
  responsiveResult: { stage: "wrap", reason: "label-overlap", indices: [0, 1], rotation: 0, maxWidth: 80, wrap: "word" } });

test("stored responsive decisions accept canonical values independently of object key order", () => {
  const input = { minPlotSize: { height: 120, width: 160 } }, normalized = normalizeResponsiveCanvas(input);
  assert.ok(Object.isFrozen(normalized.minPlotSize));
  input.minPlotSize.width = 1;
  assert.equal(normalized.minPlotSize.width, 160);
  assert.equal(normalizeResponsiveCanvas(false), undefined);
  const state = config();
  state.responsive = { minPlotSize: { height: 120, width: 160 } };
  state.responsiveResult.requiredPlotSize = { height: 120, width: 160 };
  validateResponsiveCanvasState(state, canvas);
  validateResponsiveCanvasState(undefined, undefined);
  validateResponsiveLabelState(undefined);
  validateResponsiveLabelState({ responsive: normalizeResponsiveLabels({}) });
  const value = labels(); value.responsive = Object.fromEntries(Object.entries(value.responsive).reverse());
  validateResponsiveLabelState(value);
  validateResponsiveLabelState({ rotation: 0, responsive: value.responsive,
    responsiveResult: { stage: "native", reason: "native-fit", indices: [], rotation: 0 } });
  validateResponsiveLabelState({ ...labels(), responsiveResult: { ...labels().responsiveResult, stage: "rotate", rotation: -Math.PI / 4, indices: [0, 2] } });
});

test("stored Canvas result validation rejects invalid topology, bounds, minima and transient results", () => {
  assert.throws(() => validateResponsiveCanvasState({ responsiveResult: config().responsiveResult }, canvas));
  const mutations = [
    state => state.responsive = false,
    state => state.responsive = {},
    state => state.plot = { width: 1, height: 1 },
    state => state.responsiveResult = undefined,
    state => state.responsiveResult.status = "continue",
    state => state.responsiveResult.reason = "measuring",
    state => state.responsiveResult.iterations = 1,
    state => state.responsiveResult.iterations = 5,
    state => state.responsiveResult.iterations = 2.5,
    state => state.responsiveResult.change = -1,
    state => state.responsiveResult.change = NaN,
    state => state.responsiveResult.change = 0.2,
    state => state.responsiveResult.requiredPlotSize.width = 161,
    state => state.responsiveResult.requiredBounds.left = -1,
    state => state.responsiveResult.requiredBounds.right = 0,
    state => state.responsiveResult.snapshot.plot.right = 20,
    state => state.responsiveResult.snapshot.plot.left = 19,
    state => state.responsiveResult.snapshot.plot.top = 19,
    state => state.responsiveResult.snapshot.plot.right = 381,
    state => state.responsiveResult.snapshot.plot.bottom = 281,
    state => state.responsiveResult.snapshot.plot.right = 100,
    state => state.responsiveResult.snapshot.plot.bottom = 100,
    state => state.responsiveResult.snapshot.occupied.left = -1,
    state => state.responsiveResult.snapshot.occupied.top = -1,
    state => state.responsiveResult.snapshot.occupied.right = 401,
    state => state.responsiveResult.snapshot.occupied.bottom = 301,
    state => state.responsiveResult.snapshot.occupied.left = -Number.MAX_VALUE,
    state => state.responsiveResult.snapshot.occupied.right = NaN,
    state => state.responsiveResult.snapshot.occupied.bottom = 19,
    state => state.responsiveResult.snapshot.lanes.push(state.responsiveResult.snapshot.lanes[0]),
    state => state.responsiveResult.snapshot.lanes[0].id = "",
    state => state.responsiveResult.snapshot.lanes = [],
  ];
  // Empty lanes are valid; no guide is synthesized while restoring.
  const empty = config(); mutations.pop()(empty); validateResponsiveCanvasState(empty, canvas);
  for (const mutate of mutations) { const value = config(); mutate(value); assert.throws(() => validateResponsiveCanvasState(value, canvas)); }
  for (const invalid of [undefined, { width: 0, height: 300 }, { width: 400, height: Infinity }]) {
    assert.throws(() => validateResponsiveCanvasState(config(), invalid));
  }
});

test("stored label choices preserve raw order, declared rotations, explicit widths and stage reasons", () => {
  assert.throws(() => validateResponsiveLabelState({ responsiveResult: labels().responsiveResult }));
  const mutations = [
    state => state.responsive = {}, state => state.responsiveResult.stage = "resize",
    state => state.responsiveResult.reason = "guess", state => state.responsiveResult.reason = "native-fit",
    state => state.responsiveResult.rotation = NaN, state => state.responsiveResult.rotation = 1,
    state => { state.responsiveResult.stage = "rotate"; state.responsiveResult.rotation = 1; },
    state => state.responsiveResult.indices = [-1], state => state.responsiveResult.indices = [0, 0],
    state => state.responsiveResult.indices = [1, 0], state => state.responsiveResult.indices = [0.5],
    state => state.responsiveResult.indices = [10000], state => state.responsiveResult.indices = Array(10001).fill(0),
    state => { state.responsiveResult.stage = "skip"; state.responsiveResult.indices = [1]; },
    state => state.responsiveResult.maxWidth = 0, state => state.responsiveResult.maxWidth = Infinity,
    state => state.responsiveResult.wrap = "truncate", state => state.maxWidth = 90,
    state => delete state.responsiveResult.maxWidth,
    state => { delete state.responsiveResult.maxWidth; delete state.responsiveResult.wrap; }
  ];
  for (const mutate of mutations) { const value = labels(); mutate(value); assert.throws(() => validateResponsiveLabelState(value)); }
  validateResponsiveLabelState({ ...labels(), maxWidth: 80 });
  const native = { ...labels(), responsiveResult: { stage: "native", reason: "native-fit", indices: [0], rotation: 0, wrap: "word" } };
  assert.throws(() => validateResponsiveLabelState(native), /requires a width/);
  let reads = 0;
  const hostile = { ...labels(), responsiveResult: Object.defineProperty({}, "stage", { enumerable: true, get() { reads++; return "native"; } }) };
  assert.throws(() => validateResponsiveLabelState(hostile), /accessor/);
  assert.equal(reads, 0);
});
