import test from "node:test";
import assert from "node:assert/strict";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { dataInputReference } from "../../../../src/selectors/resources.js";
import { prepareGraphResource } from "../../../../src/actions/graphs/layouts.js";
import { createInferredGraphResource } from "../../../../src/materialization/graph/inferredResource.js";
import { withPreparedProjectedResourceResults, preparedResourceResults, preparedResourceDataProjection } from "../../../../src/actions/primitives/preparedResourceContext.js";

const rows = [
  { id: "a", x: 1, y: 2, group: "A", row: "top" },
  { id: "b", x: 2, y: 1, group: "A", row: "top" },
  { id: "c", x: 3, y: 3, group: "B", row: "bottom" },
  { id: "d", x: 4, y: 4, group: "B", row: "bottom" },
  { id: "e", x: 5, y: 1, group: "C", row: "bottom" }
];
const resource = (p, id) => p.semanticSpec.resources.find(value => value.id === id);
const dataset = (p, id) => p.semanticSpec.datasets.find(value => value.id === id);
function source() {
  return chart().createCanvas({ width: 300, height: 250, margin: 35 })
    .createData({ id: "rows", values: rows, keyField: "id" })
    .createInferredGraphData({ id: "sequence", data: "rows", nodeKey: "id", ruleId: "neighbors", rule: "radius", features: ["x"], metric: "euclidean", options: { radius: 2 } })
    .createInferredGraphData({ id: "tree", data: "rows", nodeKey: "id", ruleId: "backbone", rule: "mst", candidateGraph: "sequence" })
    .layoutGraph({ id: "positions", graph: "tree", method: "circular" })
    .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" });
}
function assertProjection(child, revision) {
  const local = dataset(child, child.semanticSpec.layers[0].data);
  for (const id of ["sequence", "tree"]) {
    assert.equal(resource(child, id).revision, revision);
    assert.deepEqual(resource(child, id).inputs[0], dataInputReference(local));
    assert.deepEqual(resource(child, id).result.model.nodes.map(node => node.key), local.values.map(row => encodeRowKey(row.id)));
  }
  assert.deepEqual(resource(child, "tree").inputs[1], { kind: "graph", id: "sequence", revision });
  assert.deepEqual(resource(child, "positions").inputs, [{ kind: "graph", id: "tree", revision }]);
  assert.equal(resource(child, "positions").revision, revision);
}

test("facet projections rebuild resource-only candidate graph chains and layouts once per cell", () => {
  const base = source(), saved = serializeProgram(base);
  const result = base.facet({ field: "group", columns: 2 });
  for (const child of Object.values(result.children)) assertProjection(child, 1);
  assert.equal(new Set(Object.values(result.children).map(child => dataset(child, child.semanticSpec.layers[0].data).logicalId)).size, 3);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
  assert.equal(serializeProgram(base), saved);
});

test("empty grid cells and repeat projections retain valid resource results", () => {
  const base = source();
  const grid = base.facetGrid({ rows: { field: "row" }, columns: { field: "group" }, combinations: "full" });
  for (const child of Object.values(grid.children)) assertProjection(child, 1);
  assert.equal(Object.values(grid.children).filter(child => resource(child, "sequence").result.model.nodes.length === 0).length, 3);
  const repeated = base.repeatCharts({ channel: "y", fields: ["x", "y"] });
  for (const child of Object.values(repeated.children)) {
    assert.equal(resource(child, "sequence").result.model.nodes.length, rows.length);
    assert.deepEqual(deserializeProgram(serializeProgram(child)).semanticSpec.resources, child.semanticSpec.resources);
  }
});

test("source revisions replay local graph projection through nested concat without changing siblings", () => {
  const facet = source().facet({ field: "group", columns: 2 });
  const nested = hconcat({ programs: [facet, facet] }), saved = serializeProgram(nested);
  const [left, right] = nested.compositionSpec.children;
  const next = nested.reviseData({ target: { childPath: [left] }, source: "rows", id: "revised", values: rows.map(row => ({ ...row, x: -row.x })) });
  assert.equal(next.children[right], nested.children[right]);
  for (const child of Object.values(next.children[left].children)) assertProjection(child, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  assert.equal(serializeProgram(nested), saved);
});

test("projection authority requires exact receiver, current refs and complete dependent results", () => {
  const base = source().filterData({ id: "projected", source: "rows", field: "group", oneOf: ["A"] });
  const previous = resource(base, "sequence"), nextData = dataset(base, "projected");
  const next = createInferredGraphResource({ program: base, id: previous.id, revision: 1, data: nextData, definition: previous.options.definition });
  const plan = prepareGraphResource(base, next, new Map([["rows", "projected"]]));
  const args = { property: "resource[graph:sequence]", value: next };
  const refs = [{ previous: dataInputReference(dataset(base, "rows")), next: dataInputReference(nextData) }];
  const bind = (operation, replacements = plan.replacements, inputs = refs, options = args) =>
    withPreparedProjectedResourceResults(base, options, replacements, operation, inputs);
  assertProjection(bind(input => base.editSemantic(input)).rebindLayerData({ id: "points", data: "projected" }), 1);
  assert.throws(() => bind(input => base._clone({}).editSemantic(input)), /different receiver/);
  assert.throws(() => bind(input => base.editSemantic({ ...input })), /input|graph|node|layout|source/i);
  assert.throws(() => bind(input => base.editSemantic(input), []), /every affected/);
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements, []), /existing graph/);
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements, [{ ...refs[0], previous: { ...refs[0].previous, revision: 99 } }]), /revision|stale/i);
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements, [refs[0], refs[0]]), /unique/);
  assert.throws(() => bind(() => { throw new Error("abort"); }), /abort/);
  assert.equal(preparedResourceResults(args), undefined);
  assert.equal(preparedResourceDataProjection(args), false);
  bind(() => {
    assert.equal(preparedResourceDataProjection(args), true);
    assert.throws(() => bind(() => { throw new Error("nested"); }), /nested/);
    assert.equal(preparedResourceDataProjection(args), true);
  });
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements, [{ previous: refs[0].previous, next: refs[0].previous }]), /distinct/);
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements, refs,
    { ...args, value: { ...next, inputs: previous.inputs } }), /stale data/);
  assert.throws(() => bind(input => base.editSemantic(input), plan.replacements.slice().reverse().map(entry => ({ ...entry, resource: { ...entry.resource, inputs: resource(base, entry.resource.id).inputs } }))), /stale dependency/);
});
