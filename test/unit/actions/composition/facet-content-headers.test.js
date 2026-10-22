import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";

const close = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const headers = p => p.graphicSpec.objects[`${p.compositionSpec.id}-headers`].items.map(x => x.properties);
const config = p => p.materializationConfigs.facets[p.compositionSpec.id].headers;
function unit(options = {}, values = [{ group: "A", row: "R", x: 5, y: 5 },
  { group: "B", row: "R", x: 10, y: 10 }]) {
  return chart().createCanvas({ plot: { width: 100, height: 100 }, margin: 70 })
    .createData({ values })
    .createScatterPlot({ x: { field: "x", scale: { domain: [0, 10] } },
      y: { field: "y", scale: { domain: [0, 10] } }, guides: false })
    .editPointMark({ stroke: false, ...options }).encodePointRadius({ value: 3 });
}
function facet(options = {}, source = unit()) {
  return source.facet({ field: "group", columns: 2, spacing: "plot", gap: 100, ...options });
}
function boxes(p) {
  const { layout, plots } = resolveFacetProgramLayout(p);
  return layout.children.map(cell => {
    const plot = plots.find(x => x.id === cell.id);
    return { left: cell.x + plot.x, right: cell.x + plot.x + plot.width,
      top: cell.y + plot.y, bottom: cell.y + plot.y + plot.height };
  });
}

test("content follows per-panel mark overflow while keeping the plot alignment", () => {
  const old = facet(), before = serializeProgram(old);
  const actual = old.editFacetHeaders({ anchor: "content" });
  const initial = facet({ headers: { anchor: "content" } });
  assert.deepEqual(actual.graphicSpec, initial.graphicSpec);
  assert.deepEqual(config(actual), config(initial));
  const b = boxes(actual), h = headers(actual);
  close(b[0].top - h[0].y, 16);
  close(b[1].top - h[1].y, 19);
  h.forEach((item, i) => close(item.x, (b[i].left + b[i].right) / 2));
  assert.equal(serializeProgram(old), before);
  assert.deepEqual(actual.editFacetHeaders({ anchor: "plot" }).graphicSpec, old.graphicSpec);
});

test("omitted anchor retains the old graphics and has no new persisted default", () => {
  const p = facet();
  assert(!Object.hasOwn(config(p).common, "anchor"));
  assert.deepEqual(p.editFacetHeaders({ anchor: "plot" }).graphicSpec, p.graphicSpec);
});

for (const side of ["top", "bottom", "left", "right"]) {
  for (const rotation of [0, Math.PI / 4]) {
    test(`content ${side} anchor preserves rotated edge clearance at ${rotation}`, () => {
      const p = facet({ headers: { fontWeight: 400,
        column: { side, anchor: "content", offset: 30, rotation } } });
      const b = boxes(p), h = headers(p);
      h.forEach((item, i) => {
        const text = resolveTextBounds(item), edge = b[i];
        const overflow = i === 1 && ["top", "right"].includes(side) ? 3 : 0;
        const actual = side === "top" ? edge.top - text.bottom :
          side === "bottom" ? text.top - edge.bottom :
          side === "left" ? edge.left - text.right : text.left - edge.right;
        close(actual, 30 + overflow);
      });
    });
  }
}

test("clipping is honored and opacity retains geometric layout stability", () => {
  const p = facet({ headers: { anchor: "content" } });
  const clipped = facet({ headers: { anchor: "content" } }, unit({ clip: true }));
  const transparent = facet({ headers: { anchor: "content" } }, unit({ opacity: 0 }));
  const h = headers(clipped), b = boxes(clipped);
  close(b[1].top - h[1].y, 16);
  assert.deepEqual(headers(transparent), headers(p));
  const stroke = facet({ headers: { anchor: "content" } }, unit({ stroke: "black", strokeWidth: 4 }));
  close(boxes(stroke)[1].top - headers(stroke)[1].y, 21);
});

test("extension graphics and guides do not change the content anchor", () => {
  const source = unit(), p = facet({ headers: { anchor: "content" } }, source);
  const extra = source.createGraphics({ id: "decoration", type: "circle", parent: "canvas" })
    .editGraphics({ target: "decoration", property: "x", value: 120 })
    .editGraphics({ target: "decoration", property: "y", value: 20 })
    .editGraphics({ target: "decoration", property: "radius", value: 10 });
  assert.deepEqual(headers(facet({ headers: { anchor: "content" } }, extra)), headers(p));
});

