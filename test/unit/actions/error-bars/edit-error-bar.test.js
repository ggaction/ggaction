import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 3 }),
  Object.freeze({ group: "B", value: 2 }),
  Object.freeze({ group: "B", value: 6 })
]);

function errorBar(id = "errorBar") {
  return chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({ values: rows })
    .createErrorBar({
      id,
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" }
    });
}

test("edits one error bar and reconciles its owned caps", () => {
  const before = errorBar();
  const withoutCaps = before.editErrorBar({
    caps: false,
    stroke: "#dc2626",
    strokeWidth: 3,
    strokeDash: [8, 4],
    opacity: 0.6
  });

  assert.equal(withoutCaps.semanticSpec.layers.some(
    layer => layer.id === "errorBarLowerCap"
  ), false);
  assert.equal(withoutCaps.graphicSpec.objects.errorBarLowerCap, undefined);
  assert.equal(before.graphicSpec.objects.errorBarLowerCap.type, "line");
  assert.deepEqual(
    withoutCaps.graphicSpec.objects.errorBar.items[0].properties.strokeDash,
    [8, 4]
  );
  assert.equal(withoutCaps.semanticSpec.datasets.at(-1).id, "errorBarIntervalData");

  const restored = withoutCaps.editErrorBar({
    caps: true,
    capSize: 14
  });
  const cap = restored.graphicSpec.objects.errorBarLowerCap.items[0].properties;
  assert.equal(cap.x2 - cap.x1, 14);
  assert.equal(cap.stroke, "#dc2626");
  assert.deepEqual(
    restored.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeErrorBar"]
  );
});

test("resolves one owner and validates edits before changing state", () => {
  const single = errorBar("first");
  assert.equal(single.editErrorBar({ opacity: 0.5 }).markConfigs.first.errorBar.opacity, 0.5);
  assert.throws(() => single.editErrorBar({}), /requires at least one/);
  assert.throws(() => single.editErrorBar({ strokeWidth: -1 }), /strokeWidth/);
  assert.throws(() => single.editErrorBar({ unknown: true }), /Unknown editErrorBar option/);

  const two = single.createErrorBar({
    id: "second",
    data: "data",
    x: { field: "group", fieldType: "nominal", scale: { id: "x" } },
    y: { field: "value", scale: { id: "y" } }
  });
  assert.throws(() => two.editErrorBar({ opacity: 0.5 }), /ambiguous/);
  assert.equal(two.editErrorBar({ target: "second", opacity: 0.5 })
    .markConfigs.second.errorBar.opacity, 0.5);
});

test("revises statistical provenance and rebinds every error-bar consumer", () => {
  const before = errorBar();
  const after = before.editErrorBar({
    statistics: { center: "median", extent: "iqr" }
  });
  const revised = after.semanticSpec.datasets.find(
    dataset => dataset.id === "errorBarIntervalDataRevision1"
  );

  assert.deepEqual(revised.transform[0], {
    type: "interval",
    field: "value",
    groupBy: ["group"],
    center: "median",
    extent: "iqr",
    as: {
      center: "__errorBar_center",
      lower: "__errorBar_lower",
      upper: "__errorBar_upper"
    }
  });
  assert.deepEqual(
    after.semanticSpec.layers
      .filter(layer => layer.id.startsWith("errorBar"))
      .map(layer => layer.data),
    Array(3).fill("errorBarIntervalDataRevision1")
  );
  assert.equal(after.semanticSpec.datasets.some(
    dataset => dataset.id === "errorBarIntervalData"
  ), false);
  assert.equal(before.semanticSpec.layers[0].data, "errorBarIntervalData");
  assert.notDeepEqual(after.graphicSpec.objects.errorBar, before.graphicSpec.objects.errorBar);
});

