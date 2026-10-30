import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";

const sources = [{ id: "tt-us-births", field: "births" }, { id: "tt-trash-wheel", field: "Weight" },
  { id: "tt-stock-prices", field: "volume", eligible: row => row.stock_symbol === "AAPL" },
  { id: "tt-animal-rescues", field: "incident_notional_cost" }, { id: "tt-movie-profit", field: "production_budget" }];
for (const source of sources) test(`${source.id} preserves raw guide values across six native transition recipes`, () => {
  try {
    const original = tidyTuesdaySourceRows(source.id);
    assert.match(tidyTuesdayFixtureReport(source.id).sha256, /^[a-f0-9]{64}$/);
    // One declared cohort: the first twelve positive observations, with original
    // units and source row identities. No synthetic measurement is introduced.
    const rows = original.flatMap((row, index) => Number.isFinite(row[source.field]) && row[source.field] > 0 &&
      (!source.eligible || source.eligible(row)) ? [{ ...row, sourceRowIndex: index }] : []).slice(0, 12);
    assert.equal(rows.length, 12);
    const max = Math.max(...rows.map(row => row[source.field])), value = max / 2;
    const sourceProgram = chart().createCanvas({ width: 400, height: 400, margin: 40 })
      .createData({ id: "raw", values: rows, keyField: "sourceRowIndex" });
    const base = sourceProgram.createPointMark({ id: "m" });
    const x = base.encodeX({ field: source.field, scale: { domain: [0, max], nice: false } })
      .encodeY({ field: "sourceRowIndex" });
    const polar = base.encodeTheta({ field: "sourceRowIndex" })
      .encodeR({ field: source.field, scale: { domain: [0, max], nice: false } })
      .createGrid({ radial: { values: [value] } });
    const boundary = base.encodeX({ field: "sourceRowIndex", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0 } })
      .encodeY({ field: source.field }).createVerticalGrid({ bandPosition: "boundary" });
    const parallel = sourceProgram.editCanvas({ width: 600, height: 420, margin: 90 })
      .createParallelCoordinates({ id: "fields", dimensions: [source.field, "sourceRowIndex"], guides: { legend: false } });
    for (const [recipe, from] of [["axis", x.createXAxis({ ticksAndLabels: { values: [value] }, title: false })],
      ["grid", x.createVerticalGrid({ values: [value] })], ["polar", polar],
      ["title", x.createXAxis({ line: false, ticksAndLabels: false, title: { text: source.field, at: value, offset: 20 } })],
      ["boundary", boundary], ["parallel", parallel]]) {
      const to = recipe === "polar" ? from.editCanvas({ width: 600, height: 600 })
        : recipe === "parallel" ? from.encodeParallelCoordinates({ target: "fields", dimensions: ["sourceRowIndex", source.field] })
        : recipe === "boundary" ? from.editCanvas({ width: 600 })
        : from.editScale({ id: "x", domain: [0, max * 2] });
      const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
      const frame = sampleTransition(plan, 50), indices = frame.decisions.flatMap((decision, index) =>
        decision.kernel === "guide-geometry" ? [index] : []);
      assert.ok(indices.length > 0);
      for (const index of indices) {
        const key = JSON.parse(frame.decisions[index].guideKey);
        if (["axis", "grid", "polar"].includes(recipe) && key[3] !== "line") assert.equal(key[4], value);
        const properties = frame.scene.nodes[index].properties;
        if (["ticks", "grid"].includes(key[3]) && recipe !== "polar") assert.ok(Math.abs(properties.x1 - (40 + 320 / 3)) < 1e-9);
        if (recipe === "polar") assert.deepEqual(properties.commands[0], { op: "M", x: 250, y: 145 });
        if (recipe === "title") assert.ok(Math.abs(properties.x - (40 + 320 / 3)) < 1e-9);
        if (recipe === "parallel") assert.ok(key[3].startsWith("parallel-"));
        if (recipe === "boundary") assert.equal(key[3], "boundary");
      }
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50), frame);
      assertSvgIntegrity(renderToSVG(frame), `${source.id}/${recipe}`);
      assert.deepEqual(from.semanticSpec.datasets.find(data => data.id === "raw").values, rows);
    }
    for (const row of rows) assert.equal(row[source.field], original[row.sourceRowIndex][source.field]);
  } finally { releaseTidyTuesdaySourceCache(source.id); }
});