test("nested child Canvas clips discard fully offscreen geometry", () => {
  const source = unit({}, [{ group: "A", x: 5, y: 5 }, { group: "B", x: 10, y: 100 }]);
  const p = facet({ headers: { anchor: "content" } }, source), b = boxes(p), h = headers(p);
  close(b[1].top - h[1].y, 16);
});

test("lower and left plot-edge marks preserve the same outward clearance", () => {
  const source = unit({}, [{ group: "A", x: 5, y: 5 }, { group: "B", x: 0, y: 0 }]);
  for (const side of ["left", "bottom"]) {
    const p = facet({ headers: { column: { anchor: "content", side, offset: 30 } } }, source);
    const b = boxes(p), h = headers(p);
    for (let i = 0; i < 2; i++) {
      const text = resolveTextBounds(h[i]);
      close(side === "left" ? b[i].left - text.right : text.top - b[i].bottom, 30 + (i === 1 ? 3 : 0));
    }
  }
});

test("field repeats and blank header labels retain content intent", () => {
  const p = unit().repeatCharts({ channel: "y", fields: ["x", "y"],
    spacing: "plot", gap: 100, headers: { anchor: "content" } });
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  const q = facet({ headers: { anchor: "content", labelMap: [{ value: "B", label: "" }] } });
  assert.equal(headers(q)[1].text, "");
  assert.equal(config(q).common.anchor, "content");
});

test("layout, source, metrics, theme and persistence replay retain the owner", () => {
  const p = facet({ headers: { anchor: "content" } });
  for (const q of [p.editCompositionLayout({ gap: 110 }),
    p.editFacetSource({ program: unit().encodePointRadius({ value: 4 }) }),
    p.applyTheme({ theme: "dark" }),
    p.applyTextMetrics({ profile: { schemaVersion: 1, id: "headers", measurements: [] } }),
    deserializeProgram(serializeProgram(p))]) {
    assert.equal(config(q).common.anchor, "content");
    const radius = q.children[q.compositionSpec.children[1]].graphicSpec.objects.scatterPlot.items[0].properties.radius;
    close(boxes(q)[1].top - headers(q)[1].y, 16 + radius);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("role override, field titles and grids use their existing ownership", () => {
  const p = facet({ headers: { anchor: "content", column: { anchor: "plot", side: "top", title: { text: "Group" } } } });
  close(boxes(p)[1].top - headers(p)[1].y, 16);
  const q = unit().facetGrid({ rows: { field: "row" }, columns: { field: "group" },
    spacing: "plot", gap: 100, headers: { anchor: "content", fontWeight: 400,
      column: { title: { text: "Group" } } } });
  assert.equal(config(q).common.anchor, "content");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("shared top space keeps fixed canvas and exposes only actual outward motion", () => {
  const p = facet({ topLane: "shared" });
  const q = p.editFacetHeaders({ anchor: "content" });
  assert.deepEqual(q.graphicSpec.objects.canvas.properties, p.graphicSpec.objects.canvas.properties);
  close(headers(q)[0].y, headers(p)[0].y);
  close(headers(q)[1].y, headers(p)[1].y - 3);
});

test("invalid anchors, canvas spacing and overflow reject without mutating the source", () => {
  const p = facet(), before = serializeProgram(p);
  for (const anchor of [null, undefined, false, "marks", {}, 1]) {
    assert.throws(() => p.editFacetHeaders({ anchor }), /anchor/);
    assert.equal(serializeProgram(p), before);
  }
  const q = p.editCompositionLayout({ topLane: "shared" }).editFacetHeaders({ anchor: "content" }), stable = serializeProgram(q);
  assert.throws(() => p.editFacetHeaders({ anchor: "content" })
    .editCompositionLayout({ spacing: "canvas" }), /plot spacing/);
  assert.throws(() => q.editFacetHeaders({ offset: 1000 }), /space|Canvas/);
  assert.equal(serializeProgram(q), stable);
  assert.throws(() => unit().facet({ field: "group", headers: { anchor: "content" } }), /plot spacing/);
  const current = p.materializationConfigs.facets.facet;
  const invalid = p._withMaterializationConfig(["facets", "facet"], {
    ...current, headers: { ...current.headers, common: { ...current.headers.common, anchor: "marks" } }
  });
  assert.throws(() => serializeProgram(invalid), /anchor/);
});
