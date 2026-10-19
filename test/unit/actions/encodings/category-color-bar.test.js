import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [
  { category: "A", value: 3, series: "one" }, { category: "A", value: 5, series: "two" },
  { category: "B", value: 8, series: "one" }, { category: "B", value: 4, series: "two" },
  { category: "C", value: 2, series: "one" }, { category: "C", value: 6, series: "two" }
];
const geometry = p => p.graphicSpec.objects.bars.items.map(({ properties: { x, y, width, height } }) => ({ x, y, width, height }));
function source(factory = chart, horizontal = false, fieldType = "nominal", width = undefined) {
  return factory().createCanvas({ width: 640, height: 460, margin: 80 }).createData({ id: "data", values })
    .createBarPlot({ id: "bars", guides: false,
      x: horizontal ? { field: "value", aggregate: "mean" } : { field: "category", fieldType },
      y: horizontal ? { field: "category", fieldType } : { field: "value", aggregate: "mean" },
      ...(width === undefined ? {} : { width }) });
}

test("same categorical position and color preserve every rectangle in Full and Basic", () => {
  for (const factory of [chart, basic]) for (const horizontal of [false, true]) for (const fieldType of ["nominal", "ordinal"]) {
    const p = source(factory, horizontal, fieldType), before = serializeProgram(p);
    const q = p.encodeColor({ target: "bars", field: "category", fieldType,
      scale: { domain: ["C", "B", "A"], range: ["#ff0000", "#00ff00", "#0000ff"] } });
    assert.deepEqual(geometry(q), geometry(p));
    assert.deepEqual(q.graphicSpec.objects.bars.items.map(item => item.properties.fill), ["#0000ff", "#00ff00", "#ff0000"]);
    assert.equal(q.semanticSpec.layers[0].layout.mode, "overlay");
    assert.equal(q.semanticSpec.layers[0].encoding[horizontal ? "yOffset" : "xOffset"], undefined);
    assert.equal(q.trace.children.length, p.trace.children.length + 1);
    assert.equal(q.trace.children.at(-1).op, "encodeColor");
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(q.semanticSpec.datasets[0].values, values);
    assert.ok(renderToSVG(q).startsWith('<svg'));
  }
});

test("different color fields still produce separate grouped bars by default", () => {
  for (const horizontal of [false, true]) {
    const p = source(chart, horizontal), q = p.encodeColor({ field: "series" });
    assert.equal(q.semanticSpec.layers[0].layout.mode, "group");
    assert.equal(q.semanticSpec.layers[0].encoding[horizontal ? "yOffset" : "xOffset"].field, "series");
    assert.equal(q.graphicSpec.objects.bars.items.length, 6);
    const band = horizontal ? "height" : "width";
    assert.ok(geometry(q).every(rect => rect[band] < geometry(p)[0][band]));
  }
});

test("explicit color layout, stored layout and independent series groups retain their placement", () => {
  for (const horizontal of [false, true]) {
    const p = source(chart, horizontal);
    for (const mode of ["group", "overlay", "stack", "fill", "diverging"]) {
      const explicit = p.encodeColor({ field: "category", layout: mode });
      assert.equal(explicit.semanticSpec.layers[0].layout.mode, mode);
      const stored = p.encodeGroup({ field: "category" }).layoutSeries({ mode })
        .encodeColor({ field: "category" });
      assert.equal(stored.semanticSpec.layers[0].layout.mode, mode);
    }
    const grouped = p.encodeGroup({ field: "series" }).encodeColor({ field: "category" });
    assert.equal(grouped.semanticSpec.layers[0].layout.mode, "group");
    assert.equal(grouped.graphicSpec.objects.bars.items.length, 6);
  }
});

test("same-category coloring preserves band and pixel width policies through replay", () => {
  for (const horizontal of [false, true]) for (const width of [{ band: 0.5 }, { pixels: 24 }]) {
    const p = source(chart, horizontal, "nominal", width), q = p.encodeColor({ field: "category" });
    assert.deepEqual(geometry(q), geometry(p));
    assert.deepEqual(geometry(q.editCanvas({ width: 720, height: 520 })), geometry(p.editCanvas({ width: 720, height: 520 })));
    const axis = horizontal ? "y" : "x";
    assert.deepEqual(geometry(q.editScale({ id: axis, domain: ["C", "A", "B"] })),
      geometry(p.editScale({ id: axis, domain: ["C", "A", "B"] })));
    assert.deepEqual(geometry(deserializeProgram(serializeProgram(q))), geometry(q));
  }
});

test("one-call bar facade and separate color assignment agree for a repeated category", () => {
  const p = source(), q = p.encodeColor({ field: "category" });
  const bundled = chart().createCanvas({ width: 640, height: 460, margin: 80 }).createData({ id: "data", values })
    .createBarPlot({ id: "bars", x: "category", y: { field: "value", aggregate: "mean" }, color: "category", guides: false });
  assert.deepEqual(bundled.semanticSpec, q.semanticSpec);
  assert.deepEqual(bundled.graphicSpec, q.graphicSpec);
});
