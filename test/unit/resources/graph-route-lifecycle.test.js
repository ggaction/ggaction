import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems, inspectProgram, comparePrograms } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { createTransitionScene } from "../../../src/scene.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { resolveMarkItems } from "../../../src/materialization/selection/policies/index.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";

const get = (p, kind, id) => p.semanticSpec.resources.find(r => r.kind === kind && r.id === id);
const count = (trace, op) => (trace.op === op ? 1 : 0) + trace.children.reduce((sum, child) => sum + count(child, op), 0);

test("screen lasso keeps routed graph node identity through Canvas and source revisions", () => {
  const nodes = [{ key: "a" }, { key: "b" }];
  const p = chart().createCanvas({ width: 400, height: 300, margin: 40 })
    .createData({ id: "nodes", values: nodes, keyField: "key" })
    .createData({ id: "edges", values: [{ id: 1, s: "a", t: "b" }], keyField: "id" })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t", edgeKey: "id" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 100, y: 100 }, { key: "b", x: 250, y: 100 }] } })
    .bundleGraphEdges({ id: "route", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "plot", routes: "route", nodes: { radius: 5 }, edges: { arrows: false } })
    .selectMarks({ id: "picked", target: "plot", items: [] })
    .highlightMarks({ selection: "picked", fill: "red", dimOthers: false, bringToFront: false });
  const saved = serializeProgram(p), listeners = new Map(), captures = new Set();
  let scheduled;
  const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type),
    setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id), hasPointerCapture: id => captures.has(id),
    requestAnimationFrame: fn => { scheduled = fn; return 1; }, cancelAnimationFrame: () => { scheduled = undefined; } };
  const session = createInteractionSession({ program: p, bindings: [{ type: "lasso", target: "plot", selection: "picked" }] });
  session.mount(host);
  const node = getMarkItems(p, { target: "plot" }).find(item => item.fields.kind === "node" && item.fields.key === "a");
  const { x, y } = node.geometry[0].properties;
  const fire = (type, dx, dy) => listeners.get(type)({ pointerId: 1, pointerType: "mouse", clientX: x + dx, clientY: y + dy });
  fire("pointerdown", -10, -10); fire("pointermove", 10, -10); fire("pointermove", 10, 10); fire("pointermove", -10, 10);
  const flush = scheduled; scheduled = undefined; flush();
  const selected = program => getMarkItems(program, { target: "plot" }).filter(item => item.properties.fill === "red").map(item => item.key);
  assert.deepEqual(selected(session.getState().previewProgram), [node.key]);
  assert.equal(session.getState().program, p);
  fire("pointerup", -10, -10);
  const committed = session.getState().program;
  assert.deepEqual(selected(committed), [node.key]);
  assert.equal(session.getState().revision, 1);
  const revised = committed.editCanvas({ width: 500 }).reviseData({ source: "nodes", id: "updated", values: nodes });
  session.updateProgram(revised);
  assert.deepEqual(selected(session.getState().program), [node.key]);
  assert.equal(get(revised, "edge-route", "route").revision, 2);
  assert.deepEqual(selected(deserializeProgram(serializeProgram(revised))), [node.key]);
  assert.equal(serializeProgram(p), saved);
  session.destroy(); assert.equal(listeners.size + captures.size, 0); assert.equal(scheduled, undefined);
  assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "brush", target: "plot", selection: "picked" }] }), /explicit resolved position scale/);
});
function hierarchySource() {
  const rows = [{ key: "root", parent: null, value: 0 }, { key: "a", parent: "root", value: 1 }, { key: "b", parent: "root", value: 1 }];
  let p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createData({ id: "tree", values: rows, keyField: "key" })
    .createHierarchyData({ id: "hierarchy", data: "tree", key: "key", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "tree-layout", method: "tree", options: { nodeSize: [10, 10], siblingGap: 20, depthGap: 50, orientation: "vertical" } });
  const positions = ["a", "b"].map(key => { const node = get(p, "layout", "tree-layout").result.nodes.find(n => n.key === encodeRowKey(key)); return { key, x: node.x, y: node.y }; });
  p = p.createData({ id: "nodes", values: [{ key: "a" }, { key: "b" }] }).createData({ id: "edges", values: [{ id: 1, s: "a", t: "b" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t", edgeKey: "id" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
  return p.bundleGraphEdges({ id: "route", layout: "layout", method: "hierarchical", options: { hierarchy: "hierarchy", hierarchyLayout: "tree-layout", mapping: ["a", "b"].map(key => ({ nodeKey: key, hierarchyKey: key })) } })
    .createGraphPlot({ id: "plot", layout: "layout", routes: "route", nodes: { radius: 0 } });
}

test("hierarchy, hierarchy-layout and source revisions update their exact route consumers once", () => {
  const p = hierarchySource(), before = serializeProgram(p), old = get(p, "edge-route", "route");
  assert.equal(old.result.routes[0].provenance.hierarchyKeys.length, 3);
  for (const q of [p.editLayout({ target: "tree-layout", options: { nodeSize: [10, 10] } }),
    p.editHierarchyData({ target: "hierarchy", valueMode: "own-plus-children" }),
    p.reviseData({ source: "tree", id: "tree2", values: [{ key: "root", parent: null, value: 0 }, { key: "a", parent: "root", value: 2 }, { key: "b", parent: "root", value: 3 }] })]) {
    const resource = get(q, "edge-route", "route");
    assert.equal(resource.revision, 1); assert.equal(resource.inputs[3].revision, 1);
    assert.equal(count(q.trace.children.at(-1), "materializeGraphPlot"), 1);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  }
  assert.throws(() => p.editLayout({ target: "tree-layout", options: { depthGap: 100 } }), /match graph node positions/);
  assert.equal(serializeProgram(p), before);
  const switched = p.editEdgeRoute({ method: "force-directed" });
  assert.equal(get(switched, "edge-route", "route").inputs.length, 2);
  assert.equal(get(switched, "edge-route", "route").options.options.mapping, undefined);
  assert.throws(() => switched.editEdgeRoute({ method: "hierarchical" }), /mapping|hierarchy/);
});

test("routes preserve typed edge membership through logical selection, inspection, accessibility and hidden views", () => {
  const p = hierarchySource(), items = resolveMarkItems(p, "plot"), edge = items.find(item => item.role === "edge");
  assert.equal(edge.lineage.resource.kind, "edge-route"); assert.equal(edge.rows[0].data, "edges");
  assert.ok(items.filter(item => item.role === "node").every(item => item.lineage.resource.kind === "layout"));
  assert.equal(getMarkItems(p).length, 3); assert.equal(exportAccessibleData(p).views[0].rows.length, 3);
  const inspected = inspectProgram(p, { target: { kind: "edge-route", id: "route" } });
  assert.equal(inspected.views.length, 1); assert.ok(inspected.views[0].sourceRefs.some(ref => ref.kind === "edge-route" && ref.id === "route"));
  assert.equal(comparePrograms(p, p.editEdgeRoute({ options: { strength: 0 } }), { target: { kind: "edge-route", id: "route" } }).equivalence, "different");
  const highlighted = p.highlightMarks({ id: "edge-selection", target: "plot", select: { rows: { data: "edges", indices: [0] } }, color: "red", strokeWidth: 4 });
  assert.equal(highlighted.graphicSpec.objects.plot.items.filter(item => item.properties.stroke === "red").length, 1);
  const revised = highlighted.editEdgeRoute({ options: { strength: .5 } });
  assert.equal(revised.graphicSpec.objects.plot.items.filter(item => item.properties.stroke === "red").length, 1);
  assert.deepEqual(revised.graphicSpec.objects.plot.items.map(item => item.identity.key), highlighted.graphicSpec.objects.plot.items.map(item => item.identity.key));
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
});

test("parallel original edges remain separate hit candidates in the current sampled route frame", () => {
  const p = chart().createCanvas({ width: 200, height: 100, margin: 0 })
    .createData({ id: "n", values: [{ id: "a" }, { id: "b" }] })
    .createData({ id: "e", values: [{ id: "first", from: "a", to: "b" }, { id: "second", from: "a", to: "b" }] })
    .createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: "id", source: "from", target: "to", edgeKey: "id" })
    .layoutGraph({ id: "l", method: "fixed", options: { positions: [{ key: "a", x: 20, y: 50 }, { key: "b", x: 180, y: 50 }] } })
    .bundleGraphEdges({ id: "r", method: "edge-path" }).createGraphPlot({ id: "p", origin: [0, 0], routes: "r", nodes: { radius: 0 }, edges: { strokeWidth: 2 } });
  const snapshot = serializeProgram(p), session = createInteractionSession({ program: p });
  session.dispatch({ type: "inspect", point: { x: 100, y: 50 }, slop: 0 });
  const hit = session.getState().hit;
  assert.equal(hit.candidates.length, 2); assert.equal(new Set(hit.candidates.map(candidate => candidate.itemKey)).size, 2);
  assert.ok(hit.candidates.every(candidate => candidate.resourceRefs[0].kind === "edge-route"));
  const scene = createTransitionScene(p, { format: "canvas" });
  const moved = { ...scene, nodes: scene.nodes.map(node => node.type === "path" ? { ...node, properties: { ...node.properties, commands: node.properties.commands.map(c => ({ ...c, y: c.y + 10 })) } } : node) };
  session.dispatch({ type: "frame", scene: moved, version: 1, generation: 0 });
  session.dispatch({ type: "inspect", point: { x: 100, y: 50 }, slop: 0 }); assert.equal(session.getState().hit.candidates.length, 0);
  session.dispatch({ type: "inspect", point: { x: 100, y: 60 }, slop: 0 }); assert.equal(session.getState().hit.candidates.length, 2);
  assert.equal(serializeProgram(p), snapshot); session.destroy();
});

test("empty and coincident graph routes retain zero-length records without invented nodes or arrows", () => {
  const empty = chart().createCanvas().createData({ id: "n", values: [] }).createData({ id: "e", values: [] })
    .createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: "id", source: "s", target: "t" }).layoutGraph({ id: "l", method: "circular" });
  for (const method of ["edge-path", "density", "force-directed"]) {
    const p = empty.bundleGraphEdges({ id: "r", method }).createGraphPlot({ routes: "r" });
    assert.deepEqual(get(p, "edge-route", "r").result.routes, []); assert.deepEqual(getMarkItems(p), []);
  }
  const coincident = chart().createCanvas().createData({ id: "n", values: [{ id: "same" }] }).createData({ id: "e", values: [{ s: "same", t: "same" }] })
    .createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: "id", source: "s", target: "t", selfLoops: true, directed: true })
    .layoutGraph({ id: "l", method: "fixed", options: { positions: [{ key: "same", x: -0, y: 0 }] } })
    .bundleGraphEdges({ id: "r", method: "edge-path" }).createGraphPlot({ routes: "r" });
  assert.equal(get(coincident, "edge-route", "r").result.routes[0].provenance.reason, "zero-length");
  assert.equal(coincident.graphicSpec.objects.graphPlot.items.length, 2);
  assert.equal(coincident.graphicSpec.objects.graphPlot.items.some(item => item.identity.role === "arrow"), false);
});

