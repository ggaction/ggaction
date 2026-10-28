import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
import { validateResourceGraph } from "../../../src/materialization/resourceState.js";
import { flowRibbonCommands } from "../../../src/grammar/flow/ribbon.js";

const nodes = [{ id: "a", label: "Input" }, { id: "b", label: "First" }, { id: "c", label: "Second" }];
const edges = [{ id: "ab", s: "a", t: "b", v: 3 }, { id: "ac", s: "a", t: "c", v: 1 }];
function fixture(method = "dag", orientation = "horizontal") {
  return chart().createCanvas({ width: 240, height: 200, margin: 20 })
    .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: method === "cyclic" ? [...edges, { id: "ba", s: "b", t: "a", v: 2 }] : edges, keyField: "id" })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "s", target: "t", value: "v" })
    .layoutFlow({ id: "layout", method, options: { width: 100, height: 80, nodeWidth: 10, iterations: 0, orientation } });
}
const plot = (method, orientation) => fixture(method, orientation).createFlowLinks({}).createFlowNodes({ labels: {} });
const bodies = (program, id = "flowNodes") => program.graphicSpec.objects[id].items.filter(item => item.identity.role === "body");

test("public flow nodes and ribbons share one literal frame and resource identities", () => {
  const program = plot();
  assert.deepEqual(bodies(program).map(item => [item.properties.x, item.properties.y, item.properties.width, item.properties.height]), [[20, 28, 20, 144], [200, 20, 20, 108], [200, 144, 20, 36]]);
  const commands = bodies(program, "flowLinks")[0].properties.commands;
  assert.deepEqual(commands[0], { op: "M", x: 40, y: 28 });
  assert.deepEqual(commands[2], { op: "L", x: 200, y: 128 });
  assert.deepEqual(commands.at(-1), { op: "Z" });
  assert.equal(program.graphicSpec.objects.flowNodes.items.length, 6);
  assert.equal(getMarkItems(program, { target: "flowNodes" }).length, 3);
  assert.equal(getMarkItems(program, { target: "flowLinks" }).length, 2);
  assert.ok(bodies(program).every(item => item.identity.lineage.resource.id === "layout"));
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(program))), renderToSVG(program));
});

test("closed ribbons retain source width and transpose both cubic and cyclic geometry", () => {
  for (const method of ["dag", "cyclic"]) for (const orientation of ["horizontal", "vertical"]) {
    const program = plot(method, orientation), layout = program.semanticSpec.resources.find(item => item.kind === "layout");
    for (const edge of layout.result.edges) {
      const commands = flowRibbonCommands(edge, orientation);
      assert.equal(commands[0].op, "M"); assert.equal(commands.at(-1).op, "Z");
      assert.ok(commands.every(command => Object.entries(command).every(([key, value]) => key === "op" || Number.isFinite(value))));
      if (edge.route === "forward") assert.equal(commands.filter(command => command.op === "C").length, 2);
    }
    assert.equal(bodies(program, "flowLinks").length, method === "cyclic" ? 3 : 2);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(program))), renderToSVG(program));
  }
});

test("flow style and label edits preserve numerical layout and support typed overrides", () => {
  const program = plot(), snapshot = serializeProgram(program), layout = program.semanticSpec.resources.find(item => item.kind === "layout");
  const next = program.editFlowNodes({ nodes: { opacity: 0, overrides: [{ key: "b", fill: "orange" }] }, labels: { content: { field: "label" }, overrides: [{ key: "a", text: "Source" }] } })
    .editFlowLinks({ links: { fill: "red", overrides: [{ key: "ac", fill: "blue" }] }, clip: false });
  assert.equal(next.semanticSpec.resources.find(item => item.kind === "layout"), layout);
  assert.equal(bodies(next)[1].properties.fill, "orange"); assert.ok(bodies(next).every(item => item.properties.opacity === 0));
  assert.deepEqual(next.graphicSpec.objects.flowNodes.items.filter(item => item.type === "text").map(item => item.properties.text), ["Source", "First", "Second"]);
  assert.equal(bodies(next, "flowLinks")[1].properties.fill, "blue");
  assert.equal(next.editFlowNodes({ labels: false }).graphicSpec.objects.flowNodes.items.length, 3);
  assert.equal(serializeProgram(program), snapshot);
});

