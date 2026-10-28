import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { getMarkItems } from "../../../src/inspection.js";

const day = 1704067200000;
const rows = (offset = 0) => Array.from({ length: 9 }, (_, x) => ({ id: `row-${x}`, x, y: x * x + offset,
  day: day + Math.floor(x / 3) * 86400000, column: "total" }));
const expression = root => ({ version: 2, registry: "standard@1", root });
const literal = value => ({ type: "literal", value });
const source = { kind: "url", format: "json", url: expression({ type: "call", name: "concat", args: [
  literal("https://example.test/"), { type: "parameter", id: "region" }, literal(".json")
] }) };
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
const current = (p, family, id) => p.semanticSpec.datasets.find(d => d.id === p.materializationConfigs.data[family][id].current);

async function example() {
  let p = chart().createCanvas({ width: 400, height: 280, margin: 60 }).createParameter({ id: "region", value: "north" });
  const prepared = await prepareDataUpdate(p, { kind: "create", id: "raw", source, keyField: "id" },
    { requestToken: "initial", load: async () => response(rows()) });
  p = p.applyDataUpdate({ prepared, requestToken: "initial" });
  return p.createComputedData({ id: "adjusted", source: "raw", as: "adjusted", expression: expression({ type: "binary", op: "add",
    left: { type: "field", name: "y" }, right: literal(10) }) })
    .createPivotData({ id: "daily", source: "adjusted", field: "column", value: "adjusted", groupBy: "day", op: "sum" })
    .createCompleteData({ id: "calendar", source: "daily", key: "day", calendar: {
      unit: "day", start: "2024-01-01", end: "2024-01-04", timeZone: "UTC"
    }, fill: { total: 0 } })
    .createRegressionData({ id: "fit", source: "adjusted", x: "x", y: "adjusted", method: "loess", degree: 2, span: 1 })
    .createScatterPlot({ id: "dailyPoints", data: "calendar", x: "day", y: "total" })
    .highlightMarks({ id: "first", target: "dailyPoints", select: { rows: { data: "raw", indices: [0] } }, color: "red" });
}

test("prepared parameter refresh replays pivot, calendar and quadratic consumers after offline restore", async () => {
  const original = await example(), before = serializeProgram(original), priorSVG = renderToSVG(original);
  const restored = deserializeProgram(before), loads = [];
  const prepared = await prepareDataUpdate(restored, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "next", load: async ({ url }) => { loads.push(url); return response(rows(2)); }
  });
  const revised = restored.applyDataUpdate({ prepared, requestToken: "next" });
  assert.deepEqual(loads, ["https://example.test/south.json"]);
  assert.deepEqual(current(revised, "pivot", "daily").values.map(r => r.total), [41, 86, 185]);
  assert.deepEqual(current(revised, "complete", "calendar").values.map(r => r.total), [41, 86, 185, 0]);
  for (const row of current(revised, "regression", "fit").values) assert.ok(Math.abs(row.adjusted - (row.x * row.x + 12)) < 1e-8);
  assert.equal(current(revised, "regression", "fit").transform[0].degree, 2);
  const points = getMarkItems(revised, { target: "dailyPoints" });
  const selected = points.filter(item => item.geometry.some(g => g.properties.fill === "red"));
  assert.equal(selected.length, 1);
  assert.equal(selected[0].fields.day, day);
  assert.notEqual(renderToSVG(revised), priorSVG);
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
  assert.equal(serializeProgram(original), before);
  assert.equal(serializeProgram(restored), before);
});

test("a prepared source that violates inferred pivot columns fails atomically", async () => {
  const original = await example(), before = serializeProgram(original);
  const prepared = await prepareDataUpdate(original, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "invalid", load: async () => response(rows().map(row => ({ ...row, column: "undeclared" })))
  });
  assert.throws(() => original.applyDataUpdate({ prepared, requestToken: "invalid" }), /column|key/i);
  assert.equal(serializeProgram(original), before);
});
