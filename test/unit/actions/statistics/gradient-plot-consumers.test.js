import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 2 }),
  Object.freeze({ group: "A", value: 3 }),
  Object.freeze({ group: "B", value: 2 }),
  Object.freeze({ group: "B", value: 4 }),
  Object.freeze({ group: "B", value: 6 })
]);

const facetedRows = Object.freeze([
  Object.freeze({ panel: "P1", group: "A", value: 1 }),
  Object.freeze({ panel: "P1", group: "A", value: 2 }),
  Object.freeze({ panel: "P1", group: "B", value: 3 }),
  Object.freeze({ panel: "P1", group: "B", value: 4 }),
  Object.freeze({ panel: "P2", group: "A", value: 5 }),
  Object.freeze({ panel: "P2", group: "A", value: 6 }),
  Object.freeze({ panel: "P2", group: "B", value: 7 }),
  Object.freeze({ panel: "P2", group: "B", value: 8 })
]);

function gradient() {
  return chart()
    .createCanvas({ width: 420, height: 320 })
    .createData({ id: "rows", values: rows })
    .createGradientPlot({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 0.5, steps: 8 },
      guides: false
    });
}

test("selects gradient plots at final category-strip grain", () => {
  const selected = gradient().selectMarks({ field: "group", op: "eq", value: "B" });
  const config = selected.materializationConfigs.selections.gradientPlotSelection;

  assert.equal(config.target, "gradientPlot");
  assert.deepEqual(config.selector, {
    grain: "item",
    field: "group",
    op: "eq",
    value: "B"
  });
});

test("preserves structured paint for opacity and offset highlights", () => {
  const original = gradient();
  const fills = original.graphicSpec.objects.gradientPlot.items.map(
    item => item.properties.fill
  );
  const highlighted = original.highlightMarks({
    select: { field: "group", op: "eq", value: "B" },
    opacity: 0.6,
    offset: { x: 3, y: -2 },
    bringToFront: false
  });
  const items = highlighted.graphicSpec.objects.gradientPlot.items;

  assert.deepEqual(items[0].properties.fill, fills[0]);
  assert.deepEqual(items[1].properties.fill, fills[1]);
  assert.equal(items[1].properties.opacity, 0.6);
  assert.equal(
    items[1].properties.x,
    original.graphicSpec.objects.gradientPlot.items[1].properties.x + 3
  );
  assert.equal(
    items[1].properties.y,
    original.graphicSpec.objects.gradientPlot.items[1].properties.y - 2
  );

  const replaced = original.highlightMarks({
    select: { field: "group", op: "eq", value: "B" },
    fill: "#dc2626",
    bringToFront: false
  });
  assert.equal(replaced.graphicSpec.objects.gradientPlot.items[1].properties.fill, "#dc2626");
  assert.equal(original.graphicSpec.objects.gradientPlot.items[1].properties.fill.type, "linear-gradient");
});

test("reapplies gradient highlights after scale rematerialization", () => {
  const normal = gradient();
  const highlighted = normal.highlightMarks({
    select: { field: "group", op: "eq", value: "B" },
    opacity: 0.6,
    offset: { x: 3 },
    bringToFront: false
  });
  const edited = highlighted.editScale({ id: "y", reverse: true });
  const baseline = normal.editScale({ id: "y", reverse: true });
  const selected = edited.graphicSpec.objects.gradientPlot.items[1];

  assert.equal(selected.properties.fill.type, "linear-gradient");
  assert.equal(selected.properties.opacity, 0.6);
  assert.equal(
    selected.properties.x,
    baseline.graphicSpec.objects.gradientPlot.items[1].properties.x + 3
  );
  assert.equal(
    selected.properties.y,
    baseline.graphicSpec.objects.gradientPlot.items[1].properties.y
  );
});

test("replays gradient profiles inside immutable facet children", () => {
  const base = chart()
    .createCanvas({ width: 300, height: 220 })
    .createData({ id: "rows", values: facetedRows })
    .createGradientPlot({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 0.5, steps: 8 },
      guides: false
    });
  const faceted = base.facet({ field: "panel" });
  const children = Object.values(faceted.children);

  assert.equal(children.length, 2);
  for (const child of children) {
    const config = child.markConfigs.gradientPlot.gradientPlot;
    const profile = child.semanticSpec.datasets.find(
      dataset => dataset.id === config.profileId
    );
    const source = child.semanticSpec.datasets.find(
      dataset => dataset.id === config.source
    );
    assert.equal(profile.source, source.id);
    assert.equal(profile.values.length, 2);
    assert.equal(child.semanticSpec.layers.find(
      layer => layer.id === "gradientPlot"
    ).data, profile.id);
    assert.equal(child.semanticSpec.layers.find(
      layer => layer.id === "gradientPlotCenter"
    ).data, profile.id);
    assert.equal(child.graphicSpec.objects.gradientPlot.items.length, 2);
    assert.equal(child.graphicSpec.objects.gradientPlotCenter.items.length, 2);
    assert.ok(child.trace.children.at(-1).children.some(
      node => node.op === "rebindGradientPlotProfile"
    ));
  }
  assert.notEqual(
    children[0].markConfigs.gradientPlot.gradientPlot.profileId,
    children[1].markConfigs.gradientPlot.gradientPlot.profileId
  );
  assert.equal(base.markConfigs.gradientPlot.gradientPlot.profileId, "gradientPlotProfileData");
  assert.equal(base.graphicSpec.objects.gradientPlot.items.length, 2);
});
