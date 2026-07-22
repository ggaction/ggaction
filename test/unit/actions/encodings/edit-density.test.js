import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../charts/cars-density-area/reference-values.js";
import { loadCars } from "../../../support/data.js";
import { linearPathCommands } from "../../../support/path.js";

function densityProgram(id = "densities") {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id, opacity: 0.5 })
    .encodeDensity({
      target: id,
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6
    });
}

function categoricalDensityProgram() {
  return chart()
    .createCanvas({ width: 520, height: 360, margin: 60 })
    .createData({ id: "values", values: [
      { category: "A", split: "early", value: 1 },
      { category: "A", split: "late", value: 2 },
      { category: "B", split: "early", value: 3 },
      { category: "B", split: "late", value: 4 }
    ] })
    .createAreaMark({ id: "violins" })
    .encodeDensity({
      field: "value",
      groupBy: "category",
      bandwidth: 1,
      extent: [0, 5],
      steps: 12,
      placement: { type: "category" }
    });
}

test("creates, rebinds, and materializes one immutable density revision", () => {
  const before = densityProgram();
  const after = before.editDensity({
    target: "densities",
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
  const expected = createCarsDensityAreaValues(loadCars(), {
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
  const revised = after.semanticSpec.datasets[1];

  assert.deepEqual(after.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityDataRevision1"
  ]);
  assert.equal(after.semanticSpec.layers[0].data, revised.id);
  assert.deepEqual(revised.transform[0], {
    type: "density",
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.9,
    extent: "auto",
    steps: 100,
    kernel: "triangular",
    normalization: "count",
    as: ["Acceleration_value", "Acceleration_density"],
    resolve: "shared",
    resolved: {
      bandwidth: 0.9,
      extent: [8, 24.8]
    }
  });
  assert.deepEqual(revised.values, expected.densityRows);
  assert.deepEqual(after.resolvedScales.y.domain, [0, 40]);
  assert.deepEqual(
    after.graphicSpec.objects.densities.items.map(
      child => child.properties.commands
    ),
    expected.areas.map(area => linearPathCommands(area.points, { close: true }))
  );
  assert.deepEqual(before.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData"
  ]);
  assert.equal(before.semanticSpec.layers[0].data, "densitiesDensityData");
  assert.notEqual(after.semanticSpec, before.semanticSpec);
});

test("records explicit revision, rebind, release, and materialization actions", () => {
  const program = densityProgram().editDensity({ kernel: "uniform" });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createDensityData",
    "rebindLayerData",
    "releaseDerivedData",
    "rematerializeAreaMark"
  ]);
  assert.deepEqual(
    node.children[2].children.map(child => child.op),
    ["editSemantic"]
  );
});

test("increments revision ids and preserves omitted density decisions", () => {
  const first = densityProgram().editDensity({ steps: 25 });
  const second = first.editDensity({ extent: [10, 20] });
  const transform = second.semanticSpec.datasets[1].transform[0];

  assert.equal(second.semanticSpec.datasets[1].id, "densitiesDensityDataRevision2");
  assert.equal(transform.steps, 25);
  assert.deepEqual(transform.extent, [10, 20]);
  assert.equal(transform.bandwidth, 0.6);
  assert.equal(transform.kernel, "gaussian");
  assert.equal(transform.normalization, "unit");
  assert.equal(first.semanticSpec.datasets[1].id, "densitiesDensityDataRevision1");
});

test("keeps auto intent while each density revision owns resolved parameters", () => {
  const initial = chart()
    .createCanvas({ width: 360, height: 240, margin: 30 })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id: "densities" })
    .encodeDensity({
      target: "densities",
      field: "Acceleration",
      groupBy: "Origin"
    });
  const revised = initial.editDensity({ target: "densities", steps: 24 });
  const before = initial.semanticSpec.datasets[1].transform[0];
  const after = revised.semanticSpec.datasets[1].transform[0];

  assert.equal(before.bandwidth, "auto");
  assert.equal(after.bandwidth, "auto");
  assert.equal(before.extent, "auto");
  assert.equal(after.extent, "auto");
  assert.deepEqual(after.resolved, before.resolved);
  assert.notEqual(after.resolved, before.resolved);
  assert.equal(after.steps, 24);
});

