import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../support/data.js";
import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";

test("authors the center target with explicit semantic and graphic primitives", () => {
  const program = createCenteredAreaStreamPrimitives(loadJobs());

  assert.equal(program.semanticSpec.datasets[0].values.length, 75);
  assert.equal(program.graphicSpec.objects.occupations.items.length, 5);
  assert.equal(
    program.trace.children.some(node =>
      ["encodeX", "encodeY", "encodeColor"].includes(node.op)
    ),
    false
  );
  assert.deepEqual(program.semanticSpec.layers[0].encoding.y.stack, "center");
});
