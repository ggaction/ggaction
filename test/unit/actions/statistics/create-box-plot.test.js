import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

function base(rows = loadCars()) {
  return chart()
    .createCanvas({
      width: 360,
      height: 460,
      margin: { top: 140, right: 40, bottom: 70, left: 80 }
    })
    .createData({ values: rows });
}

function complete(program = base()) {
  return program.createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" }
  });
}

function findAction(node, op) {
  if (node.op === op) return node;
  for (const child of node.children ?? []) {
    const found = findAction(child, op);
    if (found !== undefined) return found;
  }
  return undefined;
}

test("creates the shortest vertical Tukey box plot with documented defaults", () => {
  const program = complete();
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "boxPlotSummaryData"
  );

  assert.equal(summary.transform[0].factor, 1.5);
  assert.equal(summary.transform[0].method, "linear");
  assert.deepEqual(
    program.semanticSpec.layers.map(layer => [layer.id, layer.mark.type]),
    [
      ["boxPlot", "bar"],
      ["boxPlotWhisker", "rule"],
      ["boxPlotWhiskerLowerCap", "rule"],
      ["boxPlotWhiskerUpperCap", "rule"],
      ["boxPlotMedian", "rule"],
      ["boxPlotOutliers", "point"]
    ]
  );
  assert.equal(program.graphicSpec.objects.boxPlot.children.length, 3);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers.children.length, 10);
  assert.ok(program.graphicSpec.objects.boxPlotOutliers.children.every(child =>
    child.type === "path" && child.properties.fill === "#111111"
  ));
  assert.deepEqual(
    program.graphicSpec.objects.boxPlotMedian.children.map(child => [
      child.properties.x1,
      child.properties.x2
    ]),
    program.graphicSpec.objects.boxPlot.children.map(child => [
      child.properties.x,
      child.properties.x + child.properties.width
    ])
  );
});

test("converges when compatible owner encodings arrive after createBoxPlot", () => {
  const direct = complete();
  const deferred = base()
    .createBoxPlot()
    .encodeX({ target: "boxPlot", field: "Origin", fieldType: "nominal" })
    .encodeY({ target: "boxPlot", field: "Miles_per_Gallon" });

  assert.deepEqual(deferred.semanticSpec, direct.semanticSpec);
  assert.deepEqual(deferred.graphicSpec, direct.graphicSpec);
  assert.deepEqual(deferred.resolvedScales, direct.resolvedScales);
});

test("infers data, coordinate, fields, and scales from an encoded source layer", () => {
  const source = base(loadCars().filter(row =>
    typeof row.Origin === "string" && Number.isFinite(row.Miles_per_Gallon)
  ))
    .createPointMark({ id: "observations" })
    .encodeX({ field: "Origin", fieldType: "nominal" })
    .encodeY({ field: "Miles_per_Gallon" });
  const program = source.createBoxPlot();
  const body = program.semanticSpec.layers.find(layer => layer.id === "boxPlot");

  assert.equal(body.coordinate, "main");
  assert.equal(body.encoding.x.scale, "x");
  assert.equal(body.encoding.y.scale, "y");
  assert.equal(
    program.semanticSpec.datasets.find(dataset => dataset.id === "boxPlotSummaryData").source,
    "data"
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("records reusable data, interval, median, and outlier child actions", () => {
  const actionNode = complete().trace.children.at(-1);
  const materialize = findAction(actionNode, "materializeBoxPlot");

  assert.ok(materialize);
  assert.ok(findAction(materialize, "createBoxSummaryData"));
  assert.ok(findAction(materialize, "createBoxOutlierData"));
  assert.ok(findAction(materialize, "createErrorBar"));
  assert.ok(findAction(materialize, "createBoxMedian"));
  assert.ok(findAction(materialize, "createBoxOutliers"));
});

test("omits empty optional outlier resources and rematerializes after Canvas edits", () => {
  const rows = [
    { Origin: "A", Miles_per_Gallon: 1 },
    { Origin: "A", Miles_per_Gallon: 2 },
    { Origin: "A", Miles_per_Gallon: 3 }
  ];
  const program = complete(base(rows));
  const resized = program.editCanvas({ width: 460 });

  assert.equal(program.semanticSpec.datasets.some(dataset => dataset.id === "boxPlotOutlierData"), false);
  assert.equal(program.semanticSpec.layers.some(layer => layer.id === "boxPlotOutliers"), false);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers, undefined);
  assert.notDeepEqual(
    resized.graphicSpec.objects.boxPlot.children.map(child => child.properties.x),
    program.graphicSpec.objects.boxPlot.children.map(child => child.properties.x)
  );
  assert.deepEqual(
    resized.graphicSpec.objects.boxPlotMedian.children.map(child => [
      child.properties.x1,
      child.properties.x2
    ]),
    resized.graphicSpec.objects.boxPlot.children.map(child => [
      child.properties.x,
      child.properties.x + child.properties.width
    ])
  );
});

test("validates ownership, orientation, and nested options atomically", () => {
  const program = base();
  assert.throws(
    () => program.createBoxPlot({
      x: { field: "Horsepower" },
      y: { field: "Miles_per_Gallon" }
    }),
    /categorical x and quantitative y/
  );
  assert.throws(
    () => complete(program).createBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" }
    }),
    /requires an explicit .*id/i
  );
  assert.throws(
    () => program.createBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" },
      width: { band: 1 }
    }),
    /Unknown createBoxPlot option/
  );
  assert.equal(program.semanticSpec.layers.length, 0);
});