test("all route methods preserve observed and inferred directed or undirected topology and survive revisions", () => {
  for (const origin of ["observed", "inferred"]) for (const directed of [false, true]) {
    let base = hierarchySource().removeMark({ target: "plot" }).removeResource({ kind: "edge-route", id: "route" });
    let graphId = "graph", layoutId = "layout";
    if (origin === "observed") base = base.editGraphData({ target: graphId, definition: { directed } });
    else {
      const previous = get(base, "layout", layoutId);
      const positions = ["a", "b"].map((key, i) => ({ key, x: previous.result.nodes[i].x, y: previous.result.nodes[i].y }));
      graphId = "inferred"; layoutId = "inferred-layout";
      base = base.createData({ id: "inferred-rows", values: [{ key: "a", group: "same", order: 0 }, { key: "b", group: "same", order: 1 }] })
        .createInferredGraphData({ id: graphId, data: "inferred-rows", nodeKey: "key", ruleId: "links", rule: directed ? "sequence" : "group", options: directed ? { orderField: "order" } : { fields: ["group"] } })
        .layoutGraph({ id: layoutId, graph: graphId, method: "fixed", options: { positions } });
    }
    const graph = get(base, "graph", graphId), layout = get(base, "layout", layoutId), saved = serializeProgram(base);
    assert.equal(graph.result.model.directed, directed);
    for (const method of ["hierarchical", "force-directed", "density", "edge-path"]) {
      const program = base.bundleGraphEdges({ id: "route", graph: graphId, layout: layoutId, method, ...(method === "hierarchical" ? { options: { hierarchy: "hierarchy", hierarchyLayout: "tree-layout", mapping: ["a", "b"].map(key => ({ nodeKey: key, hierarchyKey: key })) } } : {}) })
        .createGraphPlot({ id: "plot", layout: layoutId, routes: "route", nodes: { radius: 0 } });
      assert.equal(get(program, "graph", graphId), graph); assert.equal(get(program, "layout", layoutId), layout);
      assert.deepEqual(get(program, "edge-route", "route").result.routes.map(value => value.edgeKey), graph.result.model.edges.map(value => value.key));
      assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
      const next = program.editLayout({ target: layoutId, options: { positions: layout.options.options.positions } });
      assert.equal(get(next, "edge-route", "route").revision, 1);
      assert.equal(count(next.trace.children.at(-1), "materializeGraphPlot"), 1);
    }
    assert.equal(serializeProgram(base), saved);
  }
});
