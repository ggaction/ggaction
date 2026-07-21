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

function horizontal(program = base()) {
  return program.createBoxPlot({
    x: { field: "Horsepower" },
    y: { field: "Origin", fieldType: "nominal" },
    whisker: { type: "minmax" }
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
  assert.equal(program.graphicSpec.objects.boxPlot.items.length, 3);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers.items.length, 10);
  assert.ok(program.graphicSpec.objects.boxPlotOutliers.items.every(child =>
    child.type === "path" && child.properties.fill === "#111111"
  ));
  assert.deepEqual(
    program.graphicSpec.objects.boxPlotMedian.items.map(child => [
      child.properties.x1,
      child.properties.x2
    ]),
    program.graphicSpec.objects.boxPlot.items.map(child => [
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

test("preserves opt-in guides and replays them after deferred encodings", () => {
  const options = {
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    guides: { legend: false }
  };
  const omitted = complete();
  const disabled = base().createBoxPlot({
    x: options.x,
    y: options.y,
    guides: false
  });
  const direct = base().createBoxPlot(options);
  const deferred = base()
    .createBoxPlot({ guides: { legend: false } })
    .encodeX({ target: "boxPlot", ...options.x })
    .encodeY({ target: "boxPlot", ...options.y });

  assert.equal(omitted.graphicSpec.objects.xAxisLine, undefined);
  assert.equal(disabled.graphicSpec.objects.xAxisLine, undefined);
  assert.equal(findAction(omitted.trace.children.at(-1), "createGuides"), undefined);
  assert.equal(findAction(disabled.trace.children.at(-1), "createGuides"), undefined);
  assert.ok(direct.graphicSpec.objects.xAxisLine);
  assert.ok(direct.graphicSpec.objects.yAxisLine);
  assert.ok(direct.graphicSpec.objects.horizontalGridLines);
  assert.ok(findAction(direct.trace.children.at(-1), "createGuides"));
  assert.deepEqual(deferred.semanticSpec, direct.semanticSpec);
  assert.deepEqual(deferred.graphicSpec, direct.graphicSpec);
  assert.deepEqual(deferred.resolvedScales, direct.resolvedScales);
});

test("infers one dataset without transient context and rejects ambiguous data", () => {
  const detached = base()._withContext({
    currentData: undefined,
    currentMark: undefined
  });
  const inferred = complete(detached);
  assert.equal(
    inferred.semanticSpec.datasets.find(dataset =>
      dataset.id === "boxPlotSummaryData"
    ).source,
    "data"
  );

  const ambiguous = detached
    .createData({ id: "other", values: [{ Origin: "A", Miles_per_Gallon: 1 }] })
    ._withContext({ currentData: undefined, currentMark: undefined });
  assert.throws(
    () => complete(ambiguous),
    /requires data when multiple datasets are available/
  );
  assert.equal(ambiguous.semanticSpec.layers.length, 0);
});

test("rejects ambiguous encoded sources before authoring and permits explicit positions", () => {
  const encoded = base(loadCars().filter(row =>
    typeof row.Origin === "string" && Number.isFinite(row.Miles_per_Gallon)
  ))
    .createPointMark({ id: "first" })
    .encodeX({ target: "first", field: "Origin", fieldType: "nominal", scale: { id: "firstX" } })
    .encodeY({ target: "first", field: "Miles_per_Gallon", scale: { id: "firstY" } })
    .createPointMark({ id: "second", data: "data" })
    .encodeX({ target: "second", field: "Origin", fieldType: "nominal", scale: { id: "secondX" } })
    .encodeY({ target: "second", field: "Miles_per_Gallon", scale: { id: "secondY" } })
    ._withContext({ currentMark: undefined, currentData: undefined });

  assert.throws(
    () => encoded.createBoxPlot(),
    /target is ambiguous; provide target or explicit x and y/
  );
  assert.equal(encoded.semanticSpec.layers.length, 2);

  const explicit = encoded.createBoxPlot({
    data: "data",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" }
  });
  assert.ok(explicit.semanticSpec.layers.some(layer => layer.id === "boxPlot"));
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

test("creates horizontal minmax boxes without optional outlier resources", () => {
  const program = horizontal();
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "boxPlotSummaryData"
  );
  const body = program.semanticSpec.layers.find(layer => layer.id === "boxPlot");

  assert.equal(summary.transform[0].whisker, "minmax");
  assert.equal(Object.hasOwn(summary.transform[0], "factor"), false);
  assert.equal(program.semanticSpec.datasets.some(dataset =>
    dataset.id === "boxPlotOutlierData"
  ), false);
  assert.equal(program.semanticSpec.layers.some(layer =>
    layer.id === "boxPlotOutliers"
  ), false);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers, undefined);
  assert.equal(body.encoding.y.field, "Origin");
  assert.equal(body.encoding.x.field, "__boxPlot_q1");
  assert.equal(body.encoding.x2.field, "__boxPlot_q3");
  assert.deepEqual(
    program.graphicSpec.objects.boxPlotMedian.items.map(child => [
      child.properties.y1,
      child.properties.y2
    ]),
    program.graphicSpec.objects.boxPlot.items.map(child => [
      child.properties.y,
      child.properties.y + child.properties.height
    ])
  );
});

test("converges when horizontal encodings arrive after createBoxPlot", () => {
  const direct = horizontal();
  const deferred = base()
    .createBoxPlot({ whisker: { type: "minmax" } })
    .encodeX({ target: "boxPlot", field: "Horsepower" })
    .encodeY({ target: "boxPlot", field: "Origin", fieldType: "nominal" });

  assert.deepEqual(deferred.semanticSpec, direct.semanticSpec);
  assert.deepEqual(deferred.graphicSpec, direct.graphicSpec);
  assert.deepEqual(deferred.resolvedScales, direct.resolvedScales);
});

test("infers horizontal box roles from one compatible encoded source", () => {
  const source = base(loadCars().filter(row =>
    typeof row.Origin === "string" && Number.isFinite(row.Horsepower)
  ))
    .createPointMark({ id: "observations" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Origin", fieldType: "nominal" });
  const program = source.createBoxPlot({ whisker: { type: "minmax" } });
  const body = program.semanticSpec.layers.find(layer => layer.id === "boxPlot");

  assert.equal(body.encoding.x.scale, "x");
  assert.equal(body.encoding.y.scale, "y");
  assert.equal(body.encoding.x.title, "Horsepower");
  assert.equal(program.markConfigs.boxPlot.boxPlot.orientation, "horizontal");
});

test("rematerializes horizontal boxes, medians, and minmax whiskers", () => {
  const program = horizontal();
  const resized = program.editCanvas({ width: 460 });
  const reversed = resized.editScale({ id: "x", reverse: true });

  assert.notDeepEqual(
    resized.graphicSpec.objects.boxPlot.items.map(child => child.properties.x),
    program.graphicSpec.objects.boxPlot.items.map(child => child.properties.x)
  );
  assert.notDeepEqual(
    reversed.graphicSpec.objects.boxPlot.items.map(child => child.properties.x),
    resized.graphicSpec.objects.boxPlot.items.map(child => child.properties.x)
  );
  assert.deepEqual(
    reversed.graphicSpec.objects.boxPlotMedian.items.map(child => [
      child.properties.y1,
      child.properties.y2
    ]),
    reversed.graphicSpec.objects.boxPlot.items.map(child => [
      child.properties.y,
      child.properties.y + child.properties.height
    ])
  );
  assert.equal(reversed.graphicSpec.objects.boxPlotOutliers, undefined);
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
    resized.graphicSpec.objects.boxPlot.items.map(child => child.properties.x),
    program.graphicSpec.objects.boxPlot.items.map(child => child.properties.x)
  );
  assert.deepEqual(
    resized.graphicSpec.objects.boxPlotMedian.items.map(child => [
      child.properties.x1,
      child.properties.x2
    ]),
    resized.graphicSpec.objects.boxPlot.items.map(child => [
      child.properties.x,
      child.properties.x + child.properties.width
    ])
  );
});

test("forwards factor, width, and approved component styles", () => {
  const program = base().createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    whisker: { type: "tukey", factor: 1 },
    width: { band: 0.5 },
    box: {
      fill: "#f28e2b",
      opacity: 0.82,
      stroke: "#9a3412",
      strokeWidth: 2
    },
    median: { stroke: "#431407", strokeWidth: 3 },
    outlier: { shape: "diamond", radius: 4, opacity: 0.9 }
  });
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "boxPlotSummaryData"
  );
  const body = program.graphicSpec.objects.boxPlot.items;
  const medians = program.graphicSpec.objects.boxPlotMedian.items;
  const outliers = program.graphicSpec.objects.boxPlotOutliers.items;

  assert.equal(summary.transform[0].factor, 1);
  assert.equal(outliers.length, 25);
  assert.deepEqual(body.map(child => child.properties.width), [40, 40, 40]);
  assert.ok(body.every(child =>
    child.properties.fill === "#f28e2b" &&
    child.properties.opacity === 0.82 &&
    child.properties.stroke === "#9a3412" &&
    child.properties.strokeWidth === 2
  ));
  assert.ok(medians.every(child =>
    child.properties.stroke === "#431407" && child.properties.strokeWidth === 3
  ));
  assert.ok(outliers.every(child =>
    child.type === "path" && child.properties.opacity === 0.9
  ));
  assert.deepEqual(
    medians.map(child => [child.properties.x1, child.properties.x2]),
    body.map(child => [child.properties.x, child.properties.x + child.properties.width])
  );
});

test("rematerializes approved styles and aligned components after Canvas edits", () => {
  const original = base().createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    whisker: { type: "tukey", factor: 1 },
    width: { band: 0.5 },
    box: { fill: "#f28e2b", opacity: 0.82, stroke: "#9a3412", strokeWidth: 2 },
    median: { stroke: "#431407", strokeWidth: 3 },
    outlier: { shape: "diamond", radius: 4, opacity: 0.9 }
  });
  const resized = original.editCanvas({ width: 460 });
  const body = resized.graphicSpec.objects.boxPlot.items;
  const medians = resized.graphicSpec.objects.boxPlotMedian.items;

  assert.notDeepEqual(
    body.map(child => child.properties.x),
    original.graphicSpec.objects.boxPlot.items.map(child => child.properties.x)
  );
  assert.ok(body.every(child =>
    child.properties.fill === "#f28e2b" &&
    child.properties.opacity === 0.82 &&
    child.properties.strokeWidth === 2
  ));
  assert.ok(medians.every(child => child.properties.strokeWidth === 3));
  assert.deepEqual(
    medians.map(child => [child.properties.x1, child.properties.x2]),
    body.map(child => [child.properties.x, child.properties.x + child.properties.width])
  );
  assert.ok(resized.graphicSpec.objects.boxPlotOutliers.items.every(child =>
    child.type === "path" && child.properties.opacity === 0.9
  ));
});

test("disables outliers without creating optional resources", () => {
  const program = base().createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    outliers: false
  });
  const actionNode = program.trace.children.at(-1);

  assert.equal(program.semanticSpec.datasets.some(dataset =>
    dataset.id === "boxPlotOutlierData"
  ), false);
  assert.equal(program.semanticSpec.layers.some(layer =>
    layer.id === "boxPlotOutliers"
  ), false);
  assert.equal(program.graphicSpec.objects.boxPlotOutliers, undefined);
  assert.equal(findAction(actionNode, "createBoxOutlierData"), undefined);
  assert.equal(findAction(actionNode, "createBoxOutliers"), undefined);
});

