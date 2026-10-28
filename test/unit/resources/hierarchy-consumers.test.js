import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { inspectProgram, comparePrograms, describeAction, getMarkItems } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const rows = [{ id: "a", v: 3, group: "A", parent: null }, { id: "a1", v: 3, group: "A", parent: "a" },
  { id: "b", v: 7, group: "B", parent: null }, { id: "b1", v: 7, group: "B", parent: "b" }];
const tree = () => chart().createCanvas({ width: 300, height: 220 }).createData({ id: "d", values: rows, keyField: "id" })
  .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v", forest: true })
  .layoutHierarchy({ id: "l", method: "tree", options: { nodeSize: [10, 10], siblingGap: 10, depthGap: 20, orientation: "vertical" } })
  .createTreePlot({ id: "tree", labels: {} });
const hierarchy = p => p.semanticSpec.resources.find(r => r.kind === "hierarchy");

test("hierarchy inspection distinguishes nodes from links and labels and exposes exact resource dependencies", () => {
  const p = tree(), report = inspectProgram(p), view = report.views.find(view => view.owner.id === "tree");
  assert.equal(view.logicalDataItems, 4); assert.equal(view.drawablePrimitives, 10); assert.equal(view.rawRows, 4);
  assert.deepEqual(view.sourceRefs.map(ref => ref.kind), ["layout", "hierarchy", "data"]);
  assert.equal(view.flags.find(flag => flag.reason === "synthetic-node").count, 1);
  assert.equal(inspectProgram(p, { target: { kind: "hierarchy", id: "h" } }).views.length, 1);
  assert.equal(describeAction(p, { action: "editTreePlot", target: { kind: "mark", id: "tree" }, options: { labels: false } }).applicability, "supported");
  const q = p.editLayout({ order: { by: "value", direction: "descending" } });
  assert.ok(comparePrograms(p, q).changes.some(change => change.resource.kind === "layout"));
  assert.deepEqual(resolveMarkSourceItems(p, "tree").map(item => item.rows), getMarkItems(p, { target: "tree" }).map(item => item.rows));
  const alternative = exportAccessibleData(p);
  assert.equal(alternative.views[0].rows.length, 4);
  assert.deepEqual(alternative.views[0].rows.map(row => row.values["tree:value"]), [3, 3, 7, 7]);
});

test("hierarchy facets partition complete subtrees and revise retained source resources", () => {
  const p = tree(), old = serializeProgram(p), f = p.facet({ field: "group" });
  const children = Object.values(f.children);
  assert.deepEqual(children.map(child => hierarchy(child).result.totalValue), [3, 7]);
  assert.deepEqual(children.map(child => getMarkItems(child, { target: "tree" }).length), [2, 2]);
  assert.ok(children.every(child => !Object.hasOwn(child.semanticSpec.layers[0], "data")));
  const revised = f.editFacetSource({ action: { method: "reviseData", options: { source: "d", id: "next", values: rows.map(row => ({ ...row, v: row.v * 2 })) } } });
  assert.deepEqual(Object.values(revised.children).map(child => hierarchy(child).result.totalValue), [6, 14]);
  const supplied = f.editFacetSource({ program: p.reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, v: row.v * 3 })) }) });
  assert.deepEqual(Object.values(supplied.children).map(child => hierarchy(child).result.totalValue), [9, 21]);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))), renderToSVG(revised));
  assert.equal(serializeProgram(p), old);
});

test("hierarchy topology partition and repeat encoding changes fail atomically", () => {
  const p = tree().reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, group: row.parent === null ? "root" : "child" })) });
  const old = serializeProgram(p);
  assert.throws(() => p.facet({ field: "group" }), /parent/i);
  assert.throws(() => p.repeatCharts({ target: "tree", channel: "x", fields: ["v", "id"] }), /eligible|field role/i);
  assert.equal(serializeProgram(p), old);
});

test("hierarchy concat scopes stable identities and keeps same-name siblings independent", () => {
  const p = tree(), combined = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = combined.editLayout({ target: { childPath: ["left"], id: "l" }, order: { by: "value", direction: "descending" } });
  assert.equal(q.children.right, combined.children.right);
  const left = getMarkItems(q, { target: { childPath: ["left"], id: "tree" } });
  const right = getMarkItems(q, { target: { childPath: ["right"], id: "tree" } });
  assert.notEqual(left[0].key, right[0].key);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
});

test("nested undefined style and nonscalar targets fail without changing an existing plot", () => {
  const p = tree(), old = serializeProgram(p);
  for (const options of [{ nodes: { overrides: undefined } }, { labels: { content: undefined } }, { labels: { offset: undefined } }, { labels: { overrides: undefined } }, { nodes: { overrides: [{ key: ["a"], fill: "red" }] } }]) assert.throws(() => p.editTreePlot(options));
  const q = p.editTreePlot({ nodes: { overrides: [{ key: "a1", fill: "red" }] } })
    .reviseData({ source: "d", id: "next", values: rows.filter(row => row.id !== "a1") });
  assert.equal(inspectProgram(q).findings.find(finding => finding.code === "orphan-style").reason, "missing-node");
  assert.equal(serializeProgram(p), old);
});