test("retains a previous revision while another layer still consumes it", () => {
  const shared = densityProgram()
    .createPointMark({ id: "samples", data: "densitiesDensityData" })
    .encodeX({
      target: "samples",
      field: "Acceleration_value",
      scale: { id: "x", nice: false, zero: false }
    })
    .encodeY({
      target: "samples",
      field: "Acceleration_density",
      scale: { id: "y", nice: true, zero: true }
    });
  const beforeY = shared.graphicSpec.objects.samples.items.map(
    child => child.properties.y
  );
  const revised = shared.editDensity({
    target: "densities",
    normalization: "count"
  });
  const node = revised.trace.children.at(-1);

  assert.deepEqual(revised.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData",
    "densitiesDensityDataRevision1"
  ]);
  assert.equal(
    revised.semanticSpec.layers.find(layer => layer.id === "samples").data,
    "densitiesDensityData"
  );
  assert.deepEqual(node.children[2].children, []);
  assert.deepEqual(node.children.slice(3).map(child => child.op), [
    "rematerializeAreaMark",
    "rematerializePointMark"
  ]);
  assert.notDeepEqual(
    revised.graphicSpec.objects.samples.items.map(
      child => child.properties.y
    ),
    beforeY
  );
});

test("validates selection and edits atomically", () => {
  const before = densityProgram();
  assert.throws(() => before.editDensity({}), /at least one density option/);
  assert.throws(
    () => before.editDensity({ target: "missing", bandwidth: 1 }),
    /Unknown density area target/
  );
  assert.throws(
    () => before.editDensity({ kernel: "round" }),
    /Unsupported density kernel/
  );
  assert.throws(
    () => before.editDensity({ normalization: "probability" }),
    /Unsupported density normalization/
  );
  assert.throws(
    () => before.editDensity({ bandwidth: 0 }),
    /positive finite/
  );
  assert.throws(
    () => before.editDensity({ extra: true }),
    /Unknown editDensity option/
  );
  assert.deepEqual(before.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData"
  ]);

  const ambiguous = before
    .createAreaMark({ id: "other", data: "cars" })
    .encodeDensity({ target: "other", field: "Acceleration" })
    ._withContext({ currentMark: undefined });
  assert.throws(
    () => ambiguous.editDensity({ steps: 20 }),
    /target is ambiguous/
  );
});

test("revises categorical width and split without replacing position roles", () => {
  const before = categoricalDensityProgram();
  const after = before.editDensity({
    placement: {
      type: "category",
      split: { field: "split", domain: ["early", "late"] },
      width: { band: 0.5, resolve: "independent" }
    }
  });
  const transform = after.semanticSpec.datasets[1].transform[0];

  assert.equal(after.semanticSpec.datasets[1].id, "violinsDensityDataRevision1");
  assert.deepEqual(transform.placement, {
    type: "category",
    channel: "x",
    categoryField: "category",
    width: { band: 0.5, resolve: "independent" },
    split: { field: "split", domain: ["early", "late"] }
  });
  assert.equal(after.graphicSpec.objects.violins.items.length, 4);
  assert.deepEqual(after.semanticSpec.layers[0].encoding, before.semanticSpec.layers[0].encoding);
  assert.equal(before.graphicSpec.objects.violins.items.length, 2);
});

test("transitions category placement to baseline and back without stale scales", () => {
  const category = categoricalDensityProgram();
  const baseline = category.editDensity({ placement: { type: "baseline" } });
  const restored = baseline.editDensity({ placement: { type: "category" } });

  assert.equal(baseline.semanticSpec.datasets[1].transform[0].placement, undefined);
  assert.deepEqual(baseline.semanticSpec.layers[0].encoding, {
    group: { field: "category", fieldType: "nominal" },
    x: { field: "value_value", fieldType: "quantitative", scale: "x" },
    y: { field: "value_density", fieldType: "quantitative", scale: "y" }
  });
  assert.deepEqual(baseline.semanticSpec.scales.map(scale => scale.type), [
    "linear", "linear"
  ]);
  assert.deepEqual(restored.semanticSpec.layers[0].encoding, {
    group: { field: "category", fieldType: "nominal" },
    x: { field: "category", fieldType: "nominal", scale: "x" },
    y: { field: "value_value", fieldType: "quantitative", scale: "y" }
  });
  assert.deepEqual(restored.semanticSpec.scales.map(scale => scale.type), [
    "band", "linear"
  ]);
  assert.deepEqual(restored.semanticSpec.datasets.map(dataset => dataset.id), [
    "values", "violinsDensityDataRevision2"
  ]);
  assert.equal(category.semanticSpec.scales[0].type, "band");
});

