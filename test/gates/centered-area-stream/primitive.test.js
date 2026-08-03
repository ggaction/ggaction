import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";

import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";
import { CENTER_AREA_LAYOUT } from "./reference-values.js";

test("authors the two-panel target without future center actions", () => {
  const program = createCenteredAreaStreamPrimitives(loadJobs());

  assert.deepEqual(Object.keys(program.children), ["zero", "center"]);
  for (const child of Object.values(program.children)) {
    assert.equal(child.semanticSpec.datasets[0].values.length, 75);
    assert.equal(child.graphicSpec.objects.occupations.items.length, 5);
    assert.equal(
      child.trace.children.some(node =>
        ["createAreaMark", "encodeX", "encodeY", "encodeColor", "createGuides"]
          .includes(node.op)
      ),
      false
    );
  }
  assert.deepEqual(program.graphicSpec.objects.canvas.properties, {
    width: CENTER_AREA_LAYOUT.padding * 2 +
      CENTER_AREA_LAYOUT.panelWidth * 2 + CENTER_AREA_LAYOUT.gap,
    height: CENTER_AREA_LAYOUT.padding * 2 + CENTER_AREA_LAYOUT.panelHeight,
    background: "white"
  });
  assert.equal(
    program.children.center.graphicSpec.objects.zeroRule.properties.y1,
    (CENTER_AREA_LAYOUT.plot.top + CENTER_AREA_LAYOUT.plot.bottom) / 2
  );
});
