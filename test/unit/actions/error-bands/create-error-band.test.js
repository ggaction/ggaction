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
  assert.equal(program.graphicSpec.objects.errorBand.items.length, 6);
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

  const child = program.graphicSpec.objects.errorBand.items[0];
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
  assert.equal(program.graphicSpec.objects.errorBand.items.length, 1);
  assert.equal(
    program.graphicSpec.objects.errorBand.items[0]
      .properties.commands.at(-1).op,
    "Z"
  );
  assert.deepEqual(program.graphicSpec.objects["plot-main"].children.slice(-3), [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]);
  for (const id of ["errorBandLowerBoundary", "errorBandUpperBoundary"]) {
    const properties = program.graphicSpec.objects[id].items[0].properties;
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

test("colors statistical and explicit horizontal bands without stack dispatch", () => {
  const statistical = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createErrorBand({
      x: { field: "Displacement", center: "mean", extent: "ci" },
      y: { field: "Acceleration" },
      groupBy: "Origin"
    })
    .encodeColor({
      target: "errorBand",
      field: "Origin",
      layout: "overlay"
    });
  const explicitRows = [
    { position: 1, center: 2, lower: 1, upper: 3, group: "A" },
    { position: 2, center: 3, lower: 2, upper: 4, group: "A" },
    { position: 1, center: 4, lower: 3, upper: 5, group: "B" },
    { position: 2, center: 5, lower: 4, upper: 6, group: "B" }
  ];
  const explicit = chart()
    .createCanvas(canvas)
    .createData({ values: explicitRows })
    .createErrorBand({
      x: { center: "center", lower: "lower", upper: "upper" },
      y: { field: "position" },
      groupBy: "group"
    })
    .encodeColor({
      target: "errorBand",
      field: "group",
      layout: "overlay"
    });

  assert.equal(statistical.graphicSpec.objects.errorBand.items.length, 3);
  assert.equal(explicit.graphicSpec.objects.errorBand.items.length, 2);
  for (const program of [statistical, explicit]) {
    const layer = program.semanticSpec.layers.find(
      candidate => candidate.id === "errorBand"
    );
    assert.equal(layer.encoding.color.layout, "overlay");
    assert.equal(layer.encoding.x.stack, undefined);
    assert.equal(layer.encoding.y.stack, undefined);
    assert.equal(
      new Set(program.graphicSpec.objects.errorBand.items.map(
        item => item.properties.fill
      )).size,
      program.graphicSpec.objects.errorBand.items.length
    );
  }
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
    after.graphicSpec.objects.errorBandLowerBoundary.items[0]
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

test("inherits area curves into styled boundaries and permits an override", () => {
  const inherited = chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "cluster",
      curve: "cardinal",
      boundaries: {
        stroke: "#25364d",
        strokeWidth: 1.4,
        strokeDash: [6, 3],
        opacity: 0.8
      }
    });
  const overridden = chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "cluster",
      curve: "cardinal",
      boundaries: { curve: "step" }
    });

  assert.equal(inherited.markConfigs.errorBand.curve, "cardinal");
  assert.equal(
    inherited.markConfigs.errorBandLowerBoundary.curve,
    "cardinal"
  );
  assert.equal(overridden.markConfigs.errorBand.curve, "cardinal");
  assert.equal(overridden.markConfigs.errorBandLowerBoundary.curve, "step");
  for (const id of [
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]) {
    const properties = inherited.graphicSpec.objects[id].items[0].properties;
    assert.equal(properties.stroke, "#25364d");
    assert.equal(properties.strokeWidth, 1.4);
    assert.deepEqual(properties.strokeDash, [6, 3]);
    assert.equal(properties.opacity, 0.8);
  }
  assert.deepEqual(inherited.graphicSpec.objects["plot-main"].children.slice(0, 3), [
    "errorBand",
    "errorBandLowerBoundary",
    "errorBandUpperBoundary"
  ]);
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
      boundaries: { curve: "smooth" }
    }), /Unsupported curve interpolation/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      boundaries: { strokeDash: [4] }
    }), /even-length array/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      boundaries: { opacity: 2 }
    }), /from 0 to 1/);
  assert.throws(() => chart()
    .createCanvas(canvas)
    .createData({ values: loadGapminder() })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "year"
    }), /must differ from the independent position field/);
});
