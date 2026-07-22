import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

function base() {
  return chart()
    .createCanvas({
      width: 360,
      height: 460,
      margin: { top: 140, right: 40, bottom: 70, left: 80 }
    })
    .createData({ values: loadCars() })
    .createBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" }
    });
}

const editOptions = Object.freeze({
  whisker: { type: "tukey", factor: 1 },
  width: { band: 0.5 },
  box: {
    fill: "#f28e2b",
    opacity: 0.82,
    stroke: "#9a3412",
    strokeWidth: 2
  },
  median: { stroke: "#431407", strokeWidth: 3 },
  outlier: { shape: "diamond", radius: 4, opacity: 0.9 }
});

test("revises one box summary and rebinds every owned component", () => {
  const before = base();
  const edited = before.editBoxPlot(editOptions);
  const direct = chart()
    .createCanvas({
      width: 360,
      height: 460,
      margin: { top: 140, right: 40, bottom: 70, left: 80 }
    })
    .createData({ values: loadCars() })
    .createBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" },
      ...editOptions
    });
  const summaryId = "boxPlotSummaryDataRevision1";
  const outlierId = "boxPlotOutlierDataRevision1";

  assert.equal(
    edited.semanticSpec.datasets.some(dataset => dataset.id === "boxPlotSummaryData"),
    false
  );
  assert.equal(
    edited.semanticSpec.datasets.some(dataset => dataset.id === "boxPlotOutlierData"),
    false
  );
  for (const id of [
    "boxPlot",
    "boxPlotWhisker",
    "boxPlotWhiskerLowerCap",
    "boxPlotWhiskerUpperCap",
    "boxPlotMedian"
  ]) {
    assert.equal(
      edited.semanticSpec.layers.find(layer => layer.id === id).data,
      summaryId
    );
  }
  assert.equal(
    edited.semanticSpec.layers.find(layer => layer.id === "boxPlotOutliers").data,
    outlierId
  );
  for (const id of ["boxPlot", "boxPlotWhisker", "boxPlotMedian", "boxPlotOutliers"]) {
    assert.deepEqual(edited.graphicSpec.objects[id], direct.graphicSpec.objects[id]);
  }
  assert.equal(before.markConfigs.boxPlot.boxPlot.whisker.factor, 1.5);
});

test("retains derived data for appearance and width-only edits", () => {
  const before = base();
  const edited = before.editBoxPlot({
    width: { band: 0.5 },
    box: { opacity: 0.6 },
    median: { strokeWidth: 2 },
    outlier: { radius: 5 }
  });

  assert.deepEqual(
    edited.semanticSpec.datasets.map(dataset => dataset.id),
    before.semanticSpec.datasets.map(dataset => dataset.id)
  );
  assert.ok(edited.graphicSpec.objects.boxPlot.items.every(
    item => item.properties.opacity === 0.6
  ));
  assert.deepEqual(
    edited.graphicSpec.objects.boxPlotMedian.items.map(item => item.properties.strokeWidth),
    [2, 2, 2]
  );
  assert.notDeepEqual(
    edited.graphicSpec.objects.boxPlot.items.map(item => item.properties.width),
    before.graphicSpec.objects.boxPlot.items.map(item => item.properties.width)
  );
});

test("reconciles outlier topology and validates the whole patch first", () => {
  const before = base();
  const hidden = before.editBoxPlot({ outliers: false });
  assert.equal(hidden.graphicSpec.objects.boxPlotOutliers, undefined);
  assert.equal(
    hidden.semanticSpec.layers.some(layer => layer.id === "boxPlotOutliers"),
    false
  );
  const restored = hidden.editBoxPlot({ outliers: true });
  assert.ok(restored.graphicSpec.objects.boxPlotOutliers);

  assert.throws(
    () => before.editBoxPlot({ whisker: { type: "minmax", factor: 1 } }),
    /do not accept factor/
  );
  assert.throws(
    () => before.editBoxPlot({ box: { opacity: 2 } }),
    /opacity/
  );
  assert.throws(
    () => before.editBoxPlot({ target: "missing", width: { band: 0.5 } }),
    /Unknown box-plot owner/
  );
  assert.equal(before.semanticSpec.datasets.at(-1).id, "boxPlotOutlierData");
});

