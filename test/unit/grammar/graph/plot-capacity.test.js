import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { MAX_GRAPH_PLOT_ITEMS } from "../../../../src/core/validation.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";

const path = (count, routes = false) => {
  const nodes = Array.from({ length: count }, (_, id) => ({ id }));
  const edges = Array.from({ length: count - 1 }, (_, id) => ({ id, source: id, target: id + 1 }));
  let p = chart().createCanvas({ width: 400, height: 300 }).createData({ id: "nodes", values: nodes, keyField: "id" })
    .createData({ id: "edges", values: edges, keyField: "id" })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: nodes.map(({ id }) => ({ key: id, x: id % 100, y: Math.floor(id / 100) })) } });
  if (routes) p = p.bundleGraphEdges({ id: "routes", method: "edge-path" });
  return p;
};
const config = p => p.markConfigs.plot.graphPlot;

test("graph plot capacity keeps the default 10k limit unless maxItems is stated", () => {
  const big = path(6000);
  assert.throws(() => big.createGraphPlot({ id: "plot", labels: false }), /Graph plot graphic count must not exceed 10000/);
  const p = big.createGraphPlot({ id: "plot", labels: false, maxItems: 20_000 });
  assert.equal(config(p).maxItems, 20_000);
  assert.equal(p.graphicSpec.objects.plot.items.length, 6000 + 5999);
  const small = path(3).createGraphPlot({ id: "plot" });
  assert.equal(Object.hasOwn(config(small), "maxItems"), false);
  assert.equal(MAX_GRAPH_PLOT_ITEMS, 100_000);
});

test("graph plot maxItems rejects invalid values and too-small edits", () => {
  const base = path(3);
  for (const value of [0, -1, 1.5, MAX_GRAPH_PLOT_ITEMS + 1, "10", Number.NaN]) {
    assert.throws(() => base.createGraphPlot({ id: "plot", maxItems: value }), error =>
      /Graph plot maxItems must be an integer from 1 to 100000/.test(error.message) && getErrorDetails(error).optionPath === "maxItems");
  }
  const p = base.createGraphPlot({ id: "plot" });
  assert.throws(() => p.editGraphPlot({ target: "plot", maxItems: 2 }), /Graph plot graphic count must not exceed 2/);
  const edited = p.editGraphPlot({ target: "plot", maxItems: 50 });
  assert.equal(config(edited).maxItems, 50);
  assert.equal(edited.editGraphPlot({ target: "plot", nodes: { radius: 3 } }).markConfigs.plot.graphPlot.maxItems, 50);
});

test("graph plot capacity survives persistence and rejects tampered snapshots", () => {
  const p = path(6000).createGraphPlot({ id: "plot", labels: false, maxItems: 20_000 });
  const text = serializeProgram(p), restored = deserializeProgram(text);
  assert.equal(serializeProgram(restored), text);
  assert.equal(config(restored).maxItems, 20_000);
  for (const value of [0, MAX_GRAPH_PLOT_ITEMS + 1, "\"x\""]) {
    assert.throws(() => deserializeProgram(text.replaceAll("[\"maxItems\",20000]", `["maxItems",${value}]`)), /Graph plot maxItems must be an integer/);
  }
  assert.throws(() => deserializeProgram(text.replaceAll("[\"maxItems\",20000]", "[\"maxItems\",11000]")), /must not exceed 11000/);
});

test("graph plot capacity covers stored routes and composition children", () => {
  const routed = path(3, true);
  assert.throws(() => routed.createGraphPlot({ id: "plot", routes: "routes", maxItems: 6 }), /Graph plot graphic count must not exceed 6/);
  assert.equal(routed.createGraphPlot({ id: "plot", routes: "routes", maxItems: 7 }).graphicSpec.objects.plot.items.length, 5);
  const big = path(6000).createGraphPlot({ id: "plot", labels: false, maxItems: 18_000 });
  const composed = hconcat({ programs: [{ id: "left", program: big }, { id: "right", program: path(3).createGraphPlot({ id: "plot" }) }] });
  const text = serializeProgram(composed);
  assert.equal(serializeProgram(deserializeProgram(text)), text);
  assert.throws(() => deserializeProgram(text.replaceAll("[\"maxItems\",18000]", "[\"maxItems\",11000]")), /must not exceed 11000/);
});