test("flow structured fills use the shared object and plot paint materializer", () => {
  const pattern = { type: "pattern", style: "diagonal", pitch: 8, strokeWidth: 1, foreground: "black", background: "white" };
  const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, radius: .5, stops: [{ offset: 0, color: "white" }, { offset: 1, color: "navy" }] };
  const program = fixture().createFlowLinks({ links: { fill: pattern } }).createFlowNodes({ nodes: { fill: radial }, labels: { fill: radial } });
  assert.equal(bodies(program, "flowLinks")[0].properties.fill.type, "pattern");
  assert.ok(bodies(program, "flowLinks")[0].properties.fill.origin);
  assert.ok(program.graphicSpec.objects.flowNodes.items.find(item => item.type === "text").properties.fillBounds);
  assert.match(renderToSVG(program), /pattern/);
});

test("source and layout revisions update both flow consumers once and retain old state", () => {
  const program = plot(), snapshot = serializeProgram(program);
  const next = program.reviseData({ source: "edges", id: "edges2", values: edges.map(row => ({ ...row, v: row.v * 2 })) });
  assert.ok(next.semanticSpec.layers.every(layer => layer.flowBinding.layout.revision === 1));
  assert.ok(bodies(next).every(item => item.identity.lineage.resource.revision === 1));
  assert.deepEqual(bodies(next).map(item => item.properties), bodies(program).map(item => item.properties));
  const widened = next.editLayout({ options: { nodeWidth: 20 } });
  assert.ok(bodies(widened).every(item => item.properties.width === 40));
  const resized = widened.editCanvas({ width: 440, height: 360 });
  assert.equal(resized.semanticSpec.resources.find(item => item.kind === "layout"), widened.semanticSpec.resources.find(item => item.kind === "layout"));
  assert.ok(bodies(resized)[0].properties.width > bodies(widened)[0].properties.width);
  assert.equal(serializeProgram(program), snapshot);
});

test("flow item highlights include node labels, preserve links and replay after resize", () => {
  const program = plot(), links = bodies(program, "flowLinks");
  const selected = program.highlightMarks({ id: "picked", target: "flowNodes", select: { field: "id", op: "eq", value: "b" }, fill: "red" });
  assert.equal(selected.graphicSpec.objects.flowNodes.items.filter(item => item.properties.fill === "red").length, 2);
  assert.deepEqual(bodies(selected, "flowLinks"), links);
  const resized = selected.editCanvas({ width: 400 });
  assert.equal(resized.graphicSpec.objects.flowNodes.items.filter(item => item.properties.fill === "red").length, 2);
  assert.equal(renderToSVG(selected.removeMarkHighlight({ selection: "picked" })), renderToSVG(program));
  const linkSelection = program.highlightMarks({ id: "link", target: "flowLinks", select: { field: "target", op: "eq", value: "c" }, fill: "green" });
  assert.equal(bodies(linkSelection, "flowLinks").filter(item => item.properties.fill === "green").length, 1);
});

test("flow removals and composition scope preserve independent shared consumers", () => {
  const child = plot();
  assert.throws(() => child.removeResource({ kind: "layout", id: "layout", cascade: true }), /mark/);
  const removed = child.removeMark({ target: "flowLinks" });
  assert.ok(removed.graphicSpec.objects.flowNodes);
  assert.equal(removed.removeMark({ target: "flowNodes" }).removeResource({ kind: "layout", id: "layout" }).semanticSpec.resources.length, 1);
  const composite = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const edited = composite.editFlowNodes({ target: { childPath: ["left"], id: "flowNodes" }, nodes: { fill: "red" } });
  assert.equal(bodies(edited.children.left)[0].properties.fill, "red"); assert.equal(edited.children.right, child);
});

