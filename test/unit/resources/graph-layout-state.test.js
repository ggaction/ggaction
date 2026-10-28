import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { createGraphLayoutResource } from "../../../src/materialization/graph/layoutResource.js";
import { graphLayoutResourceHandler } from "../../../src/materialization/graph/layoutState.js";
import { layoutResourceHandler } from "../../../src/materialization/layoutState.js";

function fixture() {
  const program = chart().createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }, { id: "c" }] })
    .createData({ id: "edges", values: [{ source: "a", target: "b" }] })
    .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target" });
  return { program, graph: program.semanticSpec.resources[0] };
}
function validate(program, resource) {
  graphLayoutResourceHandler.validateStored(resource);
  graphLayoutResourceHandler.validateBindings(program, resource);
}

test("stored layout dispatch requires exactly one supported source domain", () => {
  const { program, graph } = fixture();
  const resource = createGraphLayoutResource({ id: "layout", graph, intent: { method: "circular" } });
  for (const inputs of [[], [{ kind: "data", id: "nodes", revision: 0 }], [resource.inputs[0], resource.inputs[0]]]) {
    const invalid = { ...resource, inputs };
    assert.throws(() => layoutResourceHandler.validateStored(invalid), /layout|Layout/);
    assert.throws(() => layoutResourceHandler.validateBindings(program, invalid), /layout|Layout/);
  }
});

test("stored fixed, circular and force layouts validate exact graph bindings without re-running solvers", () => {
  const { program, graph } = fixture();
  for (const intent of [{ method: "fixed", options: { positions: [{key:"a",x:1,y:2},{key:"b",x:3,y:4},{key:"c",x:5,y:6}] } },
    { method: "circular", options: { startAngle: 17, radius: 13 } },
    { method: "force", options: { seed: 4, iterations: 2, pinned: [{key:"a",fx:1,fy:2}] } }]) {
    const resource = createGraphLayoutResource({ id: "layout", graph, intent });
    validate(program, resource);
    assert.throws(() => validate(program, { ...resource, inputs: [{ ...resource.inputs[0], revision: 10 }] }));
    const changed = structuredClone(resource); changed.result.nodes[0].x = Infinity;
    assert.throws(() => validate(program, changed));
  }
});

test("layout validation rejects forged options, node membership, provenance and packing", () => {
  const { program, graph } = fixture();
  const resource = createGraphLayoutResource({ id: "layout", graph, intent: { method: "force", options: { iterations: 0, pinned: [{ key: "a", fx: 1, fy: 2 }] } } });
  const mutations = [
    r => { r.options.options.seed = undefined; }, r => { r.options.extra = 1; }, r => { r.result.extra = 1; },
    r => { r.result.algorithm = "unknown"; }, r => { r.provenance.sourceRows = []; },
    r => { r.inputs = []; }, r => { r.ownership.mode = "generated"; },
    r => { r.result.nodes[0].key = "unknown"; }, r => { r.result.nodes[0].key = r.result.nodes[1].key; },
    r => { r.result.nodes.pop(); }, r => { r.result.packing.gap += 1; },
    r => { r.result.packing.components[0].pinned = false; }, r => { r.result.packing.components[0].bounds.left += 1; },
    r => { r.result.packing.components[0].nodeIndices.push(999); }, r => { r.result.packing.components.pop(); },
    r => { r.options.options.pinned[0].fx = 100; }
  ];
  for (const mutate of mutations) { const invalid = structuredClone(resource); mutate(invalid); assert.throws(() => validate(program, invalid)); }
  const circular = createGraphLayoutResource({ id: "layout", graph, intent: { method: "circular" } });
  assert.throws(() => validate(program, { ...circular, result: { ...circular.result, packing: {} } }));
  const moved = structuredClone(circular); moved.result.nodes[0].x += 1; assert.throws(() => validate(program, moved));
});
