import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsHistogramEncodings,
  renderCarsHistogramEncodings
} from "../programs/carsHistogramEncodings.js";
import {
  createCarsHistogramPrimitives
} from "../programs/carsHistogramPrimitives.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("replaces raw bar and x blocks with chart actions", () => {
  const primitive = createCarsHistogramPrimitives(cars);
  const program = createCarsHistogramEncodings(cars);

  assert.deepEqual(program.semanticSpec, primitive.semanticSpec);
  assert.deepEqual(program.graphicSpec.objects, primitive.graphicSpec.objects);
  assert.deepEqual(program.graphicSpec.order.slice(0, 3), [
    "canvas",
    "bars",
    "horizontalGridLines"
  ]);
  assert.deepEqual(
    program.trace.children.slice(0, 4).map(node => node.op),
    ["createCanvas", "createData", "createBarMark", "encodeX"]
  );

  const createBarMark = program.trace.children.find(
    node => node.op === "createBarMark"
  );
  assert.deepEqual(createBarMark.args, { id: "bars" });
  assert.deepEqual(createBarMark.children.map(node => node.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics"
  ]);
  assert.deepEqual(createBarMark.children[2].args, {
    id: "bars",
    type: "rect",
    length: 0
  });
  const encodeX = program.trace.children.find(node => node.op === "encodeX");
  assert.deepEqual(encodeX.args, {
    field: "Displacement",
    bin: { maxBins: 10 },
    scale: { nice: true, zero: false }
  });
  assert.deepEqual(encodeX.children.map(node => node.op), [
    "createCoordinate",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeScale"
  ]);
  assert.deepEqual(program.resolvedScales.x, {
    type: "linear",
    domain: [50, 500],
    range: [80, 372]
  });
  assert.equal(
    program.trace.children.some(
      node =>
        node.op === "createGraphics" &&
        node.args.id === "bars"
    ),
    false
  );
  const replacedXPaths = new Set([
    "layer[bars].coordinate",
    "layer[bars].encoding.x.field",
    "layer[bars].encoding.x.fieldType",
    "layer[bars].encoding.x.bin.maxBins",
    "layer[bars].encoding.x.scale",
    "scale[x].type",
    "scale[x].domain",
    "scale[x].range",
    "scale[x].nice",
    "scale[x].zero",
    "coordinate[main].type"
  ]);
  assert.equal(
    program.trace.children.some(
      node =>
        node.op === "editSemantic" && replacedXPaths.has(node.args.property)
    ),
    false
  );
  assert.equal(
    program.trace.children.some(
      node =>
        node.op === "editSemantic" &&
        ["layer[bars].mark.type", "layer[bars].data"].includes(
          node.args.property
        )
    ),
    false
  );
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0]), true);
  assert.equal(Object.isFrozen(program.graphicSpec.objects.bars.children), true);
  assert.deepEqual(program.actionStack, []);
});

test("renders the mark-action progression from graphicSpec alone", () => {
  const program = createCarsHistogramEncodings(cars);
  const context = createMockCanvasContext();

  renderCarsHistogramEncodings(
    { graphicSpec: program.graphicSpec },
    context
  );

  assert.equal(findCanvasCalls(context, "stroke").length, 40);
  assert.equal(findCanvasCalls(context, "fillRect").length, 19);
  assert.equal(findCanvasCalls(context, "fillText").length, 23);
});
