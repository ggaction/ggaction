import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { GRADIENT_PROFILE_FIELDS } from
  "../../../../src/grammar/gradientProfile.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 2 }),
  Object.freeze({ group: "B", value: 4 }),
  Object.freeze({ group: "B", value: 6 })
]);

test("authors and materializes a traceable gradient-profile dataset", () => {
  const source = chart().createData({ id: "rows", values: rows });
  const program = source.createGradientProfileData({
    id: "profiles",
    source: "rows",
    category: "group",
    field: "value",
    bandwidth: 0.5,
    steps: 8
  });
  const dataset = program.semanticSpec.datasets.find(item => item.id === "profiles");
  const actionNode = program.trace.children.at(-1);

  assert.equal(dataset.source, "rows");
  assert.equal(dataset.transform[0].type, "gradientProfile");
  assert.deepEqual(dataset.transform[0].resolved.extent, [1, 6]);
  assert.equal(dataset.values.length, 2);
  assert.equal(dataset.values[0][GRADIENT_PROFILE_FIELDS.values].length, 8);
  assert.equal(actionNode.op, "createGradientProfileData");
  assert.deepEqual(actionNode.children.map(child => child.op), [
    "createDerivedData",
    "materializeGradientProfileData"
  ]);
  assert.deepEqual(source.semanticSpec.datasets.map(item => item.id), ["rows"]);
  assert.deepEqual(rows[0], { group: "A", value: 1 });
});
