import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { legendGuideItems } from "../../../src/materialization/guides/legendItems.js";
import { resolveGradientLayout } from "../../../src/materialization/guides/legendGradient.js";
import { resolveSizeLegendLayout } from "../../../src/materialization/guides/legendSamples.js";
import { resolveContinuousBounds, resolveLegendBackgroundFromBounds } from "../../../src/materialization/guides/legendLayout.js";

const base = () => chart().createCanvas({ width: 760, height: 460, margin: { top: 100, right: 250, bottom: 100, left: 150 } })
  .createData({ id: "rows", values: [{ x: 0, y: 0, v: 0, g: 1 }, { x: 1, y: 1, v: 5, g: "1" }, { x: 2, y: 2, v: 10, g: false }] })
  .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const read = p => legendGuideItems(p, () => {});
const values = (items, component) => items.filter(item => item.component === component).map(item => item.value[1]);

test("legend metadata retains typed values, explicit multilayer roles, hidden labels and summary roles", () => {
  const p = base().encodeColor({ field: "g", fieldType: "nominal" }).createLegend({ channels: ["color"], title: "Category",
    symbol: { layers: [{ type: "line", length: 20 }, { type: "point", size: 3 }] } });
  const before = JSON.stringify(p), items = read(p);
  assert.deepEqual(values(items, "symbol"), [["value", 1], ["value", 1], ["value", "1"], ["value", "1"], ["value", false], ["value", false]]);
  assert.deepEqual(items.filter(item => item.component === "symbol").map(item => item.part), ["line", "point", "line", "point", "line", "point"]);
  assert.deepEqual(values(items, "label"), [["value", 1], ["value", "1"], ["value", false]]);
  assert.deepEqual(values(items, "title"), [["title"]]);
  const hidden = p.editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: 1, label: "" }] });
  assert.deepEqual(values(read(hidden), "label"), [["value", "1"], ["value", false]]);
  const overflow = p.editLegend({ symbol: { layers: [{ type: "line", length: 20 }] }, overflow: { maxItems: 1, summary: "ellipsis-count", summarySymbol: "first-hidden" } });
  assert.deepEqual(values(read(overflow), "symbol"), [["value", 1], ["summary"]]);
  assert.deepEqual(values(read(overflow), "label"), [["value", 1], ["summary"]]);
  assert.equal(JSON.stringify(p), before);
});

test("legend sample identity is independent of clip windows, display text and collection position", () => {
  const p = base().encodeSize({ field: "v", scale: { domain: [0, 10], range: [Math.PI, 9 * Math.PI] } })
    .createLegend({ channels: ["size"], values: [0, 5, 10], title: false, clipHeight: 2 });
  assert.deepEqual(values(read(p), "symbol"), [["value", 0], ["value", 5], ["value", 10]]);
  assert.ok(read(p).filter(item => item.component === "symbol").every(item => item.graphicId.includes("glyph")));
  assert.deepEqual(values(read(p.editLegendBlock({ target: "points", channel: "size", labelMap: [{ value: 5, label: "" }] })), "label"), [["value", 0], ["value", 10]]);
  const categorical = base().encodeSize({ field: "g", fieldType: "ordinal", scale: { domain: [1, "1", false], range: [4, 9, 16] } })
    .createLegend({ channels: ["size"], overflow: { maxItems: 1, summary: "ellipsis-count" } });
  assert.deepEqual(values(read(categorical), "symbol"), [["value", 1]]);
  assert.deepEqual(values(read(categorical), "label"), [["value", 1], ["summary"]]);
});

