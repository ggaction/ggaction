import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";

function base(labels = false) {
  let program = chart()
    .createCanvas({ width: 400, height: 300, margin: 20 })
    .createData({ id: "low", values: [{ x: 0, y: 0, c: 0 }, { x: 50, y: 50, c: 50 }] })
    .createScatterPlot({
      id: "lowPoints", data: "low",
      x: { field: "x", scale: { nice: false } },
      y: { field: "y", scale: { nice: false } }, guides: false
    });
  if (labels) program = program.createTextMark({ id: "labels" }).encodeText({ field: "c" });
  return program
    .createData({ id: "high", values: [{ x: 100, y: 100, c: 100 }, { x: 200, y: 200, c: 200 }] })
    .createScatterPlot({ id: "highPoints", data: "high", x: "x", y: "y", guides: false });
}

test("filtering a shared position consumer refreshes sibling marks and attached labels", () => {
  const before = base(true);
  assert.equal(before.semanticSpec.layers.find(layer => layer.id === "labels").source, "lowPoints");
  const snapshot = JSON.stringify(before);
  const after = before.filterMarks({ target: "highPoints", field: "x", op: "eq", value: 100 });
  assert.deepEqual(after.resolvedScales.x.domain, [0, 100]);
  assert.deepEqual(after.resolvedScales.y.domain, [0, 100]);
  const point = after.graphicSpec.objects.lowPoints.items[1].properties;
  assert.equal(point.x, 200);
  assert.equal(point.y, 150);
  assert.deepEqual(after.graphicSpec, after.editCanvas({ width: 400 }).graphicSpec);
  assert.doesNotThrow(() => renderToSVG(after));
  assert.equal(JSON.stringify(before), snapshot);
});

for (const [method, property, expected, extra] of [
  ["encodeColor", "fill", "#3b528b", { fieldType: "quantitative" }],
  ["encodeSize", "radius", Math.sqrt(67 / Math.PI), {}],
  ["encodeOpacity", "opacity", 0.4, {}]
]) {
  test(method + " refreshes both shared consumers in either authoring order", () => {
    for (const targets of [["lowPoints", "highPoints"], ["highPoints", "lowPoints"]]) {
      let program = base();
      for (const target of targets) program = program[method]({ target, field: "c", ...extra });
      const value = program.graphicSpec.objects.lowPoints.items[1].properties[property];
      if (typeof expected === "number") assert.ok(Math.abs(value - expected) < 1e-12);
      else assert.equal(value, expected);
      assert.deepEqual(program.graphicSpec, program.editCanvas({ width: 400 }).graphicSpec);
    }
  });
}

test("shared color refresh crosses compatible mark families", () => {
  const program = base()
    .createData({ id: "series", values: [{ x: 0, y: 0, c: "A" }, { x: 50, y: 50, c: "A" }] })
    .createLineMark({ id: "trend", data: "series" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "c", fieldType: "nominal", scale: { id: "categories" } })
    .encodeColor({ target: "highPoints", field: "c", fieldType: "nominal", scale: { id: "categories" } });
  assert.deepEqual(program.graphicSpec, program.editCanvas({ width: 400 }).graphicSpec);
});
