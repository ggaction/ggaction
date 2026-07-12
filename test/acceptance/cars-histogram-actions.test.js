import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createMockCanvasContext } from "../helpers/mockCanvasContext.js";
import {
  createCarsHistogramActions,
  renderCarsHistogramActions
} from "../programs/carsHistogramActions.js";
import {
  createCarsHistogramEncodings,
  renderCarsHistogramEncodings
} from "../programs/carsHistogramEncodings.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("authors histogram mark and encodings through chart actions", () => {
  const explicit = createCarsHistogramEncodings(cars);
  const program = createCarsHistogramActions(cars);

  assert.deepEqual(program.semanticSpec, explicit.semanticSpec);
  assert.deepEqual(program.resolvedScales.x, explicit.resolvedScales.x);
  assert.deepEqual(program.resolvedScales.y, explicit.resolvedScales.y);
  assert.deepEqual(program.resolvedScales.color, {
    type: "ordinal",
    domain: ["USA", "Europe", "Japan"],
    range: [
      "#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
      "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac"
    ]
  });
  assert.deepEqual(program.graphicSpec, explicit.graphicSpec);
  assert.deepEqual(
    program.trace.children.slice(0, 5).map(node => node.op),
    [
      "createCanvas", "createData", "createBarMark", "encodeHistogram",
      "encodeColor"
    ]
  );

  const histogram = program.trace.children.find(
    node => node.op === "encodeHistogram"
  );
  assert.deepEqual(histogram.args, {
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  });
  assert.deepEqual(histogram.children.map(node => node.op), [
    "encodeX",
    "encodeY"
  ]);
  assert.equal(
    program.trace.children.some(
      node => node.op === "encodeX" || node.op === "encodeY"
    ),
    false
  );

  const color = program.trace.children.find(node => node.op === "encodeColor");
  assert.deepEqual(color.args, {
    field: "Origin",
    scale: { palette: "tableau10" }
  });
  assert.deepEqual(color.children.map(node => node.op), [
    "editSemantic", "editSemantic", "editSemantic", "createScale",
    "rematerializeBarMark"
  ]);
  assert.deepEqual(
    color.children.at(-1).children.slice(0, 3).map(node => node.op),
    ["rematerializeScale", "rematerializeScale", "rematerializeScale"]
  );
  assert.equal(
    program.trace.children.some(
      node =>
        node.op === "editSemantic" &&
        [
          "layer[bars].encoding.color.field",
          "layer[bars].encoding.color.fieldType",
          "layer[bars].encoding.color.scale",
          "scale[color].type",
          "scale[color].domain",
          "scale[color].range"
        ].includes(node.args.property)
    ),
    false
  );
  assert.equal(
    program.trace.children.some(
      node => node.op === "editGraphics" && node.args.target === "bars"
    ),
    false
  );
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0].encoding), true);
  assert.equal(Object.isFrozen(program.graphicSpec.objects.bars.children), true);
  assert.deepEqual(program.actionStack, []);
});

test("renders the atomic histogram progression identically", () => {
  const explicit = createCarsHistogramEncodings(cars);
  const program = createCarsHistogramActions(cars);
  const explicitContext = createMockCanvasContext();
  const context = createMockCanvasContext();

  renderCarsHistogramEncodings(explicit, explicitContext);
  renderCarsHistogramActions(program, context);

  assert.deepEqual(context.calls, explicitContext.calls);
});
