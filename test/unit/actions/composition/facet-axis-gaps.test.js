import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, vconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { decodeValue, encodeSharedValue } from "../../../../src/persistence/codec.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";

const rows = ["A", "B"].flatMap(row => ["C", "D"].map((column, i) => ({ row, column, panel: row + column, x: i + 1, y: i + 2, z: i + 3 })));
const gap = Object.freeze({ x: 42, y: 57 });
const source = () => chart().createCanvas({ plot: { width: 90, height: 80 }, margin: 60 })
  .createData({ id: "raw", values: rows }).createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
const recipes = [
  ...["canvas", "plot", "content"].map(spacing => ({ name: `wrapped ${spacing}`, make: (p, value) => p.facet({ field: "panel", columns: 2, spacing, gap: value }) })),
  ...["canvas", "plot", "content"].map(spacing => ({ name: `repeat ${spacing}`, make: (p, value) => p.repeatCharts({ channel: "y", fields: ["y", "z"], columns: 1, spacing, gap: value }) })),
  ...["canvas", "plot"].map(spacing => ({ name: `grid ${spacing}`, make: (p, value) => p.facetGrid({ rows: { field: "row" }, columns: { field: "column" }, spacing, gap: value }) }))
];

for (const { name, make } of recipes) {
  test(`${name} accepts axis gaps, replaces whole pairs and preserves round-trip output`, () => {
    const base = source(), baseSaved = serializeProgram(base);
    const callerGap = { ...gap }, program = make(base, callerGap), saved = serializeProgram(program);
    assert.deepEqual(program.compositionSpec.gap, gap);
    assert.ok(Object.isFrozen(program.compositionSpec.gap));
    callerGap.x = 999;
    assert.deepEqual(program.compositionSpec.gap, gap);
    const changed = program.editCompositionLayout({ gap: { x: 51, y: 63 } });
    assert.deepEqual(changed.compositionSpec.gap, { x: 51, y: 63 });
    assert.deepEqual(changed.editCompositionLayout({ align: "start" }).compositionSpec.gap, { x: 51, y: 63 });
    assert.equal(changed.editCompositionLayout({ gap: 24 }).compositionSpec.gap, 24);
    const restored = deserializeProgram(saved);
    assert.deepEqual(restored.compositionSpec.gap, gap);
    assert.equal(renderToSVG(restored), renderToSVG(program));
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.equal(serializeProgram(program), saved);
    assert.equal(serializeProgram(base), baseSaved);
    for (const bad of [{ x: 1 }, { y: 2 }, { x: 1, y: 2, extra: 0 }, { x: 1, y: -1 }]) {
      assert.throws(() => program.editCompositionLayout({ gap: bad }));
      assert.equal(serializeProgram(program), saved);
    }
  });

  test(`${name} equal pairs have exact scalar graphics and SVG`, () => {
    const base = source(), scalar = make(base, 42), pair = make(base, { x: 42, y: 42 });
    assert.deepEqual(pair.graphicSpec, scalar.graphicSpec);
    assert.equal(renderToSVG(pair), renderToSVG(scalar));
    assert.equal(scalar.compositionSpec.gap, 42);
    assert.deepEqual(pair.compositionSpec.gap, { x: 42, y: 42 });
    assert.deepEqual(scalar.editCompositionLayout({ gap: { x: 42, y: 42 } }).graphicSpec, scalar.graphicSpec);
    assert.deepEqual(pair.editCompositionLayout({ gap: 42 }).graphicSpec, pair.graphicSpec);
  });
}

test("guide, header, source, scale, theme and metrics replay preserve pair intent and parent title", () => {
  const base = source().createAxes();
  const replayGap = { x: 142, y: 157 };
  const parent = base.facet({ field: "panel", columns: 2, spacing: "plot", topLane: "shared", gap: replayGap,
    guides: { axes: { x: "outer", y: "each" }, legend: false } }).createTitle({ text: "Panels", titleStyle: { fontSize: 12 } });
  const saved = serializeProgram(parent);
  for (const update of [
    p => p.editFacetHeaders({ fontSize: 10 }),
    p => p.editFacetScales({ y: "independent" }),
    p => p.editFacetGuides({ axes: { x: "each", y: "outer" } }),
    p => p.editFacetSource({ program: base.editPointMark({ fill: "red" }) }),
    p => p.applyTheme({ theme: "light" }),
    p => p.applyTextMetrics({ profile: { schemaVersion: 1, id: "panels", measurements: [
      { text: "Panels", fontFamily: "sans-serif", fontSize: 12, fontWeight: 700, width: 40 }
    ] } })
  ]) {
    const changed = update(parent);
    assert.deepEqual(changed.compositionSpec.gap, replayGap);
    assert.equal(changed.compositionSpec.topLane, "shared");
    assert.equal(changed.semanticSpec.title.text, "Panels");
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.equal(serializeProgram(parent), saved);
  }
});

test("data revision preserves promoted parent titles for scalar and pair facet gaps", () => {
  for (const value of [142, { x: 142, y: 157 }]) {
    const parent = source().createAxes().facet({ field: "panel", columns: 2, spacing: "plot", topLane: "shared", gap: value,
      guides: { axes: { x: "outer", y: "each" }, legend: false } }).createTitle({ text: "Panels", titleStyle: { fontSize: 12 } });
    const saved = serializeProgram(parent);
    const changed = parent.reviseData({ source: "raw", id: "revised", values: rows.map(row => ({ ...row, y: row.y + 1 })) });
    assert.deepEqual(changed.compositionSpec.gap, value);
    assert.equal(changed.semanticSpec.title.text, "Panels");
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.equal(serializeProgram(parent), saved);
    const sourceId = changed.compositionSpec.facet.data;
    assert.equal(sourceId, "revised");
    assert.equal(Object.values(changed.children).reduce((sum, child) => sum + child.graphicSpec.objects.points.items.length, 0), rows.length);
  }
});

