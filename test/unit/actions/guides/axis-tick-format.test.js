import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
const labels = (p, id = "yAxisLabels") => p.graphicSpec.objects[id].items.map(i => i.properties.text);
function base() {
  return chart().createCanvas({ width: 600, height: 480, margin: 90 })
    .createData({ values: [{ x: 0, y: -0.15 }, { x: 1, y: 0.3 }] })
    .createLinePlot({ x: "x", y: { field: "y", scale: { domain: [-0.15, 0.3] } }, guides: false });
}
const ticks = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
const expected = ["−0.15", "−0.10", "−0.05", "0.00", "0.05", "0.10", "0.15", "0.20", "0.25", "0.30"];

test("complete and focused axis authoring retain data and tick geometry", () => {
  const original = base().createYAxis({ title: false, ticksAndLabels: { values: ticks, labels: { fontSize: 10 } } });
  const before = serializeProgram(original);
  const edited = original.editYAxisLabels({ format: "ticks" });
  const direct = base().createAxes({ x: false, y: { title: false, ticksAndLabels: { values: ticks, labels: { fontSize: 10, format: "ticks" } } } });
  assert.deepEqual(labels(edited), expected);
  assertEquivalentMeaning(direct.graphicSpec, edited.graphicSpec);
  assert.deepEqual(edited.graphicSpec.objects.yAxisTicks, original.graphicSpec.objects.yAxisTicks);
  assert.deepEqual(edited.semanticSpec, original.semanticSpec);
  assert.equal(serializeProgram(original), before);
  assert.deepEqual(labels(edited.editYAxisLabels({ format: "auto" })), labels(original));
});

test("precision follows scale and Canvas replay and survives editable persistence", () => {
  const original = base().createYAxis({ title: false, ticksAndLabels: { count: 10, labels: { fontSize: 10, format: "ticks" } } });
  const restored = deserializeProgram(serializeProgram(original));
  assert.equal(renderToSVG(restored), renderToSVG(original));
  const resized = restored.editCanvas({ height: 520 });
  assert.deepEqual(labels(resized), labels(original));
  const changed = resized.editYScale({ domain: [0, 900] });
  assert.deepEqual(labels(changed), ["0", "100", "200", "300", "400", "500", "600", "700", "800", "900"]);
  assert.equal(changed.guideConfigs.axis.y.labels.format, "ticks");
  const mapped = original.editYAxisLabels({ labelMap: [{ value: 0, label: "Baseline" }] });
  assert(labels(mapped).includes("Baseline"));
  assert(labels(mapped).includes("0.10"));
});

test("independent facet children compute separate decimal precision from one axis recipe", () => {
  const p = chart().createCanvas({ width: 440, height: 480, margin: 90 })
    .createData({ values: [{ group: "fraction", x: 0, y: -0.15 }, { group: "fraction", x: 1, y: 0.3 }, { group: "integer", x: 0, y: 0 }, { group: "integer", x: 1, y: 879.4 }] })
    .createLinePlot({ x: "x", y: { field: "y", scale: { zero: true, nice: { count: 10 } } }, guides: false })
    .createYAxis({ title: false, ticksAndLabels: { count: 10, labels: { fontSize: 10, format: "ticks" } } })
    .facet({ field: "group", scales: { y: "independent" } });
  assert.deepEqual(labels(p.children[p.compositionSpec.children[0]]), expected);
  assert.deepEqual(labels(p.children[p.compositionSpec.children[1]]), ["0", "100", "200", "300", "400", "500", "600", "700", "800", "900"]);
  const restored = deserializeProgram(serializeProgram(p));
  assert.equal(renderToSVG(restored), renderToSVG(p));
});

test("named, polar and parallel numeric axes use the same explicit policy", () => {
  const named = base().createYAxis({ id: "right", position: "right", title: false, ticksAndLabels: { values: ticks, labels: { format: "ticks", fontSize: 10 } } });
  assert(Object.values(named.graphicSpec.objects).some(o => o.items?.some(i => i.properties.text === "−0.10")));
  const polar = chart().createCanvas({ width: 500, height: 500, margin: 100 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 1, r: 1 }] })
    .createPointMark().encodeTheta({ field: "a" }).encodeR({ field: "r" })
    .createRadialAxis({ title: false, ticksAndLabels: { values: [0, 0.5, 1], labels: { format: "ticks" } } });
  assert.deepEqual(labels(polar, "radialAxisLabels"), ["0.0", "0.5", "1.0"]);
  const parallel = chart().createCanvas({ width: 600, height: 450, margin: 90 })
    .createData({ values: [{ a: 0, b: 0 }, { a: 1, b: 1 }] })
    .createParallelCoordinates({ dimensions: ["a", "b"] })
    .editParallelAxis({ field: "a", labels: { values: [0, 0.5, 1], format: "ticks" } });
  assert(Object.values(parallel.graphicSpec.objects).some(o => o.items?.some(i => i.properties.text === "0.5")));
});

test("rejects numeric tick formatting on nonnumeric axes without changing the prior state", () => {
  const discrete = chart().createCanvas({ width: 400, height: 400, margin: 90 })
    .createData({ values: [{ x: "A", y: 1 }, { x: "B", y: 2 }] })
    .createBarPlot({ x: "x", y: "y", guides: false });
  const before = serializeProgram(discrete);
  assert.throws(() => discrete.createXAxis({ ticksAndLabels: { labels: { format: "ticks" } } }), /quantitative|auto/);
  assert.equal(serializeProgram(discrete), before);
  const time = chart().createCanvas({ width: 500, height: 400, margin: 90 })
    .createData({ values: [{ date: "2020-01-01", y: 1 }, { date: "2021-01-01", y: 2 }] })
    .createLinePlot({ x: { field: "date", fieldType: "temporal" }, y: "y", guides: false });
  assert.throws(() => time.createXAxis({ ticksAndLabels: { labels: { format: "ticks" } } }), /quantitative/);
});


test("Full and Basic plot facades preserve the explicit axis formatter", () => {
  for (const factory of [chart, basicChart]) {
    const p = factory().createCanvas({ width: 600, height: 480, margin: 90 })
      .createData({ values: [{ x: 0, y: -0.15 }, { x: 1, y: 0.3 }] })
      .createLinePlot({ x: "x", y: { field: "y", scale: { domain: [-0.15, 0.3] } },
        guides: { axes: { x: false, y: { title: false,
          ticksAndLabels: { values: ticks, labels: { format: "ticks", fontSize: 10 } } } }, grid: false, legend: false } });
    assert.deepEqual(labels(p), expected);
  }
});
