import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../../src/index.js";
import { createMockCanvasContext } from "../../../support/canvas.js";
import { loadGapminder } from "../../../support/data.js";
import { createGapminderCurvedBoundaryPrimitives } from
  "./curved-boundary.primitive.program.js";
import {
  CURVED_BOUNDARY_STYLE,
  createCardinalReferenceCommands,
  createCurvedBoundaryReferenceValues,
  createStepReferenceCommands
} from "./curved-boundary.reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("locks independent cardinal and step boundary commands", () => {
  const points = [
    { x: 0, y: 2 },
    { x: 10, y: 6 },
    { x: 20, y: 3 }
  ];
  const cardinal = createCardinalReferenceCommands(points);
  const step = createStepReferenceCommands(points);

  assert.deepEqual(cardinal.map(command => command.op), ["M", "C", "C"]);
  assert.deepEqual(cardinal.at(-1), {
    op: "C",
    x1: 13.333333333333334,
    y1: 6.166666666666667,
    x2: 18.333333333333332,
    y2: 3.5,
    x: 20,
    y: 3
  });
  assert.deepEqual(step.map(command => command.op), [
    "M", "L", "L", "L", "L", "L", "L"
  ]);
  assert.deepEqual(step.at(-1), { op: "L", x: 20, y: 3 });
});

for (const boundaryCurve of ["cardinal", "step"]) {
  test(`authors the ${boundaryCurve} boundary target with primitives`, () => {
    const gapminder = loadGapminder();
    const values = createCurvedBoundaryReferenceValues(gapminder, {
      boundaryCurve
    });
    const program = createGapminderCurvedBoundaryPrimitives(gapminder, {
      boundaryCurve
    });
    const area = program.graphicSpec.objects.errorBand.items;
    const lower = program.graphicSpec.objects.errorBandLowerBoundary.items;
    const upper = program.graphicSpec.objects.errorBandUpperBoundary.items;

    assert.equal(area.length, 6);
    assert.equal(lower.length, 6);
    assert.equal(upper.length, 6);
    assert.deepEqual(
      area.map(path => path.properties.commands),
      values.series.map(series => series.areaCommands)
    );
    assert.deepEqual(
      lower.map(path => path.properties.commands),
      values.series.map(series => series.lowerCommands)
    );
    assert.deepEqual(
      upper.map(path => path.properties.commands),
      values.series.map(series => series.upperCommands)
    );
    for (const path of [...lower, ...upper]) {
      assert.equal(path.properties.stroke, CURVED_BOUNDARY_STYLE.stroke);
      assert.equal(
        path.properties.strokeWidth,
        CURVED_BOUNDARY_STYLE.strokeWidth
      );
      assert.deepEqual(
        path.properties.strokeDash,
        CURVED_BOUNDARY_STYLE.strokeDash
      );
      assert.equal(path.properties.opacity, CURVED_BOUNDARY_STYLE.opacity);
    }

    const order = program.graphicSpec.order;
    assert.ok(order.indexOf("horizontalGridLines") < order.indexOf("errorBand"));
    assert.ok(
      order.indexOf("errorBand") <
      order.indexOf("errorBandLowerBoundary")
    );
    assert.ok(
      order.indexOf("errorBandLowerBoundary") <
      order.indexOf("errorBandUpperBoundary")
    );
    assert.ok(order.indexOf("errorBandUpperBoundary") < order.indexOf("xAxisLine"));

    const operations = flattenActions(program.trace).map(node => node.op);
    for (const futureAction of [
      "createErrorBand",
      "createAreaMark",
      "createLineMark",
      "editAreaMark",
      "editLineMark"
    ]) {
      assert.equal(operations.includes(futureAction), false, futureAction);
    }

    const context = createMockCanvasContext();
    assert.doesNotThrow(() => render(program, context));
    assert.equal(
      context.calls.some(call => call.op === "bezierCurveTo"),
      true
    );
  });
}

test("rejects an unsupported boundary curve", () => {
  assert.throws(
    () => createCurvedBoundaryReferenceValues(loadGapminder(), {
      boundaryCurve: "unknown"
    }),
    /Unsupported error-band boundary curve/
  );
});
