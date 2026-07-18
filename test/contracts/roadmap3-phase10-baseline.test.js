import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { chart, hconcat, vconcat } from "../../src/index.js";

const matrixUrl = new URL(
  "../../agent_docs/impl/roadmap3/phase10/INTEGRATION_MATRIX.json",
  import.meta.url
);
const encodingContract = readFileSync(new URL(
  "../../agent_docs/contract/current/ENCODINGS.md",
  import.meta.url
), "utf8");

const rows = Object.freeze([
  Object.freeze({ angle: "A", radius: 1, group: "one" }),
  Object.freeze({ angle: "B", radius: 2, group: "one" }),
  Object.freeze({ angle: "A", radius: 2, group: "two" }),
  Object.freeze({ angle: "B", radius: 3, group: "two" })
]);

function polarProgram() {
  return chart()
    .createCanvas({ width: 220, height: 220, margin: 30 })
    .createData({ values: rows })
    .createPointMark()
    .encodeTheta({ field: "angle", fieldType: "nominal" })
    .encodeR({ field: "radius" })
    .encodeRadius({ value: 3 });
}

function polarLegendProgram() {
  return chart()
    .createCanvas({
      width: 260,
      height: 220,
      margin: { top: 20, right: 80, bottom: 20, left: 20 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeTheta({ field: "angle", fieldType: "nominal" })
    .encodeR({ field: "radius" })
    .encodeColor({ field: "group" })
    .encodePointRadius({ value: 4 })
    .createGuides({ axes: false, grid: false, legend: { position: "right" } });
}

test("keeps the Phase 10 integration matrix valid and evidence-addressable", () => {
  const matrix = JSON.parse(readFileSync(matrixUrl, "utf8"));
  const statuses = new Set([
    "current-pass", "current-explicit-error", "gate-pending"
  ]);

  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.phase, "phase10");
  assert.equal(new Set(matrix.cases.map(entry => entry.id)).size, matrix.cases.length);
  for (const entry of matrix.cases) {
    assert.equal(statuses.has(entry.status), true, `${entry.id} status`);
    assert.equal(existsSync(new URL(`../../${entry.evidence}`, import.meta.url)), true);
  }
  assert.match(encodingContract, /temporal aggregate bar bandwidth/);
});

test("retains Polar children in horizontal and nested concat compositions", () => {
  const polar = polarProgram();
  const horizontal = hconcat({ programs: [polar, polar] });
  const nested = vconcat({ programs: [horizontal, polar] });

  assert.deepEqual(horizontal.graphicSpec.objects.canvas.properties, {
    width: 456,
    height: 220,
    background: "white"
  });
  assert.deepEqual(nested.graphicSpec.objects.canvas.properties, {
    width: 456,
    height: 456,
    background: "white"
  });
  assert.equal(Object.keys(horizontal.children).length, 2);
  assert.equal(Object.keys(nested.children).length, 2);
  assert.equal(polar.compositionSpec, undefined);
});

test("rejects unsupported Polar facet before changing the source program", () => {
  const polar = polarProgram();
  const graphics = polar.graphicSpec;
  const trace = polar.trace;

  assert.throws(
    () => polar.facet({ field: "group" }),
    /must be a complete materializable Cartesian mark/
  );
  assert.equal(polar.graphicSpec, graphics);
  assert.equal(polar.trace, trace);
  assert.equal(polar.compositionSpec, undefined);
});

test("records the approved temporal bar-line shared-scale behavior", () => {
  const values = Object.freeze([
    Object.freeze({ Year: "1970-01-01", Acceleration: 12 }),
    Object.freeze({ Year: "1971-01-01", Acceleration: 15 })
  ]);
  const layered = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Year", fieldType: "temporal" })
    .encodeY({ field: "Acceleration", aggregate: "mean" })
    .createLineMark({ id: "trend" });
  const bars = layered.semanticSpec.layers.find(layer => layer.id === "bars");
  const trend = layered.semanticSpec.layers.find(layer => layer.id === "trend");

  assert.equal(trend.encoding.x.scale, bars.encoding.x.scale);
  assert.equal(trend.encoding.y.scale, bars.encoding.y.scale);
  assert.equal(trend.encoding.y.aggregate, "mean");
  assert.equal(trend.encoding.y.stack, undefined);
  assert.equal(layered.graphicSpec.objects.trend.items.length, 1);
});

test("propagates an immutable Polar child revision through explicit ancestor replacement", () => {
  const polar = polarLegendProgram();
  const peer = polarLegendProgram();
  const inner = hconcat({
    id: "inner",
    programs: [
      { id: "polar", program: polar },
      { id: "peer", program: peer }
    ]
  });
  const outer = vconcat({
    id: "outer",
    programs: [
      { id: "inner", program: inner },
      { id: "footer", program: peer }
    ]
  });
  const revisedPolar = polar
    .filterMarks({ field: "group", op: "eq", value: "one" })
    .highlightMarks({
      select: { field: "radius", op: "max" },
      color: "#dc2626",
      size: 6,
      dimOthers: { opacity: 0.2 }
    })
    .editCanvas({ width: 320 })
    .editScale({ id: "radius", reverse: true });
  const revisedInner = inner.replaceCompositionChild({
    target: "polar",
    program: revisedPolar
  });
  const revisedOuter = outer.replaceCompositionChild({
    target: "inner",
    program: revisedInner
  });

  assert.equal(revisedOuter.children.inner, revisedInner);
  assert.equal(revisedOuter.children.inner.children.polar, revisedPolar);
  assert.deepEqual(revisedOuter.graphicSpec.objects.canvas.properties, {
    width: 596,
    height: 456,
    background: "white"
  });
  assert.deepEqual(outer.graphicSpec.objects.canvas.properties, {
    width: 536,
    height: 456,
    background: "white"
  });
  assert.equal(
    revisedPolar.graphicSpec.objects.seriesLegendSymbols.items.length,
    1
  );
  assert.equal(revisedPolar.graphicSpec.objects.point.items.length, 2);
  assert.equal(polar.graphicSpec.objects.seriesLegendSymbols.items.length, 2);
  assert.equal(polar.graphicSpec.objects.point.items.length, 4);
  assert.equal(inner.children.polar, polar);
  assert.equal(outer.children.inner, inner);
});
