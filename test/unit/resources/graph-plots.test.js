import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { getMarkItems, inspectProgram } from "../../../src/inspection.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";
import { resolveGraphPlot } from "../../../src/materialization/graph/plot.js";
import { createGraph } from "../../../examples/graph-plots/program.js";

const nodes = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: "c", label: "Gamma" }];
const edges = [{ id: "ab", from: "a", to: "b", weight: 2 }, { id: "parallel", from: "a", to: "b", weight: 3 }, { id: "loop", from: "a", to: "a", weight: 1 }];
const source = () => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
  .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", weight: "weight", edgeKey: "id", attributes: ["label"], directed: true, selfLoops: true });
const base = () => source().layoutGraph({ id: "l", method: "circular", options: { radius: 50 } }).createGraphPlot({ labels: { field: "label" } });
const graphics = p => p.graphicSpec.objects.graphPlot.items;
const resource = (p, kind) => p.semanticSpec.resources.find(item => item.kind === kind);

test("graph plots retain distinct node, parallel-edge, loop and arrow identities", () => {
  const p = base(), items = resolveMarkItems(p, "graphPlot");
  assert.equal(items.length, 6); assert.equal(graphics(p).length, 12);
  assert.deepEqual(items.map(item => item.role), ["edge", "edge", "edge", "node", "node", "node"]);
  assert.deepEqual(items.slice(3).map(item => item.fields.degree), [4, 2, 0]);
  assert.equal(new Set(items.map(item => item.key)).size, 6);
  assert.ok(items.slice(0, 3).every(item => item.graphicIds.length === 2 && item.rows.every(row => row.data === "edges")));
  assert.ok(items.slice(3).every(item => item.graphicIds.length === 2 && item.rows.every(row => row.data === "nodes")));
  assert.deepEqual(graphics(p).filter(item => item.type === "text").map(item => item.properties.text), ["Alpha", "Beta", "Gamma"]);
  assert.equal(getMarkItems(p).length, 6);
  assert.equal(exportAccessibleData(p).views[0].rows.length, 6);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
  assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(p)), { format: "canvas" }), createTransitionScene(p, { format: "canvas" }));
  assert.equal(typeof basicChart().createGraphPlot, "undefined");
  assert.deepEqual(p.trace.children.at(-1).children.map(node => node.op), ["editSemantic", "editSemantic", "editSemantic", "materializeGraphPlot"]);
});

test("graph revisions rematerialize exact layout and row lineage while preserving old programs", () => {
  const p = base(), snapshot = serializeProgram(p), layout = resource(p, "layout");
  const q = p.reviseData({ source: "nodes", id: "nodes2", values: [...nodes].reverse().map(node => ({ ...node, label: `${node.label}!` })) });
  assert.equal(resource(q, "layout").revision, 1);
  assert.equal(q.semanticSpec.layers[0].graphBinding.layout.revision, 1);
  assert.ok(graphics(q).every(item => item.identity.lineage.resource.revision === 1));
  assert.deepEqual(graphics(q).filter(item => item.type === "text").map(item => item.properties.text), ["Gamma!", "Beta!", "Alpha!"]);
  assert.ok(resolveMarkItems(q, "graphPlot").filter(item => item.role === "node").every(item => item.rows.some(row => row.data === "nodes2")));
  const r = q.editLayout({ options: { radius: 75 } });
  assert.notDeepEqual(graphics(r), graphics(q)); assert.equal(resource(r, "layout").revision, 2);
  assert.equal(resource(p, "layout"), layout); assert.equal(serializeProgram(p), snapshot);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(r))), renderToSVG(r));
});

test("graph highlights color a complete edge including its arrow and survive reorder", () => {
  const p = base(), q = p.highlightMarks({ id: "picked", target: "graphPlot", select: { rows: { data: "edges", indices: [1] } }, color: "red", strokeWidth: 4, offset: { x: 2, y: 3 } });
  const selected = graphics(q).filter(item => item.properties.stroke === "red" || item.properties.fill === "red");
  assert.equal(selected.length, 2); assert.equal(selected[0].identity.key, selected[1].identity.key);
  assert.equal(selected[1].properties.strokeWidth, 0);
  assert.equal(renderToSVG(q.removeMarkHighlight({ selection: "picked" })), renderToSVG(p));
  const r = q.reviseData({ source: "edges", id: "edges2", values: [...edges].reverse() });
  const red = graphics(r).filter(item => item.properties.stroke === "red" || item.properties.fill === "red");
  assert.equal(red.length, 2); assert.ok(red.every(item => item.identity.key === selected[0].identity.key));
  const node = p.highlightMarks({ id: "node", target: "graphPlot", select: { field: "key", op: "eq", value: "a" }, color: "red", dimOthers: true });
  assert.equal(graphics(node).filter(item => item.properties.stroke === "red").length, 1);
  assert.equal(graphics(node).filter(item => item.type === "text" && item.properties.fill === "red").length, 0);
  assert.throws(() => p.highlightMarks({ target: "graphPlot", select: { field: "kind", op: "eq", value: "edge" }, fill: "red" }));
});

