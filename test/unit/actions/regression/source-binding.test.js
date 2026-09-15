import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { deserializeProgram, serializeProgram } from "../../../../src/persistence.js";

const rows = [
  { group: "A", x: 1, y: 2, z: 13 },
  { group: "A", x: 2, y: 4, z: 16 },
  { group: "A", x: 3, y: 6, z: 19 },
  { group: "B", x: 1, y: 3, z: 14 },
  { group: "B", x: 2, y: 5, z: 17 },
  { group: "B", x: 3, y: 7, z: 20 }
];

function regressionProgram(sourceBinding) {
  return chart()
    .createCanvas()
    .createData({ id: "source", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createRegression({
      target: "points",
      groupBy: "group",
      interval: false,
      sourceBinding,
      line: { strokeWidth: 5 }
    });
}

function regressionTransform(program) {
  const owner = program.markConfigs.points.regression;
  return program.semanticSpec.datasets.find(dataset => dataset.id === owner.dataId).transform[0];
}

test("follow regression refits when the source y binding changes", () => {
  const before = regressionProgram("follow");
  const after = before.encodeY({ target: "points", field: "z" });
  const transform = regressionTransform(after);
  const owner = after.markConfigs.points.regression;

  assert.equal(transform.y, "z");
  assert.equal(after.semanticSpec.layers.find(layer => layer.id === owner.lineId).encoding.y.field, "z");
  assert.equal(after.graphicSpec.objects[owner.lineId].items[0].properties.strokeWidth, 5);
  assert.deepEqual(
    after.semanticSpec.layers.find(layer => layer.id === "points").derivedBindings.regression,
    { mode: "follow", roles: ["data", "x", "y"] }
  );
  assert.equal(regressionTransform(before).y, "y");
});

test("fixed regression retains its fitted source roles", () => {
  const before = regressionProgram("fixed");
  const after = before.encodeY({ target: "points", field: "z" });

  assert.equal(regressionTransform(after).y, "y");
  assert.equal(after.semanticSpec.layers.find(layer => layer.id === "points").encoding.y.field, "z");
  assert.equal(after.semanticSpec.layers.find(layer => layer.id === "points").derivedBindings, undefined);
});

test("source binding mode edits and editable snapshots preserve the relationship", () => {
  const followed = regressionProgram("fixed").editRegression({ sourceBinding: "follow" });
  const restored = deserializeProgram(serializeProgram(followed));
  const after = restored.encodeY({ target: "points", field: "z" });

  assert.equal(regressionTransform(after).y, "z");
  assert.deepEqual(
    after.semanticSpec.layers.find(layer => layer.id === "points").derivedBindings.regression,
    { mode: "follow", roles: ["data", "x", "y"] }
  );

  const fixed = after.editRegression({ sourceBinding: "fixed" });
  assert.equal(fixed.semanticSpec.layers.find(layer => layer.id === "points").derivedBindings, undefined);
});
