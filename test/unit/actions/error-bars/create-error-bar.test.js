import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

const canvas = Object.freeze({
  width: 720,
  height: 460,
  margin: Object.freeze({ top: 90, right: 40, bottom: 70, left: 80 })
});

function encodedPoints() {
  return chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createPointMark()
    .encodeX({ field: "Origin", fieldType: "ordinal" })
    .encodeY({ field: "Acceleration" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 });
}

test("creates the canonical vertical interval and wrapped cap hierarchy", () => {
  const program = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createErrorBar({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration" }
    });
  const interval = program.semanticSpec.datasets[1];
  const action = program.trace.children.at(-1);

  assert.equal(action.op, "createErrorBar");
  assert.deepEqual(action.children.map(node => node.op), [
    "createIntervalData",
    "createRuleMark",
    "encodeX",
    "encodeY",
    "encodeY2",
    "encodeStroke",
    "encodeStrokeWidth",
    "encodeStrokeDash",
    "encodeOpacity",
    "createErrorBarCap",
    "createErrorBarCap"
  ]);
  assert.deepEqual(interval.transform[0], {
    type: "interval",
    field: "Acceleration",
    groupBy: ["Origin"],
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: {
      center: "__errorBar_center",
      lower: "__errorBar_lower",
      upper: "__errorBar_upper"
    }
  });
  assert.deepEqual(
    program.semanticSpec.layers.map(layer => layer.id),
    ["errorBar", "errorBarLowerCap", "errorBarUpperCap"]
  );
  for (const child of action.children.filter(node => node.op === "createErrorBarCap")) {
    assert.equal(child.children.at(-1).op, "materializeRuleSpan");
  }
});

test("infers a no-option overlay from the current encoded layer", () => {
  const base = encodedPoints();
  const program = base.createErrorBar();
  const transform = program.semanticSpec.datasets.at(-1).transform[0];
  const [point, main, lower, upper] = program.semanticSpec.layers;

  assert.deepEqual(transform.groupBy, ["Origin"]);
  assert.equal(transform.field, "Acceleration");
  assert.deepEqual(
    [main, lower, upper].map(layer => [
      layer.coordinate,
      layer.encoding.x.scale,
      layer.encoding.y.scale
    ]),
    [
      [point.coordinate, point.encoding.x.scale, point.encoding.y.scale],
      [point.coordinate, point.encoding.x.scale, point.encoding.y.scale],
      [point.coordinate, point.encoding.x.scale, point.encoding.y.scale]
    ]
  );
  assert.deepEqual(program.resolvedScales.y.domain, [8, 24.8]);
  assert.equal(base.semanticSpec.layers.length, 1);
});

