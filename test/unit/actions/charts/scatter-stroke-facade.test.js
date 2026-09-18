import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [{ x: 1, y: 2, group: "A", amount: 1, time: "2024-01-01" },
  { x: 2, y: 3, group: "B", amount: 10, time: "2024-01-02" }];
const base = (factory = chart) => factory().createCanvas({ width: 800, height: 500, margin: 150 })
  .createData({ values });

test("scatter stroke uses the existing encoding owner in Full and Basic", () => {
  for (const stroke of ["group", { field: "amount", fieldType: "quantitative", scale: { type: "log" } },
    { field: "amount", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } },
    { field: "time", fieldType: "temporal" }]) {
    const encoding = typeof stroke === "string" ? { field: stroke } : stroke;
    const reference = base().createScatterPlot({ x: "x", y: "y", point: { fill: "none" }, guides: false })
      .encodeStroke({ target: "scatterPlot", ...encoding }).editPointMark({ strokeWidth: 2 });
    for (const factory of [chart, basicChart]) {
      const source = base(factory);
      const before = serializeProgram(source);
      const result = source.createScatterPlot({ x: "x", y: "y", stroke, point: { fill: "none", strokeWidth: 2 }, guides: false });
      assert.deepEqual(result.semanticSpec, reference.semanticSpec);
      assert.deepEqual(result.graphicSpec, reference.graphicSpec);
      assert.deepEqual(result.trace.children.at(-1).children.map(child => child.op),
        ["createPointMark", "encodeX", "encodeY", "encodeStroke", "editPointMark"]);
      assert.equal(serializeProgram(source), before);
      assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
      assert.match(renderToSVG(result), /stroke=/);
    }
  }
});

test("scatter stroke creates categorical, continuous and discretized owned legends", () => {
  for (const factory of [chart, basicChart]) {
    for (const [stroke, kind] of [["group", "stroke"],
      [{ field: "amount", fieldType: "quantitative" }, "strokeGradient"],
      [{ field: "amount", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }, "strokeInterval"]]) {
      const result = base(factory).createScatterPlot({ x: "x", y: "y", stroke, point: { fill: "none" } });
      assert.equal(result.guideConfigs.legend[kind].target, "scatterPlot");
      assert.match(renderToSVG(result), /<svg/);
    }
    const combined = base(factory).createScatterPlot({ x: "x", y: "y", color: "group", stroke: "group",
      guides: { legend: { channels: ["stroke"] } } });
    assert.equal(combined.semanticSpec.layers[0].encoding.color.field, "group");
    assert.equal(combined.guideConfigs.legend.stroke.target, "scatterPlot");
  }
});

test("scatter stroke conflicts and nested ownership fail without changing the source", () => {
  for (const factory of [chart, basicChart]) {
    const source = base(factory);
    const before = serializeProgram(source);
    for (const pointStroke of [false, "red"]) {
      assert.throws(() => source.createScatterPlot({ x: "x", y: "y", stroke: "group", point: { stroke: pointStroke } }), /conflicts/);
    }
    for (const stroke of [{ value: "red" }, { field: "group", value: "red" }, { field: "" }]) {
      assert.throws(() => source.createScatterPlot({ x: "x", y: "y", stroke }), /requires a field/);
    }
    assert.throws(() => source.createScatterPlot({ x: "x", y: "y", stroke: { field: "group", target: "other" } }), /owned by the chart facade/);
    assert.throws(() => source.createScatterPlot({ x: "x", y: "y", stroke: "group", point: { strokeWidth: -1 } }), /non-negative/);
    const invisible = source.createScatterPlot({ x: "x", y: "y", stroke: "group", point: { strokeWidth: 0 }, guides: false });
    assert.ok(invisible.graphicSpec.objects.scatterPlot.items.every(item => item.properties.strokeWidth === 0));
    assert.equal(serializeProgram(source), before);
  }
});

test("scatter stroke retains its encoding through resize, rebinding and facets", () => {
  const original = base().createScatterPlot({ x: "x", y: "y", stroke: "group", guides: false });
  const recolored = original.encodeStroke({ field: "group", scale: { range: ["red", "blue"] } });
  assert.deepEqual(recolored.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), ["red", "blue"]);
  const resized = recolored.editCanvas({ width: 900 });
  assert.deepEqual(resized.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), ["red", "blue"]);
  const faceted = resized.facet({ field: "group" });
  assert.equal(Object.keys(faceted.children).length, 2);
  assert.deepEqual(Object.values(faceted.children).flatMap(child => child.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke)), ["red", "blue"]);
});
