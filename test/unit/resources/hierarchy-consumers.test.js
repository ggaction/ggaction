import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { inspectProgram, comparePrograms, describeAction, getMarkItems } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createInteractionSession } from "../../../src/interaction.js";
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

const typedRows = [{ id: "root", parent: null, v: 4 }, { id: 1, parent: "root", v: 3 }, { id: "1", parent: "root", v: 1 }];
function typedHierarchy(method) {
  const p = chart().createCanvas({ width: 240, height: 200, margin: 0 })
    .createData({ id: "d", values: typedRows, keyField: "id" })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v" })
    .layoutHierarchy({ id: "l", method, options: method === "tree"
      ? { nodeSize: [10, 10], siblingGap: 40, depthGap: 60, orientation: "vertical" }
      : { size: [160, 120], padding: 8, method: "slice-dice" } });
  return method === "tree" ? p.createTreePlot({ id: "plot", labels: {} })
    : p.createTreemapPlot({ id: "plot", origin: [20, 20], labels: {} });
}

for (const method of ["tree", "treemap"]) {
  test(`${method} hit, accessible items and highlights retain typed source meaning after restore and revision`, () => {
    const p = typedHierarchy(method), old = serializeProgram(p);
    const before = getMarkItems(p, { target: "plot" });
    assert.deepEqual(before.map(item => [item.fields.id, item.fields.value, item.fields.depth]), [["root", 4, 0], [1, 3, 1], ["1", 1, 1]]);
    assert.notEqual(before[1].key, before[2].key);
    const highlighted = p.highlightMarks({ id: "picked", target: "plot", select: { rows: { data: "d", indices: [1] } }, fill: "red" });
    assert.deepEqual(highlighted.graphicSpec.objects.plot.items.filter(item => item.properties.fill === "red").map(item => item.identity.key), [before[1].key, before[1].key]);
    assert.equal(renderToSVG(highlighted.removeMarkHighlight({ selection: "picked" })), renderToSVG(p));
    const nextRows = [typedRows[0], typedRows[2], { ...typedRows[1], v: 6 }];
    const revised = deserializeProgram(serializeProgram(highlighted)).reviseData({ source: "d", id: "next", values: nextRows });
    const items = getMarkItems(revised, { target: "plot" }), selected = items.find(item => item.fields.id === 1);
    assert.equal(selected.key, before[1].key);
    assert.equal(selected.fields.value, 6);
    assert.equal(hierarchy(revised).result.totalValue, 7);
    assert.equal(revised.semanticSpec.resources.find(resource => resource.id === "l").revision, 1);
    assert.equal(selected.rows.length, 1);
    assert.deepEqual([selected.rows[0].data, selected.rows[0].revision, selected.rows[0].index, selected.rows[0].rowKey],
      ["next", 1, 2, '["scalar",[["number",1]]]']);
    assert.deepEqual(revised.semanticSpec.datasets.find(data => data.id === "next").values[selected.rows[0].index], nextRows[2]);
    assert.deepEqual(selected.geometry.map(graphic => graphic.properties.fill), ["red", "red"]);
    const accessible = exportAccessibleData(revised, { format: "items", target: "plot" }).views[0].items;
    assert.deepEqual(accessible.map(item => item.key), items.map(item => item.key));
    assert.deepEqual(accessible.find(item => item.key === selected.key).selectedBy, ["picked"]);
    assert.deepEqual(accessible.find(item => item.key === selected.key).fields, selected.fields);
    const body = selected.geometry[0].properties;
    const point = method === "tree" ? { x: body.x, y: body.y }
      : { x: body.x + body.width / 2, y: body.y + body.height * .75 };
    const session = createInteractionSession({ program: revised });
    try {
      session.dispatch({ type: "inspect", point });
      const hit = session.getState().hit.target;
      assert.equal(hit.ownerId, "plot"); assert.equal(hit.role, "node"); assert.equal(hit.itemKey, selected.key);
      assert.deepEqual(hit.resourceRefs, [{ kind: "layout", id: "l", revision: 1 }]);
    } finally { session.destroy(); }
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))), renderToSVG(revised));
    assert.equal(serializeProgram(p), old);
  });

  test(`${method} scoped edits preserve sibling resources and namespace source-backed logical items`, () => {
    const child = typedHierarchy(method), old = serializeProgram(child);
    const composite = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
    const edited = method === "tree"
      ? composite.editTreePlot({ target: { childPath: ["left"], id: "plot" }, nodes: { fill: "orange" } })
      : composite.editTreemapPlot({ target: { childPath: ["left"], id: "plot" }, cells: { fill: "orange" } });
    assert.equal(edited.children.right, child);
    assert.equal(edited.children.left.semanticSpec.resources, child.semanticSpec.resources);
    const left = getMarkItems(edited, { target: { childPath: ["left"], id: "plot" } });
    const right = getMarkItems(edited, { target: { childPath: ["right"], id: "plot" } });
    assert.ok(left.every(item => item.properties.fill === "orange"));
    assert.equal(new Set([...left, ...right].map(item => item.key)).size, 6);
    assert.deepEqual(left.map(item => item.rows), right.map(item => item.rows));
    const revised = edited.editLayout({ target: { childPath: ["left"], id: "l" }, order: { by: "value", direction: "ascending" } });
    assert.equal(revised.children.right, child);
    assert.deepEqual(getMarkItems(revised, { target: { childPath: ["left"], id: "plot" } }).map(item => item.key).sort(), left.map(item => item.key).sort());
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))), renderToSVG(revised));
    assert.equal(serializeProgram(child), old);
  });
}
