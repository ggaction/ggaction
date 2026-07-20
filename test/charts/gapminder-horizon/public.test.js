import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createGapminderHorizonPrimitives } from "./primitive.program.js";
import { createGapminderHorizon } from "./public.program.js";
import {
  HORIZON_COLORS,
  createGapminderHorizonValues
} from "./reference-values.js";

test("builds the approved Kenya Horizon through one atomic encoding", () => {
  const input = loadGapminder().map(row => ({ ...row }));
  const before = structuredClone(input);
  const program = createGapminderHorizon(input);
  const primitive = createGapminderHorizonPrimitives(loadGapminder());
  const expected = createGapminderHorizonValues(loadGapminder());
  const dataset = program.semanticSpec.datasets.find(
    candidate => candidate.id === "areaHorizonData"
  );

  assert.deepEqual(input, before);
  assertChartProgramsEquivalent({
    publicProgram: program,
    primitiveProgram: primitive,
    compareSemanticSpec: false
  });
  assert.equal(dataset.transform[0].type, "horizon");
  assert.deepEqual(dataset.transform[0].resolved.extents, [{
    extent: expected.horizon.groups[0].extent,
    bandHeight: expected.horizon.groups[0].bandHeight
  }]);
  assert.equal(program.graphicSpec.objects.area.items.length, 7);
  assert.deepEqual(
    program.graphicSpec.objects.area.items.map(item => item.properties.fill),
    [
      HORIZON_COLORS.negative[0],
      HORIZON_COLORS.negative[0],
      HORIZON_COLORS.negative[1],
      HORIZON_COLORS.positive[0],
      HORIZON_COLORS.positive[0],
      HORIZON_COLORS.positive[1],
      HORIZON_COLORS.positive[2]
    ]
  );
  assert.equal(program.graphicSpec.objects.yAxisLine, undefined);
  assert.equal(program.graphicSpec.objects.horizontalGridLines, undefined);
  assert.equal(program.graphicSpec.objects.colorLegend, undefined);
  assert.ok(program.graphicSpec.objects.verticalGridLines);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "filterData",
    "createAreaMark",
    "encodeHorizon",
    "createGuides",
    "createTitle"
  ]);
});
