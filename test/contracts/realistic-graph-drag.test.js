import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { createInteractionSession } from "../../src/interaction.js";
import { planTransition, sampleTransition } from "../../src/animation.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"], witnesses = new Map();
const layout = p => p.semanticSpec.resources.find(r => r.kind === "layout");
for (const dataset of datasets) for (const recipe of ["fixed", "fixed-routed", "force"]) test(`${dataset} ${recipe} preserves observed rows through current-frame node dragging`, () => {
  try {
    const view = realisticRecordView(dataset, { rowLimit: 32, groupLimit: 6 }); assert.ok(view.rows.length >= 4); assert.equal(view.provenance.sourceDataset, dataset);
    const rows = view.rows.map(row => ({ key: row.key, value: row.value, sourceRowIndex: row.sourceRowIndex }));
    const min = Math.min(...rows.map(r => r.value)), span = Math.max(...rows.map(r => r.value)) - min;
    const positions = rows.map((r, i) => ({ key: r.key, x: 50 + i * 450 / (rows.length - 1), y: 80 + (span ? (r.value - min) / span * 80 : 0) }));
    // Observed order links retain source indices; they imply no similarity or causation.
    const edges = rows.slice(1).map((r, i) => ({ key: r.key, from: rows[i].key, to: r.key }));
    let p = chart().createCanvas({ width: 600, height: 400, margin: 0 }).createData({ id: "records", keyField: "key", values: rows })
      .createData({ id: "links", keyField: "key", values: edges })
      .createGraphData({ id: "graph", nodes: "records", edges: "links", nodeKey: "key", edgeKey: "key", source: "from", target: "to", attributes: ["sourceRowIndex", "value"] })
      .layoutGraph({ id: "layout", method: recipe === "force" ? "force" : "fixed", options: recipe === "force" ? { iterations: 0, initialPositions: positions, center: [250, 160] } : { positions } })
      .createGraphPlot({ id: "plot", origin: [0, 0], nodes: { radius: 6 } });
    if (recipe === "fixed-routed") p = p.bundleGraphEdges({ id: "routes", method: "edge-path" }).editGraphPlot({ routes: "routes" });
    const original = serializeProgram(p), first = layout(p).result.nodes[0];
    const to = p.editLayout({ node: { key: rows[0].key, x: first.x + 20, y: first.y + 30 } });
    const frame = sampleTransition(planTransition({ from: p, to, options: { durationMs: 100, easing: "linear" } }), 50);
    const current = frame.scene.nodes.filter(n => n.type === "circle"), [x, y] = [current[0].properties.x, current[0].properties.y];
    const s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "plot" }] }), listeners = new Map(), pending = new Map(); let seq = 0;
    s.mount({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }), addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k),
      setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => true, requestAnimationFrame: f => (pending.set(++seq, f), seq), cancelAnimationFrame: k => pending.delete(k) });
    const fire = (type, x, y) => listeners.get(type)({ pointerId: 1, pointerType: "mouse", clientX: x, clientY: y });
    s.dispatch({ type: "frame", frame, version: s.getState().frameVersion + 1, generation: 0 }); fire("pointerdown", x, y); fire("pointermove", x + 15, y + 10);
    for (const fn of pending.values()) fn(); pending.clear();
    const preview = s.getState().previewFrame; assert.ok(preview); assert.equal(s.getState().program, p);
    assert.deepEqual(preview.scene.nodes.filter(n => n.type === "circle").map(n => [n.properties.x, n.properties.y]), current.map((n, i) => [n.properties.x + (i ? 0 : 15), n.properties.y + (i ? 0 : 10)]));
    fire("pointerup", x + 15, y + 10); const next = s.getState().program;
    assert.equal(s.getState().history.undoCount, 1); assert.equal(layout(next).revision, 1);
    const items = getMarkItems(next), beforeItems = getMarkItems(p); assert.deepEqual(items.map(i => i.key), beforeItems.map(i => i.key));
    assert.deepEqual(items.map(i => i.rows), beforeItems.map(i => i.rows)); assert.equal(serializeProgram(p), original);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))), renderToSVG(next));
    s.dispatch({ type: "undo" }); assert.equal(s.getState().program, p); s.dispatch({ type: "redo" }); assert.equal(s.getState().program, next); s.destroy();
    if (!witnesses.has(dataset)) witnesses.set(dataset, new Set()); witnesses.get(dataset).add(recipe);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
test("current graph drag witnesses cover five datasets and three native layout recipes", () => {
  assert.equal(witnesses.size, 5); for (const set of witnesses.values()) assert.equal(set.size, 3);
});
