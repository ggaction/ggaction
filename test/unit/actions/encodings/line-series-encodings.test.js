import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { DASH10, TABLEAU10 } from "../../../../src/grammar/scales/index.js";
import {
  createLegendMeanLine,
  createMeanLine,
  lineSeriesRows as rows
} from "./line-series.fixture.js";

test("encodes nominal line color and materializes one stroke per series", () => {
  const before = createMeanLine();
  const program = before.encodeColor({
    field: "origin",
    scale: { palette: "tableau10" }
  });
  const paths = program.graphicSpec.objects.trends.items;

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
  assert.equal(before.graphicSpec.objects.trends.items.length, 1);
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
});
test("encodes nominal stroke dash with the built-in ten-pattern range", () => {
  const program = createMeanLine()
    .encodeColor({ field: "origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "origin" });
  const paths = program.graphicSpec.objects.trends.items;

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

test("maps one quantitative stroke width per line series", () => {
  const before = createMeanLine();
  const program = before
    .encodeGroup({ field: "origin" })
    .encodeStrokeWidth({
      field: "cylinders",
      scale: { range: [1, 7] }
    });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeWidth, {
    field: "cylinders",
    fieldType: "quantitative",
    scale: "strokeWidth"
  });
  assert.deepEqual(program.resolvedScales.strokeWidth, {
    type: "linear",
    domain: [4, 6],
    range: [1, 7]
  });
  assert.deepEqual(
    program.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeWidth
    ),
    [1, 7]
  );
  assert.equal(before.semanticSpec.layers[0].encoding.strokeWidth, undefined);
});

test("rejects unequal or invalid stroke widths within a line series atomically", () => {
  const program = createMeanLine().encodeGroup({ field: "origin" });
  const unequal = rows.map((row, index) => ({
    ...row,
    cylinders: index === 1 ? 5 : row.cylinders
  }));
  const missing = rows.map((row, index) => ({
    ...row,
    ...(index === 0 ? { cylinders: undefined } : {})
  }));
  const negative = rows.map(row => ({ ...row, cylinders: -1 }));

  assert.throws(
    () => createMeanLine(unequal)
      .encodeGroup({ field: "origin" })
      .encodeStrokeWidth({ field: "cylinders" }),
    /one value within each series/
  );
  assert.throws(
    () => createMeanLine(missing)
      .encodeGroup({ field: "origin" })
      .encodeStrokeWidth({ field: "cylinders" }),
    /finite number/
  );
  assert.throws(
    () => createMeanLine(negative)
      .encodeGroup({ field: "origin" })
      .encodeStrokeWidth({ field: "cylinders" }),
    /cannot contain negative/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.strokeWidth, undefined);
});

test("rematerializes field-driven line widths after scale edits", () => {
  const encoded = createMeanLine()
    .encodeGroup({ field: "origin" })
    .encodeStrokeWidth({ field: "cylinders", scale: { range: [1, 7] } });
  const edited = encoded.editScale({ id: "strokeWidth", range: [2, 10] });

  assert.deepEqual(
    edited.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeWidth
    ),
    [2, 10]
  );
  assert.deepEqual(
    encoded.graphicSpec.objects.trends.items.map(
      path => path.properties.strokeWidth
    ),
    [1, 7]
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
