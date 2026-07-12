import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createMockCanvasContext } from "../helpers/mockCanvasContext.js";
import {
  createCarsHistogramEncodings,
  renderCarsHistogramEncodings
} from "../programs/carsHistogramEncodings.js";
import {
  createCarsHistogramPrimitives,
  renderCarsHistogramPrimitives
} from "../programs/carsHistogramPrimitives.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("replaces raw bar creation with createBarMark", () => {
  const primitive = createCarsHistogramPrimitives(cars);
  const program = createCarsHistogramEncodings(cars);

  assert.deepEqual(program.semanticSpec, primitive.semanticSpec);
  assert.deepEqual(program.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(program.graphicSpec.order.slice(0, 3), [
    "canvas",
    "horizontalGridLines",
    "bars"
  ]);

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
  assert.equal(
    program.trace.children.some(
      node =>
        node.op === "createGraphics" &&
        node.args.id === "bars"
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

test("renders the mark-action progression identically from graphicSpec", () => {
  const program = createCarsHistogramEncodings(cars);
  const primitive = createCarsHistogramPrimitives(cars);
  const context = createMockCanvasContext();
  const primitiveContext = createMockCanvasContext();

  renderCarsHistogramEncodings(
    { graphicSpec: program.graphicSpec },
    context
  );
  renderCarsHistogramPrimitives(
    { graphicSpec: primitive.graphicSpec },
    primitiveContext
  );

  assert.deepEqual(context.calls, primitiveContext.calls);
});
