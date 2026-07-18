import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeRegressionRSquared,
  createReadmeAuthoringDemo,
  formatRegressionRSquared,
  README_STAGE_IDS
} from "../../examples/readme-authoring-sequence/program.js";
import {
  inspectReadmeGif,
  inspectReadmePng,
  README_DEMO_DURATION_MS,
  README_DEMO_HEIGHT,
  README_DEMO_MAX_BYTES,
  README_DEMO_WIDTH
} from "../../scripts/generate-readme-demo.js";
import { loadCars } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const gifPath = "docs/assets/images/readme-authoring-sequence.gif";
const pngPath = "docs/assets/images/readme-authoring-sequence.png";

function read(relative) {
  return readFileSync(path.join(root, relative));
}

test("builds the ordered immutable README authoring sequence", () => {
  const cars = loadCars();
  const { stages, finalProgram } = createReadmeAuthoringDemo(cars);

  assert.deepEqual(stages.map(stage => stage.id), README_STAGE_IDS);
  assert.equal(new Set(stages.map(stage => stage.program)).size, stages.length);
  assert.equal(stages.every(stage => Object.isFrozen(stage.program)), true);
  assert.equal(stages.at(-1).delayMs >= 1500, true);
  assert.equal(stages.reduce((sum, stage) => sum + stage.delayMs, 0), 15000);
  const firstChartIndex = README_STAGE_IDS.indexOf("size");
  assert.equal(firstChartIndex, README_STAGE_IDS.indexOf("y") + 1);
  assert.equal(README_STAGE_IDS.indexOf("guides"), firstChartIndex + 1);
  assert.equal(
    stages.slice(0, firstChartIndex).reduce((sum, stage) => sum + stage.delayMs, 0),
    1500
  );
  assert.equal(stages.slice(0, firstChartIndex).every(stage => stage.delayMs === 300), true);

  const topLevelActions = finalProgram.trace.children.map(node => node.op);
  assert.equal(topLevelActions.includes("createRegression"), true);
  assert.equal(topLevelActions.filter(op => op === "highlightMarks").length, 3);
  assert.equal(topLevelActions.at(-1), "annotateRegressionFit");
  const annotation = finalProgram.trace.children.at(-1);
  assert.equal(annotation.children.some(node => node.op === "createGraphics"), true);
  assert.equal(annotation.children.some(node => node.op === "editGraphics"), true);

  const regression = finalProgram.materializationConfigs.marks.points.regression;
  assert.equal(regression.lineId, "pointsRegressionLines");
  assert.equal(regression.bandId, "pointsRegressionBands");
  for (const target of ["points", regression.lineId, regression.bandId]) {
    assert.equal(
      Object.values(finalProgram.materializationConfigs.highlights)
        .some(highlight => highlight.target === target),
      true,
      target
    );
  }

  const source = finalProgram.semanticSpec.datasets.find(
    dataset => dataset.id === regression.source
  );
  const japan = source.values.filter(row => row.Origin === "Japan");
  const expected = formatRegressionRSquared(computeRegressionRSquared(japan, {
    x: regression.x,
    y: regression.y
  }));
  const annotationText = finalProgram.graphicSpec.objects
    .readmeFitAnnotationText.items.map(item => item.properties.text);
  assert.equal(annotationText.includes(expected), true);
  assert.equal(
    finalProgram.graphicSpec.objects.readmeFitAnnotationCard,
    undefined
  );
  assert.equal(
    finalProgram.graphicSpec.objects.readmeFitAnnotationText.items[0]
      .properties.fill,
    "#111827"
  );
  const highlightedPoint = finalProgram.graphicSpec.objects.points.items.at(-1);
  assert.equal(highlightedPoint.properties.strokeWidth, 0);
  const highlightedLine = finalProgram.graphicSpec.objects[regression.lineId]
    .items.at(-1);
  assert.equal(highlightedLine.properties.stroke, "#111827");
  assert.match(expected, /^R² = 0\.\d{2}$/);
});

test("handles zero-variance R-squared input explicitly", () => {
  const rows = [
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 }
  ];
  assert.equal(computeRegressionRSquared(rows, { x: "x", y: "y" }), undefined);
  assert.equal(formatRegressionRSquared(undefined), "R² = n/a");
});

test("keeps generated README GIF and PNG valid and referenced", () => {
  const gifBytes = read(gifPath);
  const pngBytes = read(pngPath);
  const gif = inspectReadmeGif(gifBytes);
  const png = inspectReadmePng(pngBytes);
  const readme = read("README.md").toString("utf8");

  assert.equal(gifBytes.length > 0, true);
  assert.equal(gifBytes.length <= README_DEMO_MAX_BYTES, true);
  assert.equal(pngBytes.length > 0, true);
  assert.deepEqual(
    { width: gif.width, height: gif.height },
    { width: README_DEMO_WIDTH, height: README_DEMO_HEIGHT }
  );
  assert.deepEqual(png, {
    width: README_DEMO_WIDTH,
    height: README_DEMO_HEIGHT
  });
  assert.equal(gif.frameCount, README_STAGE_IDS.length);
  assert.equal(gif.durationMs, README_DEMO_DURATION_MS);
  assert.match(readme, /\.\/docs\/assets\/images\/readme-authoring-sequence\.gif/);
});
