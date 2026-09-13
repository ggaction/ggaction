import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { ACTION_INDEX } from "../support/action-contracts.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares exact Full-only derived editing unions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-derived-edit-types-"));
  try {
    const file = path.join(directory, "derived-editing.mts");
    await writeFile(file, `
import type {
  ChartProgram,
  DerivedDataDependents,
  EditCompleteDataOptions,
  EditDerivedDataOptions,
  EditSummaryDataOptions,
  RequestedDatasetTransform
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const policy: DerivedDataDependents = "recompute";
const computed: RequestedDatasetTransform = {
  type: "computed", as: "z", expression: { field: "x" }
};
const generic: EditDerivedDataOptions = {
  target: "computed", definition: computed, dependents: policy
};
const complete: EditCompleteDataOptions = {
  target: "completed", values: [1, 2, 3]
};
const summary: EditSummaryDataOptions = {
  target: "summary", weight: false
};
void generic;
void complete;
void summary;
p.editDerivedData(generic);
p.editComputedData({ target: "computed", as: "result" });
p.editFilteredData({ target: "filtered", range: { min: 0, max: 1 } });
p.editFoldData({ target: "fold", fields: ["a", "b"] });
p.editSummaryData({ target: "summary", aggregates: [{ op: "mean", field: "x", as: "mean" }] });
p.editBinData({ target: "bins", boundaries: [0, 1], weight: false });
p.editTimeUnitData({ target: "bucket", unit: "week", weekRule: "iso", weekStartsOn: 1 });
p.editWindowData({ target: "window", operations: [{ op: "rank", as: "rank" }] });
p.editDensityData({ target: "density", bandwidth: "auto", weight: false });
p.editStackData({ target: "stack", mode: "fill" });
p.editRegressionData({ target: "fit", method: "polynomial", degree: 2 });
p.editIntervalData({ target: "interval", center: "median", extent: "iqr" });
p.editECDFData({ target: "ecdf", weight: false });
p.editNormalizedData({ target: "normalized", method: "zscore", variance: "sample" });
p.editCompleteData({ target: "completed", sequence: { start: 0, end: 2, step: 1 } });
p.editImputedData({ target: "imputed", method: "constant", value: null });
p.editBin2DData({ target: "cells", bins: 4, dependents: "recompute" });
// @ts-expect-error target is mandatory for new focused editors
p.editComputedData({ as: "result" });
// @ts-expect-error generic definitions cannot replace their source
p.editDerivedData({ target: "computed", definition: { type: "computed", source: "raw", as: "z", expression: { field: "x" } } });
// @ts-expect-error horizon is chart-owned and not in the editable transform union
const horizon: RequestedDatasetTransform = { type: "horizon" };
// @ts-expect-error statistical reference data is chart-owned and not editable
const statisticalReference: RequestedDatasetTransform = { type: "statisticalReference", target: "mean" };
// @ts-expect-error dependents is a closed policy
p.editFoldData({ target: "fold", fields: ["a"], dependents: "cascade" });
// @ts-expect-error filter modes are mutually exclusive
p.editFilteredData({ target: "filtered", oneOf: [1], range: { min: 0, max: 1 } });
// @ts-expect-error Complete values and sequence are mutually exclusive
p.editCompleteData({ target: "completed", values: [1], sequence: { start: 0, end: 1, step: 1 } });
// @ts-expect-error Full only
basic.editComputedData({ target: "computed", as: "z" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("publishes every derived editor as Current and renders a revised owner", async t => {
  const names = [
    "editDerivedData", "editComputedData", "editFilteredData", "editFoldData",
    "editSummaryData", "editBinData", "editTimeUnitData", "editWindowData",
    "editDensityData", "editStackData", "editRegressionData",
    "editIntervalData", "editECDFData", "editNormalizedData",
    "editCompleteData", "editImputedData"
  ];
  for (const name of names) {
    assert.equal(
      ACTION_INDEX.actions.some(action => action.name === name),
      true,
      name
    );
    assert.equal(
      ACTION_INDEX.plannedActions.some(action => action.name === name),
      false,
      name
    );
  }

  const before = chart()
    .createCanvas({ width: 240, height: 180, margin: 30 })
    .createData({ id: "raw", values: [
      { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }
    ] })
    .createComputedData({
      id: "scaled", source: "raw", as: "scaled",
      expression: {
        op: "multiply", left: { field: "x" }, right: { constant: 2 }
      }
    })
    .createPointMark({ id: "points", data: "scaled" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "scaled" });
  const after = before.editComputedData({
    target: "scaled",
    as: "tripled",
    expression: {
      op: "multiply", left: { field: "x" }, right: { constant: 3 }
    }
  });
  const current = after.materializationConfigs.data.computed.scaled.current;
  assert.match(current, /^scaledComputedDataRevision1$/);
  assert.equal(after.semanticSpec.layers[0].data, current);
  assert.equal(after.semanticSpec.layers[0].encoding.y.field, "tripled");
  assert.deepEqual(
    after.semanticSpec.datasets.find(dataset => dataset.id === current).values
      .map(row => row.tripled),
    [3, 6, 9]
  );
  assert.equal(before.semanticSpec.layers[0].data, "scaled");

  const context = createMockCanvasContext();
  render(after, context);
  assert.equal(findCanvasCalls(context, "fill").length > 0, true);
  const svg = renderToSVG(after, { title: "Derived revision" });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<circle /);

  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-derived-edit-render-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pngPath = path.join(directory, "derived.png");
  const png = await renderToPNG(after, { output: pngPath, pixelRatio: 2 });
  assert.deepEqual(
    { width: png.width, height: png.height },
    { width: 480, height: 360 }
  );
  assert.deepEqual(
    [...(await readFile(pngPath)).subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );

  const pdfPath = path.join(directory, "derived.pdf");
  const pdf = await renderToPDF(after, {
    output: pdfPath,
    metadata: { title: "Derived revision" }
  });
  assert.deepEqual(
    { width: pdf.width, height: pdf.height, pages: pdf.pages },
    { width: 240, height: 180, pages: 1 }
  );
  assert.match((await readFile(pdfPath)).toString("latin1"), /^%PDF-/);
});