test("infers explicit semantic grouping from another compatible mark type", () => {
  const rows = [
    { date: "2020-01-01", group: "A", value: 1 },
    { date: "2020-01-01", group: "A", value: 3 },
    { date: "2020-01-01", group: "B", value: 2 },
    { date: "2020-01-01", group: "B", value: 4 },
    { date: "2021-01-01", group: "A", value: 5 },
    { date: "2021-01-01", group: "A", value: 7 }
  ];
  const program = chart()
    .createCanvas(canvas)
    .createData({ values: rows })
    .createLineMark()
    .encodeX({ field: "date", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .encodeGroup({ field: "group" })
    .createErrorBar();

  assert.deepEqual(
    program.semanticSpec.datasets.at(-1).transform[0].groupBy,
    ["date", "group"]
  );
  assert.deepEqual(
    program.semanticSpec.datasets.at(-1).values.map(row => [row.date, row.group]),
    [
      ["2020-01-01", "A"],
      ["2020-01-01", "B"],
      ["2021-01-01", "A"]
    ]
  );
});

test("requires explicit choices for ambiguous sources and axis roles", () => {
  let ambiguous = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createPointMark({ id: "first" })
    .encodeX({ target: "first", field: "Origin", fieldType: "ordinal" })
    .encodeY({ target: "first", field: "Acceleration" })
    .encodeRadius({ target: "first", value: 2 })
    .createPointMark({ id: "second" })
    .encodeX({ target: "second", field: "Origin", fieldType: "ordinal" })
    .encodeY({ target: "second", field: "Acceleration" })
    .encodeRadius({ target: "second", value: 2 })
    .createRuleMark({ id: "unencoded" });

  assert.throws(() => ambiguous.createErrorBar(), /target is ambiguous/);
  assert.equal(
    ambiguous.createErrorBar({ target: "first" })
      .semanticSpec.datasets.at(-1).source,
    "data"
  );

  const quantitative = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createPointMark()
    .encodeX({ field: "Displacement" })
    .encodeY({ field: "Acceleration" })
    .encodeRadius({ value: 2 });
  assert.throws(
    () => quantitative.createErrorBar(),
    /requires one quantitative interval axis/
  );
});

test("keeps fixed cap widths through scale and Canvas rematerialization", () => {
  const created = encodedPoints().createErrorBar();
  const resized = created.editCanvas({ width: 900 });

  for (const program of [created, resized]) {
    for (const id of ["errorBarLowerCap", "errorBarUpperCap"]) {
      for (const child of program.graphicSpec.objects[id].children) {
        assert.equal(child.properties.x2 - child.properties.x1, 8);
      }
    }
  }
  assert.notEqual(
    created.graphicSpec.objects.errorBar.children[0].properties.x1,
    resized.graphicSpec.objects.errorBar.children[0].properties.x1
  );
  assert.equal(
    created.graphicSpec.objects.errorBarLowerCap.children[0].properties.x1,
    176
  );
});

test("supports appearance options and rejects duplicate default ownership atomically", () => {
  const base = encodedPoints();
  assert.equal(
    base.createErrorBar({ stroke: "red" })
      .graphicSpec.objects.errorBar.children[0].properties.stroke,
    "red"
  );
  const created = base.createErrorBar();
  assert.throws(() => created.createErrorBar(), /explicit error-bar id/);
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(base.semanticSpec.layers.length, 1);
});

test("creates horizontal statistical intervals with x2 and vertical caps", () => {
  const program = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createErrorBar({
      x: { field: "Horsepower" },
      y: { field: "Origin", fieldType: "nominal" }
    });
  const action = program.trace.children.at(-1);
  const [main, lower, upper] = program.semanticSpec.layers;

  assert.deepEqual(action.children.map(node => node.op), [
    "createIntervalData",
    "createRuleMark",
    "encodeY",
    "encodeX",
    "encodeX2",
    "encodeStroke",
    "encodeStrokeWidth",
    "encodeStrokeDash",
    "encodeOpacity",
    "createErrorBarCap",
    "createErrorBarCap"
  ]);
  assert.equal(main.encoding.x.field, "__errorBar_lower");
  assert.equal(main.encoding.x2.field, "__errorBar_upper");
  assert.equal(main.encoding.y.field, "Origin");
  assert.deepEqual(program.resolvedScales.x.domain, [70, 130]);
  assert.deepEqual(program.resolvedScales.y.domain, ["USA", "Europe", "Japan"]);
  for (const cap of [lower, upper]) {
    assert.equal(cap.encoding.x.fieldType, "quantitative");
    assert.equal(cap.encoding.y.fieldType, "nominal");
    for (const child of program.graphicSpec.objects[cap.id].children) {
      assert.equal(child.properties.y2 - child.properties.y1, 8);
    }
  }
});

test("uses explicit interval rows without deriving data or creating disabled caps", () => {
  const rows = [
    { group: "A", center: 3, lower: 2, upper: 4 },
    { group: "B", center: 6, lower: 4, upper: 8 }
  ];
  const base = chart().createCanvas(canvas).createData({ values: rows });
  const program = base
    .createErrorBar({
      x: { field: "group", fieldType: "nominal" },
      y: { center: "center", lower: "lower", upper: "upper" },
      caps: false
    })
    .createGuides({ grid: false });
  const action = program.trace.children.at(-2);

  assert.equal(program.semanticSpec.datasets.length, 1);
  assert.deepEqual(program.semanticSpec.layers.map(layer => layer.id), ["errorBar"]);
  assert.equal(program.semanticSpec.layers[0].data, "data");
  assert.equal(program.semanticSpec.layers[0].encoding.y.title, "center");
  assert.equal(program.semanticSpec.guides.axis.y.title, "center");
  assert.equal(program.graphicSpec.objects.errorBarLowerCap, undefined);
  assert.equal(program.graphicSpec.objects.errorBarUpperCap, undefined);
  assert.equal(action.children.some(node => node.op === "createIntervalData"), false);
  assert.equal(action.children.some(node => node.op === "createErrorBarCap"), false);
  assert.deepEqual(base.semanticSpec.datasets[0].values, rows);
});

test("forwards one custom appearance and cap size to every owned rule", () => {
  const program = encodedPoints().createErrorBar({
    capSize: 16,
    stroke: "#d9485f",
    strokeWidth: 3,
    strokeDash: [8, 4],
    opacity: 0.8
  });

  for (const id of ["errorBar", "errorBarLowerCap", "errorBarUpperCap"]) {
    const layer = program.semanticSpec.layers.find(item => item.id === id);
    assert.deepEqual(layer.encoding.strokeDash.datum, [8, 4]);
    for (const child of program.graphicSpec.objects[id].children) {
      assert.equal(child.properties.stroke, "#d9485f");
      assert.equal(child.properties.strokeWidth, 3);
      assert.deepEqual(child.properties.strokeDash, [8, 4]);
      assert.equal(child.properties.opacity, 0.8);
    }
  }
  for (const id of ["errorBarLowerCap", "errorBarUpperCap"]) {
    for (const child of program.graphicSpec.objects[id].children) {
      assert.equal(child.properties.x2 - child.properties.x1, 16);
    }
  }
});

test("converges statistical and explicit modes when interval rows are equal", () => {
  const statistical = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createErrorBar({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration" },
      caps: false
    });
  const rows = statistical.semanticSpec.datasets.at(-1).values;
  const explicit = chart()
    .createCanvas(canvas)
    .createData({ values: rows })
    .createErrorBar({
      x: { field: "Origin", fieldType: "nominal" },
      y: {
        center: "__errorBar_center",
        lower: "__errorBar_lower",
        upper: "__errorBar_upper"
      },
      caps: false
    });

  assert.deepEqual(
    explicit.graphicSpec.objects.errorBar,
    statistical.graphicSpec.objects.errorBar
  );
  assert.deepEqual(explicit.resolvedScales, statistical.resolvedScales);
});

test("namespaces repeated error bars and rejects occupied child roles", () => {
  const base = chart().createCanvas(canvas).createData({ values: loadCars() });
  const first = base.createErrorBar({
    id: "acceleration",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" }
  });
  const second = first.createErrorBar({
    id: "horsepower",
    data: "data",
    x: { field: "Horsepower", scale: { id: "horsepowerX" } },
    y: {
      field: "Origin",
      fieldType: "nominal",
      scale: { id: "horsepowerY" }
    }
  });

  assert.deepEqual(second.semanticSpec.datasets.slice(1).map(item => item.id), [
    "accelerationIntervalData",
    "horsepowerIntervalData"
  ]);
  assert.deepEqual(second.semanticSpec.layers.map(layer => layer.id), [
    "acceleration",
    "accelerationLowerCap",
    "accelerationUpperCap",
    "horsepower",
    "horsepowerLowerCap",
    "horsepowerUpperCap"
  ]);

  const occupied = base.createRuleMark({ id: "customLowerCap" });
  assert.throws(
    () => occupied.createErrorBar({
      id: "custom",
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration" }
    }),
    /already exists/
  );
  assert.equal(occupied.semanticSpec.layers.length, 1);
});

test("validates variant option combinations before exposing a result", () => {
  const base = chart().createCanvas(canvas).createData({ values: loadCars() });
  const vertical = {
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" }
  };
  for (const [options, pattern] of [
    [{ ...vertical, caps: "yes" }, /caps must be a boolean/],
    [{ ...vertical, capSize: 0 }, /capSize must be a positive/],
    [{ ...vertical, stroke: "" }, /stroke requires a non-empty/],
    [{ ...vertical, strokeWidth: -1 }, /strokeWidth requires a non-negative/],
    [{ ...vertical, strokeDash: [1] }, /Stroke dash pattern/],
    [{ ...vertical, opacity: 2 }, /opacity requires a finite value/],
    [{ x: vertical.x, y: { lower: "a" } }, /requires center, lower, and upper/],
    [{
      x: vertical.x,
      y: { center: "Origin", lower: "Origin", upper: "Acceleration" }
    }, /must be distinct/],
    [{
      x: vertical.x,
      y: {
        center: "Acceleration",
        lower: "Displacement",
        upper: "Weight_in_lbs"
      },
      groupBy: "Origin"
    }, /do not accept groupBy/]
  ]) {
    assert.throws(() => base.createErrorBar(options), pattern);
  }
  assert.equal(base.semanticSpec.datasets.length, 1);
  assert.equal(base.semanticSpec.layers.length, 0);
});

test("keeps custom cap spans after Canvas and shared-scale rematerialization", () => {
  const created = chart()
    .createCanvas(canvas)
    .createData({ values: loadCars() })
    .createErrorBar({
      x: { field: "Horsepower", scale: { domain: [70, 130] } },
      y: { field: "Origin", fieldType: "nominal" },
      capSize: 16
    });
  const resized = created.editCanvas({ width: 900 });
  const rescaled = resized.encodeX({
    target: "errorBar",
    field: "__errorBar_lower",
    fieldType: "quantitative",
    scale: { id: "x", domain: [70, 140] }
  });

  assert.notEqual(
    created.graphicSpec.objects.errorBar.children[0].properties.x1,
    resized.graphicSpec.objects.errorBar.children[0].properties.x1
  );
  for (const program of [created, resized, rescaled]) {
    for (const id of ["errorBarLowerCap", "errorBarUpperCap"]) {
      for (const child of program.graphicSpec.objects[id].children) {
        assert.equal(child.properties.y2 - child.properties.y1, 16);
      }
    }
  }
  assert.notEqual(
    resized.graphicSpec.objects.errorBarLowerCap.children[0].properties.x1,
    rescaled.graphicSpec.objects.errorBarLowerCap.children[0].properties.x1
  );
});
