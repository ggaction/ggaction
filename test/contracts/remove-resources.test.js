import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chart, hconcat, render } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { createMockCanvasContext } from "../support/canvas.js";
import { assertRenderedPNG } from "../support/png.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", x: 1, y: 2, z: 8 }),
  Object.freeze({ group: "B", x: 2, y: 4, z: 5 }),
  Object.freeze({ group: "A", x: 3, y: 3, z: 7 })
]);

function renderedCalls(program) {
  const context = createMockCanvasContext();
  render(program, context);
  return context.calls;
}

test("publishes three exact Full-only safe-removal actions", () => {
  const full = chart();
  const basic = basicChart();
  const catalog = JSON.parse(readFileSync(
    new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url),
    "utf8"
  ));
  for (const name of ["removeData", "removeScale", "removeCoordinate"]) {
    assert.equal(typeof full[name], "function", name);
    assert.equal(basic[name], undefined, name);
    const actions = catalog.actions.filter(action => action.name === name);
    assert.equal(actions.length, 1, name);
    assert.deepEqual(actions[0].contract, {
      file: "agent_docs/contract/current/CORE.md",
      anchor: name.toLowerCase()
    });
  }
});

test("R25-N01/N02/N03 remove unused named resources without visual drift", async () => {
  const before = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createData({ id: "unusedData", values: [] })
    .createScale({ id: "unusedScale", type: "linear" })
    .createCoordinate({ id: "unusedCoordinate", type: "cartesian" });
  const expectedCalls = renderedCalls(before);
  const dataOptions = Object.freeze({ id: "unusedData" });
  const scaleOptions = Object.freeze({ id: "unusedScale" });
  const coordinateOptions = Object.freeze({ id: "unusedCoordinate" });
  const after = before
    .removeData(dataOptions)
    .removeScale(scaleOptions)
    .removeCoordinate(coordinateOptions);

  assert.deepEqual(after.semanticSpec.datasets.map(value => value.id), ["rows"]);
  assert.equal(after.semanticSpec.scales.some(value => value.id === "unusedScale"), false);
  assert.equal(
    after.semanticSpec.coordinates.some(value => value.id === "unusedCoordinate"),
    false
  );
  assert.equal(after.context.currentData, undefined);
  assert.equal(after.context.currentScale, undefined);
  assert.equal(after.context.currentCoordinate, undefined);
  assert.strictEqual(after.graphicSpec, before.graphicSpec);
  assert.strictEqual(after.children, before.children);
  assert.deepEqual(renderedCalls(after), expectedCalls);
  const beforePixels = await assertRenderedPNG(before, {
    name: "remove-resources-before",
    width: 320,
    height: 220,
    pixelRatio: 1,
    minimumInkPixels: 20
  });
  const afterPixels = await assertRenderedPNG(after, {
    name: "remove-resources-after",
    width: 320,
    height: 220,
    pixelRatio: 1,
    minimumInkPixels: 20
  });
  assert.equal(afterPixels.pixelHash, beforePixels.pixelHash);
  assert.equal(
    before.trace.children.some(node =>
      node.op === "createData" && node.args.id === "unusedData"
    ),
    true
  );
});

test("R25-E01 reports a Parallel dimension as a single live scale edge", () => {
  const program = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createParallelCoordinates({
      id: "parallel",
      dimensions: ["x", "y", "z"],
      guides: false
    });
  const dimension = program.semanticSpec.layers[0].encoding.parallel.dimensions[1];

  assert.throws(
    () => program.removeScale({ id: dimension.scale }),
    new RegExp(
      `Cannot remove scale "${dimension.scale}"; live references: ` +
      "layer \"parallel\" at \\.encoding\\.parallel\\.dimensions\\[1\\]\\.scale"
    )
  );
});

test("R25-E02 retained facet source blocks parent deletion", () => {
  const faceted = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .facet({ field: "group" });

  assert.throws(
    () => faceted.removeData({ id: "rows" }),
    /composition "facet" at \.facet\.data/
  );
});

test("R25-L01 removes a logical data owner only after its last consumer", () => {
  const computed = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: rows })
    .createComputedData({
      id: "computed",
      as: "twice",
      expression: {
        op: "multiply",
        left: { field: "x" },
        right: { constant: 2 }
      }
    });
  const consumed = computed
    .createPointMark({ id: "points", data: "computed" })
    .encodeX({ field: "twice" })
    .encodeY({ field: "y" });

  assert.throws(
    () => consumed.removeData({ id: "computed" }),
    /layer "points" at \.data/
  );
  const released = consumed
    .removeMark({ target: "points" })
    .removeData({ id: "computed" });
  assert.deepEqual(released.semanticSpec.datasets.map(value => value.id), ["source"]);
  assert.equal(released.materializationConfigs.data, undefined);
});

test("uses structural ownership for chart-generated statistical data", () => {
  const program = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createReferenceLine({
      id: "average",
      source: "points",
      axis: "y",
      statistic: { op: "mean" }
    });

  assert.throws(
    () => program.removeData({ id: "average-statistical-reference-data" }),
    /chart-owned; use its owning resource action/
  );
});

test("rejects concat parents before attempting cross-child name resolution", () => {
  const child = id => chart()
    .createCanvas({ width: 120, height: 100, margin: 10 })
    .createData({ id, values: rows });
  const pair = hconcat({ programs: [child("left"), child("right")] });

  assert.throws(
    () => pair.removeData({ id: "left" }),
    /removeData supports unit and facet composition programs/
  );
});
