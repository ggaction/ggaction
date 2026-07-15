import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars, loadGapminder } from "../../../support/data.js";

const canvas = Object.freeze({
  width: 760,
  height: 480,
  margin: Object.freeze({ top: 90, right: 150, bottom: 70, left: 80 })
});

function directBand() {
  return chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "cluster"
    });
}

test("creates one grouped statistical area through wrapped interval actions", () => {
  const program = directBand();
  const action = program.trace.children.at(-1);
  const interval = program.semanticSpec.datasets.at(-1);
  const layer = program.semanticSpec.layers[0];

  assert.deepEqual(action.children.map(child => child.op), [
    "createIntervalData",
    "createAreaMark",
    "encodeX",
    "encodeYRange",
    "encodeGroup"
  ]);
  assert.deepEqual(
    action.children.find(child => child.op === "encodeYRange")
      .children.map(child => child.op),
    ["encodeY", "encodeY2"]
  );
  assert.deepEqual(interval.transform[0], {
    type: "interval",
    field: "life_expect",
    groupBy: ["year", "cluster"],
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: {
      center: "__errorBand_center",
      lower: "__errorBand_lower",
      upper: "__errorBand_upper"
    }
  });
  assert.deepEqual(layer.encoding, {
    x: { field: "year", fieldType: "temporal", scale: "x" },
    y: {
      field: "__errorBand_lower",
      fieldType: "quantitative",
      scale: "y"
    },
    y2: {
      field: "__errorBand_upper",
      fieldType: "quantitative",
      scale: "y"
    },
    group: { field: "cluster", fieldType: "nominal" }
  });
  assert.equal(interval.values.length, 66);
  assert.equal(program.graphicSpec.objects.errorBand.children.length, 6);
  assert.deepEqual(program.resolvedScales.y.domain, [30, 90]);
});

test("infers the source layer, channels, scales, coordinate, and grouping", () => {
  const base = chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createPointMark()
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "life_expect", scale: { nice: true, zero: false } })
    .createLineMark({ id: "trend" })
    .encodeX({ target: "trend", field: "year", fieldType: "temporal" })
    .encodeY({ target: "trend", field: "life_expect", aggregate: "mean" })
    .encodeGroup({ target: "trend", field: "cluster" });
  const program = base.createErrorBand();
  const source = base.semanticSpec.layers.find(layer => layer.id === "trend");
  const band = program.semanticSpec.layers.find(layer => layer.id === "errorBand");

  assert.equal(program.semanticSpec.datasets.at(-1).source, source.data);
  assert.deepEqual(program.semanticSpec.datasets.at(-1).transform[0].groupBy, [
    "year",
    "cluster"
  ]);
  assert.equal(band.coordinate, source.coordinate);
  assert.equal(band.encoding.x.scale, source.encoding.x.scale);
  assert.equal(band.encoding.y.scale, source.encoding.y.scale);
  assert.equal(band.encoding.group.field, "cluster");
});

test("explicit and statistical rows converge on the same concrete band", () => {
  const statistical = directBand();
  const rows = statistical.semanticSpec.datasets.at(-1).values;
  const explicit = chart()
    .createCanvas(canvas)
    .createData({ values: rows })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: {
        center: "__errorBand_center",
        lower: "__errorBand_lower",
        upper: "__errorBand_upper"
      },
      groupBy: "cluster"
    });

  assert.equal(explicit.semanticSpec.datasets.length, 1);
  assert.equal(explicit.semanticSpec.layers[0].encoding.y.title, "__errorBand_center");
  assert.deepEqual(
    explicit.graphicSpec.objects.errorBand,
    statistical.graphicSpec.objects.errorBand
  );
  assert.deepEqual(explicit.resolvedScales, statistical.resolvedScales);
});

test("reassigns both vertical bounds atomically without mutating earlier programs", () => {
  const rows = [
    { year: 2000, low: 1, high: 4, nextLow: 2, nextHigh: 5 },
    { year: 2001, low: 2, high: 5, nextLow: 3, nextHigh: 7 }
  ];
  const before = chart()
    .createCanvas(canvas)
    .createData({ values: rows })
    .createAreaMark()
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeYRange({ lower: "low", upper: "high" });
  const after = before.encodeYRange({ lower: "nextLow", upper: "nextHigh" });

  assert.equal(before.semanticSpec.layers[0].encoding.y.field, "low");
  assert.equal(before.semanticSpec.layers[0].encoding.y2.field, "high");
  assert.equal(after.semanticSpec.layers[0].encoding.y.field, "nextLow");
  assert.equal(after.semanticSpec.layers[0].encoding.y2.field, "nextHigh");
  assert.notDeepEqual(after.graphicSpec.objects.area, before.graphicSpec.objects.area);
  assert.deepEqual(
    after.trace.children.at(-1).children.map(child => child.op),
    ["encodeY", "encodeY2"]
  );
});

test("rematerializes temporal area paths after Canvas edits", () => {
  const before = directBand();
  const after = before.editCanvas({ width: 860 });

  assert.notDeepEqual(
    after.graphicSpec.objects.errorBand,
    before.graphicSpec.objects.errorBand
  );
  assert.equal(
    after.trace.children.at(-1).children.some(
      child => child.op === "rematerializeAreaMark"
    ),
    true
  );
});

