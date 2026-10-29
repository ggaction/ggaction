import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { civilCell } from "../oracles/calendar.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = ["tt-tv-ratings", "tt-space-launches", "tt-big-mac", "tt-world-cup-matches", "tt-stock-prices"];
const recipes = [
  { id: "daily-totals", aggregate: "sum", timeZone: "UTC", weekStartsOn: 0, missing: "empty" },
  { id: "observed-averages", aggregate: "mean", timeZone: "UTC", weekStartsOn: 1, missing: "omit" },
  { id: "tokyo-counts", aggregate: "count", timeZone: "Asia/Tokyo", weekStartsOn: 6, missing: "empty" }
];
const witnesses = new Map(["createCalendarLayout", "createCalendarPlot", "editCalendarPlot"].map(name => [name, new Map()]));
for (const dataset of datasets) for (const recipe of recipes) test(`${dataset} ${recipe.id} calendar uses authentic dates, measures and row keys`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 60, groupLimit: 4 }), groups = new Map();
    for (const row of view.rows) {
      assert.match(row.time, /^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
      const year = row.time.slice(0, 4); if (!groups.has(year)) groups.set(year, []); groups.get(year).push(row);
    }
    // Select the most observed actual year, with chronological tie-breaking.
    // This bounds the displayed calendar without inventing or shifting dates.
    const [year, rows] = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
    assert.ok(rows.length >= 2); assert.equal(view.provenance.sourceDataset, dataset);
    assert.ok(rows.every(row => view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
    const byDay = new Map();
    for (const row of rows) { const day = row.time.slice(0, 10); if (!byDay.has(day)) byDay.set(day, []); byDay.get(day).push(row); }
    const expected = [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => [day,
      recipe.aggregate === "count" ? values.length : values.reduce((sum, row) => sum + row.value, 0) / (recipe.aggregate === "mean" ? values.length : 1), values.length]);
    const { id, ...intent } = recipe;
    const p = chart().createCanvas({ width: 960, height: 300, margin: 30 })
      .createData({ id: "observations", values: rows, keyField: "key" })
      .createCalendarLayout({ id: "days", data: "observations", date: "time", ...(recipe.aggregate === "count" ? {} : { value: "value" }),
        start: `${year}-01-01`, end: `${year}-12-31`, ...intent })
      .createCalendarPlot({ id: "calendar", layout: "days", color: false, labels: { week: false } })
      .editCalendarPlot({ target: "calendar", cells: { opacity: .7, gap: .12 }, monthBoundary: recipe.missing === "omit" ? false : { stroke: "#64748b" } });
    const actual = getMarkItems(p, { target: "calendar" }).filter(item => !item.fields.empty);
    assert.deepEqual(actual.map(item => [item.fields.date, item.rows.length]), expected.map(([date, , count]) => [date, count]));
    actual.forEach((item, i) => assert.ok(Math.abs(item.fields.value - expected[i][1]) < Math.max(1, Math.abs(expected[i][1])) * 1e-12));
    const stored = p.semanticSpec.resources.find(resource => resource.id === "days");
    for (const cell of stored.result.cells) {
      const reference = civilCell(cell.year, cell.month, cell.day, recipe.weekStartsOn);
      assert.deepEqual([cell.week, cell.weekday], [reference.week, reference.weekday]);
      assert.deepEqual(cell.sourceIndices.map(index => rows[index].time.slice(0, 10)), Array(cell.sourceIndices.length).fill(cell.key));
    }
    const saved = serializeProgram(p), keys = getMarkItems(p, { target: "calendar" }).map(item => item.key);
    const next = deserializeProgram(saved).reviseData({ source: "observations", id: "reordered", values: [...rows].reverse() })
      .editLayout({ target: "days", options: { weekStartsOn: (recipe.weekStartsOn + 1) % 7 } });
    assert.deepEqual(getMarkItems(next, { target: "calendar" }).map(item => item.key), keys);
    assertGraphicIntegrity(next, `${dataset}/${id}`); assertSvgIntegrity(renderToSVG(next), `${dataset}/${id}`);
    assert.equal(serializeProgram(p), saved);
    assert.throws(() => p.reviseData({ source: "observations", id: "bad", values: rows.map(row => ({ ...row, time: "invalid" })) }));
    assert.equal(serializeProgram(p), saved);
    for (const entry of p.trace.children) if (witnesses.has(entry.op)) {
      const byDataset = witnesses.get(entry.op); if (!byDataset.has(dataset)) byDataset.set(dataset, new Set()); byDataset.get(dataset).add(id);
    }
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
test("every calendar action has five authentic datasets and three distinct direct recipe witnesses", () => {
  for (const [action, byDataset] of witnesses) {
    assert.equal(byDataset.size, 5, action); for (const values of byDataset.values()) assert.equal(values.size, 3, action);
  }
});
