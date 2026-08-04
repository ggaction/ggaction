import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";

const rows = Object.freeze([
  Object.freeze({ category: "Beta", value: 3, group: "East" }),
  Object.freeze({ category: "Alpha", value: 10, group: "East" }),
  Object.freeze({ category: "Gamma", value: 4, group: "East" }),
  Object.freeze({ category: "Beta", value: 2, group: "West" }),
  Object.freeze({ category: "Alpha", value: 1, group: "West" }),
  Object.freeze({ category: "Gamma", value: 8, group: "West" })
]);

function barBase({ horizontal = false, values = rows } = {}) {
  let program = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 24, right: 24, bottom: 52, left: 54 }
    })
    .createData({ id: "rows", values })
    .createBarMark({ id: "bars" });
  program = horizontal
    ? program
        .encodeY({ target: "bars", field: "category", fieldType: "nominal" })
        .encodeX({
          target: "bars",
          field: "value",
          fieldType: "quantitative",
          aggregate: "sum"
        })
    : program
        .encodeX({ target: "bars", field: "category", fieldType: "nominal" })
        .encodeY({
          target: "bars",
          field: "value",
          fieldType: "quantitative",
          aggregate: "sum"
        });
  return program.createGuides();
}

function axisLabels(program, channel) {
  return program.graphicSpec.objects[`${channel}AxisLabels`].items.map(
    item => item.properties.text
  );
}

test("stores summary intent and rematerializes domain, bar geometry, axis, and selection items", () => {
  const automatic = barBase();
  const ordered = automatic
    .selectMarks({ id: "all", target: "bars", channel: "x", op: "gte", value: 0 })
    .orderCategories({
      target: "bars",
      channel: "x",
      by: { field: "value", aggregate: "sum" },
      direction: "descending"
    });
  const layer = ordered.semanticSpec.layers.find(item => item.id === "bars");

  assert.deepEqual(layer.encoding.x.categoryOrder, {
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  });
  assert.deepEqual(automatic.resolvedScales.x.domain, ["Beta", "Alpha", "Gamma"]);
  assert.deepEqual(ordered.resolvedScales.x.domain, ["Gamma", "Alpha", "Beta"]);
  assert.deepEqual(axisLabels(ordered, "x"), ["Gamma", "Alpha", "Beta"]);
  assert.notDeepEqual(
    ordered.graphicSpec.objects.bars,
    automatic.graphicSpec.objects.bars
  );
  assert.deepEqual(
    resolveStoredSelection(ordered, "all").items.map(item => item.channels.x),
    ["Gamma", "Alpha", "Beta"]
  );
  assert.deepEqual(
    ordered.trace.children.at(-1).children.map(child => child.op),
    [
      "editSemantic",
      "rematerializeScale",
      "rematerializeBarMark",
      "editXAxisLine",
      "editXAxisTicks",
      "editXAxisLabels",
      "editXAxisTitle"
    ]
  );
  assert.equal(automatic.semanticSpec.layers[0].encoding.x.categoryOrder, undefined);
});

test("reassigns, removes, and restores the automatic order immutably", () => {
  const automatic = barBase();
  const explicitValues = ["Gamma"];
  const explicit = automatic.orderCategories({
    target: "bars",
    channel: "x",
    values: explicitValues
  });
  explicitValues[0] = "Alpha";
  const category = explicit.orderCategories({
    target: "bars",
    channel: "x",
    by: "category"
  });
  const restored = category.removeCategoryOrder({ target: "bars", channel: "x" });

  assert.deepEqual(explicit.resolvedScales.x.domain, ["Gamma", "Beta", "Alpha"]);
  assert.deepEqual(explicit.semanticSpec.layers[0].encoding.x.categoryOrder.values, ["Gamma"]);
  assert.deepEqual(category.resolvedScales.x.domain, ["Alpha", "Beta", "Gamma"]);
  assert.equal(restored.semanticSpec.layers[0].encoding.x.categoryOrder, undefined);
  assert.deepEqual(restored.resolvedScales.x.domain, automatic.resolvedScales.x.domain);
  assert.deepEqual(restored.graphicSpec, automatic.graphicSpec);
  assert.deepEqual(
    restored.trace.children.at(-1).children.map(child => child.op),
    [
      "editSemantic",
      "rematerializeScale",
      "rematerializeBarMark",
      "editXAxisLine",
      "editXAxisTicks",
      "editXAxisLabels",
      "editXAxisTitle"
    ]
  );

  const inferred = explicit
    .createPointMark({ id: "current", data: "rows" })
    .encodeX({ target: "current", field: "value", scale: { id: "current-x" } })
    .removeCategoryOrder({ channel: "x" });
  assert.equal(inferred.semanticSpec.layers[0].encoding.x.categoryOrder, undefined);
});

