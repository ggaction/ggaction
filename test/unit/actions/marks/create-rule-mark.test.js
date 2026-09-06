import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function dataProgram(values = [{ value: 1 }]) {
  return chart().createData({ id: "values", values });
}

test("creates the default semantic rule and empty line collection", () => {
  const before = dataProgram();
  const program = before.createRuleMark();

  assert.deepEqual(program.semanticSpec.layers, [
    { id: "rule", mark: { type: "rule" }, data: "values" }
  ]);
  assert.deepEqual(program.graphicSpec.objects.rule, {
    type: "line",
    items: []
  });
  assert.deepEqual(program.markConfigs.rule, {
    stroke: "#4c78a8",
    strokeWidth: 2,
    strokeDash: [],
    opacity: 1
  });
  assert.equal(before.semanticSpec.layers.length, 0);
  assert.equal(before.graphicSpec.objects.rule, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createRuleMark");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createGraphics"
  ]);
});

test("supports explicit rule roles and requires a name for another rule", () => {
  const first = dataProgram([]).createRuleMark({ id: "baseline" });
  const second = first.createRuleMark({ id: "threshold" });

  assert.deepEqual(
    second.semanticSpec.layers.map(layer => layer.id),
    ["baseline", "threshold"]
  );
  assert.throws(
    () => first.createRuleMark(),
    /requires an explicit rule mark id because its default is ambiguous/
  );
});

test("validates rule creation without mutating the earlier program", () => {
  const program = dataProgram();

  assert.throws(() => chart().createRuleMark(), /requires data/);
  assert.throws(
    () => program.createRuleMark({ data: "missing" }),
    /Unknown dataset/
  );
  assert.throws(
    () => program.createRuleMark({ id: "bad id" }),
    /Rule mark id/
  );
  assert.throws(
    () => program.createRuleMark({ fill: "red" }),
    /Unknown createRuleMark option/
  );

  const created = program.createRuleMark({ id: "threshold" });
  assert.throws(
    () => created.createRuleMark({ id: "threshold" }),
    /already exists/
  );
  assert.equal(program.semanticSpec.layers.length, 0);
  assert.equal(program.graphicSpec.objects.threshold, undefined);
});