test("revises box source and position roles while retaining stable components", () => {
  const rows = loadCars();
  const alternate = rows.map((row, index) => ({
    ...row,
    Miles_per_Gallon: row.Miles_per_Gallon == null
      ? row.Miles_per_Gallon
      : row.Miles_per_Gallon + (index % 3)
  }));
  const before = chart()
    .createCanvas({
      width: 360,
      height: 460,
      margin: { top: 140, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createData({ id: "alternate", values: alternate })
    .createBoxPlot({
      id: "distribution",
      data: "cars",
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Miles_per_Gallon" },
      guides: {}
  });
  const sourceEdited = before.editBoxPlot({ data: "alternate" });
  const highlighted = sourceEdited.highlightMarks({
    select: { field: "Origin", op: "eq", value: "USA" },
    opacity: 0.4,
    bringToFront: false
  });
  const flipped = highlighted.editBoxPlot({
    x: { field: "Miles_per_Gallon", fieldType: "quantitative" },
    y: { field: "Origin", fieldType: "nominal" }
  });

  assert.equal(sourceEdited.markConfigs.distribution.boxPlot.source, "alternate");
  assert.equal(
    sourceEdited.markConfigs.distribution.boxPlot.summaryId,
    "distributionSummaryDataRevision1"
  );
  assert.equal(flipped.markConfigs.distribution.boxPlot.orientation, "horizontal");
  assert.equal(
    flipped.markConfigs.distribution.boxPlot.summaryId,
    "distributionSummaryDataRevision2"
  );
  assert.deepEqual(
    flipped.semanticSpec.layers.map(layer => layer.id),
    sourceEdited.semanticSpec.layers.map(layer => layer.id)
  );
  for (const id of [
    "distribution",
    "distributionWhisker",
    "distributionWhiskerLowerCap",
    "distributionWhiskerUpperCap",
    "distributionMedian"
  ]) {
    const layer = flipped.semanticSpec.layers.find(item => item.id === id);
    assert.equal(layer.data, "distributionSummaryDataRevision2");
    assert.equal(layer.encoding.x.scale, "y");
    assert.equal(layer.encoding.y.scale, "x");
    assert.ok(flipped.graphicSpec.objects[id].items.length > 0);
  }
  assert.equal(flipped.semanticSpec.guides.axis.x.scale, "y");
  assert.equal(flipped.semanticSpec.guides.axis.x.title, "Miles_per_Gallon");
  assert.equal(flipped.semanticSpec.guides.axis.y.scale, "x");
  assert.equal(flipped.semanticSpec.guides.axis.y.title, "Origin");
  assert.equal(flipped.semanticSpec.guides.grid.horizontal, undefined);
  assert.equal(flipped.semanticSpec.guides.grid.vertical.scale, "y");
  assert.equal(
    flipped.graphicSpec.objects.distribution.items.find(
      item => item.properties.opacity === 0.4
    ) !== undefined,
    true
  );
  assert.equal(
    flipped.materializationConfigs.highlights.distributionSelection.target,
    "distribution"
  );
  assert.equal(before.markConfigs.distribution.boxPlot.source, "cars");
  assert.equal(alternate[0].Miles_per_Gallon, rows[0].Miles_per_Gallon);
});

test("preflights invalid box role revisions and accepts equivalent role calls", () => {
  const before = base();
  const equivalent = before.editBoxPlot({
    data: "data",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon", fieldType: "quantitative" }
  });
  assert.deepEqual(
    equivalent.semanticSpec.datasets.map(dataset => dataset.id),
    before.semanticSpec.datasets.map(dataset => dataset.id)
  );
  assert.throws(
    () => before.editBoxPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Name", fieldType: "nominal" }
    }),
    /one categorical axis and one quantitative axis/
  );
  assert.throws(
    () => before.editBoxPlot({ data: "missing" }),
    /Unknown box-plot data/
  );
  assert.equal(before.markConfigs.boxPlot.boxPlot.summaryId, "boxPlotSummaryData");
  assert.equal(
    before.semanticSpec.layers.find(layer => layer.id === "boxPlot").encoding.x.scale,
    "x"
  );
});
