import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createCarsHistogram } from "../../../examples/cars-histogram/program.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import {
  createTallestHistogramStackHighlightPrimitive,
  createTopmostHistogramSegmentHighlightPrimitive
} from "./primitive.program.js";
import {
  BAR_HIGHLIGHT_LAYOUT,
  BAR_HIGHLIGHT_TARGET,
  selectTallestHistogramStack,
  selectTopmostHistogramSegment
} from "./reference-values.js";

function assertPrimitiveTarget(program, base, target) {
  const baseChildren = base.graphicSpec.objects.bars.items;
  const children = program.graphicSpec.objects.bars.items;
  const selected = children.slice(-target.indices.length);
  const selectedIndices = new Set(target.indices);

  assert.deepEqual(program.semanticSpec, base.semanticSpec);
  assert.deepEqual(
    children.slice(0, -target.indices.length).map(child => child.properties),
    baseChildren
      .filter((_, index) => !selectedIndices.has(index))
      .map(child => child.properties)
  );
  assert.deepEqual(
    selected.map(child => ({
      x: child.properties.x,
      y: child.properties.y,
      width: child.properties.width,
      height: child.properties.height
    })),
    target.indices.map(index => {
      const properties = baseChildren[index].properties;
      return {
        x: properties.x,
        y: properties.y,
        width: properties.width,
        height: properties.height
      };
    })
  );
  assert.equal(selected.every(child =>
    child.properties.fill === BAR_HIGHLIGHT_TARGET.fill &&
    child.properties.stroke === BAR_HIGHLIGHT_TARGET.stroke &&
    child.properties.strokeWidth === BAR_HIGHLIGHT_TARGET.strokeWidth &&
    child.properties.opacity === BAR_HIGHLIGHT_TARGET.opacity
  ), true);

  const left = Math.min(...selected.map(child => child.properties.x));
  const top = Math.min(...selected.map(child => child.properties.y));
  const right = Math.max(...selected.map(child =>
    child.properties.x + child.properties.width
  ));
  const bottom = Math.max(...selected.map(child =>
    child.properties.y + child.properties.height
  ));
  assert.deepEqual({ x: left, y: top, width: right - left, height: bottom - top }, target.concrete);
}

function assertSegmentTarget(program, base, target) {
  const baseChildren = base.graphicSpec.objects.bars.items;
  const children = program.graphicSpec.objects.bars.items;
  const selected = children.at(-1);
  assert.deepEqual(
    children.slice(0, -1).map(child => child.properties),
    baseChildren
      .filter((_, index) => index !== target.index)
      .map(child => child.properties)
  );
  assert.deepEqual(
    {
      x: selected.properties.x,
      y: selected.properties.y,
      width: selected.properties.width,
      height: selected.properties.height
    },
    target.concrete
  );
  assert.equal(selected.properties.fill, BAR_HIGHLIGHT_TARGET.fill);
  assert.equal(selected.properties.stroke, BAR_HIGHLIGHT_TARGET.stroke);
  assert.equal(selected.properties.strokeWidth, BAR_HIGHLIGHT_TARGET.strokeWidth);
}

test("authors the approved stack highlight with one selected-last raw stack edit", () => {
  const cars = loadCars();
  const base = createCarsHistogram(cars);
  const program = createTallestHistogramStackHighlightPrimitive(cars);
  const { target } = selectTallestHistogramStack(cars);

  assertPrimitiveTarget(program, base, target);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(program.graphicSpec.objects).filter(([id]) => id !== "bars")
    ),
    Object.fromEntries(
      Object.entries(base.graphicSpec.objects).filter(([id]) => id !== "bars")
    )
  );
  assert.equal(
    program.trace.children.some(node =>
      ["selectMarks", "highlightMarks", "editBarMark"].includes(node.op)
    ),
    false
  );
  assert.equal(program.trace.children.at(-1).op, "editGraphics");

  const context = createMockCanvasContext();
  assert.doesNotThrow(() => render(program, context));
  assert.equal(
    context.calls.some(call =>
      call.op === "fillRect" && call.fillStyle === BAR_HIGHLIGHT_TARGET.fill
    ),
    true
  );
});

test("reauthors the same semantic target after a Canvas-only resize", () => {
  const cars = loadCars();
  const height = BAR_HIGHLIGHT_LAYOUT.height + 120;
  const base = createCarsHistogram(cars).editCanvas({ height });
  const program = createTallestHistogramStackHighlightPrimitive(cars, { height });
  const { target } = selectTallestHistogramStack(cars, { height });

  assertPrimitiveTarget(program, base, target);
  assert.equal(target.key, "bars/stack/1");
  assert.equal(target.total, 104);
});

test("authors the maximum-y2 item as one selected-last rect", () => {
  const cars = loadCars();
  const base = createCarsHistogram(cars);
  const program = createTopmostHistogramSegmentHighlightPrimitive(cars);
  const { target } = selectTopmostHistogramSegment(cars);

  assertSegmentTarget(program, base, target);
  assert.equal(target.key, "bars/histogram/5");
  assert.equal(target.start, 76);
  assert.equal(target.end, 104);
  assert.equal(target.count, 28);
  assert.equal(program.trace.children.at(-1).op, "editGraphics");
});
