import assert from "node:assert/strict";
import test from "node:test";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { categoricalLegendLabels, resolveCategoricalLegendConfig, resolveEffectiveLegendBlockConfig, hasExactLegendSamplingForScale } from "../../../src/materialization/guides/legendConfig.js";

const config = (patch = {}) => ({ kind: "color", channels: ["color"], target: "points", domain: [1, "1", false], labels: { fontSize: 10 }, ...patch });
const program = legend => ({ guideConfigs: { legend } });

test("categorical lookup requires explicit ownership when ambiguous and retains typed label values", () => {
  const stored = cloneAndFreeze(config({ labelMap: [{ value: 1, label: "Number" }, { value: "1", label: "" }], defaultLabelMap: [{ value: 1, label: "Default" }, { value: false, label: "False" }] }));
  assert.deepEqual(categoricalLegendLabels(stored), ["Number", "", "False"]);
  assert.deepEqual(categoricalLegendLabels(config({ overflow: { maxItems: 1, summary: "ellipsis-count", summarySymbol: "first-hidden" } })), ["1", "…2 entries"]);
  assert.deepEqual(resolveCategoricalLegendConfig(program({ color: stored })).config, stored);
  assert.equal(resolveCategoricalLegendConfig(program({ color: stored, stroke: config({ kind: "stroke", channels: ["stroke"] }) }), "stroke").kind, "stroke");
  assert.throws(() => resolveCategoricalLegendConfig(program({})), /one categorical/);
  assert.throws(() => resolveCategoricalLegendConfig(program({ color: stored, stroke: stored })), /one categorical/);
  assert.throws(() => resolveCategoricalLegendConfig(program({}), "color"), /Missing/);
  assert.throws(() => resolveCategoricalLegendConfig(program({}), "gradient"), /Unknown/);
});

test("legend block overrides preserve area to radius, line width and role-specific appearance without mutation", () => {
  const stored = cloneAndFreeze(config({ title: "Original", symbol: { layers: [{ type: "point", size: 1 }, { type: "line", length: 8 }, { type: "swatch", width: 4 }] }, blockOverrides: { '["color"]': { title: "", gap: 7, text: { color: "red" }, labelMap: [], symbol: { size: Math.PI * 4, fill: "blue", stroke: "green", strokeWidth: 3, opacity: .5 } } } }));
  const effective = resolveEffectiveLegendBlockConfig({}, "color", stored);
  assert.equal(effective.title, "Original"); assert.equal(effective.titleVisible, false);
  assert.equal(effective.itemGap, 7); assert.equal(effective.blockGap, 7);
  assert.deepEqual(effective.labels, { fontSize: 10, color: "red" }); assert.deepEqual(effective.labelMap, []);
  assert.deepEqual(effective.symbol.layers, [
    { type: "point", size: 2, fill: "blue", stroke: "green", strokeWidth: 3, opacity: .5 },
    { type: "line", length: 8, stroke: "green", lineWidth: 3, opacity: .5 },
    { type: "swatch", width: 4, fill: "blue", stroke: "green", strokeWidth: 3, opacity: .5 }
  ]);
  assert.equal(stored.symbol.layers[0].size, 1); assert.equal(stored.title, "Original");
  const opacity = resolveEffectiveLegendBlockConfig({}, "opacity", { symbol: { radius: 8 }, blockOverrides: { '["opacity"]': { title: "Current", symbol: { size: Math.PI * 9, fill: "red", opacity: .1 } } } });
  assert.deepEqual(opacity.symbol, { radius: 3, fill: "red" }); assert.equal(opacity.titleVisible, true);
  const interval = resolveEffectiveLegendBlockConfig({}, "interval", { symbol: { width: 2 }, blockOverrides: { '["color"]': { symbol: { stroke: "black" } } } });
  assert.deepEqual(interval.symbol, { width: 2, stroke: "black" });
});

test("exact legend sampling belongs only to the named live scale and supported legend family", () => {
  const p = program({ size: { scale: "area", sampling: { mode: "values", values: [1, 4] } }, opacity: { scale: "alpha", count: 3 }, color: { scale: "area", sampling: { mode: "values", values: [1, 4] } } });
  assert.equal(hasExactLegendSamplingForScale(p, "area"), true);
  assert.equal(hasExactLegendSamplingForScale(p, "alpha"), false);
  assert.equal(hasExactLegendSamplingForScale(p, "missing"), false);
  assert.equal(hasExactLegendSamplingForScale(program({ color: p.guideConfigs.legend.color }), "area"), false);
  assert.equal(hasExactLegendSamplingForScale({ guideConfigs: {} }, "area"), false);
});
