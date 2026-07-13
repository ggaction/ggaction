import assert from "node:assert/strict";
import test from "node:test";

import { action, ChartProgram } from "ggaction/extension";

class CustomProgram extends ChartProgram {}

CustomProgram.prototype.recordNote = action(
  {
    op: "recordNote",
    description: "Record a custom trace note."
  },
  function () {
    return this;
  }
);

test("exports the public action-authoring API", () => {
  assert.equal(typeof action, "function");
  assert.equal(typeof ChartProgram, "function");
});

test("supports actions on ChartProgram subclasses", () => {
  const result = new CustomProgram().recordNote({ label: "example" });

  assert.equal(result instanceof CustomProgram, true);
  assert.deepEqual(result.actionStack, []);
  assert.equal(result.trace.children[0].op, "recordNote");
  assert.deepEqual(result.trace.children[0].args, { label: "example" });
});
