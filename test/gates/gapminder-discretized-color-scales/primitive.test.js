import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderDiscretizedColorPrimitives } from "./primitive.program.js";
import {
  DISCRETIZED_COLORS,
  DISCRETIZED_COLOR_TYPES,
  createDiscretizedColorReference
} from "./reference-values.js";

const gapminder = loadGapminder();

test("locks independent quantize, quantile, and threshold class boundaries", () => {
  assert.deepEqual(
    createDiscretizedColorReference(gapminder, "quantize").thresholds,
    [58.18, 64.26, 70.34, 76.42]
  );
  assert.deepEqual(
    createDiscretizedColorReference(gapminder, "quantile").thresholds,
    [69.178, 74.17, 77.71000000000001, 79.728]
  );
  assert.deepEqual(
    createDiscretizedColorReference(gapminder, "threshold").thresholds,
    [60, 70, 75, 80]
  );
});

test("authors each discretized color target with primitives only", () => {
  for (const type of DISCRETIZED_COLOR_TYPES) {
    const reference = createDiscretizedColorReference(gapminder, type);
    const program = createGapminderDiscretizedColorPrimitives(gapminder, type);
    const scale = program.semanticSpec.scales.find(item => item.id === "color");
    const fills = program.graphicSpec.objects.point.children.map(
      child => child.properties.fill
    );

    assert.equal(scale.type, type);
    assert.deepEqual(scale.domain, reference.domains.color);
    assert.deepEqual(scale.range, DISCRETIZED_COLORS);
    assert.deepEqual(
      program.graphicSpec.objects.colorLegendLabels.children.map(
        child => child.properties.text
      ),
      reference.legend.labels
    );
    assert.deepEqual(new Set(fills), new Set(DISCRETIZED_COLORS));
    assert.equal(
      program.graphicSpec.order.indexOf("horizontalGridLines") <
        program.graphicSpec.order.indexOf("point"),
      true
    );
    assert.equal(
      program.graphicSpec.order.indexOf("point") <
        program.graphicSpec.order.indexOf("colorLegendSymbols"),
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
    assert.equal(context.calls.some(call => call.op === "arc"), true);
    assert.equal(context.calls.some(call => call.op === "fillRect"), true);
  }
});

test("keeps quantile classes balanced at the final point grain", () => {
  const reference = createDiscretizedColorReference(gapminder, "quantile");
  const counts = DISCRETIZED_COLORS.map(color =>
    reference.points.filter(point => point.fill === color).length
  );

  assert.deepEqual(counts, [13, 12, 12, 12, 13]);
  assert.equal(Math.max(...counts) - Math.min(...counts), 1);
});
