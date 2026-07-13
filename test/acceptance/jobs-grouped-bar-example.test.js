import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createJobsGroupedBar } from "../../examples/jobs-grouped-bar/program.js";

const jobs = JSON.parse(
  readFileSync(new URL("../../data/jobs.json", import.meta.url), "utf8")
);

test("builds the public jobs grouped bar chart with chart actions", () => {
  const program = createJobsGroupedBar(jobs);
  const layer = program.semanticSpec.layers[0];

  assert.equal(program.semanticSpec.datasets[0].values.length, 7650);
  assert.equal(layer.mark.type, "bar");
  assert.deepEqual(layer.encoding.x, {
    field: "year",
    fieldType: "ordinal",
    scale: "x"
  });
  assert.equal(layer.encoding.y.aggregate, "mean");
  assert.equal(layer.encoding.y.stack, null);
  assert.equal(layer.encoding.color.field, "sex");
  assert.equal(layer.encoding.xOffset.field, "sex");
  assert.equal(program.graphicSpec.objects.bars.children.length, 30);
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    ["men", "women"]
  );
  assert.equal(program.semanticSpec.guides.grid.horizontal.scale, "y");
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createBarMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeBarWidth",
    "createGuides"
  ]);
});