test("public wrapped and keyed plot grids move only the requested axis", () => {
  for (const make of [
    value => source().facet({ field: "panel", columns: 2, spacing: "plot", gap: value }),
    value => source().facetGrid({ rows: { field: "row" }, columns: { field: "column" }, spacing: "plot", gap: value })
  ]) {
    const parent = make(gap), base = resolveFacetProgramLayout(parent).layout;
    for (const axis of ["x", "y"]) {
      const edited = parent.editCompositionLayout({ gap: { ...gap, [axis]: gap[axis] + 9 } });
      const next = resolveFacetProgramLayout(edited).layout;
      next.children.forEach((child, i) => {
        assert.equal(child[axis] - base.children[i][axis], 9 * child[axis === "x" ? "column" : "row"]);
        assert.equal(child[axis === "x" ? "y" : "x"], base.children[i][axis === "x" ? "y" : "x"]);
      });
    }
  }
});

test("shared legend lanes and shared content footers survive independent gaps", () => {
  for (const position of ["left", "right", "top", "bottom"]) {
    const program = source().encodeColor({ field: "column" }).createLegend({ position })
      .facet({ field: "panel", columns: 2, spacing: "plot", topLane: "shared", gap, guides: { legend: "shared" } });
    const changed = program.editCompositionLayout({ gap: { x: 48, y: 65 } });
    assert.equal(Object.values(changed.guideConfigs.legend)[0].position, position);
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
  }
  const wrapped = source().createAxes().facet({ field: "panel", columns: 2, spacing: "content", gap,
    guides: { axes: { x: "outer", y: "each" } }, headers: { anchor: "view" } });
  const { layout } = resolveFacetProgramLayout(wrapped);
  assert.equal(layout.children.length, 4);
  assert.deepEqual(wrapped.compositionSpec.facet.guides.axes, { x: "outer", y: "each" });
  assert.deepEqual(deserializeProgram(serializeProgram(wrapped)).graphicSpec, wrapped.graphicSpec);
});

test("concat rejects object gaps while a nested facet retains its own independent recipe", () => {
  const base = source(), nested = base.facet({ field: "panel", columns: 2, gap });
  for (const concat of [hconcat, vconcat]) {
    assert.throws(() => concat({ programs: [base, base], gap }));
    const parent = concat({ programs: [{ id: "panels", program: nested }, { id: "unit", program: base }], gap: 9 });
    const saved = serializeProgram(parent);
    assert.throws(() => parent.editCompositionLayout({ gap }));
    const replacement = nested.editCompositionLayout({ gap: { x: 61, y: 73 } });
    const changed = parent.replaceCompositionChild({ target: "panels", program: replacement });
    assert.equal(changed.compositionSpec.gap, 9);
    assert.deepEqual(changed.children.panels.compositionSpec.gap, { x: 61, y: 73 });
    assert.equal(serializeProgram(parent), saved);
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
  }
});

test("persisted invalid pairs and concat objects reject without repairing historical bytes", () => {
  const parent = source().facet({ field: "panel", gap });
  const saved = serializeProgram(parent);
  for (const gapValue of [{ x: 3 }, { x: 3, y: -2 }, { x: 3, y: 4, unexpected: 1 }]) {
    const snapshot = JSON.parse(saved), state = decodeValue(snapshot.payload);
    state.compositionSpec.gap = gapValue;
    snapshot.payload = encodeSharedValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(snapshot)));
  }
  const snapshot = JSON.parse(serializeProgram(hconcat({ programs: [source(), source()] })));
  const state = decodeValue(snapshot.payload);
  state.compositionSpec.gap = gap;
  snapshot.payload = encodeSharedValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(snapshot)));
  assert.equal(serializeProgram(parent), saved);
  assert.throws(() => source().facetGrid({ rows: { field: "row" }, columns: { field: "column" }, gap, spacing: "content" }), /wrapped|content/i);
});

test("polar and parallel plot facets retain the supported coordinate combinations", () => {
  for (const make of [p => p.createPolarScatterPlot({ theta: "x", radius: "y", guides: false }),
    p => p.createParallelCoordinates({ dimensions: [{ field: "x" }, { field: "y" }], guides: false })]) {
    const base = chart().createCanvas({ width: 260, height: 260, margin: 70 }).createData({ values: rows });
    const program = make(base).facet({ field: "panel", columns: 2, spacing: "plot", topLane: "shared", gap });
    assert.deepEqual(program.compositionSpec.gap, gap);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
    assert.throws(() => program.editFacetGuides({ axes: "outer" }), /outer|Cartesian/);
  }
});

test("concrete SVG, PNG and PDF consume the same immutable pair-gap graphic snapshot", async () => {
  const base = source();
  const scalar = base.facet({ field: "panel", columns: 2, gap: 42 });
  const pair = base.facet({ field: "panel", columns: 2, gap: { x: 42, y: 42 } });
  const asymmetric = base.facet({ field: "panel", columns: 2, gap });
  const snapshot = deserializeGraphic(serializeGraphic(asymmetric));
  assert.equal(renderToSVG(snapshot), renderToSVG(asymmetric));
  assert.deepEqual((await renderToPNGBuffer(pair)).buffer, (await renderToPNGBuffer(scalar)).buffer);
  assert.deepEqual((await renderToPNGBuffer(snapshot)).buffer, (await renderToPNGBuffer(asymmetric)).buffer);
  const pdf = await renderToPDFBuffer(asymmetric);
  assert.equal(pdf.pages, 1);
  assert.ok(pdf.buffer.length > 0);
});
