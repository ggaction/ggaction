import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { hconcat } from "../../../src/index.js";

function plot(kind, options = {}, before = chart()) {
  const p = before.createCanvas({ width: 240, height: 160, margin: 0 })
    .createData({ id: "nodes", keyField: "id", values: [{ id: "a", parent: null, value: 2 }, { id: "b", parent: "a", value: 1 }] });
  if (kind === "graph") return p.createData({ id: "edges", values: [{ from: "a", to: "b" }] })
    .createGraphData({ id: "source", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "layout", method: "force", options: { seed: 7, iterations: 2 } })
    .createGraphPlot({ id: "plot", labels: {}, ...options });
  return p.createHierarchyData({ id: "source", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method: kind, options: kind === "tree"
      ? { nodeSize: [20, 20], siblingGap: 30, depthGap: 40, orientation: "vertical" }
      : { size: [180, 100], padding: 5, method: "slice-dice" } })
    [kind === "tree" ? "createTreePlot" : "createTreemapPlot"]({ id: "plot", labels: {}, ...options });
}
const items = program => program.graphicSpec.objects.plot.items;
const body = program => items(program).filter(item => ["circle", "rect"].includes(item.type));
const labels = program => items(program).filter(item => item.type === "text");
const operations = trace => [trace.op, ...(trace.children ?? []).flatMap(operations)];
for (const kind of ["graph", "tree", "treemap"]) {
  test(`${kind} theme paint changes preserve stored layouts and final item identity`, () => {
    const source = plot(kind), saved = serializeProgram(source), resources = source.semanticSpec.resources;
    const keys = getMarkItems(source, { target: "plot" }).map(item => item.key);
    const dark = source.applyTheme({ theme: "dark" });
    assert.ok(body(dark).every(item => item.properties.fill === "#60a5fa"));
    assert.ok(labels(dark).every(item => item.properties.fill === "#e2e8f0"));
    assert.equal(dark.semanticSpec.resources, resources);
    assert.deepEqual(getMarkItems(dark, { target: "plot" }).map(item => item.key), keys);
    assert.ok(!operations(dark.trace.children.at(-1)).some(op => ["layoutGraph", "layoutHierarchy", "editLayout"].includes(op)));
    const restored = deserializeProgram(serializeProgram(dark));
    assert.deepEqual(restored.graphicSpec, dark.graphicSpec);
    assert.deepEqual(dark.removeTheme().graphicSpec, source.graphicSpec);
    assert.equal(serializeProgram(source), saved);
  });
  test(`${kind} same-as-default authored paint and per-item styles outrank a theme`, () => {
    const name = kind === "treemap" ? "cells" : "nodes", color = kind === "treemap" ? "#3b82f6" : "#2563eb";
    const source = plot(kind, { [name]: { fill: color, opacity: 0, strokeWidth: 0, overrides: [{ key: "b", fill: "orange" }] }, labels: { fill: "#0f172a" } });
    const dark = source.applyTheme({ theme: "dark" });
    assert.deepEqual(body(dark).map(item => item.properties.fill), [color, "orange"]);
    assert.ok(body(dark).every(item => item.properties.opacity === 0 && item.properties.strokeWidth === 0));
    assert.ok(labels(dark).every(item => item.properties.fill === "#0f172a"));
    const inherited = plot(kind, {}, chart().applyTheme({ theme: "dark" }));
    assert.ok(body(inherited).every(item => item.properties.fill === "#60a5fa"));
  });
}

test("resource plot themes keep disabled roles and inferred targets during editing", () => {
  const p = plot("tree", { labels: false, links: false }).applyTheme({ theme: "dark" });
  assert.equal(labels(p).length, 0);
  assert.ok(items(p).every(item => item.type === "circle"));
  const q = p.editTreePlot({ nodes: { fill: "orange" }, labels: { fontFamily: "serif" }, links: { stroke: "red" } });
  const next = q.applyTheme({ theme: { base: "light", tokens: { fontFamily: "monospace", mark: "green" } } });
  assert.ok(body(next).every(item => item.properties.fill === "orange"));
  assert.ok(labels(next).every(item => item.properties.fontFamily === "serif"));
  assert.ok(items(next).filter(item => item.type === "path").every(item => item.properties.stroke === "red"));
  const reset = next.editTreePlot({ links: false }).editTreePlot({ links: {} });
  assert.ok(items(reset).filter(item => item.type === "path").every(item => item.properties.stroke === "#64748b"));
});

test("resource label typography changes rematerialize once without altering layout resources", () => {
  const p = plot("graph"), resources = p.semanticSpec.resources;
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontFamily: "serif" } } });
  assert.ok(labels(q).every(item => item.properties.fontFamily === "serif"));
  assert.equal(q.semanticSpec.resources, resources);
  assert.equal(operations(q.trace.children.at(-1)).filter(op => op === "materializeGraphPlot").length, 1);
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
});

test("scoped resource themes preserve child-local requests and restore family defaults", () => {
  const first = plot("tree").applyTheme({ theme: { base: "light", tokens: { mark: "purple" } } });
  const second = plot("treemap");
  const p = hconcat({ programs: [first, second], gap: 20 });
  const q = p.applyTheme({ theme: "dark", scope: "descendants" });
  assert.ok(Object.values(q.children).every(child => body(child).every(item => item.properties.fill === "#60a5fa")));
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
  assert.ok(body(first).every(item => item.properties.fill === "purple"));
  assert.ok(body(second).every(item => item.properties.fill === "#3b82f6"));
});

for (const kind of ["graph", "tree", "treemap"]) {
  test(`${kind} theme follows label reset and preserves a named highlight baseline`, () => {
    const edit = { graph: "editGraphPlot", tree: "editTreePlot", treemap: "editTreemapPlot" }[kind];
    const p = plot(kind, { labels: { fill: "orange" } }).applyTheme({ theme: "dark" });
    const reset = p[edit]({ target: "plot", labels: false })[edit]({ target: "plot", labels: {} });
    assert.ok(labels(reset).every(item => item.properties.fill === "#e2e8f0"));
    const selectedKey = body(reset)[0].identity.key;
    const selectedBody = program => body(program).find(item => item.identity.key === selectedKey);
    const q = reset.highlightMarks({ id: "picked", target: "plot", select: { rows: { data: "nodes", indices: [0] } }, stroke: "red", opacity: 0.4 });
    const first = q.applyTheme({ theme: { base: "light", tokens: { mark: "green" } } });
    const second = first.applyTheme({ theme: "dark" });
    assert.equal(selectedBody(second).properties.opacity, 0.4);
    assert.equal(selectedBody(second).properties.stroke, "red");
    assert.ok(body(second).filter(item => item.identity.key !== selectedKey).every(item => item.properties.fill === "#60a5fa"));
    assert.equal(selectedBody(second.removeTheme()).properties.opacity, 0.4);
    assert.ok(labels(second).every(item => !Object.hasOwn(item.properties, "stroke")));
    assert.equal(getMarkItems(second, { target: "plot" }).length, kind === "graph" ? 3 : 2);
  });
}
