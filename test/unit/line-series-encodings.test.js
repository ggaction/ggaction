import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";
import { DASH10, TABLEAU10 } from "../../src/grammar/scales.js";

const rows = [
  { year: "2020-01-01", value: 2, origin: "A" },
  { year: "2021-01-01", value: 10, origin: "A" },
  { year: "2020-01-01", value: 6, origin: "B" },
  { year: "2021-01-01", value: 14, origin: "B" }
];

function createMeanLine(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
}

test("encodes nominal line color and materializes one stroke per series", () => {
  const before = createMeanLine();
  const program = before.encodeColor({
    field: "origin",
    scale: { palette: "tableau10" }
  });
  const paths = program.graphicSpec.objects.trends.children;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.scales[2], {
    id: "color",
    type: "ordinal",
    domain: "auto",
    range: { palette: "tableau10" }
  });
  assert.deepEqual(program.resolvedScales.color, {
    type: "ordinal",
    domain: ["A", "B"],
    range: TABLEAU10
  });
  assert.equal(paths.length, 2);
  assert.deepEqual(
    paths.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
  assert.deepEqual(
    paths.map(path => path.properties.strokeDash),
    [[], []]
  );
  assert.equal(before.graphicSpec.objects.trends.children.length, 1);
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
});

test("encodes nominal stroke dash with the built-in ten-pattern range", () => {
  const program = createMeanLine()
    .encodeColor({ field: "origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "origin" });
  const paths = program.graphicSpec.objects.trends.children;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeDash, {
    field: "origin",
    fieldType: "nominal",
    scale: "strokeDash"
  });
  assert.deepEqual(program.semanticSpec.scales[3], {
    id: "strokeDash",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.resolvedScales.strokeDash, {
    type: "ordinal",
    domain: ["A", "B"],
    range: DASH10
  });
  assert.deepEqual(
    paths.map(path => path.properties.strokeDash),
    DASH10.slice(0, 2)
  );
  assert.deepEqual(
    paths.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
});

test("records line series encodings through wrapped materialization actions", () => {
  const color = createMeanLine().encodeColor({ field: "origin" });
  const colorNode = color.trace.children.at(-1);
  const dashed = color.encodeStrokeDash({ field: "origin" });
  const dashNode = dashed.trace.children.at(-1);

  assert.equal(colorNode.op, "encodeColor");
  assert.deepEqual(colorNode.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeLineMark"
  ]);
  assert.deepEqual(
    colorNode.children.at(-1).children
      .filter(child => child.op === "rematerializeScale")
      .map(child => child.args.id),
    ["x", "y", "color"]
  );
  assert.equal(dashNode.op, "encodeStrokeDash");
  assert.deepEqual(dashNode.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeLineMark"
  ]);
  assert.deepEqual(
    dashNode.children.at(-1).children
      .filter(child => child.op === "rematerializeScale")
      .map(child => child.args.id),
    ["x", "y", "color", "strokeDash"]
  );
});

test("supports explicit dash ranges and cycles automatic patterns", () => {
  const explicit = createMeanLine().encodeStrokeDash({
    field: "origin",
    scale: { range: [[], [5, 2]] }
  });
  const manyRows = Array.from({ length: 11 }, (_, index) => [
    { year: "2020-01-01", value: index, origin: `C${index}` },
    { year: "2021-01-01", value: index + 1, origin: `C${index}` }
  ]).flat();
  const cycled = createMeanLine(manyRows).encodeStrokeDash({ field: "origin" });

  assert.deepEqual(
    explicit.graphicSpec.objects.trends.children.map(
      path => path.properties.strokeDash
    ),
    [[], [5, 2]]
  );
  assert.equal(cycled.graphicSpec.objects.trends.children.length, 11);
  assert.deepEqual(
    cycled.graphicSpec.objects.trends.children[10].properties.strokeDash,
    DASH10[0]
  );
});

test("reapplies semantic series styles after Canvas geometry changes", () => {
  const encoded = createMeanLine()
    .encodeColor({ field: "origin" })
    .encodeStrokeDash({ field: "origin" });
  const manuallyChanged = encoded
    .editGraphics({ target: "trends", property: "stroke", value: "black" })
    .editGraphics({
      target: "trends",
      property: "strokeDash",
      value: [[1, 1], [1, 1]]
    });
  const resized = manuallyChanged.editCanvas({ width: 440 });

  assert.deepEqual(
    resized.graphicSpec.objects.trends.children.map(path => path.properties.stroke),
    TABLEAU10.slice(0, 2)
  );
  assert.deepEqual(
    resized.graphicSpec.objects.trends.children.map(
      path => path.properties.strokeDash
    ),
    DASH10.slice(0, 2)
  );
});

test("validates line series encoding options and ranges", () => {
  assert.throws(
    () => createMeanLine().encodeColor({
      field: "origin",
      scale: { palette: "tableau10", range: ["red"] }
    }),
    /both palette and range/
  );
  assert.throws(
    () => createMeanLine().encodeColor({
      field: "origin",
      scale: { palette: "unknown" }
    }),
    /tableau10/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({
      field: "origin",
      scale: { range: [[3]] }
    }),
    /even-length/
  );
  assert.throws(
    () => createMeanLine().encodeStrokeDash({ field: "missing" }),
    /nominal value/
  );
  assert.throws(
    () => chart()
      .createCanvas({ width: 240, height: 160, margin: 20 })
      .createData({ id: "data", values: rows })
      .createPointMark({ id: "points" })
      .encodeStrokeDash({ field: "origin" }),
    /Unknown line mark/
  );
});