test("forwards constant area appearance through the owned mark action", () => {
  const program = chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      fill: "#d9485f",
      opacity: 0.4
    });

  const child = program.graphicSpec.objects.errorBand.children[0];
  assert.equal(child.properties.fill, "#d9485f");
  assert.equal(child.properties.opacity, 0.4);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      opacity: 2
    }), /from 0 to 1/);
});

test("creates a horizontal Cars band with ordered boundary components", () => {
  const program = chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 90, right: 50, bottom: 70, left: 80 }
    })
    .createData({ values: loadCars() })
    .createErrorBand({
      x: { field: "Acceleration", extent: "ci" },
      y: { field: "Year", fieldType: "temporal" },
      boundaries: { stroke: "#355f8a", strokeWidth: 1.5 }
    });
  const action = program.trace.children.at(-1);
  const area = program.semanticSpec.layers[0];

  assert.deepEqual(action.children.map(child => child.op), [
    "createIntervalData",
    "createAreaMark",
    "encodeY",
    "encodeXRange",
    "createErrorBandBoundary",
    "createErrorBandBoundary"
  ]);
  assert.deepEqual(
    action.children.find(child => child.op === "encodeXRange")
      .children.map(child => child.op),
    ["encodeX", "encodeX2"]
  );
  assert.equal(area.encoding.y.field, "Year");
  assert.equal(area.encoding.y.fieldType, "temporal");
  assert.equal(area.encoding.x.field, "__errorBand_lower");
  assert.equal(area.encoding.x2.field, "__errorBand_upper");
  assert.deepEqual(program.resolvedScales.x.domain, [10, 20]);
  assert.equal(program.graphicSpec.objects.errorBand.children.length, 1);
  assert.equal(
    program.graphicSpec.objects.errorBand.children[0]
      .properties.commands.at(-1).op,
    "Z"
  );
  assert.deepEqual(program.graphicSpec.order.slice(-3), [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]);
  for (const id of ["errorBandLowerBoundary", "errorBandUpperBoundary"]) {
    const properties = program.graphicSpec.objects[id].children[0].properties;
    assert.equal(properties.stroke, "#355f8a");
    assert.equal(properties.strokeWidth, 1.5);
    assert.equal(properties.opacity, 1);
  }
});

test("uses explicit horizontal bounds without deriving a dataset", () => {
  const rows = [
    { year: 2000, center: 12, lower: 10, upper: 14 },
    { year: 2001, center: 13, lower: 11, upper: 16 }
  ];
  const program = chart()
    .createCanvas(canvas)
    .createData({ values: rows })
    .createErrorBand({
      x: { center: "center", lower: "lower", upper: "upper" },
      y: { field: "year", fieldType: "temporal" }
    });
  const layer = program.semanticSpec.layers[0];

  assert.equal(program.semanticSpec.datasets.length, 1);
  assert.equal(layer.encoding.x.field, "lower");
  assert.equal(layer.encoding.x2.field, "upper");
  assert.equal(layer.encoding.x.title, "center");
  assert.equal(layer.encoding.y.field, "year");
  assert.equal(
    program.trace.children.at(-1).children.some(
      child => child.op === "createIntervalData"
    ),
    false
  );
});

test("rematerializes horizontal bands and boundaries after Canvas and scale edits", () => {
  const before = chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 90, right: 50, bottom: 70, left: 80 }
    })
    .createData({ values: loadCars() })
    .createErrorBand({
      x: { field: "Acceleration", extent: "ci" },
      y: { field: "Year", fieldType: "temporal" },
      boundaries: {}
    });
  const resized = before.editCanvas({ width: 860 });
  const after = resized.editScale({ id: "x", reverse: true });

  for (const id of [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]) {
    assert.notDeepEqual(resized.graphicSpec.objects[id], before.graphicSpec.objects[id]);
    assert.notDeepEqual(after.graphicSpec.objects[id], resized.graphicSpec.objects[id]);
  }
  assert.equal(
    after.graphicSpec.objects.errorBandLowerBoundary.children[0]
      .properties.stroke,
    "#4c78a8"
  );
  assert.equal(
    after.trace.children.at(-1).children.filter(
      child => child.op === "rematerializeLineMark"
    ).length,
    2
  );
});

test("rejects ambiguous roles, occupied defaults, and invalid options", () => {
  const quantitative = chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createPointMark()
    .encodeX({ field: "fertility" })
    .encodeY({ field: "life_expect" });
  assert.throws(
    () => quantitative.createErrorBand(),
    /cannot infer the interval axis/
  );

  const created = directBand();
  assert.throws(() => created.createErrorBand({
    data: "data",
    x: { field: "year", fieldType: "temporal" },
    y: { field: "life_expect" }
  }), /explicit error-band id/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      boundaries: true
    }), /false or a plain object/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      boundaries: { curve: "step" }
    }), /Unknown createErrorBand boundaries option/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "year"
    }), /must differ from the independent position field/);
});
