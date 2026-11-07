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
for (const source of sources) test(`${source.id} preserves raw guide values across fifteen native transition recipes`, () => {
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
    const legend = x.editCanvas({ width: 600, margin: { top: 60, bottom: 60, left: 40, right: 180 } })
      .encodeColor({ field: source.field, fieldType: "quantitative", scale: { domain: [0, max], range: ["red", "blue"] } })
      .createLegend({ channels: ["color"], values: [value], offset: 20, title: source.field });
    const sizeLegend = x.editCanvas({ width: 600, margin: { top: 60, bottom: 60, left: 40, right: 180 } })
      .encodeSize({ field: source.field, scale: { domain: [0, max], range: [0, 100] } })
      .createLegend({ channels: ["size"], values: [value], offset: 20, title: source.field });
    // This explicit nominal encoding displays the original observations as
    // category values. It retains their values, units and source membership.
    const categoricalLegend = x.editCanvas({ width: 800, height: 700, margin: { top: 60, bottom: 60, left: 40, right: 250 } })
      .encodeColor({ field: source.field, fieldType: "nominal" })
      .createLegend({ channels: ["color"], offset: 20, title: source.field, symbol: { layers: [{ type: "point", size: 4 }] } });
    const implicitLegend = categoricalLegend
      .encodeSize({ field: source.field, scale: { domain: [0, max], range: [0, 100] } })
      .createLegend({ channels: ["size"], values: [value], title: source.field });
    const axisLegend = x.editCanvas({ width: 800, height: 700, margin: { top: 60, bottom: 60, left: 40, right: 250 } })
      .encodeColor({ field: source.field, fieldType: "nominal" })
      .createLegend({ channels: ["color"], title: source.field, symbol: { layers: [{ type: "point", size: 4 }] } })
      .encodeSize({ field: source.field, scale: { domain: [0, max], range: [0, 100] } })
      .createLegend({ channels: ["size"], values: [value], title: source.field })
      .createYAxis({ position: "right", title: false });
    const groupedLegend = categoricalLegend
      .encodeSize({ field: source.field, scale: { domain: [0, max], range: [0, 100] } })
      .createLegend({ channels: ["size"], values: [value], offset: 20, title: source.field })
      .editLegendLayout({ target: "m", position: "right", blockLayout: "column", offset: 20 });
    const titleBase = x.editCanvas({ width: 700, height: 600, margin: 150 });
    const inferredTitle = titleBase.createXAxis({ ticksAndLabels: { values: [value], labels: { flush: true } }, title: { text: source.field, at: value } });
    const relativeTitle = titleBase.createXAxis({ ticksAndLabels: { values: [value], labels: { flush: true } }, title: { text: source.field, at: value, offset: { from: "labels", gap: 7 } } });
    for (const [recipe, from] of [["inferred-title", inferredTitle], ["relative-title", relativeTitle], ["axis", x.createXAxis({ ticksAndLabels: { values: [value] }, title: false })],
      ["label-layout", x.createXAxisLabels({ values: [value], flush: true })],
      ["grid", x.createVerticalGrid({ values: [value] })], ["polar", polar],
      ["title", x.createXAxis({ line: false, ticksAndLabels: false, title: { text: source.field, at: value, offset: 20 } })],
      ["boundary", boundary], ["parallel", parallel], ["legend", legend], ["size-legend", sizeLegend], ["categorical-legend", categoricalLegend], ["grouped-legend", groupedLegend], ["implicit-lane", implicitLegend], ["axis-lane", axisLegend]]) {
      const to = ["grouped-legend", "implicit-lane", "axis-lane"].includes(recipe) ? from.editCanvas({ width: 900 }).editScale({ id: "size", range: [0, 400] })
        : recipe === "categorical-legend" ? from.editLegend({ symbol: { layers: [{ type: "point", size: 8 }] } })
        : recipe === "size-legend" ? from.editScale({ id: "size", range: [0, 400] })
        : recipe === "polar" ? from.editCanvas({ width: 600, height: 600 })
        : recipe === "parallel" ? from.encodeParallelCoordinates({ target: "fields", dimensions: ["sourceRowIndex", source.field] })
        : recipe === "boundary" ? from.editCanvas({ width: 600 })
        : from.editScale({ id: recipe === "legend" ? "color" : "x", domain: [0, max * 2] });
      const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
      const frame = sampleTransition(plan, 50), indices = frame.decisions.flatMap((decision, index) =>
        decision.kernel === "guide-geometry" ? [index] : []);
      assert.ok(indices.length > 0);
      if (["inferred-title", "relative-title"].includes(recipe)) assert.ok(frame.decisions.some(item => item.role === "guide-title" && item.kernel === "guide-geometry"));
      for (const index of indices) {
        const key = JSON.parse(frame.decisions[index].guideKey);
        if (["axis", "grid", "polar", "label-layout"].includes(recipe) && key[3] !== "line") assert.equal(key[4], value);
        const properties = frame.scene.nodes[index].properties;
        if (["ticks", "grid"].includes(key[3]) && !["polar", "inferred-title", "relative-title", "axis-lane"].includes(recipe)) assert.ok(Math.abs(properties.x1 - (40 + 320 / 3)) < 1e-9);
        if (recipe === "polar") assert.deepEqual(properties.commands[0], { op: "M", x: 250, y: 145 });
        if (recipe === "label-layout") assert.ok(Math.abs(properties.x - (40 + 320 / 3)) < 1e-9);
        if (["inferred-title", "relative-title"].includes(recipe) && key[3] === "title") assert.ok(Math.abs(properties.x - (150 + 400 / 3)) < 1e-9);
        if (recipe === "title") assert.ok(Math.abs(properties.x - (40 + 320 / 3)) < 1e-9);
        if (recipe === "parallel") assert.ok(key[3].startsWith("parallel-"));
        if (recipe === "legend") {
          assert.ok(key[3].startsWith("legend-"));
          if (key[3] === "legend-tick" || key[3] === "legend-label") assert.deepEqual(key[4], ["array", ["gradient", ["array", ["value", value]]]]);
        }
        if (recipe === "size-legend" && key[3] === "legend-symbol") {
          assert.ok(Math.abs(properties.radius - Math.sqrt(125 / Math.PI)) < 1e-9);
          assert.deepEqual(key[4], ["array", ["size", ["array", ["value", value]]]]);
        }
        if (recipe === "categorical-legend" && key[3] === "legend-symbol") {
          assert.equal(properties.radius, 6);
          const originalCategory = key[4][1][1][1][1];
          assert.ok(rows.some(row => row[source.field] === originalCategory));
        }
        if (["grouped-legend", "implicit-lane", "axis-lane"].includes(recipe) && key[3] === "legend-symbol") {
          const family = key[4][1][0];
          if (family === "size") assert.ok(Math.abs(properties.radius - Math.sqrt(125 / Math.PI)) < 1e-9);
          else assert.ok(rows.some(row => row[source.field] === key[4][1][1][1][1]));
        }
        if (recipe === "boundary") assert.equal(key[3], "boundary");
      }
      if (recipe === "axis-lane") {
        const expected = from.editCanvas({ width: 850 }).editScale({ id: "size", range: [0, 250] });
        const native = sampleTransition(planTransition({ from: expected, to: expected, options: { durationMs: 100 } }), 50);
        const legendGeometry = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [frame.scene.nodes[index].properties] : []);
        assert.ok(frame.decisions.filter(decision => decision.role?.startsWith("guide-legend-")).every(decision => decision.kernel === "guide-geometry"));
        assert.deepEqual(legendGeometry(frame), legendGeometry(native));
      }
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50), frame);
      assertSvgIntegrity(renderToSVG(frame), `${source.id}/${recipe}`);
      assert.deepEqual(from.semanticSpec.datasets.find(data => data.id === "raw").values, rows);
    }
    for (const row of rows) assert.equal(row[source.field], original[row.sourceRowIndex][source.field]);
  } finally { releaseTidyTuesdaySourceCache(source.id); }
});
