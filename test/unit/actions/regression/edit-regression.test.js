import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { loadCars } from "../../../support/data.js";

function regressionProgram(options = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 40, right: 190, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
    .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
    .encodeColor({ field: "Origin" })
    .filterMarks({ field: "Origin", op: "oneOf", values: ["Japan", "USA"] })
    .createRegression(options);
}

test("revises regression statistics once and rebinds every owned consumer", () => {
  const before = regressionProgram();
  const edited = before.editRegression({
    method: "polynomial",
    degree: 2,
    band: { color: "#a78bfa", opacity: 0.16 },
    line: { strokeWidth: 4 }
  });
  const direct = regressionProgram({
    method: "polynomial",
    degree: 2,
    band: { color: "#a78bfa", opacity: 0.16 },
    line: { strokeWidth: 4 }
  });
  const revision = edited.semanticSpec.datasets.find(
    dataset => dataset.id === "pointsRegressionDataRevision1"
  );

  assert.ok(revision);
  assert.deepEqual(revision.values, direct.semanticSpec.datasets.at(-1).values);
  assert.equal(
    edited.semanticSpec.datasets.some(dataset => dataset.id === "pointsRegressionData"),
    false
  );
  assert.equal(
    edited.semanticSpec.layers.find(layer => layer.id === "pointsRegressionBands").data,
    revision.id
  );
  assert.equal(
    edited.semanticSpec.layers.find(layer => layer.id === "pointsRegressionLines").data,
    revision.id
  );
  assert.deepEqual(
    edited.graphicSpec.objects.pointsRegressionBands,
    direct.graphicSpec.objects.pointsRegressionBands
  );
  assert.deepEqual(
    edited.graphicSpec.objects.pointsRegressionLines,
    direct.graphicSpec.objects.pointsRegressionLines
  );
  assert.equal(before.semanticSpec.datasets.at(-1).id, "pointsRegressionData");
});

test("keeps data for appearance-only edits and reconciles optional bands", () => {
  const before = regressionProgram();
  const styled = before.editRegression({
    band: { opacity: 0.12 },
    line: { strokeWidth: 5 }
  });
  assert.equal(styled.semanticSpec.datasets.at(-1).id, "pointsRegressionData");
  assert.equal(
    styled.graphicSpec.objects.pointsRegressionBands.items[0].properties.opacity,
    0.12
  );

  const loess = styled.editRegression({ method: "loess", span: 0.55 });
  assert.equal(loess.graphicSpec.objects.pointsRegressionBands, undefined);
  assert.equal(
    loess.semanticSpec.layers.some(layer => layer.id === "pointsRegressionBands"),
    false
  );
  const restored = loess.editRegression({ method: "linear", band: {} });
  assert.ok(restored.graphicSpec.objects.pointsRegressionBands);
  assert.equal(
    restored.semanticSpec.layers.find(layer => layer.id === "pointsRegressionBands").data,
    "pointsRegressionDataRevision2"
  );
});

test("resolves owners and rejects invalid composite edits atomically", () => {
  const program = regressionProgram();
  assert.throws(
    () => program.editRegression({ method: "loess", band: { opacity: 0.2 } }),
    /does not support a band/
  );
  assert.throws(
    () => program.editRegression({ line: { strokeWidth: -1 } }),
    /strokeWidth/
  );
  assert.throws(
    () => program.editRegression({ target: "missing", line: { strokeWidth: 2 } }),
    /Unknown regression owner/
  );
  assert.equal(program.semanticSpec.datasets.at(-1).id, "pointsRegressionData");
});

test("revises regression data roles while preserving component and position identities", () => {
  const before = regressionProgram().createData({
    id: "observations",
    values: [
      { time: 1, value: 2 },
      { time: 2, value: 5 },
      { time: 3, value: 7 },
      { time: 4, value: 10 }
    ]
  });
  const ownerBefore = before.markConfigs.points.regression;
  const after = before.editRegression({
    data: "observations",
    x: "time",
    y: "value",
    groupBy: false
  });
  const ownerAfter = after.markConfigs.points.regression;
  const line = after.semanticSpec.layers.find(
    layer => layer.id === "pointsRegressionLines"
  );
  const band = after.semanticSpec.layers.find(
    layer => layer.id === "pointsRegressionBands"
  );
  const revised = after.semanticSpec.datasets.find(
    dataset => dataset.id === "pointsRegressionDataRevision1"
  );

  assert.equal(revised.source, "observations");
  assert.equal(revised.transform[0].x, "time");
  assert.equal(revised.transform[0].y, "value");
  assert.equal(revised.transform[0].groupBy, undefined);
  assert.equal(line.data, revised.id);
  assert.equal(band.data, revised.id);
  assert.equal(line.encoding.x.field, "time");
  assert.equal(line.encoding.y.field, "value");
  assert.equal(line.encoding.group, undefined);
  assert.equal(line.encoding.color, undefined);
  assert.equal(band.encoding.x.field, "time");
  assert.equal(band.encoding.group, undefined);
  assert.equal(line.encoding.x.scale, ownerBefore.xScale);
  assert.equal(line.encoding.y.scale, ownerBefore.yScale);
  assert.equal(band.coordinate, ownerBefore.coordinate);
  assert.equal(ownerAfter.lineId, ownerBefore.lineId);
  assert.equal(ownerAfter.bandId, ownerBefore.bandId);
  assert.equal(after.semanticSpec.layers.find(layer => layer.id === "points").data,
    before.semanticSpec.layers.find(layer => layer.id === "points").data);
  assert.equal(before.markConfigs.points.regression.source, "pointsFilteredData");
});

test("adds a revised regression group with a dedicated stable component scale", () => {
  const before = regressionProgram({ groupBy: undefined });
  const after = before.editRegression({ groupBy: "Cylinders" });
  const owner = after.markConfigs.points.regression;
  const line = after.semanticSpec.layers.find(
    layer => layer.id === "pointsRegressionLines"
  );
  const band = after.semanticSpec.layers.find(
    layer => layer.id === "pointsRegressionBands"
  );

  assert.equal(owner.colorScale, "pointsRegressionColor");
  assert.equal(line.encoding.group.field, "Cylinders");
  assert.equal(line.encoding.color.field, "Cylinders");
  assert.equal(line.encoding.color.scale, "pointsRegressionColor");
  assert.equal(band.encoding.group.field, "Cylinders");
  assert.ok(after.semanticSpec.scales.some(
    scale => scale.id === "pointsRegressionColor"
  ));
  assert.ok(after.graphicSpec.objects.pointsRegressionLines.items.length > 1);
});

test("rejects invalid regression data revisions before exposing a branch", () => {
  const before = regressionProgram();
  assert.throws(
    () => before.editRegression({ data: "missing" }),
    /Unknown source dataset/
  );
  assert.throws(
    () => before.editRegression({ x: "missing" }),
    /Field "missing" must contain a finite number/
  );
  assert.throws(
    () => before.editRegression({ groupBy: "" }),
    /Regression groupBy must be a non-empty string/
  );
  assert.equal(before.semanticSpec.datasets.at(-1).id, "pointsRegressionData");
});
