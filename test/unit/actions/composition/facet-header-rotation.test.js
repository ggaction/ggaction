import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { createRegionChart, createFacetHeaderRotation } from "../../../../examples/facet-header-rotation/program.js";

const rotation = { value: -90, unit: "degrees" };
const headers = p => p.graphicSpec.objects[`${p.compositionSpec.id}-headers`].items.map(x => x.properties);
const config = p => p.materializationConfigs.facets[p.compositionSpec.id].headers;
const close = (a, b) => assert(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
function initial(column = {}) {
  return createRegionChart().facet({ field: "region", columns: 1,
    headers: { fontSize: 12, fontWeight: 400, column: { side: "left", offset: 35, ...column } } });
}

test("initial structured degrees equal edited radians without changing the earlier program", () => {
  const old = initial(), before = serializeProgram(old);
  const actual = initial({ rotation });
  const edited = old.editFacetHeaders({ role: "column", rotation: -Math.PI / 2 });
  assertEquivalentMeaning(actual.graphicSpec, edited.graphicSpec);
  assert.deepEqual(config(actual), config(edited));
  assert.equal(config(actual).column.rotation, -Math.PI / 2);
  assert.equal(serializeProgram(old), before);
  assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
});

test("zero restores the exact previous unrotated graphics and reservation", () => {
  const old = initial(), turned = old.editFacetHeaders({ role: "column", rotation });
  const restored = turned.editFacetHeaders({ role: "column", rotation: 0 });
  assert.deepEqual(restored.graphicSpec, old.graphicSpec);
  assert(headers(restored).every(x => !Object.hasOwn(x, "rotation")));
});

test("common rotation inherits into roles and a zero role override wins", () => {
  const p = createRegionChart().facet({ field: "region", columns: 1, headers: {
    rotation, fontSize: 12, column: { side: "left", offset: 35 }
  } });
  assert(headers(p).every(x => x.rotation === -Math.PI / 2));
  const zero = p.editFacetHeaders({ role: "column", rotation: 0 });
  assert(headers(zero).every(x => !Object.hasOwn(x, "rotation")));
  assert.equal(config(zero).common.rotation, -Math.PI / 2);
  assert.equal(config(zero).column.rotation, 0);
});

test("invalid angles and units reject atomically before changing state", () => {
  const p = initial(), before = serializeProgram(p);
  for (const value of [NaN, Infinity, -Infinity, null, undefined, "90", {},
    { value: 90, unit: "turns" }, { value: Infinity, unit: "degrees" },
    { value: 90, unit: "degrees", extra: true }, { value: Number.MAX_VALUE, unit: "degrees" }]) {
    assert.throws(() => p.editFacetHeaders({ role: "column", rotation: value }));
    assert.equal(serializeProgram(p), before);
  }
});

test("editable persistence rejects a non-normalized or nonfinite stored angle", () => {
  const p = createFacetHeaderRotation();
  for (const rotation of [Infinity, NaN, { value: -90, unit: "degrees" }]) {
    const current = p.materializationConfigs.facets.facet;
    const invalid = p._withMaterializationConfig(["facets", "facet"], {
      ...current, headers: { ...current.headers, column: { ...current.headers.column, rotation } }
    });
    assert.throws(() => serializeProgram(invalid), /rotation.*finite normalized radians/);
  }
});

for (const side of ["top", "bottom", "left", "right"]) {
  for (const align of ["start", "center", "end"]) {
    for (const degrees of [-90, 45, 90]) {
      test(`rotated ${side} header honors ${align} block alignment at ${degrees} degrees`, () => {
        const offset = 35;
        const p = createRegionChart().facet({ field: "region", columns: 1,
          headers: { fontSize: 12, fontWeight: 400, column: { side, offset,
            align, rotation: { value: degrees, unit: "degrees" } } } })
          .editFacetGuides({ axes: "outer", legend: false })
          .editCompositionLayout({ spacing: "plot", gap: 100 });
        const { layout, plots } = resolveFacetProgramLayout(p), local = new Map(plots.map(x => [x.id, x]));
        const items = headers(p);
        for (let i = 0; i < items.length; i++) {
          const cell = layout.children[i], plot = local.get(cell.id), b = resolveTextBounds(items[i]);
          const box = { left: cell.x + plot.x, right: cell.x + plot.x + plot.width,
            top: cell.y + plot.y, bottom: cell.y + plot.y + plot.height };
          const angle = degrees * Math.PI / 180;
          // Existing pre-feature width literal, independent rectangular rotation oracle.
          const width = 29.880000000000003;
          close(b.right - b.left, Math.abs(width * Math.cos(angle)) + Math.abs(12 * Math.sin(angle)));
          close(b.bottom - b.top, Math.abs(width * Math.sin(angle)) + Math.abs(12 * Math.cos(angle)));
          if (side === "left") close(b.right, box.left - offset);
          if (side === "right") close(b.left, box.right + offset);
          if (side === "top") close(b.bottom, box.top - offset);
          if (side === "bottom") close(b.top, box.bottom + offset);
          const horizontal = ["top", "bottom"].includes(side);
          const [a, z, start, end] = horizontal ? [b.left, b.right, box.left, box.right] : [b.top, b.bottom, box.top, box.bottom];
          if (align === "start") close(a, start);
          if (align === "end") close(z, end);
          if (align === "center") close((a + z) / 2, (start + end) / 2);
        }
      });
    }
  }
}

test("layout, source, metrics, theme and persistence replay retain the rotation owner", () => {
  const p = createFacetHeaderRotation();
  const variants = [p.editCompositionLayout({ gap: 30 }),
    p.editFacetSource({ program: createRegionChart() }),
    p.applyTheme({ theme: "dark" }),
    p.applyTextMetrics({ profile: { schemaVersion: 1, id: "header-fonts", measurements: [
      { text: "North", fontFamily: "sans-serif", fontSize: 12, fontWeight: 400, fontStyle: "normal", width: 40 },
      { text: "South", fontFamily: "sans-serif", fontSize: 12, fontWeight: 400, fontStyle: "normal", width: 40 }
    ] } }), deserializeProgram(serializeProgram(p))];
  for (const v of variants) {
    assert.equal(config(v).column.rotation, -Math.PI / 2);
    assert(headers(v).every(x => x.rotation === -Math.PI / 2));
    assert.equal(v.semanticSpec.datasets[0].values.length, 6);
  }
});

test("blank mapped headers retain no visible glyph and allow subsequent rotation reset", () => {
  const p = initial({ rotation, labelMap: [{ value: "North", label: "" }, { value: "South", label: "" }] });
  assert.deepEqual(headers(p).map(x => x.text), ["", ""]);
  assert.doesNotThrow(() => p.editFacetHeaders({ role: "column", rotation: 0 }));
});

test("initial rotation is available to facet grids and field repetition", () => {
  const unit = chart().createCanvas({ width: 200, height: 160, margin: 45 })
    .createData({ values: [{ row: "R1", group: "A", x: 1, y: 2 }, { row: "R2", group: "B", x: 2, y: 3 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  for (const [action, args, side] of [
    ["facetGrid", { rows: { field: "row" }, columns: { field: "group" } }, "top"],
    ["repeatCharts", { channel: "y", fields: ["x", "y"] }, "left"]
  ]) {
    const p = unit[action]({ ...args, headers: { column: { side, offset: 30, rotation } } });
    assert(headers(p).filter(x => x.text !== "").some(x => x.rotation === -Math.PI / 2));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});

test("rotation preserves legacy Canvas anchors and rejects glyph overflow atomically", () => {
  const p = createRegionChart().facet({ field: "region", columns: 1 });
  const before = serializeProgram(p);
  assert.throws(() => p.editFacetHeaders({ rotation }), /space above every child plot/);
  assert.equal(serializeProgram(p), before);
  const roomy = createRegionChart()
    .editCanvas({ margin: { left: 50, top: 50, right: 15, bottom: 30 } })
    .facet({ field: "region", columns: 1, headers: { offset: 25 } });
  const valid = roomy.editFacetHeaders({ rotation });
  assert(headers(valid).every(x => x.rotation === -Math.PI / 2));
  assert.deepEqual(headers(valid).map(x => [x.x, x.y]), headers(roomy).map(x => [x.x, x.y]));
});

test("outer margin reuse cannot hide an axis/header collision or an oversized label", () => {
  const p = createFacetHeaderRotation(), before = serializeProgram(p);
  assert.throws(() => p.editFacetHeaders({ role: "column", offset: 0, rotation: { value: 45, unit: "degrees" } }), /space|guides|headers/);
  assert.throws(() => p.editFacetHeaders({ role: "column", labelMap: [{ value: "North", label: "A".repeat(60) }] }), /space|Canvas/);
  assert.equal(serializeProgram(p), before);
});
