import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { createFlow } from "../../../examples/flow-layouts/program.js";
import { flowLayoutResourceHandler } from "../../../src/materialization/flow/layoutState.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { resolveFlowCoordinate, resolveFlowLayerResources } from "../../../src/selectors/flow.js";
import { resolveMarkItems } from "../../../src/materialization/selection/policies/index.js";

const validate = (p, r) => { flowLayoutResourceHandler.validateStored(r); flowLayoutResourceHandler.validateBindings(p, r); };
const layout = p => p.semanticSpec.resources.find(r => r.kind === "layout");

test("stored flow layout rejects malformed quantities, memberships and foreign resource identity", () => {
  const p = createFlow(), source = layout(p);
  const mutations = [
    r => { r.kind = "graph"; }, r => { r.inputs = []; }, r => { r.inputs[0].kind = "hierarchy"; },
    r => { r.ownership.mode = "generated"; }, r => { r.provenance.origin = "authored"; },
    r => { r.options.unknown = true; }, r => { delete r.options.options.nodeWidth; },
    r => { r.result.algorithm = "unknown"; }, r => { r.result.scale = -1; },
    r => { r.result.nodes[0].y = Infinity; }, r => { r.result.nodes[0].key = ""; },
    r => { r.result.nodes[0].key = r.result.nodes[1].key; }, r => { r.result.nodes[0].throughput = -1; },
    r => { r.result.nodes[0].order = .5; }, r => { r.result.nodes[0].rank = -1; },
    r => { r.result.nodes[0].imbalance += 1; }, r => { r.result.nodes.pop(); },
    r => { r.result.nodes[1].order = 0; }, r => { r.result.nodes[0].x += 1; },
    r => { r.result.edges[0].key = ""; }, r => { r.result.edges[1].key = r.result.edges[0].key; },
    r => { r.result.edges[0].thickness = -1; }, r => { r.result.edges[0].route = "unknown"; },
    r => { r.result.edges[0].source.x = Infinity; }, r => { r.result.edges[0].lane = {}; },
    r => { r.result.columns[0].keys = ["duplicate", "duplicate"]; }, r => { r.result.columns[0].rank = -.5; },
    r => { r.result.columns[0].keys = [""]; }, r => { r.result.columns[0].keys = "bad"; },
    r => { r.provenance.sourceRows = []; }, r => { r.result.components[0].rank += 1; },
    r => { r.result.bounds.top = Infinity; }
  ];
  for (const mutate of mutations) { const changed = structuredClone(source); mutate(changed); assert.throws(() => validate(p, changed)); }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec, p.semanticSpec);
});

test("stored flow order covers explicit typed keys and barycentric position checks", () => {
  for (const order of [["Total", "Supply B", "Supply A"], "barycentric"]) {
    const p = createFlow().editLayout({ options: { order, iterations: 3 } }), stored = layout(p);
    validate(p, stored);
    const changed = structuredClone(stored); changed.result.nodes[0].y = changed.result.nodes[1].y;
    assert.throws(() => validate(p, changed), /overlap|order/);
    if (Array.isArray(order)) {
      const changed = structuredClone(stored); changed.options.options.order[0] = "unknown";
      assert.throws(() => validate(p, changed), /order/);
    }
  }
  const p = createFlow(), changed = structuredClone(layout(p)); changed.options.options.nodePadding = 1000;
  assert.throws(() => validate(p, changed));
});

test("cyclic restoration rejects malformed lane sides, coordinates and stale routes", () => {
  const p = createFlow("cyclic"), stored = layout(p);
  for (const mutate of [r => { r.result.edges[0].lane.side = "left"; }, r => { r.result.edges[0].lane.index = -1; },
    r => { r.result.edges[0].lane.center = Infinity; }, r => { r.result.edges[0].lane.sourceX += 1; },
    r => { r.result.edges[0].route = "loop"; }, r => { r.result.edges[0].lane.extra = 1; }]) {
    const changed = structuredClone(stored); mutate(changed); assert.throws(() => validate(p, changed));
  }
});

