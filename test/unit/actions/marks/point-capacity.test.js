import assert from "node:assert/strict";
import test from "node:test";
import { chart, render, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { getErrorDetails } from "../../../../src/diagnostics.js";
import { exportAccessibleData } from "../../../../src/accessibility.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createCanvas } from "@napi-rs/canvas";
import { MAX_GENERATED_ITEMS, MAX_WORK_ITEMS } from "../../../../src/core/validation.js";

const rows = count => Array.from({ length: count }, (_, x) => ({ x, y: x % 101, group: x % 2, label: String(x) }));
function scatter(count, factory = chart) {
  return factory().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ id: "raw", values: rows(count) }).createScatterPlot({ x: "x", y: "y", guides: false });
}

test("point-owned allocation has an inclusive 50000 boundary in Full and Basic", () => {
  for (const factory of [chart, basicChart]) for (const count of [9999, 10000, 10001, 49999, 50000, 50001]) {
    const values = rows(count);
    const parent = factory().createData({ id: "raw", values });
    const before = serializeProgram(parent);
    if (count === 50001) {
      assert.throws(() => parent.createPointMark(), error => {
        assert.equal(error.message, "Point mark item count must not exceed 50000.");
        assert.deepEqual(getErrorDetails(error), { code: "resource-limit", operation: "createGraphics",
          optionPath: "Point mark item count", limit: 50000, actual: 50001 });
        return true;
      });
    } else {
      const program = parent.createPointMark();
      assert.equal(program.semanticSpec.layers.length, 1);
      assert.equal(program.graphicSpec.objects.point.items.length, count);
      assert.equal(program.graphicSpec.objects.point.items.at(-1).id, `point:${count - 1}`);
      assert.deepEqual(program.semanticSpec.datasets[0].values, values);
    }
    assert.equal(serializeProgram(parent), before);
    assert.equal(values.at(-1).label, String(count - 1));
  }
});

test("one point collection supports circles, rectangles, paths, mixed shapes and property arrays", () => {
  const base = scatter(10001);
  for (const shape of ["circle", "square", "star"]) {
    const program = base.editPointMark({ shape });
    assert.equal(program.graphicSpec.objects.scatterPlot.items.length, 10001);
    assert.equal(program.graphicSpec.objects.scatterPlot.items.at(-1).id, "scatterPlot:10000");
  }
  const mixed = base.encodeShape({ field: "group", fieldType: "nominal", scale: { range: ["circle", "square"] } });
  assert.equal(mixed.graphicSpec.objects.scatterPlot.type, "collection");
  assert.deepEqual(mixed.graphicSpec.objects.scatterPlot.items.slice(0, 2).map(item => item.type), ["circle", "rect"]);
  const edited = mixed.editGraphics({ target: "scatterPlot", property: "opacity", value: Array(10001).fill(.7) });
  assert.equal(edited.graphicSpec.objects.scatterPlot.items.at(-1).properties.opacity, .7);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
  const items = mixed.graphicSpec.objects.scatterPlot.items.map(({ type, properties }) => ({ type, properties }));
  assert.equal(mixed.editGraphics({ target: "scatterPlot", property: "items", value: items }).graphicSpec.objects.scatterPlot.items.length, 10001);
});

test("primitive capacity proves semantic point ownership and retains independent limits", () => {
  assert.equal(MAX_GENERATED_ITEMS, 10000); assert.equal(MAX_WORK_ITEMS, 10000000);
  assert.throws(() => chart().createGraphics({ id: "dots", type: "circle", length: 10001 }), /10000/);
  const declared = chart().createData({ id: "raw", values: rows(1) })
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points].data", value: "raw" });
  assert.throws(() => declared.createGraphics({ id: "unowned", type: "circle", length: 10001 }), /10000/);
  assert.throws(() => declared.createGraphics({ id: "points", type: "text", length: 10001 }), /10000/);
  const graphic = chart().createGraphics({ id: "ordinary", type: "circle", length: 1 });
  assert.throws(() => graphic.editGraphics({ target: "ordinary", property: "length", value: 10001 }), /10000/);
  const values = rows(10001);
  const other = chart().createCanvas({ width: 400, height: 300, margin: 50 }).createData({ values });
  assert.throws(() => other.createTickMark().encodeX({ field: "x" }).encodeY({ field: "y" }), /10000/);
  assert.throws(() => other.createRectMark().encodeX({ field: "x" }).encodeX2({ datum: 10002 })
    .encodeY({ field: "y" }).encodeY2({ datum: 101 }), /10000/);
  const commands = Array.from({ length: 30001 }, (_, i) => ({ op: i ? "L" : "M", x: i, y: 0 }));
  assert.throws(() => chart().createGraphics({ id: "path", type: "path" })
    .editGraphics({ target: "path", property: "commands", value: commands }), /30000/);
});

