import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { describeAction } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { render } from "../../../../src/renderers/canvas/index.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

const rows = [
  { x: 0, y: 1, group: "A", alpha: 2 }, { x: 1, y: 3, group: "A", alpha: 2 },
  { x: 0, y: 2, group: "B", alpha: 6 }, { x: 1, y: 4, group: "B", alpha: 6 }
];
const seed = () => chart().createCanvas({ plot: { width: 240, height: 200 }, margin: 150 })
  .createData({ id: "data", values: rows });
const base = () => seed().createAreaPlot({ id: "area", x: "x", y: "y", groupBy: "group", color: "group", guides: false });
const field = p => p.encodeOpacity({ target: "area", field: "alpha", scale: { domain: [2, 6], range: [.3, .8] } });
const alphas = (p, id = "area") => p.graphicSpec.objects[id].items.map(item => item.properties.opacity);

test("Area opacity follows public capability inspection and existing constant style", () => {
  const p = base(), before = JSON.stringify(p);
  assert.equal(describeAction(p, { action: "encodeOpacity", target: { kind: "mark", id: "area" }, options: { value: .4 } }).applicability, "supported");
  for (const value of [0, .4, 1]) {
    const next = p.encodeOpacity({ value });
    assert.deepEqual(next.graphicSpec, p.editAreaMark({ opacity: value }).graphicSpec);
    assert.deepEqual(alphas(next), [value, value]);
    assert.equal(next.trace.children.at(-1).op, "encodeOpacity");
  }
  assert.equal(JSON.stringify(p), before);
});

test("Area field opacity uses one value per existing series and supports replacement", () => {
  const p = base().editAreaMark({ opacity: .1 }), before = JSON.stringify(p), next = field(p);
  assert.deepEqual(alphas(next), [.3, .8]);
  assert.equal(next.markConfigs.area.opacity, undefined);
  assert.deepEqual(next.semanticSpec.layers[0].encoding.group, p.semanticSpec.layers[0].encoding.group);
  assert.throws(() => next.editAreaMark({ opacity: .5 }), /conflicts with a field encoding/);
  const constant = next.encodeOpacity({ value: .5 });
  assert.equal(constant.semanticSpec.layers[0].encoding.opacity, undefined);
  assert.deepEqual(alphas(constant), [.5, .5]);
  assert.deepEqual(alphas(field(constant)), [.3, .8]);
  assert.deepEqual(alphas(next.removeEncoding({ channel: "opacity" })), [.2, .2]);
  assert.equal(JSON.stringify(p), before);
});

test("Area opacity rejects heterogeneous, missing and unsupported field values atomically", () => {
  const p = base(), before = JSON.stringify(p);
  for (const args of [{ field: "x" }, { field: "absent" }, { field: "group", fieldType: "nominal" },
    { field: "alpha", scale: { unknown: .4 } }, { value: 1.1 }, { value: .5, field: "alpha" }]) {
    assert.throws(() => p.encodeOpacity(args));
    assert.equal(JSON.stringify(p), before);
  }
  const next = field(p), encoded = JSON.stringify(next);
  assert.throws(() => next.removeEncoding({ channel: "group" }), /one value within each series/);
  assert.throws(() => next.editOpacityScale({ unknown: .5 }));
  assert.equal(JSON.stringify(next), encoded);
});

test("Area opacity can precede positions and survives scale, Canvas, legend and persistence replay", () => {
  const pending = seed().createAreaMark({ id: "area" }).encodeGroup({ field: "group" });
  const next = field(pending).encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } });
  assert.deepEqual(alphas(next), [.3, .8]);
  const legend = next.createLegend({ channels: ["opacity"], values: [2, 6] });
  const resized = legend.editOpacityScale({ range: [.2, .6] }).editCanvas({ plot: { width: 280, height: 220 } });
  assert.deepEqual(alphas(resized), [.2, .6]);
  assert.ok(resized.graphicSpec.objects.opacityLegendSymbols);
  const restored = deserializeProgram(serializeProgram(resized));
  assert.deepEqual(restored.graphicSpec, resized.graphicSpec);
  assert.match(renderToSVG(restored), /opacity="0.2"/);
  assert.doesNotThrow(() => render(restored, createMockCanvasContext()));
  const constant = restored.encodeOpacity({ value: .7 });
  assert.equal(constant.graphicSpec.objects.opacityLegendSymbols, undefined);
  assert.deepEqual(alphas(constant), [.7, .7]);
});

test("one opacity action edits a faceted Area and Line overlay beside an ordinary Line", () => {
  const p = base().createOverlay({ id: "overlay", source: "area", type: "line", basis: "visibleItems", series: "source" })
    .facet({ field: "group", data: "data", columns: 2 })
    .createAdjacentPlot({ id: "neighbor", source: "area", position: "right",
      plot: { action: "createLinePlot", options: { data: "data", x: "x", y: "y", color: "group", guides: false } } });
  const before = JSON.stringify(p);
  const next = p.encodeOpacity({ target: [
    { childPath: ["area"], id: "area", facetSource: true },
    { childPath: ["area"], id: "overlay", facetSource: true },
    { childPath: ["neighbor"], id: "neighbor" }
  ], value: .45 });
  for (const cell of Object.values(next.children.area.children)) {
    assert.ok(alphas(cell).every(value => value === .45));
    assert.ok(alphas(cell, "overlay").every(value => value === .45));
  }
  assert.deepEqual(alphas(next.children.neighbor, "neighbor"), [.45, .45]);
  assert.equal(next.trace.children.length, p.trace.children.length + 1);
  assert.equal(next.trace.children.at(-1).op, "encodeOpacity");
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  assert.equal(JSON.stringify(p), before);
});