test("plot edits and Canvas reflow preserve the stored solver result", () => {
  const p = base(), layout = resource(p, "layout"), q = p.editCanvas({ width: 600 });
  assert.equal(resource(q, "layout"), layout);
  const before = graphics(p).find(item => item.type === "circle"), after = graphics(q).find(item => item.type === "circle");
  assert.ok(Math.abs(after.properties.x - before.properties.x - 100) < 1e-10);
  const styled = p.editGraphPlot({ origin: [20, 30], clip: true, nodes: { overrides: [{ key: "a", fill: "orange" }] }, labels: false, edges: { arrows: false } });
  assert.equal(resource(styled, "layout"), layout); assert.equal(graphics(styled).length, 6);
  assert.deepEqual(styled.graphicSpec.objects.graphPlot.clip, { x: 0, y: 0, width: 400, height: 300 });
  assert.deepEqual(graphics(styled.editCanvas({ width: 600 })), graphics(styled));
  const restored = styled.editGraphPlot({ labels: { overrides: [{ key: "a", text: "Chosen", fill: "purple" }] }, edges: { arrows: "auto" } });
  assert.equal(graphics(restored).find(item => item.type === "text").properties.text, "Chosen");
  assert.equal(graphics(restored).find(item => item.type === "text").properties.fill, "purple");
});

test("scalar label and style failures preflight without mutating trace or state", () => {
  const p = base(), snapshot = serializeProgram(p), trace = p.trace;
  for (const run of [
    () => p.editGraphPlot({}), () => p.editGraphPlot({ labels: { field: "missing" } }),
    () => p.editGraphPlot({ labels: { offset: [0] } }), () => p.editGraphPlot({ nodes: { radius: -1 } }),
    () => p.editGraphPlot({ nodes: { overrides: [{ key: "missing" }] } }),
    () => p.editGraphPlot({ nodes: { overrides: [{ key: "a" }, { key: "a" }] } }),
    () => p.editGraphPlot({ edges: { arrows: null } }), () => p.editGraphPlot({ origin: undefined }),
    () => p.editGraphData({ definition: { attributes: [] } }),
    () => p.reviseData({ source: "nodes", id: "invalid", values: nodes.map(node => ({ ...node, label: {} })) })
  ]) { assert.throws(run); assert.equal(serializeProgram(p), snapshot); assert.equal(p.trace, trace); }
});

test("orphan node styles remain dormant and report their exact keys", () => {
  const p = base().editGraphPlot({ nodes: { overrides: [{ key: "c", fill: "orange" }] }, labels: { overrides: [{ key: "c", text: "Chosen" }] } });
  const q = p.reviseData({ source: "nodes", id: "nodes2", values: nodes.slice(0, 2) });
  const resolved = resolveGraphPlot(q, q.semanticSpec.layers[0], q.markConfigs.graphPlot.graphPlot);
  assert.equal(resolved.diagnostics.length, 1); assert.equal(resolved.diagnostics[0].code, "orphan-style");
  assert.equal(graphics(q).some(item => item.properties.fill === "orange"), false);
  const r = q.reviseData({ source: "nodes2", id: "nodes3", values: nodes });
  assert.equal(graphics(r).filter(item => item.properties.fill === "orange").length, 1);
});

test("graph plot restoration rejects tampered config, binding, labels and mark type", () => {
  const p = base(), envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
  for (const mutate of [
    state => { state.semanticSpec.layers[0].graphBinding.layout.revision++; },
    state => { state.semanticSpec.layers[0].mark.type = "tree"; },
    state => { state.semanticSpec.layers[0].graphLabels.field = "missing"; },
    state => { state.materializationConfigs.marks.graphPlot.graphPlot.nodes.radius = NaN; },
    state => { state.materializationConfigs.marks.graphPlot.graphPlot.edges.extra = true; }
  ]) { const changed = structuredClone(state); mutate(changed); assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) }))); }
});