test("supports horizontal bars, categorical points, and inferred unique targets", () => {
  const horizontal = barBase({ horizontal: true }).orderCategories({
    channel: "y",
    by: "category",
    direction: "descending"
  });
  assert.deepEqual(horizontal.resolvedScales.y.domain, ["Gamma", "Beta", "Alpha"]);
  assert.deepEqual(axisLabels(horizontal, "y"), ["Gamma", "Beta", "Alpha"]);

  const points = chart()
    .createCanvas({ width: 320, height: 240, margin: 40 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({ field: "value" })
    .orderCategories({ channel: "x", values: ["Alpha"] });
  assert.deepEqual(points.resolvedScales.x.domain, ["Alpha", "Beta", "Gamma"]);
});

test("uses one compatible assignment for shared consumers and rejects incompatible sharing", () => {
  const shared = barBase()
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({
      target: "points",
      field: "category",
      fieldType: "nominal",
      scale: { id: "x" }
    })
    .encodeY({ target: "points", field: "value", scale: { id: "y" } })
    .orderCategories({ target: "bars", channel: "x", values: ["Alpha"] });
  assert.deepEqual(shared.resolvedScales.x.domain, ["Alpha", "Beta", "Gamma"]);

  const incompatible = barBase()
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({
      target: "points",
      field: "group",
      fieldType: "nominal",
      scale: { id: "x" }
    })
    .encodeY({ target: "points", field: "value", scale: { id: "y" } });
  assert.throws(
    () => incompatible.orderCategories({ target: "bars", channel: "x", by: "category" }),
    /incompatible shared consumer/
  );
});

test("replays computed order through shared and independent facet scale policies", () => {
  const ordered = barBase().orderCategories({
    target: "bars",
    channel: "x",
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  });
  const shared = ordered.facet({ field: "group", scales: { x: "shared" } });
  const independent = ordered.facet({ field: "group", scales: { x: "independent" } });

  for (const child of Object.values(shared.children)) {
    assert.deepEqual(child.resolvedScales.x.domain, ["Gamma", "Alpha", "Beta"]);
  }
  assert.deepEqual(
    Object.values(independent.children).map(child => child.resolvedScales.x.domain),
    [["Alpha", "Gamma", "Beta"], ["Gamma", "Beta", "Alpha"]]
  );
});

test("rejects invalid targets, channels, assignments, and values atomically", () => {
  const base = barBase();
  const snapshot = base.semanticSpec;
  assert.throws(
    () => base.orderCategories({ target: "bars", channel: "color", by: "category" }),
    /channel must be x or y/
  );
  assert.throws(
    () => base.orderCategories({ target: "bars", channel: "y", by: "category" }),
    /Unknown categorical position mark target/
  );
  assert.throws(
    () => base.orderCategories({ target: "bars", channel: "x", values: ["Unknown"] }),
    /Unknown category order value/
  );
  assert.throws(
    () => base.orderCategories({ target: "bars", channel: "x", values: ["Alpha", "Alpha"] }),
    /must be unique/
  );
  assert.throws(
    () => base.removeCategoryOrder({ target: "bars", channel: "x" }),
    /has no category order assignment/
  );
  assert.throws(
    () => base.orderCategories({ target: "bars", channel: "x", by: "category", unknown: true }),
    /Unknown orderCategories option/
  );
  const explicitScale = barBase().editScale({
    id: "x",
    domain: ["Alpha", "Beta", "Gamma"]
  });
  assert.throws(
    () => explicitScale.orderCategories({ target: "bars", channel: "x", by: "category" }),
    /cannot combine an explicit domain with category order/
  );

  const ambiguous = base
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({ target: "points", field: "category", fieldType: "nominal" })
    .encodeY({ target: "points", field: "value" })
    .createPointMark({ id: "current", data: "rows" })
    .encodeX({ target: "current", field: "value", scale: { id: "current-x" } });
  assert.throws(
    () => ambiguous.orderCategories({ channel: "x", by: "category" }),
    /target is ambiguous/
  );
  assert.equal(base.semanticSpec, snapshot);
});
