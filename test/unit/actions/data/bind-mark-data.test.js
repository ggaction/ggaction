import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function scatterProgram() {
  return chart()
    .createCanvas({ width: 320, height: 240, margin: 24 })
    .createData({
      id: "first",
      values: [{ x: 0, y: 1 }, { x: 10, y: 9 }]
    })
    .createData({
      id: "second",
      values: [{ x: 2, y: 8 }, { x: 4, y: 3 }, { x: 8, y: 6 }]
    })
    .createPointMark({ id: "points", data: "first" })
    .encodeX({ target: "points", field: "x", fieldType: "quantitative" })
    .encodeY({ target: "points", field: "y", fieldType: "quantitative" });
}

test("bindMarkData atomically rebinds and rematerializes an independent mark", () => {
  const before = scatterProgram();
  const oldItems = before.graphicSpec.objects.points.items;
  const after = before.bindMarkData({ target: "points", data: "second" });
  const action = after.trace.children.at(-1);

  assert.equal(before.semanticSpec.layers[0].data, "first");
  assert.equal(before.graphicSpec.objects.points.items.length, 2);
  assert.equal(after.semanticSpec.layers[0].data, "second");
  assert.equal(after.graphicSpec.objects.points.items.length, 3);
  assert.notDeepEqual(after.graphicSpec.objects.points.items, oldItems);
  assert.equal(action.op, "bindMarkData");
  assert.equal(action.children[0].op, "rebindLayerData");
  assert.ok(action.children.some(child => child.op === "rematerializeScale"));
  assert.ok(action.children.some(child => child.op === "rematerializePointMark"));
});

test("bindMarkData rejects incompatible and incomplete data without changing its source", () => {
  const before = scatterProgram()
    .createData({ id: "missingField", values: [{ x: 1, z: 2 }] })
    .createData({ id: "wrongType", values: [{ x: "one", y: 2 }] })
    .createDerivedData({
      id: "definitionOnly",
      source: "first",
      transform: [{ type: "filter", field: "x", oneOf: [0] }]
    });
  const snapshot = JSON.stringify(before);
  const trace = before.trace;

  assert.throws(
    () => before.bindMarkData({ target: "points", data: "missingField" }),
    /Field "y"|has no values/
  );
  assert.throws(
    () => before.bindMarkData({ target: "points", data: "wrongType" }),
    /finite number|quantitative/
  );
  assert.throws(
    () => before.bindMarkData({ target: "points", data: "definitionOnly" }),
    /requires materialized values/
  );
  assert.equal(JSON.stringify(before), snapshot);
  assert.equal(before.trace, trace);
});

test("bindMarkData enforces lifecycle and option boundaries", () => {
  const before = scatterProgram();
  assert.throws(
    () => before.bindMarkData({ target: "points", data: "second" })
      .bindMarkData({ target: "points", data: "second" }),
    /already uses dataset/
  );
  assert.throws(
    () => before.bindMarkData({ target: "missing", data: "second" }),
    /Layer "missing" does not exist/
  );
  assert.throws(
    () => before.bindMarkData({ target: "points", data: "missing" }),
    /does not exist/
  );
  assert.throws(
    () => before.bindMarkData({ target: "points", data: "second", extra: true }),
    /Unknown bindMarkData option/
  );

  const composite = chart()
    .createCanvas()
    .createData({
      values: [
        { category: "A", value: 1 },
        { category: "A", value: 2 },
        { category: "B", value: 3 }
      ]
    })
    .createBoxPlot({
      id: "boxes",
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      guides: false
    })
    .createData({
      id: "replacement",
      values: [{ category: "A", value: 4 }]
    });
  assert.throws(
    () => composite.bindMarkData({ target: "boxes", data: "replacement" }),
    /owned by its boxPlot lifecycle/
  );
});
