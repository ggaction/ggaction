import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderContinuousColorBarPrimitives } from
  "./primitive.program.js";
import {
  CONTINUOUS_BAR_VARIANTS,
  createContinuousColorBarReference
} from "./reference-values.js";

const gapminder = loadGapminder();

test("locks independent aggregate values for each final country bar", () => {
  const matching = createContinuousColorBarReference(
    gapminder,
    "matching-population"
  );
  const alternate = createContinuousColorBarReference(
    gapminder,
    "mean-life-expectancy"
  );

  assert.deepEqual(
    matching.aggregates.map(row => row.count),
    Array(8).fill(3)
  );
  assert.equal(matching.aggregates[0].population, 3_787_131_057);
  assert.equal(alternate.aggregates[0].lifeExpectancy, 71.35333333333334);
  assert.equal(matching.color.aggregate, "sum");
  assert.equal(alternate.color.aggregate, "mean");
});

test("authors every continuous-color bar target with primitives only", () => {
  for (const variant of CONTINUOUS_BAR_VARIANTS) {
    const reference = createContinuousColorBarReference(gapminder, variant);
    const program = createGapminderContinuousColorBarPrimitives(
      gapminder,
      variant
    );
    const layer = program.semanticSpec.layers.find(item => item.id === "bar");
    const fills = program.graphicSpec.objects.bar.children.map(
      child => child.properties.fill
    );

    assert.equal(layer.encoding.color.aggregate, reference.color.aggregate);
    assert.equal(layer.encoding.color.field, reference.color.sourceField);
    assert.equal(program.graphicSpec.objects.bar.children.length, 8);
    assert.equal(new Set(fills).size > 4, true);
    assert.equal(
      program.graphicSpec.order.indexOf("horizontalGridLines") <
        program.graphicSpec.order.indexOf("bar"),
      true
    );
    assert.equal(
      program.trace.children.every(node =>
        ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
      ),
      true
    );

    const context = createMockCanvasContext();
    render(program, context);
    assert.equal(context.calls.some(call => call.op === "fillRect"), true);
    assert.equal(context.calls.some(call => call.op === "fillText"), true);
  }
});

test("reverses bar and gradient colors without changing aggregate geometry", () => {
  const normal = createContinuousColorBarReference(
    gapminder,
    "mean-life-expectancy"
  );
  const reversed = createContinuousColorBarReference(
    gapminder,
    "reversed-life-expectancy"
  );

  assert.deepEqual(
    reversed.bars.map(bar => [bar.x, bar.y, bar.width, bar.height]),
    normal.bars.map(bar => [bar.x, bar.y, bar.width, bar.height])
  );
  assert.notDeepEqual(
    reversed.bars.map(bar => bar.fill),
    normal.bars.map(bar => bar.fill)
  );
});