test("legend discrete intervals retain unbounded endpoints and gradient values retain native transformed spacing", () => {
  for (const channel of ["color", "size"]) {
    let p = base();
    p = p[channel === "color" ? "encodeColor" : "encodeSize"]({ field: "v", fieldType: "quantitative", scale: { type: "quantize", domain: [0, 10], range: channel === "color" ? ["red", "blue"] : [4, 16] } })
      .createLegend({ channels: [channel] });
    assert.deepEqual(values(read(p), "symbol"), [["interval", null, 5], ["interval", 5, null]]);
  }
  const p = base().encodeColor({ field: "v", fieldType: "quantitative", scale: { domain: [0, 10], range: ["red", "blue"] } })
    .createLegend({ channels: ["color"], values: [0, 2, 10], title: false });
  assert.deepEqual(values(read(p), "tick"), [["value", 0], ["value", 2], ["value", 10]]);
  assert.equal(values(read(p), "strip").length, 60);
  assert.ok(values(read(p), "strip").every(value => JSON.stringify(value) === JSON.stringify(["range", [0, 10]])));
  assert.deepEqual(values(read(p.editLegend({ representation: "symbols" })), "symbol"), [["value", 0], ["value", 2], ["value", 10]]);
  const config = p.guideConfigs.legend.gradient;
  const layout = resolveGradientLayout(p, config, { ...p.resolvedScales[config.scale], type: "symlog", constant: 1, domain: [-10, 10] });
  assert.deepEqual(layout.values, [0, 2, 10]);
  const automatic = resolveGradientLayout(p, { ...config, count: 3, sampling: { mode: "auto", count: 3 } }, { ...p.resolvedScales[config.scale], type: "symlog", constant: 1, domain: [-10, 10] });
  assert.deepEqual(automatic.values, [-10, 0, 10]);
  for (const domain of [[0, 10], [10, 0]]) {
    const middle = resolveGradientLayout(p, { ...config, count: 3, sampling: { mode: "auto", count: 3 } }, { ...p.resolvedScales[config.scale], domain, midpoint: 2 });
    assert.deepEqual(middle.values, domain[0] === 0 ? [0, 2, 5, 10] : [10, 5, 2, 0]);
  }
});

test("combined and opacity legend sources expose the same exact list without choosing a first owner", () => {
  const p = base().encodeColor({ field: "v", fieldType: "quantitative", scale: { domain: [0, 10], range: ["red", "blue"] } })
    .encodeSize({ field: "v", scale: { domain: [0, 10], range: [4, 16] } }).createLegend({ combine: "color-size", values: [0, 5, 10] });
  assert.deepEqual(values(read(p), "symbol"), [["value", 0], ["value", 5], ["value", 10]]);
  assert.deepEqual(values(read(p.editLegendBlock({ target: "points", channel: "size", labelMap: [{ value: 5, label: "" }] })), "label"), [["value", 0], ["value", 10]]);
  const opacity = base().encodeOpacity({ field: "v", scale: { domain: [0, 10], range: [0, 1] } }).createLegend({ channels: ["opacity"], values: [0, 10] });
  assert.deepEqual(values(read(opacity), "symbol"), [["value", 0], ["value", 10]]);
  const width = base().createRuleMark({ id: "rule", data: "rows" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeStrokeWidth({ field: "v", scale: { domain: [0, 10], range: [0, 4] } }).createLegend({ channels: ["strokeWidth"], values: [0, 10] });
  assert.deepEqual(values(read(width), "symbol"), [["value", 0], ["value", 10]]);
  assert.deepEqual(read(base()), []);
});

test("native legend preparation rejects stale correspondence and preserves layout failures", () => {
  const p = base().encodeSize({ field: "v" }).createLegend({ channels: ["size"] });
  const objects = p.graphicSpec.objects;
  assert.throws(() => read({ ...p, guideConfigs: p.guideConfigs, graphicSpec: { ...p.graphicSpec, objects: { ...objects, sizeLegendLabels: { type: "text", items: [] } } } }), /stale semantic/);
  assert.throws(() => read({ ...p, guideConfigs: p.guideConfigs, graphicSpec: { ...p.graphicSpec, objects: { ...objects, sizeLegendSymbols: { type: "circle", items: [] } } } }), /stale sample/);
  assert.throws(() => resolveSizeLegendLayout({ ...p, guideConfigs: p.guideConfigs, resolvedScales: {} }, p.guideConfigs.legend.size), /resolved size scale/);
  assert.throws(() => resolveContinuousBounds({ graphicSpec: { objects: {} }, materializationConfigs: {} }), /Canvas/);
  assert.throws(() => resolveLegendBackgroundFromBounds([{ left: 1, right: 20, top: 1, bottom: 20 }], { lineWidth: 4, padding: 10 }, { width: 30, height: 30 }, "Literal", { position: "top-right" }), /margin space/);
});
