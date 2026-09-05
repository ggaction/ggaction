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

for (const channel of ["x", "y", "color", "size", "opacity"]) {
  for (const operation of ["removeMark", "removeEncoding", "reassign"]) {
    test(operation + " removes the departed " + channel + " scale contribution", () => {
      const method = { x: "encodeX", y: "encodeY", color: "encodeColor", size: "encodeSize", opacity: "encodeOpacity" }[channel];
      const options = {
        field: ["x", "y"].includes(channel) ? channel : "c",
        ...(channel === "color" ? { fieldType: "quantitative" } : {})
      };
      let before = base();
      if (!["x", "y"].includes(channel)) {
        before = before[method]({ target: "lowPoints", ...options })
          [method]({ target: "highPoints", ...options });
      }
      const snapshot = JSON.stringify(before);
      const after = operation === "removeMark"
        ? before.removeMark({ target: "highPoints" })
        : operation === "removeEncoding"
          ? before.removeEncoding({ target: "highPoints", channel })
          : before[method]({ target: "highPoints", ...options, scale: { id: "separate" } });
      assert.deepEqual(after.resolvedScales[channel].domain, [0, 50]);
      const point = after.graphicSpec.objects.lowPoints.items[1].properties;
      if (channel === "x") assert.equal(point.x, 380);
      if (channel === "y") assert.equal(point.y, 20);
      if (channel === "color") assert.equal(point.fill, "#fde725");
      if (channel === "size") assert.ok(Math.abs(point.radius - Math.sqrt(196 / Math.PI)) < 1e-12);
      if (channel === "opacity") assert.equal(point.opacity, 1);
      assert.equal(JSON.stringify(before), snapshot);
    });
  }
}

test("detaching the last consumer preserves the named scale without trying to resolve it", () => {
  const before = base().removeMark({ target: "highPoints" });
  const after = before.removeMark({ target: "lowPoints" });
  assert.equal(after.semanticSpec.scales.length, 2);
  assert.equal(after.semanticSpec.layers.length, 0);
});

test("detachment preserves explicit domains and refreshes the remaining opacity after constant assignment", () => {
  const explicit = base().editScale({ id: "x", domain: [0, 400] });
  const removed = explicit.removeMark({ target: "highPoints" });
  assert.deepEqual(removed.resolvedScales.x.domain, [0, 400]);
  assert.equal(removed.graphicSpec.objects.lowPoints.items[1].properties.x, 65);
  const opacity = base().encodeOpacity({ target: "lowPoints", field: "c" })
    .encodeOpacity({ target: "highPoints", field: "c" })
    .encodeOpacity({ target: "highPoints", value: 0.5 });
  assert.deepEqual(opacity.resolvedScales.opacity.domain, [0, 50]);
  assert.equal(opacity.graphicSpec.objects.lowPoints.items[1].properties.opacity, 1);
});