test("edits the category scale through placement while preserving its id", () => {
  const before = categoricalDensityProgram();
  const after = before.editDensity({
    placement: {
      type: "category",
      scale: { paddingInner: 0.2, paddingOuter: 0.1 }
    }
  });

  assert.equal(after.semanticSpec.layers[0].encoding.x.scale, "x");
  assert.equal(after.semanticSpec.scales[0].paddingInner, 0.2);
  assert.equal(after.semanticSpec.scales[0].paddingOuter, 0.1);
  assert.throws(
    () => before.editDensity({
      placement: { type: "category", scale: { id: "category" } }
    }),
    /cannot change its id/
  );
  assert.equal(before.semanticSpec.scales[0].paddingInner, 0);
});

test("revises density source and field while preserving output and position identities", () => {
  const before = densityProgram()
    .createData({ id: "observations", values: [
      { cohort: "A", value: 1 },
      { cohort: "A", value: 2 },
      { cohort: "B", value: 3 },
      { cohort: "B", value: 5 }
    ] });
  const layerBefore = before.semanticSpec.layers[0];
  const after = before.editDensity({
    source: "observations",
    field: "value",
    groupBy: false
  });
  const layerAfter = after.semanticSpec.layers[0];
  const revised = after.semanticSpec.datasets.find(
    dataset => dataset.id === "densitiesDensityDataRevision1"
  );

  assert.equal(revised.source, "observations");
  assert.equal(revised.transform[0].field, "value");
  assert.equal(revised.transform[0].groupBy, undefined);
  assert.deepEqual(revised.transform[0].as, [
    "Acceleration_value", "Acceleration_density"
  ]);
  assert.equal(layerAfter.encoding.group, undefined);
  assert.equal(layerAfter.encoding.x.field, layerBefore.encoding.x.field);
  assert.equal(layerAfter.encoding.y.field, layerBefore.encoding.y.field);
  assert.equal(layerAfter.encoding.x.scale, layerBefore.encoding.x.scale);
  assert.equal(layerAfter.encoding.y.scale, layerBefore.encoding.y.scale);
  assert.equal(layerAfter.coordinate, layerBefore.coordinate);
  assert.equal(before.semanticSpec.layers[0].data, "densitiesDensityData");
});

test("moves category placement and grouping color to a revised group field", () => {
  const before = categoricalDensityProgram()
    .encodeColor({ target: "violins", field: "category" });
  const colorScale = before.semanticSpec.layers[0].encoding.color.scale;
  const after = before.editDensity({ groupBy: "split" });
  const layer = after.semanticSpec.layers[0];
  const transform = after.semanticSpec.datasets[1].transform[0];

  assert.equal(transform.groupBy, "split");
  assert.equal(transform.placement.categoryField, "split");
  assert.equal(layer.encoding.group.field, "split");
  assert.equal(layer.encoding.color.field, "split");
  assert.equal(layer.encoding.color.scale, colorScale);
  assert.equal(layer.encoding.x.field, "split");
  assert.equal(after.graphicSpec.objects.violins.items.length, 2);
  assert.equal(new Set(
    after.graphicSpec.objects.violins.items.map(item => item.properties.fill)
  ).size, 2);
});

test("removes group-owned color and rejects invalid density provenance atomically", () => {
  const colored = densityProgram()
    .encodeColor({ target: "densities", field: "Origin" })
    .createLegend({ target: "densities" });
  const ungrouped = colored.editDensity({ groupBy: false });

  assert.equal(ungrouped.semanticSpec.layers[0].encoding.group, undefined);
  assert.equal(ungrouped.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(ungrouped.semanticSpec.guides.legend, undefined);
  assert.throws(
    () => colored.editDensity({ source: "missing" }),
    /Unknown source dataset/
  );
  assert.throws(
    () => colored.editDensity({ field: "missing" }),
    /at least one valid field\/group row/
  );
  assert.throws(
    () => colored.editDensity({ groupBy: "" }),
    /Density groupBy must be a non-empty string/
  );
  assert.equal(colored.semanticSpec.layers[0].data, "densitiesDensityData");
});