test("raw source revisions reject overflow before missing rows can hide allocation", () => {
  const program = scatter(10001), before = serializeProgram(program);
  const revised = program.reviseData({ source: "raw", id: "newRows", values: rows(10002) });
  assert.equal(revised.graphicSpec.objects.scatterPlot.items.length, 10002);
  assert.equal(revised.graphicSpec.objects.scatterPlot.items.at(-1).id, "scatterPlot:10001");
  assert.throws(() => program.reviseData({ source: "raw", id: "tooMany", values: rows(50001) }), /50000/);
  const dropping = program.editPointMark({ missing: "skip" });
  assert.throws(() => dropping.reviseData({ source: "raw", id: "tooMany", values: rows(50001).map(row => ({ ...row, y: null })) }), /50000/);
  assert.equal(serializeProgram(program), before);
});

test("large point consumers preserve positions, selections, accessibility, resizing and graphic-only exports", () => {
  const program = scatter(50000);
  const before = serializeProgram(program);
  assert.deepEqual(deserializeProgram(before).graphicSpec, program.graphicSpec);
  const graphic = deserializeGraphic(serializeGraphic(program));
  assert.equal(graphic.graphicSpec.objects.scatterPlot.items.length, 50000);
  const actual = createCanvas(400, 300).getContext("2d"); render(graphic, actual);
  assert.ok(actual.getImageData(0, 0, 400, 300).data.some((byte, i) => i % 4 !== 3 && byte < 200));
  assert.match(renderToSVG(graphic), /<circle/);
  const selected = program.selectMarks({ id: "last", field: "x", op: "max" }).highlightMarks({ selection: "last", color: "red" });
  assert.equal(selected.graphicSpec.objects.scatterPlot.items.filter(item => item.properties.fill === "red").length, 1);
  assert.equal(selected.graphicSpec.objects.scatterPlot.items.at(-1).properties.fill, "red");
  const resized = selected.editCanvas({ width: 450 });
  assert.equal(resized.graphicSpec.objects.scatterPlot.items.length, 50000);
  assert.equal(resized.graphicSpec.objects.scatterPlot.items.at(-1).properties.x, 400);
  const accessible = exportAccessibleData(program, { target: "scatterPlot" });
  assert.equal(accessible.views[0].rows.length, 50000);
  assert.equal(serializeProgram(program), before);
});

test("editable snapshots require capacity ownership while graphic-only structural validation remains separate", () => {
  const program = scatter(10001);
  const snapshot = JSON.parse(serializeProgram(program)); const state = decodeValue(snapshot.payload);
  state.semanticSpec.layers[0].mark.type = "rect"; snapshot.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(snapshot)), /10000/);
  const graphics = JSON.parse(serializeGraphic(program)); const source = decodeValue(graphics.payload);
  source.objects.scatterPlot.items.push(...source.objects.scatterPlot.items.map((item, i) => ({ ...item, id: `extra:${i}` })));
  graphics.payload = encodeValue(source);
  assert.equal(deserializeGraphic(JSON.stringify(graphics)).graphicSpec.objects.scatterPlot.items.length, 20002);
});

test("facets retain large point-owned child collections without changing common work limits", () => {
  const program = scatter(22002);
  const faceted = program.facet({ field: "group", guides: { legend: false } });
  assert.equal(faceted.compositionSpec.children.length, 2);
  for (const child of Object.values(faceted.children)) assert.equal(child.graphicSpec.objects.scatterPlot.items.length, 11001);
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  const nested = hconcat({ programs: [{ id: "panels", program: faceted }, { id: "small", program: scatter(2) }] });
  assert.deepEqual(deserializeProgram(serializeProgram(nested)).graphicSpec, nested.graphicSpec);
});