test("preserves category order and singleton or duplicate summaries", () => {
  const rows = [
    { group: "B", value: 2 },
    { group: "A", value: 1 },
    { group: "A", value: 1 },
    { group: "A", value: 3 },
    { group: "B", value: null },
    { group: null, value: 9 }
  ];
  const program = base(rows).createBoxPlot({
    id: "distribution",
    x: { field: "group", fieldType: "nominal" },
    y: { field: "value" }
  });
  const summary = program.semanticSpec.datasets.find(dataset =>
    dataset.id === "distributionSummaryData"
  );

  assert.deepEqual(summary.values.map(row => [
    row.group,
    row.__boxPlot_count,
    row.__boxPlot_q1,
    row.__boxPlot_median,
    row.__boxPlot_q3
  ]), [
    ["B", 1, 2, 2, 2],
    ["A", 3, 1, 1, 2]
  ]);
  assert.equal(program.semanticSpec.layers.some(layer =>
    layer.id === "distributionOutliers"
  ), false);
  assert.equal(rows[0].group, "B");
});

test("namespaces repeated box-plot resources from explicit owners", () => {
  const first = complete();
  const second = first.createBoxPlot({
    id: "secondary",
    data: "data",
    x: { field: "Origin", fieldType: "nominal", scale: "x" },
    y: { field: "Miles_per_Gallon", scale: "y" }
  });

  assert.ok(second.semanticSpec.datasets.some(dataset =>
    dataset.id === "secondarySummaryData"
  ));
  assert.ok(second.semanticSpec.layers.some(layer => layer.id === "secondaryMedian"));
  assert.ok(second.graphicSpec.objects.secondaryWhisker);
});

