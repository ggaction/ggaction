import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

const rows = [
  { year: "2021-01-01", value: 10 },
  { year: "2020-01-01", value: 2 },
  { year: "2020-01-01", value: 6 },
  { year: "2021-01-01", value: 14 }
];

function createXEncodedLine(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal", scale: { nice: true } });
}

test("encodes aggregate y and materializes one sorted mean line", () => {
  const before = createXEncodedLine();
  const program = before.encodeY({
    field: "value",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  });
  const layer = program.semanticSpec.layers[0];
  const paths = program.graphicSpec.objects.trends.children;

  assert.deepEqual(layer.encoding.y, {
    field: "value",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: "y"
  });
  assert.deepEqual(program.semanticSpec.scales[1], {
    id: "y",
    type: "linear",
    domain: "auto",
    range: "auto",
    nice: true,
    zero: false
  });
  assert.deepEqual(program.resolvedScales.y, {
    type: "linear",
    domain: [4, 12],
    range: [140, 20]
  });
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0].properties, {
    points: [
      { x: 20, y: 140 },
      { x: 220, y: 20 }
    ],
    stroke: "#4c78a8",
    strokeWidth: 2,
    strokeDash: []
  });
  assert.equal(before.semanticSpec.layers[0].encoding.y, undefined);
  assert.deepEqual(before.graphicSpec.objects.trends.children, []);
  assert.deepEqual(before.resolvedScales.y, undefined);
});

test("records aggregate y and line materialization as wrapped actions", () => {
  const program = createXEncodedLine().encodeY({
    field: "value",
    aggregate: "mean"
  });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodeY");
  assert.deepEqual(node.children.map(child => child.op), [
    "createCoordinate",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeLineMark"
  ]);
  assert.deepEqual(
    node.children.at(-1).children.map(child => child.op),
    [
      "rematerializeScale",
      "rematerializeScale",
      "editGraphics",
      "editGraphics",
      "editGraphics",
      "editGraphics",
      "editGraphics"
    ]
  );
});

test("keeps explicit y domains ahead of zero and nice", () => {
  const program = createXEncodedLine().encodeY({
    field: "value",
    aggregate: "mean",
    scale: { domain: [0, 20], nice: true, zero: true }
  });

  assert.deepEqual(program.resolvedScales.y.domain, [0, 20]);
  assert.deepEqual(
    program.graphicSpec.objects.trends.children[0].properties.points,
    [
      { x: 20, y: 116 },
      { x: 220, y: 68 }
    ]
  );
});

test("rematerializes line scales and points after Canvas bounds change", () => {
  const before = createXEncodedLine()
    .encodeY({ field: "value", aggregate: "mean" })
    .editGraphics({ target: "trends", property: "stroke", value: "red" })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 4 })
    .editGraphics({ target: "trends", property: "strokeDash", value: [[5, 2]] });
  const program = before.editCanvas({ width: 440, margin: 40 });

  assert.deepEqual(program.resolvedScales.x.range, [40, 400]);
  assert.deepEqual(program.resolvedScales.y.range, [120, 40]);
  assert.deepEqual(
    program.graphicSpec.objects.trends.children[0].properties.points,
    [
      { x: 40, y: 120 },
      { x: 400, y: 40 }
    ]
  );
  assert.equal(
    program.graphicSpec.objects.trends.children[0].properties.stroke,
    "red"
  );
  assert.equal(
    program.graphicSpec.objects.trends.children[0].properties.strokeWidth,
    4
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children[0].properties.strokeDash,
    [5, 2]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children
      .filter(child => child.op === "rematerializeLineMark")
      .map(child => child.args.id),
    ["trends"]
  );
  assert.deepEqual(before.resolvedScales.x.range, [20, 220]);
});

test("regroups and rematerializes paths when a series field is introduced", () => {
  const values = [
    { year: "2021-01-01", value: 10, origin: "A" },
    { year: "2020-01-01", value: 2, origin: "A" },
    { year: "2020-01-01", value: 6, origin: "B" },
    { year: "2021-01-01", value: 14, origin: "B" }
  ];
  const program = createXEncodedLine(values)
    .encodeY({ field: "value", aggregate: "mean" })
    .editSemantic({
      property: "layer[trends].encoding.color.field",
      value: "origin"
    })
    .editSemantic({
      property: "layer[trends].encoding.color.fieldType",
      value: "nominal"
    })
    .rematerializeLineMark({ id: "trends" });
  const paths = program.graphicSpec.objects.trends.children;

  assert.deepEqual(program.resolvedScales.y.domain, [2, 14]);
  assert.equal(paths.length, 2);
  assert.deepEqual(paths.map(path => path.properties.points), [
    [
      { x: 20, y: 140 },
      { x: 220, y: 60 }
    ],
    [
      { x: 20, y: 100 },
      { x: 220, y: 20 }
    ]
  ]);
});

test("validates aggregate line y requirements", () => {
  assert.throws(
    () => createXEncodedLine().encodeY({ field: "value" }),
    /aggregate "mean"/
  );
  assert.throws(
    () => createXEncodedLine().encodeY({
      field: "value",
      aggregate: "sum"
    }),
    /aggregate "mean"/
  );
  assert.throws(
    () => createXEncodedLine().encodeY({
      field: "value",
      fieldType: "temporal",
      aggregate: "mean"
    }),
    /quantitative field/
  );
  assert.throws(
    () => chart()
      .createCanvas({ width: 240, height: 160, margin: 20 })
      .createData({ id: "data", values: rows })
      .createLineMark({ id: "trends" })
      .encodeY({ field: "value", aggregate: "mean" }),
    /requires a temporal x encoding/
  );
  assert.throws(
    () => createXEncodedLine([{ year: "2020-01-01", value: 1 }]).encodeY({
      field: "value",
      aggregate: "mean"
    }),
    /at least two aggregate points/
  );
});
