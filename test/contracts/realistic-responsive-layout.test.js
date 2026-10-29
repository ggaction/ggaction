import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
for (const dataset of datasets) for (const recipe of ["vertical", "horizontal", "grouped"]) test(`${dataset} ${recipe} responsive guide layout retains source rows and fixed Canvas`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 24, groupLimit: 4 });
    assert.equal(view.provenance.sourceDataset, dataset);
    assert.ok(view.rows.length >= 4);
    const horizontal = recipe === "horizontal";
    const label = horizontal ? "y" : "x";
    const program = chart().createCanvas({ width: 900, height: 600, margin: 30, responsive: {} })
      .createData({ id: "source", values: view.rows, keyField: "key" })
      .createBarPlot({ x: horizontal ? "value" : "category", y: horizontal ? "category" : "value",
        ...(recipe === "grouped" ? { color: "subgroup" } : {}),
        guides: { axes: { [label]: { ticksAndLabels: { labels: { responsive: { maxLines: 4, skipStride: 3 } } } },
          [horizontal ? "x" : "y"]: {} }, legend: false } });
    const before = serializeProgram(program), result = program.materializationConfigs.canvas.responsiveResult;
    assert.equal(result.status, "satisfied"); assert.ok(result.iterations <= 4);
    assert.equal(program.graphicSpec.objects.canvas.properties.width, 900);
    assert.deepEqual(program.materializationConfigs.canvas.margin, { top: 30, right: 30, bottom: 30, left: 30 });
    assert.deepEqual(program.semanticSpec.datasets[0].values, view.rows);
    const resized = deserializeProgram(before).editCanvas({ width: 1000 });
    assert.equal(resized.materializationConfigs.canvas.responsiveResult.status, "satisfied");
    assert.deepEqual(resized.editCanvas({ width: 900 }).graphicSpec, program.graphicSpec);
    const changed = program.reviseData({ source: "source", id: "updated", values: view.rows.map(row => ({ ...row, value: row.value + 1 })) });
    assert.equal(changed.materializationConfigs.canvas.responsiveResult.status, "satisfied");
    assertGraphicIntegrity(changed, `${dataset}/${recipe}`);
    assertSvgIntegrity(renderToSVG(changed), `${dataset}/${recipe}`);
    assert.equal(serializeProgram(program), before);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
