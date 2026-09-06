import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ year: 2000, group: "A", value: 10 }),
  Object.freeze({ year: 2000, group: "A", value: 12 }),
  Object.freeze({ year: 2001, group: "A", value: 13 }),
  Object.freeze({ year: 2001, group: "A", value: 15 }),
  Object.freeze({ year: 2000, group: "B", value: 18 }),
  Object.freeze({ year: 2000, group: "B", value: 20 }),
  Object.freeze({ year: 2001, group: "B", value: 21 }),
  Object.freeze({ year: 2001, group: "B", value: 23 })
]);

function errorBand() {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 60 })
    .createData({ values: rows })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "value" },
      groupBy: "group"
    })
    .encodeColor({ target: "errorBand", field: "group" });
}

test("requires explicit color removal before a persistent constant band fill", () => {
  const before = errorBand();
  assert.throws(() => before.editErrorBand({ fill: "#7dd3fc" }), /conflicts with a color encoding/);
  const edited = before.removeEncoding({ channel: "color" }).editErrorBand({
    fill: "#7dd3fc",
    opacity: 0.34,
    curve: "cardinal"
  });
  assert.ok(edited.graphicSpec.objects.errorBand.items.every(
    item => item.properties.fill === "#7dd3fc" && item.properties.opacity === 0.34
  ));
  const resized = edited.editCanvas({ width: 520 });
  assert.ok(resized.graphicSpec.objects.errorBand.items.every(
    item => item.properties.fill === "#7dd3fc"
  ));
  assert.notDeepEqual(before.graphicSpec, edited.graphicSpec);
});

test("creates and edits selected optional boundary components", () => {
  const before = errorBand();
  const lower = before.editErrorBandBoundary({
    boundary: "lower",
    stroke: "#0369a1",
    strokeWidth: 2,
    strokeDash: [6, 3],
    opacity: 0.8,
    curve: "cardinal"
  });
  assert.equal(lower.graphicSpec.objects.errorBandLowerBoundary.type, "path");
  assert.equal(lower.graphicSpec.objects.errorBandUpperBoundary, undefined);

  const both = lower.editErrorBandBoundary({
    stroke: "#7c3aed",
    strokeWidth: 3
  });
  assert.equal(
    both.graphicSpec.objects.errorBandLowerBoundary.items[0].properties.stroke,
    "#7c3aed"
  );
  assert.equal(
    both.graphicSpec.objects.errorBandUpperBoundary.items[0].properties.stroke,
    "#7c3aed"
  );
  assert.deepEqual(
    both.trace.children.at(-1).children.map(child => child.op),
    ["rematerializeErrorBandBoundary", "createErrorBandBoundary"]
  );
});

test("validates boundary selection and appearance atomically", () => {
  const before = errorBand();
  assert.throws(() => before.editErrorBand({}), /requires at least one/);
  assert.throws(() => before.editErrorBandBoundary({ stroke: "red", boundary: "middle" }), /Unsupported/);
  assert.throws(() => before.editErrorBandBoundary({ strokeWidth: -1 }), /strokeWidth/);
  assert.throws(() => before.editErrorBandBoundary({ target: "missing", stroke: "red" }), /Unknown/);
  assert.equal(before.graphicSpec.objects.errorBandLowerBoundary, undefined);
});

test("revises statistical data and preserves stable boundary ownership", () => {
  const before = errorBand().editErrorBand({ boundaries: {} });
  const after = before.editErrorBand({
    statistics: { extent: "ci", level: 0.9 },
    boundaries: { stroke: "#334155", strokeWidth: 1.5 }
  });

  assert.equal(
    after.markConfigs.errorBand.errorBand.data,
    "errorBandIntervalDataRevision1"
  );
  assert.deepEqual(
    after.semanticSpec.layers
      .filter(layer => layer.id.startsWith("errorBand"))
      .map(layer => [layer.id, layer.data]),
    [
      ["errorBand", "errorBandIntervalDataRevision1"],
      ["errorBandLowerBoundary", "errorBandIntervalDataRevision1"],
      ["errorBandUpperBoundary", "errorBandIntervalDataRevision1"]
    ]
  );
  assert.equal(
    after.semanticSpec.datasets.find(
      dataset => dataset.id === "errorBandIntervalDataRevision1"
    ).transform[0].level,
    0.9
  );
  assert.equal(
    after.graphicSpec.objects.errorBandLowerBoundary.items[0].properties.stroke,
    "#334155"
  );
  assert.equal(before.semanticSpec.layers[0].data, "errorBandIntervalData");
});

test("treats boundaries false as an idempotent desired-state disable", () => {
  const enabled = errorBand().editErrorBand({ boundaries: {} });
  const disabled = enabled.editErrorBand({ boundaries: false });
  const repeated = disabled.editErrorBand({ boundaries: false });

  assert.equal(disabled.semanticSpec.layers.length, 1);
  assert.equal(disabled.graphicSpec.objects.errorBandLowerBoundary, undefined);
  assert.deepEqual(repeated.semanticSpec, disabled.semanticSpec);
  assert.deepEqual(repeated.graphicSpec, disabled.graphicSpec);
});

