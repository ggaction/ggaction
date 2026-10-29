import test from "node:test";
import assert from "node:assert/strict";
import { createTree } from "../../../examples/tree-layouts/program.js";
import { createTreemap } from "../../../examples/treemap-layouts/program.js";
import { createPartition } from "../../../examples/partition-layouts/program.js";
import { createGraph } from "../../../examples/graph-plots/program.js";
import { createFlow } from "../../../examples/flow-layouts/program.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems } from "../../../src/inspection.js";

const outline = { color: "white", width: 8 }, shadow = { color: "#1238", offsetX: 4, offsetY: -3, blurRadius: 2 };
const cases = [
  ["tree", createTree, "editTreePlot", "nodes"], ["treemap", createTreemap, "editTreemapPlot", "cells"],
  ["icicle", () => createPartition("icicle"), "editPartitionPlot", "cells"],
  ["sunburst", () => createPartition("sunburst"), "editPartitionPlot", "cells"],
  ["graph", createGraph, "editGraphPlot", "nodes"], ["flow-node", createFlow, "editFlowNodes", "nodes"],
  ["flow-link", createFlow, "editFlowLinks", "links"]
];
for (const [name, create, edit, body] of cases) {
  test(`${name} role effects preserve identities, layout and exact removal through restore`, () => {
    const p = create(), before = serializeProgram(p), layer = p.semanticSpec.layers.find(layer =>
      name === "flow-node" || name === "flow-link" ? layer.mark.type === name : layer.mark.type !== "text");
    const id = layer.id, labels = name !== "flow-link";
    const q = p[edit]({ target: id, [body]: { outline, shadow }, ...(labels ? { labels: { outline, shadow } } : {}) });
    const children = q.graphicSpec.objects[id].items.filter(child => child.identity.role !== "link" &&
      (name !== "graph" || child.type === "circle" || child.type === "text"));
    assert.ok(children.length > 0);
    for (const child of children) { assert.deepEqual(child.properties.outline, outline); assert.deepEqual(child.properties.shadow, shadow); }
    assert.deepEqual(getMarkItems(q, { target: id }).map(item => item.key), getMarkItems(p, { target: id }).map(item => item.key));
    assert.equal(q.semanticSpec.resources, p.semanticSpec.resources);
    const restored = deserializeProgram(serializeProgram(q));
    assert.deepEqual(restored.graphicSpec, q.graphicSpec);
    const r = restored[edit]({ target: id, [body]: { outline: false, shadow: false }, ...(labels ? { labels: { outline: false, shadow: false } } : {}) });
    assert.ok(r.graphicSpec.objects[id].items.every(child => child.properties.outline === undefined && child.properties.shadow === undefined));
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
    for (const style of [{ shadow: { color: "red", blurRadius: -1 } }, { shadow: undefined }, { outline: { color: "white", width: -1 } }, { outline, stroke: "black" }]) {
      assert.throws(() => p[edit]({ target: id, [body]: style })); assert.equal(serializeProgram(p), before);
    }
    const envelope = JSON.parse(serializeProgram(q)), state = decodeValue(envelope.payload);
    const config = state.materializationConfigs.marks[id], owner = config.graphPlot ?? config.hierarchyPlot ?? config.flowPlot;
    delete owner[config.flowPlot ? "body" : body].shadow.offsetX;
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) })), /shadow|resolved/i);
  });
}

test("per-node false disables inherited effects while links reuse stroke-only shadow semantics", () => {
  const p = createGraph(), id = p.semanticSpec.layers.find(layer => layer.mark.type === "graph").id;
  const key = getMarkItems(p, { target: id }).find(item => item.fields.kind === "node").fields.key;
  const q = p.editGraphPlot({ target: id, nodes: { outline, shadow, overrides: [{ key, outline: false, shadow: false }] },
    edges: { shadow: { color: "red" } } });
  const node = getMarkItems(q, { target: id }).find(item => item.fields.kind === "node" && item.fields.key === key);
  assert.equal(node.properties.outline, undefined); assert.equal(node.properties.shadow, undefined);
  assert.ok(q.graphicSpec.objects[id].items.filter(item => item.identity.role === "arrow").every(item => item.properties.shadow.blurRadius === 0));
  const highlighted = q.highlightMarks({ target: id, select: { field: "kind", op: "eq", value: "node" }, stroke: "yellow" });
  assert.ok(highlighted.graphicSpec.objects[id].items.filter(item => item.type === "circle").every(item => item.properties.outline === undefined));
});

test("graph role and node override paints keep normalized pattern defaults with effects", () => {
  const p = createGraph(), target = p.semanticSpec.layers.find(layer => layer.mark.type === "graph").id;
  const keys = getMarkItems(p, { target }).filter(item => item.fields.kind === "node").map(item => item.fields.key);
  const fill = { type: "pattern", style: "dots", foreground: "red" };
  const q = p.editGraphPlot({ target, nodes: { fill, shadow: { color: "black" }, overrides: [{ key: keys[0], fill: { ...fill, style: "cross" } }] } });
  assert.deepEqual(fill, { type: "pattern", style: "dots", foreground: "red" });
  const nodes = q.graphicSpec.objects[target].items.filter(child => child.type === "circle");
  assert.deepEqual(nodes.map(node => node.properties.fill.style), ["cross", "dots"]);
  for (const node of nodes) {
    assert.equal(node.properties.fill.pitch, 8);
    assert.deepEqual(node.properties.fill.phase, [0, 0]);
    assert.ok(Number.isFinite(node.properties.fill.origin.x));
    assert.deepEqual(node.properties.shadow, { color: "black", offsetX: 0, offsetY: 0, blurRadius: 0 });
  }
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});
