import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveAreaSeries } from "../../../../src/grammar/areaSeries.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { exportAccessibleData } from "../../../../src/accessibility.js";

const rows = [{ day: "Tue", value: 20, group: "A" }, { day: "Mon", value: 10, group: "A" },
  { day: "Mon", value: 5, group: "B" }, { day: "Tue", value: 8, group: "B" }];
const domain = ["Mon", "Tue"];
function build(layout = "stack", horizontal = false, type = "point") {
  const category = { field: "day", fieldType: "ordinal", scale: { id: "category", type, domain } };
  return chart().createCanvas({ width: 400, height: 300, margin: 40 }).createData({ values: rows })
    .createAreaPlot({ id: "area", x: horizontal ? "value" : category, y: horizontal ? category : "value",
      valueChannel: horizontal ? "x" : "y", groupBy: "group", layout, guides: false });
}

test("categorical stacked areas preserve ordered positions and per-category totals", () => {
  for (const horizontal of [false, true]) for (const type of ["point", "band"]) {
    const p = build("stack", horizontal, type);
    const layer = p.semanticSpec.layers.find(l => l.id === "area");
    const derived = deriveAreaSeries(rows, layer, { xDomain: domain, yDomain: domain });
    const position = horizontal ? "y" : "x", measure = horizontal ? "x" : "y";
    assert.deepEqual(derived.series[0].values.map(v => v[position]), domain);
    assert.deepEqual(derived.series[1].values.map(v => v[measure + "2"]), [15, 28]);
    assert.deepEqual(derived.series[1].values.map(v => v[measure]), [10, 20]);
    const commands = p.graphicSpec.objects.area.items.map(i => i.properties.commands);
    assert.equal(commands.length, 2);
    assert.ok(commands.every(path => path.at(-1).op === "Z"));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.notDeepEqual(p.editCanvas({ width: 520, height: 340 }).graphicSpec.objects.area, p.graphicSpec.objects.area);
  }
});

test("categorical area geometry responds to domain order and shared point positions", () => {
  const p = build("overlay").createScatterPlot({ id: "points", x: { field: "day", fieldType: "ordinal", scale: { id: "category" } }, y: "value", guides: false });
  const path = p.graphicSpec.objects.area.items[0].properties.commands;
  const points = p.graphicSpec.objects.points.items.map(i => i.properties);
  assert.equal(path[0].x, points[1].x);
  assert.equal(path[1].x, points[0].x);
  const reversed = p.editScale({ id: "category", domain: ["Tue", "Mon"] });
  const exported = exportAccessibleData(reversed, { target: "area" });
  assert.ok(JSON.stringify(exported).includes('Tue'));
  const d = deriveAreaSeries(rows, reversed.semanticSpec.layers.find(l => l.id === "area"), { xDomain: ["Tue", "Mon"] });
  assert.deepEqual(d.series[0].values.map(v => v.x), ["Tue", "Mon"]);
});

test("categorical area layouts keep fill and centered totals", () => {
  for (const mode of ["fill", "center", "diverging"]) {
    const p = build(mode), layer = p.semanticSpec.layers.find(l => l.id === "area");
    const d = deriveAreaSeries(rows, layer, { xDomain: domain });
    const bottom = d.series[0].values, top = d.series[1].values;
    if (mode === "fill") assert.deepEqual(top.map(v => v.y2), [1, 1]);
    if (mode === "center") assert.deepEqual(bottom.map((v, i) => v.y + top[i].y2), [0, 0]);
  }
});

test("categorical areas preserve missing breaks and reject incomplete stack grids", () => {
  const values = [{ k: "E", v: 5 }, { k: "D", v: 4 }, { k: "C", v: null }, { k: "B", v: 2 }, { k: "A", v: 1 }];
  const p = chart().createCanvas().createData({ values }).createAreaPlot({ id: "area",
    x: { field: "k", fieldType: "nominal", scale: { domain: ["A", "B", "C", "D", "E"] } },
    y: "v", missing: "break", guides: false });
  assert.equal(p.graphicSpec.objects.area.items.length, 2);
  const d = deriveAreaSeries(values, p.semanticSpec.layers[0], { xDomain: ["A", "B", "C", "D", "E"] });
  assert.deepEqual(d.series.map(s => s.values.map(v => v.x)), [["A", "B"], ["D", "E"]]);
  assert.throws(() => chart().createCanvas().createData({ values: rows.slice(0, 3) }).createAreaPlot({
    x: { field: "day", fieldType: "nominal" }, y: "value", groupBy: "group", layout: "stack", guides: false
  }), /at least two points|aligned row/);
});

test("categorical areas support facet materialization and independent appearance order", () => {
  const p = build().encodeColor({ target: "area", field: "group", scale: { domain: ["B", "A"] } });
  const faceted = p.facet({ field: "group", columns: 2 });
  assert.ok(Object.keys(faceted.graphicSpec.objects).some(k => k.includes("area")));
  const d = deriveAreaSeries(rows, p.semanticSpec.layers.find(l => l.id === "area"), { xDomain: domain });
  assert.deepEqual(d.series.map(s => s.key.group), ["A", "B"]);
  assert.deepEqual(d.series[1].values.map(v => v.y2), [15, 28]);
});
