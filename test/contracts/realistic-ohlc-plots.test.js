import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
// Five authentic financial series from ONE pinned source table, never counted as
// five independent source tables. Prices retain their original four-field roles.
const symbols = ["AAPL", "ADBE", "AMZN", "MSFT", "NVDA"];
const recipes = [
  { id: "daily-prices", options: { width: { pixels: 6 } }, patch: { width: { pixels: 10 }, labels: { content: "close", format: ".2f", fontSize: 8 } } },
  { id: "reverse-price-scale", options: { yScale: { reverse: true }, body: { opacity: .7 } }, patch: { yScale: { reverse: false }, doji: "none" } },
  { id: "price-color", options: { color: { field: "close", fieldType: "quantitative" } }, patch: { color: false, stem: { strokeWidth: 2 } } }
];
const witnesses = new Map();
for (const symbol of symbols) for (const recipe of recipes) test(`authentic OHLC ${symbol}/${recipe.id} retains pinned daily price roles`, () => {
  const all = tidyTuesdaySourceRows("tt-stock-prices");
  const rows = all.flatMap((row, sourceRowIndex) => row.stock_symbol === symbol ? [{ ...row, sourceRowIndex }] : []).slice(0, 12);
  assert.equal(rows.length, 12); assert.equal(tidyTuesdayFixtureReport("tt-stock-prices").sha256, "cb6d83535f2df947a982299bc30a9b532c7ffed9642733c6f5fb3657c4a457fc");
  const p = chart().createCanvas({ width: 720, height: 420, margin: 50 }).createData({ id: "prices", values: rows, keyFields: ["stock_symbol", "date"] })
    .createOHLCPlot({ id: "market", x: { field: "date", fieldType: "temporal" }, low: "low", high: "high", open: "open", close: "close", guides: false, ...recipe.options })
    .editOHLCPlot({ target: "market", ...recipe.patch });
  const items = getMarkItems(p, { target: "market" });
  assert.deepEqual(items.map(item => [item.channels.low, item.channels.high, item.channels.open, item.channels.close]), rows.map(row => [row.low, row.high, row.open, row.close]));
  assert.deepEqual(items.map(item => item.fields.sourceRowIndex), rows.map(row => row.sourceRowIndex));
  for (const item of items) assert.ok(item.channels.low <= Math.min(item.channels.open, item.channels.close) && item.channels.high >= Math.max(item.channels.open, item.channels.close));
  const saved = serializeProgram(p), keys = items.map(item => item.key);
  const q = deserializeProgram(saved).reviseData({ source: "prices", id: "reordered", values: [...rows].reverse() });
  assert.deepEqual(getMarkItems(q, { target: "market" }).map(item => item.key), [...keys].reverse());
  assertGraphicIntegrity(q, `${symbol}/${recipe.id}`); assertSvgIntegrity(renderToSVG(q), `${symbol}/${recipe.id}`); assert.equal(serializeProgram(p), saved);
  witnesses.set(`${symbol}/${recipe.id}`, p.trace.children.filter(node => ["createOHLCPlot", "editOHLCPlot"].includes(node.op)).map(node => node.op));
});
test("OHLC evidence distinguishes five financial series from the one pinned source", () => {
  assert.equal(witnesses.size, 15); for (const actions of witnesses.values()) assert.deepEqual(actions, ["createOHLCPlot", "editOHLCPlot"]);
  releaseTidyTuesdaySourceCache("tt-stock-prices");
});