test("validates ownership, orientation, and nested options atomically", () => {
  const program = base();
  assert.throws(
    () => program.createBoxPlot({
      x: { field: "Horsepower" },
      y: { field: "Miles_per_Gallon" }
    }),
    /one categorical axis and one quantitative axis/
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
    /width\.band must be greater than 0 and less than 1/
  );
  assert.throws(
    () => program.createBoxPlot({ whisker: { type: "minmax", factor: 1 } }),
    /minmax whiskers do not accept factor/
  );
  assert.throws(
    () => program.createBoxPlot({ whisker: { type: "outer" } }),
    /Unsupported createBoxPlot whisker type/
  );
  assert.throws(
    () => program.createBoxPlot({ whisker: { type: "tukey", factor: 0 } }),
    /factor must be positive and finite/
  );
  assert.throws(
    () => program.createBoxPlot({ box: { opacity: 2 } }),
    /box\.opacity must be between 0 and 1/
  );
  assert.throws(
    () => program.createBoxPlot({ median: { strokeWidth: -1 } }),
    /median\.strokeWidth must be a non-negative finite number/
  );
  assert.throws(
    () => program.createBoxPlot({ outlier: { shape: "kite" } }),
    /Unsupported point shape/
  );
  assert.throws(
    () => program.createBoxPlot({ outliers: "no" }),
    /outliers must be a boolean/
  );
  assert.equal(program.semanticSpec.layers.length, 0);
});