test("revises source, position, interval roles, orientation, and boundaries together", () => {
  const before = errorBand()
    .editErrorBand({ boundaries: {} })
    .createData({ id: "revised", values: [
      { time: 1, cohort: "A", measure: 2 },
      { time: 1, cohort: "A", measure: 4 },
      { time: 2, cohort: "A", measure: 5 },
      { time: 2, cohort: "A", measure: 7 },
      { time: 1, cohort: "B", measure: 6 },
      { time: 1, cohort: "B", measure: 8 },
      { time: 2, cohort: "B", measure: 9 },
      { time: 2, cohort: "B", measure: 11 }
    ] });
  const after = before.editErrorBand({
    target: "errorBand",
    data: "revised",
    x: { field: "measure", center: "median", extent: "iqr" },
    y: { field: "time", fieldType: "quantitative" },
    groupBy: "cohort"
  });
  const owner = after.semanticSpec.layers.find(layer => layer.id === "errorBand");
  const lower = after.semanticSpec.layers.find(
    layer => layer.id === "errorBandLowerBoundary"
  );
  const transform = after.semanticSpec.datasets.find(
    dataset => dataset.id === owner.data
  ).transform[0];

  assert.equal(owner.id, "errorBand");
  assert.equal(owner.encoding.x.field, "__errorBand_lower");
  assert.equal(owner.encoding.x2.field, "__errorBand_upper");
  assert.equal(owner.encoding.y.field, "time");
  assert.equal(owner.encoding.group.field, "cohort");
  assert.equal(lower.encoding.x.field, "__errorBand_lower");
  assert.equal(lower.encoding.y.field, "time");
  assert.equal(lower.encoding.group.field, "cohort");
  assert.equal(transform.field, "measure");
  assert.deepEqual(transform.groupBy, ["time", "cohort"]);
  assert.equal(transform.center, "median");
  assert.equal(transform.extent, "iqr");
  assert.equal(after.markConfigs.errorBand.errorBand.orientation, "horizontal");
  assert.equal(after.markConfigs.errorBand.errorBand.source, "revised");
  assert.equal(before.markConfigs.errorBand.errorBand.orientation, "vertical");
});

test("converts statistical and explicit error-band roles without replacing the owner", () => {
  const statistical = errorBand().createData({ id: "explicit", values: [
    { year: 2000, group: "A", center: 5, low: 3, high: 7 },
    { year: 2001, group: "A", center: 8, low: 6, high: 10 }
  ] });
  const explicit = statistical.editErrorBand({
    data: "explicit",
    x: { field: "year", fieldType: "temporal" },
    y: { center: "center", lower: "low", upper: "high" }
  });

  assert.equal(explicit.semanticSpec.layers[0].id, "errorBand");
  assert.equal(explicit.semanticSpec.layers[0].data, "explicit");
  assert.equal(explicit.semanticSpec.datasets.some(
    dataset => dataset.id === "errorBandIntervalData"
  ), false);
  assert.equal(explicit.semanticSpec.layers[0].encoding.y.field, "low");
  assert.equal(explicit.semanticSpec.layers[0].encoding.y2.field, "high");
  assert.equal(explicit.markConfigs.errorBand.errorBand.intervalMode, "explicit");
  assert.equal(explicit.markConfigs.errorBand.errorBand.intervalField, undefined);
  assert.equal(explicit.markConfigs.errorBand.errorBand.centerField, "center");
});

test("replays a band highlight after an immutable role revision", () => {
  const before = errorBand()
    .highlightMarks({
      target: "errorBand",
      select: { field: "group", op: "eq", value: "A" },
      fill: "#dc2626",
      dimOthers: { opacity: 0.2 }
    })
    .createData({ id: "revised", values: rows.map(row => ({
      ...row, revised: row.value + 5
    })) });
  const after = before.editErrorBand({
    data: "revised",
    x: { field: "year", fieldType: "temporal" },
    y: { field: "revised" },
    groupBy: "group"
  });

  assert.equal(
    after.materializationConfigs.selections.errorBandSelection.target,
    "errorBand"
  );
  assert.equal(after.graphicSpec.objects.errorBand.items.some(
    item => item.properties.fill === "#dc2626"
  ), true);
  assert.equal(after.graphicSpec.objects.errorBand.items.some(
    item => item.properties.opacity === 0.2
  ), true);
});

test("rejects invalid band roles atomically", () => {
  const before = errorBand();
  const snapshot = JSON.stringify(before);

  assert.throws(
    () => before.editErrorBand({ data: "missing", opacity: 0.4 }),
    /Unknown error-band dataset/
  );
  assert.throws(
    () => before.editErrorBand({ groupBy: "year" }),
    /must differ from the independent position field/
  );
  assert.equal(JSON.stringify(before), snapshot);
});
