import assert from "node:assert/strict";
import test from "node:test";

import { createRaincloudPrimitive } from "./primitive.program.js";

test("keeps half-cloud and raw summary children on defined category sides", () => {
  const program = createRaincloudPrimitive();
  const scale = program.resolvedScales.distributionCategory;
  const centers = scale.domain.map((_, index) =>
    scale.start + scale.step * index + scale.bandwidth / 2);
  for (const [index, path] of program.graphicSpec.objects.distributionCloud.items.entries()) {
    const xs = path.properties.commands.map(command => command.x).filter(Number.isFinite);
    assert.equal(Math.max(...xs) <= centers[index], true);
  }
  for (const [index, rectangle] of program.graphicSpec.objects.distributionSummary.items.entries()) {
    const center = rectangle.properties.x + rectangle.properties.width / 2;
    assert.equal(center, centers[index] + scale.bandwidth * 0.22);
  }
  const rows = program.semanticSpec.datasets.find(dataset => dataset.id === "data").values;
  for (const [index, point] of program.graphicSpec.objects.distributionPoints.items.entries()) {
    const category = scale.domain.indexOf(rows[index].group);
    assert.equal(point.properties.x > centers[category], true);
  }
});
