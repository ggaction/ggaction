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