test("invalid flow visual edits and malformed restoration fail atomically", () => {
  const program = plot(), snapshot = serializeProgram(program), trace = program.trace;
  for (const run of [
    () => program.editFlowNodes({}), () => program.editFlowLinks({ links: { strokeWidth: -1 } }),
    () => program.editFlowNodes({ nodes: { overrides: [{ key: "missing", fill: "red" }] } }),
    () => program.editFlowNodes({ labels: { content: { field: "missing" } } }),
    () => program.createFlowNodes({}), () => program.createFlowLinks({ id: "second", layout: "missing" }),
    () => program.encodeX({ target: "flowNodes", field: "v" })
  ]) { assert.throws(run); assert.equal(serializeProgram(program), snapshot); assert.equal(program.trace, trace); }
  for (const mutate of [
    state => { delete state.semanticSpec.layers[0].flowBinding; },
    state => { state.semanticSpec.layers[0].flowBinding.layout.revision += 1; },
    state => { state.semanticSpec.layers[0].flowLabels = {}; },
    state => { state.materializationConfigs.marks.flowNodes.flowPlot.body.strokeWidth = -1; }
  ]) {
    const state = structuredClone({ semanticSpec: program.semanticSpec, materializationConfigs: program.materializationConfigs }); mutate(state);
    assert.throws(() => validateResourceGraph(program._clone(state)));
  }
});

test("flow revision closure leaves unrelated layout consumers and ordinary marks untouched", () => {
  const p = plot().createData({ id: "points", values: [{ x: 1, y: 2 }] })
    .createScatterPlot({ id: "pointsMark", data: "points", x: "x", y: "y", guides: false })
    .createData({ id: "otherNodes", values: [{ id: "d" }, { id: "e" }] })
    .createData({ id: "otherEdges", values: [{ s: "d", t: "e", v: 1 }] })
    .createFlowData({ id: "otherFlow", nodes: "otherNodes", edges: "otherEdges", nodeKey: "id", source: "s", target: "t", value: "v" })
    .layoutFlow({ id: "otherLayout", graph: "otherFlow", method: "dag" })
    .createFlowNodes({ id: "otherMark", layout: "otherLayout" });
  const q = p.editLayout({ target: "layout", options: { nodeWidth: 20 } })
    .editFlowData({ target: "flow", definition: { balance: "strict" } });
  assert.equal(q.graphicSpec.objects.pointsMark, p.graphicSpec.objects.pointsMark);
  assert.equal(q.graphicSpec.objects.otherMark, p.graphicSpec.objects.otherMark);
  assert.equal(q.semanticSpec.resources.find(r => r.id === "otherLayout"), p.semanticSpec.resources.find(r => r.id === "otherLayout"));
});

test("flow self-loop ribbons remain finite for zero values and zero lane spacing", () => {
  for (const value of [0, 1]) for (const laneGap of [0, 8]) {
    const p = chart().createCanvas().createData({ id: "n", values: [{ id: "a" }] })
      .createData({ id: "e", values: [{ s: "a", t: "a", value }] })
      .createFlowData({ id: "f", nodes: "n", edges: "e", nodeKey: "id", source: "s", target: "t", value: "value", selfLoops: true })
      .layoutFlow({ id: "l", method: "cyclic", options: { laneGap } }).createFlowLinks().createFlowNodes();
    assert.equal(p.graphicSpec.objects.flowLinks.items.length, 1);
    for (const command of p.graphicSpec.objects.flowLinks.items[0].properties.commands) {
      assert.ok(Object.entries(command).every(([key, value]) => key === "op" || Number.isFinite(value)));
    }
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
  }
});


test("flow vertical composition permits exact child edits while automatic partitions reject atomically", () => {
  const child = plot(), snapshot = serializeProgram(child), trace = child.trace;
  const composite = vconcat({ programs: [{ id: "top", program: child }, { id: "bottom", program: child }] });
  const edited = composite.editFlowLinks({ target: { childPath: ["bottom"], id: "flowLinks" }, links: { opacity: 0 } });
  assert.equal(edited.children.top, child);
  assert.ok(bodies(edited.children.bottom, "flowLinks").every(item => item.properties.opacity === 0));
  for (const run of [
    () => child.facet({ field: "id" }),
    () => child.repeatCharts({ target: "flowNodes", channel: "x", fields: ["id", "value"] })
  ]) {
    assert.throws(run, /does not support mark.*flow-link/);
    assert.equal(serializeProgram(child), snapshot);
    assert.equal(child.trace, trace);
  }
});