test("malformed stored flow labels, paint and bindings cannot bypass public validation", () => {
  const p = createFlow(), envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
  const mutations = [
    s => { s.semanticSpec.layers[1].mark.type = "point"; }, s => { s.semanticSpec.layers[1].extra = true; },
    s => { s.semanticSpec.layers[1].flowLabels.content = { field: "" }; },
    s => { s.semanticSpec.layers[1].flowLabels.overrides = [{ key: "x", text: 3 }]; },
    s => { s.materializationConfigs.marks.flowNodes.flowPlot.clip = 1; },
    s => { delete s.materializationConfigs.marks.flowNodes.flowPlot.body.fill; },
    s => { s.materializationConfigs.marks.flowNodes.flowPlot.body.overrides = [{ key: "x" }, { key: "x" }]; },
    s => { s.materializationConfigs.marks.flowNodes.flowPlot.labels.offset = [0]; },
    s => { s.semanticSpec.layers[1].flowLabels = false; },
    s => { s.semanticSpec.layers[0].flowLabels = { content: "key", overrides: [] }; },
    s => { s.materializationConfigs.marks.flowNodes.flowPlot.labels.fontSize = -1; }
  ];
  for (const mutate of mutations) { const changed = structuredClone(state); mutate(changed); assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) }))); }
});

test("flow targets reject incompatible coordinates, layout families and stale selection graphics", () => {
  const p = createFlow(), original = serializeProgram(p);
  const polar = p.createCoordinate({ id: "polar", type: "polar" });
  assert.throws(() => polar.editFlowNodes({ coordinate: "polar" }), /Cartesian/);
  const custom = p.createCoordinate({ id: "other", type: "cartesian" });
  assert.equal(resolveFlowCoordinate(custom).id, "other");
  assert.equal(resolveFlowCoordinate({ ...custom, context: {} }, "main").id, "main");
  assert.throws(() => resolveFlowCoordinate({ ...custom, context: {} }), /ambiguous/);
  const only = { ...p, context: {} }; assert.equal(resolveFlowCoordinate(only).id, "main");
  const conflict = chart().createCoordinate({ id: "main", type: "polar" });
  assert.throws(() => resolveFlowCoordinate(conflict), /conflicts/);
  const circle = p.layoutGraph({ id: "circle", graph: "flow", method: "circular" });
  assert.throws(() => circle.editFlowLinks({ layout: "circle" }), /incompatible/);
  const layer = { ...p.semanticSpec.layers[0], flowBinding: { layout: { kind: "layout", id: "circle", revision: 0 } } };
  assert.throws(() => resolveFlowLayerResources(circle, layer), /DAG/);
  // A layout reference alone does not establish its graph-input eligibility.
  // Read-only consumers must reject malformed envelopes before resolving inputs.
  for (const inputs of [[], [{ kind: "hierarchy", id: "flow", revision: 0 }]]) {
    const malformed = { ...p, semanticSpec: { ...p.semanticSpec, resources: p.semanticSpec.resources.map(resource =>
      resource.kind === "layout" ? { ...resource, inputs } : resource) } };
    assert.throws(() => resolveFlowLayerResources(malformed, p.semanticSpec.layers[0]), /DAG or cyclic graph layout/);
  }
  for (const roles of [undefined, {}, { edges: 1 }]) {
    const malformed = { ...p, semanticSpec: { ...p.semanticSpec, resources: p.semanticSpec.resources.map(resource =>
      resource.kind === "graph" ? { ...resource, options: { ...resource.options, roles } } : resource) } };
    assert.throws(() => resolveFlowLayerResources(malformed, p.semanticSpec.layers[0]));
  }
  const stale = p._clone({ graphicSpec: { ...p.graphicSpec, objects: { ...p.graphicSpec.objects, flowLinks: { ...p.graphicSpec.objects.flowLinks, items: [] } } } });
  assert.throws(() => resolveMarkItems(stale, "flowLinks"), /stale/);
  const absent = { ...p.graphicSpec.objects }; delete absent.flowLinks;
  assert.throws(() => resolveMarkItems(p._clone({ graphicSpec: { ...p.graphicSpec, objects: absent } }), "flowLinks"), /materialized/);
  assert.equal(serializeProgram(p), original);
});