test("rejects statistical edits for explicit error bars atomically", () => {
  const explicit = chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({
      values: [{ group: "A", center: 2, lower: 1, upper: 3 }]
    })
    .createErrorBar({
      x: { field: "group", fieldType: "nominal" },
      y: { center: "center", lower: "lower", upper: "upper" }
    });
  assert.throws(
    () => explicit.editErrorBar({ statistics: { extent: "stdev" } }),
    /explicit interval fields cannot be converted/
  );
  assert.equal(explicit.semanticSpec.datasets.length, 1);
});

test("revises source, position, interval roles, orientation, and caps together", () => {
  const before = errorBar().createData({ id: "revised", values: [
    { cohort: "C", measure: 2 },
    { cohort: "C", measure: 4 },
    { cohort: "D", measure: 6 },
    { cohort: "D", measure: 8 }
  ] });
  const after = before.editErrorBar({
    data: "revised",
    x: { field: "measure", center: "median", extent: "iqr" },
    y: { field: "cohort", fieldType: "nominal" },
    stroke: "#2563eb"
  });
  const owner = after.semanticSpec.layers.find(layer => layer.id === "errorBar");
  const lowerCap = after.semanticSpec.layers.find(
    layer => layer.id === "errorBarLowerCap"
  );
  const transform = after.semanticSpec.datasets.find(
    dataset => dataset.id === owner.data
  ).transform[0];

  assert.equal(owner.id, "errorBar");
  assert.equal(owner.encoding.x.field, "__errorBar_lower");
  assert.equal(owner.encoding.x2.field, "__errorBar_upper");
  assert.equal(owner.encoding.y.field, "cohort");
  assert.equal(lowerCap.encoding.x.field, "__errorBar_lower");
  assert.equal(lowerCap.encoding.y.field, "cohort");
  assert.equal(after.markConfigs.errorBarLowerCap.fixedSpan.orientation,
    "vertical");
  assert.equal(transform.field, "measure");
  assert.deepEqual(transform.groupBy, ["cohort"]);
  assert.equal(transform.center, "median");
  assert.equal(after.markConfigs.errorBar.errorBar.orientation, "horizontal");
  assert.equal(after.markConfigs.errorBar.errorBar.source, "revised");
  assert.equal(
    after.graphicSpec.objects.errorBar.items[0].properties.stroke,
    "#2563eb"
  );
  assert.equal(before.markConfigs.errorBar.errorBar.orientation, "vertical");
});

test("converts statistical and explicit error-bar roles with stable child ids", () => {
  const statistical = errorBar().createData({ id: "explicit", values: [
    { group: "A", center: 5, low: 3, high: 7 },
    { group: "B", center: 8, low: 6, high: 10 }
  ] });
  const explicit = statistical.editErrorBar({
    data: "explicit",
    x: { field: "group", fieldType: "nominal" },
    y: { center: "center", lower: "low", upper: "high" }
  });

  assert.equal(explicit.semanticSpec.layers[0].id, "errorBar");
  assert.deepEqual(explicit.semanticSpec.layers.map(layer => layer.id), [
    "errorBar", "errorBarLowerCap", "errorBarUpperCap"
  ]);
  assert.equal(explicit.semanticSpec.layers.every(
    layer => layer.data === "explicit"
  ), true);
  assert.equal(explicit.semanticSpec.datasets.some(
    dataset => dataset.id === "errorBarIntervalData"
  ), false);
  assert.equal(explicit.semanticSpec.layers[0].encoding.y.field, "low");
  assert.equal(explicit.semanticSpec.layers[0].encoding.y2.field, "high");
  assert.equal(explicit.markConfigs.errorBar.errorBar.intervalMode, "explicit");
  assert.equal(explicit.markConfigs.errorBar.errorBar.intervalField, undefined);
  assert.equal(explicit.markConfigs.errorBar.errorBar.centerField, "center");
});

