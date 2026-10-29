import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
import { planSourceResourceRevision } from "../../../src/actions/data/resourcePlan.js";
import { withPreparedDataResourceResults, preparedResourceResults } from "../../../src/actions/primitives/preparedResourceContext.js";
import { dataInputReference } from "../../../src/selectors/resources.js";
import { reviseGraphInputs } from "../../../src/actions/graphs/resources.js";

const rows = [{ id: "a", date: "2024-02-28", x: 1, y: 1, value: 1 },
  { id: "b", date: "2024-02-29", x: 2, y: 1, value: 2 }, { id: "c", date: "2024-02-29", x: 3, y: 1, value: 3 }];
const walk = node => [node, ...(node.children ?? []).flatMap(walk)];
const resource = (p, id) => p.semanticSpec.resources.find(value => value.id === id);
const data = (p, id) => p.semanticSpec.datasets.find(value => value.id === id);
const mixed = () => chart().createCanvas({ width: 600, height: 280, margin: 20 })
  .createData({ id: "samples", keyField: "id", values: rows })
  .createDensityContourData({ id: "density", data: "samples", x: "x", y: "y", weight: "value",
    grid: { origin: [0, 0], dx: 1, dy: 1, width: 4, height: 3 }, estimator: "histogram", normalization: "count", thresholds: [0, 1, 2, 4] })
  .createContourMark({ color: { id: "shared" } })
  .createCalendarLayout({ date: "date", value: "value", start: "2024-02-28", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" })
  .createCalendarPlot({ color: { id: "shared" } });
const once = (p, entries) => {
  const trace = walk(p.trace.children.at(-1));
  for (const [op, id] of entries) assert.equal(trace.filter(node => node.op === op && (node.args.id ?? node.args.target) === id).length, 1, `${op}:${id}`);
};

test("the graph revision bridge retains exact source proofs and agrees with the final resource plan", () => {
  const original = chart().createData({ id: "samples", keyField: "id", values: rows })
    .createInferredGraphData({ id: "sequence", data: "samples", nodeKey: "id", ruleId: "sequence", rule: "sequence", options: { orderField: "x" } })
    .layoutGraph({ id: "positions", method: "circular" });
  const next = original.reviseData({ source: "samples", id: "next", values: rows.map(row => ({ ...row, x: -row.x })) });
  const staged = next._clone({ semanticSpec: { ...next.semanticSpec, resources: original.semanticSpec.resources } });
  const saved = serializeProgram(staged), repaired = reviseGraphInputs(staged, new Map([["samples", "next"]]));
  assert.deepEqual(repaired.semanticSpec.resources, next.semanticSpec.resources);
  assert.deepEqual(deserializeProgram(serializeProgram(repaired)).semanticSpec.resources, next.semanticSpec.resources);
  assert.equal(serializeProgram(staged), saved);
  const unrelated = staged.createData({ id: "unrelated", values: rows });
  assert.throws(() => reviseGraphInputs(unrelated, new Map([["samples", "unrelated"]])), /same source/);
  assert.equal(serializeProgram(staged), saved);
});

test("explicit graph edits still rebuild candidate inference and its stored layout", () => {
  const original = chart().createData({ id: "nodes", keyField: "id", values: rows })
    .createData({ id: "edges", values: [{ from: "a", to: "b", weight: 1, revised: 4 }, { from: "b", to: "c", weight: 2, revised: 6 }] })
    .createGraphData({ id: "candidate", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", weight: "weight" })
    .createInferredGraphData({ id: "tree", data: "nodes", nodeKey: "id", ruleId: "backbone", rule: "mst", candidateGraph: "candidate" })
    .layoutGraph({ id: "positions", graph: "tree", method: "circular" });
  const saved = serializeProgram(original), next = original.editGraphData({ target: "candidate", definition: { weight: "revised" } });
  assert.equal(resource(next, "tree").result.diagnostics.cost, 10);
  assert.deepEqual(resource(next, "tree").inputs[1], { kind: "graph", id: "candidate", revision: 1 });
  assert.deepEqual(resource(next, "positions").inputs[0], { kind: "graph", id: "tree", revision: 1 });
  assert.deepEqual(deserializeProgram(serializeProgram(next)).semanticSpec.resources, next.semanticSpec.resources);
  assert.equal(serializeProgram(original), saved);
});

test("source revisions materialize the final calendar, contour and native shared-scale union once", () => {
  const p = mixed().createPointMark({ id: "points", data: "samples" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "shared" } });
  const before = serializeProgram(p), values = rows.map(row => ({ ...row, value: row.value * 2 }));
  const q = p.reviseData({ source: "samples", id: "next", values });
  once(q, [["materializeCalendarPlot", "calendar"], ["materializeContourMark", "contour"], ["rematerializePointMark", "points"], ["rematerializeScale", "shared"]]);
  assert.equal(resource(q, "calendarLayout").result.cells.at(-1).value, 10);
  assert.deepEqual(q.resolvedScales.shared.domain, [0, 10]);
  assert.equal(resource(q, "density").revision, 1);
  assert.equal(resource(q, "calendarLayout").revision, 1);
  for (const id of ["calendar", "contour", "points"]) assert.ok(getMarkItems(q, { target: id }).length > 0);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("one source revision preserves graph recompute while calendar and contour share the final scale", () => {
  const p = mixed().createInferredGraphData({ id: "g", data: "samples", nodeKey: "id", ruleId: "sequence", rule: "sequence", options: { orderField: "x" } })
    .layoutGraph({ id: "graphLayout", method: "fixed", options: { positions: rows.map((row, i) => ({ key: row.id, x: i * 40, y: 20 })) } })
    .createGraphPlot().filterMarks({ target: "graphPlot", field: "key", op: "neq", value: "b", recompute: true });
  const before = serializeProgram(p), q = p.reviseData({ source: "samples", id: "next", values: rows.map(row => ({ ...row, value: row.value + 1 })) });
  once(q, [["materializeCalendarPlot", "calendar"], ["materializeContourMark", "contour"], ["materializeGraphPlot", "graphPlot"], ["rematerializeScale", "shared"]]);
  assert.equal(resource(q, "g").revision, resource(p, "g").revision + 1);
  assert.deepEqual(getMarkItems(q, { target: "graphPlot" }).filter(item => item.fields.kind === "node").map(item => item.fields.key), ["a", "c"]);
  assert.equal(data(q, q.markConfigs.graphPlot.graphPlot.view.recompute.dataset).source, "next");
  assert.equal(resource(q, "calendarLayout").result.cells.at(-1).value, 7);
  const restored = deserializeProgram(serializeProgram(q));
  assert.deepEqual(restored.removeMarkFilter({ target: "graphPlot" }).graphicSpec, q.removeMarkFilter({ target: "graphPlot" }).graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("a late resource failure rejects the whole source revision without semantic, graphic or trace changes", () => {
  const p = mixed(), before = serializeProgram(p), trace = p.trace;
  for (const values of [rows.map(row => ({ ...row, date: "2024-03-01" })), rows.map(row => ({ ...row, value: -1 }))]) {
    assert.throws(() => p.reviseData({ source: "samples", id: "next", values }));
    assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  }
});

test("private data-rooted resource proof requires the entire exact revision vector and expires on every exit", () => {
  const original = mixed(), revised = original.reviseData({ source: "samples", id: "next", values: rows.map(row => ({ ...row, value: row.value + 1 })) });
  const staged = revised._clone({ semanticSpec: { ...revised.semanticSpec, resources: original.semanticSpec.resources, layers: original.semanticSpec.layers } });
  const plan = planSourceResourceRevision(staged, new Map([["samples", "next"]])), [first, ...rest] = plan.entries;
  const args = { property: `resource[${first.resource.kind}:${first.resource.id}]`, value: first.resource };
  const refs = [{ previous: dataInputReference(data(staged, "samples")), next: dataInputReference(data(staged, "next")) }];
  const bind = (entries, operation, inputs = refs, options = args) => withPreparedDataResourceResults(staged, options, entries, operation, inputs);
  assert.equal(bind(rest, input => staged.editSemantic(input)).semanticSpec.resources.find(value => value.id === "calendarLayout").revision, 1);
  assert.equal(preparedResourceResults(args), undefined);
  assert.throws(() => bind([], input => staged.editSemantic(input)), /every affected/);
  assert.throws(() => bind(rest, input => staged._clone({}).editSemantic(input)), /different receiver/);
  const copied = bind(rest, input => staged.editSemantic({ ...input }));
  assert.equal(resource(copied, "calendarLayout").revision, 0); // A copied argument has no batch authority.
  assert.equal(resource(copied, "density").revision, 1);
  assert.throws(() => bind(rest, () => { throw new Error("abort"); }), /abort/);
  assert.equal(preparedResourceResults(args), undefined);
  assert.throws(() => bind(rest, input => staged.editSemantic(input), []), /rooted/);
  assert.throws(() => bind(rest, input => staged.editSemantic(input), [{ ...refs[0], previous: { ...refs[0].previous, revision: 99 } }]), /revision|source/);
  assert.throws(() => bind(rest.map(entry => ({ ...entry, resource: { ...entry.resource, inputs: original.semanticSpec.resources.find(value => value.id === entry.resource.id).inputs } })), input => staged.editSemantic(input)), /stale dependency/);
  assert.throws(() => bind(rest, input => staged.editSemantic(input), refs, { ...args, value: { ...first.resource, inputs: original.semanticSpec.resources.find(value => value.id === first.resource.id).inputs } }), /stale data inputs/);
});

test("native-only source revisions share the same union while Basic keeps its smaller API", () => {
  const p = chart().createCanvas().createData({ id: "d", values: [{ x: 1, y: 1 }] })
    .createPointMark({ id: "a", data: "d" }).encodeX({ field: "x", scale: { id: "x" } }).encodeY({ field: "y" })
    .createPointMark({ id: "b", data: "d" }).encodeX({ field: "x", scale: { id: "x" } }).encodeY({ field: "y" });
  const q = p.reviseData({ source: "d", id: "next", values: [{ x: 2, y: 3 }] });
  once(q, [["rematerializePointMark", "a"], ["rematerializePointMark", "b"], ["rematerializeScale", "x"]]);
  assert.equal(basicChart().createCalendarPlot, undefined);
  assert.equal(basicChart().reviseData, undefined);
});
