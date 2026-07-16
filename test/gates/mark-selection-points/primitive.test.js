import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { createPointHighlightGatePrimitive } from "./primitive.program.js";
import {
  POINT_HIGHLIGHT_TARGET,
  selectGroupedMaximumHorsepower
} from "./reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("authors Gate A through an independent selector and low-level graphic edit", () => {
  const cars = loadCars();
  const values = selectGroupedMaximumHorsepower(cars);
  const program = createPointHighlightGatePrimitive(cars);
  const children = program.graphicSpec.objects.points.children;
  const selected = children.slice(-values.selected.length);
  const unselected = children.slice(0, -values.selected.length);

  assert.equal(program.graphicSpec.objects.points.type, "collection");
  assert.equal(children.length, values.rows.length);
  assert.equal(unselected.every(child => child.type === "circle"), true);
  assert.equal(
    unselected.every(child =>
      child.properties.opacity === POINT_HIGHLIGHT_TARGET.dimOpacity
    ),
    true
  );
  assert.equal(selected.every(child => child.type === "path"), true);
  assert.equal(selected.every(child =>
    child.properties.fill === POINT_HIGHLIGHT_TARGET.accent &&
    child.properties.opacity === 1 &&
    child.properties.stroke === POINT_HIGHLIGHT_TARGET.stroke &&
    child.properties.strokeWidth === POINT_HIGHLIGHT_TARGET.strokeWidth &&
    child.properties.commands.at(-1).op === "Z"
  ), true);
  assert.deepEqual(
    program.semanticSpec.datasets.find(dataset => dataset.id === "cars").values,
    values.rows
  );
  const operations = flattenActions(program.trace).map(node => node.op);
  assert.equal(operations.includes("selectMarks"), false);
  assert.equal(operations.includes("highlightMarks"), false);
  assert.equal(operations.at(-1), "editGraphics");
});

test("renders the complete Gate A chart through Canvas without errors", () => {
  const program = createPointHighlightGatePrimitive(loadCars());
  const context = createMockCanvasContext();
  render(program, context);

  assert.equal(context.canvas.width, 760);
  assert.equal(context.canvas.height, 440);
  assert.equal(
    context.calls.filter(call => call.op === "fill").length >= 3,
    true
  );
  assert.equal(
    context.calls.some(call =>
      call.op === "setFillStyle" && call.value === POINT_HIGHLIGHT_TARGET.accent
    ),
    true
  );
});