test("retains explicit statistical grouping when another role changes", () => {
  const before = chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({ values: [
      { group: "A", subgroup: "one", value: 1 },
      { group: "A", subgroup: "one", value: 3 },
      { group: "A", subgroup: "two", value: 2 },
      { group: "A", subgroup: "two", value: 4 }
    ] })
    .createErrorBar({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      groupBy: "subgroup",
      caps: false
    })
    .createData({ id: "revised", values: [
      { group: "A", subgroup: "one", revised: 2 },
      { group: "A", subgroup: "one", revised: 5 },
      { group: "A", subgroup: "two", revised: 3 },
      { group: "A", subgroup: "two", revised: 7 }
    ] });
  const after = before.editErrorBar({
    data: "revised",
    y: { field: "revised" }
  });
  const transform = after.semanticSpec.datasets.find(
    dataset => dataset.id === after.markConfigs.errorBar.errorBar.data
  ).transform[0];

  assert.equal(after.markConfigs.errorBar.errorBar.groupField, "subgroup");
  assert.deepEqual(transform.groupBy, ["group", "subgroup"]);
});

test("moves a preserved categorical offset with the revised position axis", () => {
  const before = chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({ values: [
      { group: "A", subgroup: "one", value: 1 },
      { group: "A", subgroup: "one", value: 2 },
      { group: "A", subgroup: "two", value: 3 },
      { group: "A", subgroup: "two", value: 4 },
      { group: "B", subgroup: "one", value: 2 },
      { group: "B", subgroup: "one", value: 3 },
      { group: "B", subgroup: "two", value: 6 },
      { group: "B", subgroup: "two", value: 7 }
    ] })
    .createErrorBar({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      xOffset: { field: "subgroup" }
    });
  const after = before.editErrorBar({
    x: { field: "value", center: "mean", extent: "stderr" },
    y: { field: "group", fieldType: "nominal" }
  });

  for (const layer of after.semanticSpec.layers) {
    assert.equal(layer.encoding.xOffset, undefined);
    assert.equal(layer.encoding.yOffset.field, "subgroup");
  }
  assert.equal(after.markConfigs.errorBar.errorBar.offset.channel, "yOffset");
});

test("rebinds attached labels and replays highlights after a role revision", () => {
  const before = errorBar()
    .createMarkLabels({ source: "errorBar", field: "group" })
    .highlightMarks({
      target: "errorBar",
      select: { field: "group", op: "eq", value: "A" },
      stroke: "#dc2626",
      dimOthers: { opacity: 0.2 }
    })
    .createData({ id: "revised", values: [
      { group: "A", revised: 3 },
      { group: "A", revised: 5 },
      { group: "B", revised: 4 },
      { group: "B", revised: 8 }
    ] });
  const after = before.editErrorBar({
    data: "revised",
    x: { field: "group", fieldType: "nominal" },
    y: { field: "revised" }
  });
  const revision = after.markConfigs.errorBar.errorBar.data;

  assert.equal(
    after.semanticSpec.layers.find(layer => layer.id === "errorBar-labels").data,
    revision
  );
  assert.equal(after.semanticSpec.datasets.some(
    dataset => dataset.id === "errorBarIntervalData"
  ), false);
  assert.deepEqual(
    after.graphicSpec.objects["errorBar-labels"].items.map(
      item => item.properties.text
    ),
    ["A", "B"]
  );
  assert.equal(after.graphicSpec.objects.errorBar.items.some(
    item => item.properties.stroke === "#dc2626"
  ), true);
  assert.equal(after.graphicSpec.objects.errorBar.items.some(
    item => item.properties.opacity === 0.2
  ), true);
});

test("rejects invalid role revisions without changing the input program", () => {
  const before = errorBar();
  const snapshot = JSON.stringify(before);

  assert.throws(
    () => before.editErrorBar({ data: "missing", caps: false }),
    /Unknown error-bar dataset/
  );
  assert.throws(
    () => before.editErrorBar({ y: { field: "missing" }, stroke: "red" }),
    /Field "missing"/
  );
  assert.equal(JSON.stringify(before), snapshot);
});
