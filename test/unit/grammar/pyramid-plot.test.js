import assert from "node:assert/strict";
import test from "node:test";
import { normalizePyramidPlot, validatePyramidBinding, readPyramidStages } from "../../../src/grammar/pyramid/plot.js";
const basic = { stage: "stage", value: "value" };
const normalized = patch => normalizePyramidPlot({ ...basic, ...patch });
function stored(patch) { const { binding, config } = normalized(patch); return { layer: { pyramid: binding, encoding: {} }, config }; }

test("Pyramid grammar separates meaning from paint and restores canonical state", () => {
  const first = normalized({ labels: { content: "value", format: ".2f", fontFamily: "serif", fontSize: 18, fontWeight: 700 }, stages: { fill: "red", stroke: "blue", strokeWidth: 2, opacity: .4 }, clip: false });
  assert.deepEqual(first.binding.labels, { content: "value", format: ".2f" });
  assert.equal(first.config.labels.content, undefined); assert.ok(Object.isFrozen(first.config.stages));
  validatePyramidBinding({ pyramid: first.binding }, first.config);
  const area = normalizePyramidPlot({ encoding: "area" }, first.binding, first.config);
  assert.equal(area.binding.options.lastStage, undefined); assert.equal(area.binding.options.taperRatio, .8);
  const width = normalizePyramidPlot({ encoding: "width", lastStage: "point" }, area.binding, area.config);
  assert.equal(width.binding.options.taperRatio, undefined); assert.equal(width.binding.options.lastStage, "point");
  const hidden = normalizePyramidPlot({ labels: false }, width.binding, width.config);
  validatePyramidBinding({ pyramid: hidden.binding, encoding: {} }, hidden.config);
  assert.equal(normalizePyramidPlot({ labels: {} }, hidden.binding, hidden.config).binding.labels.content, "stage");
  assert.deepEqual(readPyramidStages([{ stage: false, value: 0 }, { stage: 7, value: 2 }, { stage: "", value: 1 }], ["a", "b", "c"], first.binding), [{key:"a",value:0},{key:"b",value:2},{key:"c",value:1}]);
});

test("Pyramid grammar rejects invalid options and descriptors without executing getters", () => {
  for (const patch of [{ bad: true }, { stage: "" }, { value: "" }, { stage: undefined }, { clip: 1 }, { labels: null }, { labels: { bad: 1 } }, { labels: { fill: undefined } }, { labels: { content: "missing" } }, { labels: { format: 0 } }, { labels: { content: "percent" } }, { stages: { opacity: undefined } }, { stages: { bad: true } }, { stages: { stroke: "" } }, { stages: { strokeWidth: -1 } }, { stages: { opacity: -1 } }, { labels: { fontSize: 0 } }, { labels: { fontFamily: "" } }, { labels: { fontWeight: {} } }]) assert.throws(() => normalized(patch), JSON.stringify(patch));
  let reads = 0; const options = { ...basic }; Object.defineProperty(options, "clip", { enumerable:true, get() { reads++; return true; } });
  assert.throws(() => normalizePyramidPlot(options), /data|accessor|property/i); assert.equal(reads, 0);
  for (const stage of [null, undefined, {}, [], Infinity, NaN]) assert.throws(() => readPyramidStages([{ stage, value: 1 }], ["a"], basic), /scalar/);
  assert.throws(() => readPyramidStages([{ value: 1 }], ["a"], basic), /scalar/);
  for (const value of [-1, Infinity, NaN, "3", null, undefined]) assert.throws(() => readPyramidStages([{stage:"a",value}], ["a"], basic), /nonnegative/);
});

test("Pyramid restoration rejects noncanonical, contradictory and foreign bindings", () => {
  const mutations = [
    x => x.layer.pyramid.extra = 1, x => x.config.extra = 1,
    x => x.layer.pyramid.options.width = 1, x => x.layer.pyramid.labels.bad = 1,
    x => x.config.labels = false, x => x.layer.pyramid.labels = false,
    x => delete x.layer.pyramid.options.orientation, x => delete x.config.stages.opacity,
    x => x.layer.conditionals = {}, x => x.layer.source = {}, x => x.layer.encoding.x = {},
    x => x.config.clip = undefined
  ];
  for (const mutate of mutations) { const x = structuredClone(stored()); mutate(x); assert.throws(() => validatePyramidBinding(x.layer, x.config)); }
  const x = stored({ labels: false }); validatePyramidBinding(x.layer, x.config);
});