test("all public fixed examples have exact item counts and graph inspection refs", () => {
  for (const id of ["directed", "parallel", "self-loop"]) {
    const p = createGraph(id), items = getMarkItems(p);
    assert.equal(items.length, id === "parallel" ? 4 : id === "directed" ? 3 : 2);
    const report = inspectProgram(p);
    assert.ok(JSON.stringify(report).includes('"logicalDataItems":' + items.length));
    assert.ok(JSON.stringify(report).includes('"kind":"graph"'));
  }
});

test("scoped plot and layout edits update only the intended composition child", () => {
  const p = base(), composition = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = composition.editGraphPlot({ target: { childPath: ["left"], id: "graphPlot" }, labels: false });
  assert.equal(q.children.right, p); assert.equal(graphics(q.children.left).filter(item => item.type === "text").length, 0);
  const r = q.editLayout({ target: { childPath: ["left"], id: "l" }, options: { radius: 10 } });
  assert.equal(r.children.right, p); assert.notDeepEqual(graphics(r.children.left), graphics(q.children.left));
  assert.throws(() => p.removeResource({ kind: "layout", id: "l" }));
  assert.throws(() => p.removeResource({ kind: "layout", id: "l", cascade: true }), /mark/);
  const removed = p.removeMark({ target: "graphPlot" }).removeResource({ kind: "layout", id: "l", cascade: true });
  assert.equal(removed.semanticSpec.layers.length, 0); assert.equal(removed.graphicSpec.objects.graphPlot, undefined);
});

test("empty graphs retain empty views and source-only rows keep their own dataset role", () => {
  const empty = chart().createCanvas().createData({ id: "nodes", values: [] }).createData({ id: "edges", values: [] })
    .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "l", method: "circular" }).createGraphPlot();
  assert.deepEqual(graphics(empty), []); assert.deepEqual(getMarkItems(empty), []);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(empty))), serializeProgram(empty));
  const p = base(), sourceItems = resolveMarkSourceItems(p, "graphPlot");
  assert.deepEqual(sourceItems.map(item => item.key), resolveMarkItems(p, "graphPlot").map(item => item.key));
  assert.equal(sourceItems.filter(item => item.role === "node")[0].rows[0].data, "nodes");
  assert.equal(sourceItems.filter(item => item.role === "edge")[0].rows[0].data, "edges");
  assert.throws(() => resolveMarkItems(p.editGraphics({ target: "graphPlot", property: "items", value: [] }), "graphPlot"), /stale/);
  assert.throws(() => resolveMarkItems(p.editGraphics({ target: "graphPlot", remove: true }), "graphPlot"), /materialized/);
  assert.throws(() => p.materializeGraphPlot({ id: "missing" }));
});

test("typed compound keys and scalar labels preserve values instead of parsing identity strings", () => {
  const values = [{ group: "g", id: 1, label: null }, { group: "g", id: "1", label: true }, { group: "h", id: 2, label: 2n }];
  const p = chart().createCanvas({ width: 240, height: 180 }).createData({ id: "n", values, keyFields: ["group", "id"] })
    .createData({ id: "e", values: [] }).createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: ["group", "id"], source: "from", target: "to", attributes: ["label"] })
    .layoutGraph({ id: "l", method: "circular" }).createGraphPlot({ labels: {} });
  assert.deepEqual(graphics(p).filter(item => item.type === "text").map(item => item.properties.text), ['["g",1]', '["g","1"]', '["h",2]']);
  const q = p.editGraphPlot({ labels: { field: "label" }, nodes: { overrides: [{ key: ["g", 1], fill: "red" }] } });
  assert.deepEqual(graphics(q).filter(item => item.type === "text").map(item => item.properties.text), ["", "true", "2"]);
  assert.equal(graphics(q).filter(item => item.properties.fill === "red").length, 1);
  assert.deepEqual(getMarkItems(q).map(item => item.fields.key), [["g", 1], ["g", "1"], ["h", 2]]);
});

test("graph border highlights preserve label typography and reject unsupported dash", () => {
  const p = base(), q = p.highlightMarks({ id: "nodes", target: "graphPlot", select: { field: "kind", op: "eq", value: "node" }, stroke: "red", opacity: 0.4 });
  assert.ok(graphics(q).filter(item => item.type === "circle").every(item => item.properties.opacity === 0.4 && item.properties.stroke === "red"));
  assert.ok(graphics(q).filter(item => item.type === "text").every(item => item.properties.opacity === 0.4 && item.properties.fill === "#0f172a"));
  for (const option of ["fontSize", "strokeDash"]) assert.throws(() => p.highlightMarks({ target: "graphPlot", select: { field: "kind", op: "eq", value: "node" }, [option]: option === "fontSize" ? 20 : [2, 3] }), new RegExp(option));
});
