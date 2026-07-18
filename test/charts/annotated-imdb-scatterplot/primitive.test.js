import assert from "node:assert/strict";
import test from "node:test";

import { loadImdbTop1000 } from "../../support/data.js";
import { createAnnotatedImdbPrimitives } from "./primitive.program.js";

test("keeps the approved annotated film primitive baseline", () => {
  const program = createAnnotatedImdbPrimitives(loadImdbTop1000());
  assert.equal(program.graphicSpec.objects.point.items.length, 8);
  assert.equal(program.graphicSpec.objects.text.items.length, 8);
  assert.equal(
    program.trace.children.some(node => node.op === "createTextMark"),
    false
  );
});
