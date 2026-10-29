import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { getMarkItems } from "../../src/inspection.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const actions = ["createContourData", "createDensityContourData", "editContourData", "createContourMark", "editContourMark"];
const witnesses = new Map(actions.map(name => [name, new Map()]));
const frame = { origin: [0, 0], dx: .2, dy: .2, width: 6, height: 6 };
function histogram(rows, unit) {
  const values = Array(36).fill(0);
  // Enumerate explicit half-open bin intervals. A floor of an affine quotient
  // can round an exact boundary into the previous bin (for example 0.5).
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
    values[y * 6 + x] = rows.filter(row => row.x >= (x - .5) * .2 &&
      (x === 5 ? row.x <= (x + .5) * .2 : row.x < (x + .5) * .2) && row.y >= (y - .5) * .2 &&
      (y === 5 ? row.y <= (y + .5) * .2 : row.y < (y + .5) * .2))
      .reduce((sum, row) => sum + row.weight, 0);
  }
  return values.map(value => value / unit / (.2 * .2));
}
for (const dataset of datasets) for (const recipe of ["counts", "weighted", "kernel"]) test(`${dataset} ${recipe} contours preserve explicit density and exact source rows`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 24, groupLimit: 4 });
    const retained = view.rows.filter(row => Number.isFinite(row.orderNumeric) && row.value >= 0);
    assert.ok(retained.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
    const minX = Math.min(...retained.map(row => row.orderNumeric)), maxX = Math.max(...retained.map(row => row.orderNumeric));
    const minY = Math.min(...retained.map(row => row.value)), maxY = Math.max(...retained.map(row => row.value));
    assert.ok(maxX > minX && maxY > minY);
    // Explicit affine standardization lets unlike source units share the same
    // numeric grid. Original measurements and pinned row indexes remain stored.
    const rows = retained.map(row => ({ ...row, x: (row.orderNumeric - minX) / (maxX - minX),
      y: (row.value - minY) / (maxY - minY), weight: recipe === "weighted" ? row.value : 1 }));
    assert.ok(rows.every(row => view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
    const total = rows.reduce((sum, row) => sum + row.weight, 0), unit = recipe === "counts" ? 1 : total;
    const bins = histogram(rows, unit), thresholds = [0, .1, .5, 1, 3, Math.max(4, ...bins) + 1];
    let program = chart().createCanvas({ width: 600, height: 450, margin: 30 })
      .createData({ id: "samples", values: rows, keyField: "key" })
      .createContourData({ id: "binned", grid: { ...frame, values: bins }, thresholds })
      .createDensityContourData({ id: "density", data: "samples", x: "x", y: "y", weight: "weight", grid: frame,
        estimator: recipe === "kernel" ? "kde" : "histogram", normalization: recipe === "counts" ? "count" : "unit",
        ...(recipe === "kernel" ? { bandwidth: [.2, .3], kernel: "gaussian" } : {}), thresholds })
      .createContourMark({ id: "density-mark", geometry: "density", mode: recipe === "counts" ? "line" : "filled" })
      .createContourMark({ id: "bin-lines", geometry: "binned", mode: "line", color: false, stroke: "#444444" })
      .editContourMark({ target: "bin-lines", strokeWidth: .5, opacity: .6 })
      .editContourData({ target: "density", definition: { normalization: "count" } })
      .editContourData({ target: "binned", thresholds: thresholds.slice(1) });
    const resource = program.semanticSpec.resources.find(value => value.id === "density");
    assert.equal(resource.result.density.sourceCount, rows.length);
    assert.ok(Math.abs(resource.result.density.totalWeight - total) <= total * 1e-12);
    const values = resource.result.contours.grid.values;
    if (recipe !== "kernel") values.forEach((value, i) => assert.ok(Math.abs(value - bins[i] * unit) <= Math.max(1, value) * 1e-12));
    else {
      const expected = rows.reduce((sum, row) => sum + row.weight * Math.exp(-.5 * ((row.x / .2) ** 2 + (row.y / .3) ** 2)) / (2 * Math.PI * .2 * .3), 0);
      assert.ok(Math.abs(values[0] - expected) < 1e-10);
    }
    assert.deepEqual(resource.provenance.sourceRows.map(row => row.rowKey), program.semanticSpec.datasets[0].rowKeys);
    const keys = getMarkItems(program, { target: "density-mark" }).map(item => item.key), before = serializeProgram(program);
    const changed = deserializeProgram(before).editContourMark({ target: "density-mark", x: { reverse: true } });
    assert.deepEqual(getMarkItems(changed, { target: "density-mark" }).map(item => item.key), keys);
    assertGraphicIntegrity(changed, `${dataset}/${recipe}`); assertSvgIntegrity(renderToSVG(changed), `${dataset}/${recipe}`);
    assert.equal(serializeProgram(program), before);
    assert.throws(() => program.reviseData({ source: "samples", id: "bad", values: rows.map(row => ({ ...row, weight: -1 })) }));
    assert.equal(serializeProgram(program), before);
    for (const entry of program.trace.children) if (witnesses.has(entry.op)) {
      const entries = witnesses.get(entry.op); if (!entries.has(dataset)) entries.set(dataset, new Set()); entries.get(dataset).add(recipe);
    }
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
test("every contour action has five authentic datasets and three distinct direct recipe witnesses", () => {
  for (const [action, entries] of witnesses) {
    assert.equal(entries.size, 5, action); for (const recipes of entries.values()) assert.equal(recipes.size, 3, action);
  }
});
