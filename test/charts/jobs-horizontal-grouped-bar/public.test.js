import assert from "node:assert/strict";
import test from "node:test";

import { createJobsHorizontalGroupedBar } from
  "../../../examples/jobs-horizontal-grouped-bar/program.js";
import { loadJobs } from "../../support/data.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createHorizontalGroupedBarPrimitives } from "./primitive.program.js";

test("builds the approved horizontal grouped bar through public actions", () => {
  const rows = loadJobs();
  const program = createJobsHorizontalGroupedBar(rows);
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.id, "bar");
  assert.equal(layer.data, "data");
  assert.deepEqual(layer.encoding, {
    x: {
      field: "perc",
      fieldType: "quantitative",
      aggregate: "mean",
      stack: null,
      scale: "x"
    },
    y: { field: "year", fieldType: "ordinal", scale: "y" },
    color: {
      field: "sex",
      fieldType: "nominal",
      scale: "color",
      layout: "group"
    },
    yOffset: { field: "sex", fieldType: "nominal", scale: "yOffset" }
  });
  assert.deepEqual(program.semanticSpec.scales.find(scale => scale.id === "yOffset"), {
    id: "yOffset",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.markConfigs.bar, {
    yOffset: { paddingInner: 0, paddingOuter: 0 },
    barWidth: { band: 0.72 }
  });
  assert.equal(program.graphicSpec.objects.bar.items.length, 30);

  const color = program.trace.children.find(node => node.op === "encodeColor");
  assert.equal(color.children.some(node => node.op === "encodeYOffset"), true);
  assert.deepEqual(
    program.trace.children.map(node => node.op),
    [
      "createCanvas",
      "createData",
      "createBarMark",
      "encodeX",
      "encodeY",
      "encodeColor",
      "encodeBarWidth",
      "createGuides",
      "createTitle"
    ]
  );
});

test("matches the approved primitive graphicSpec exactly", () => {
  const rows = loadJobs();
  assertChartProgramsEquivalent({
    publicProgram: createJobsHorizontalGroupedBar(rows),
    primitiveProgram: createHorizontalGroupedBarPrimitives(rows),
    compareSemanticSpec: false
  });
});
