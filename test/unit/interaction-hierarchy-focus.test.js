import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";

const rows = [{ id: "r", parent: null }, { id: "a", parent: "r" }, { id: "a1", parent: "a", value: 2 },
  { id: "a2", parent: "a", value: 4 }, { id: "b", parent: "r", value: 4 }];
const source = () => chart().createCanvas({ width: 600, height: 400, margin: 20 }).createData({ id: "rows", keyField: "id", values: rows })
  .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" }).layoutHierarchy({ id: "layout", method: "partition" });
const program = () => source().createPartitionPlot({ id: "partition" }).selectMarks({ id: "picked", field: "id", op: "eq", value: "b" }).highlightMarks({ selection: "picked", color: "red" });
const visible = p => getMarkItems(p, { target: "partition" }).filter(item => item.visible).map(item => item.fields.id);
const focus = value => ({ type: "focusHierarchy", target: "partition", payload: { focus: value } });

test("partition focus commands reuse native views, stable hidden selections and current scene generations", () => {
  for (const polar of [false, true]) {
    const p = polar ? program().createCoordinate({ id: "polar", type: "polar" }).editPartitionPlot({ target: "partition", coordinate: "polar", outerRadius: 150 }) : program();
    const before = serializeProgram(p), session = createInteractionSession({ program: p, bindings: [] }), events = [];
    session.subscribe(event => events.push(event));
    const initial = session.getState();
    session.dispatch({ ...focus({ key: "a" }), transactionId: "focus-a", origin: "user" });
    const q = session.getState().program;
    assert.deepEqual(visible(q), ["a", "a1", "a2"]);
    assert.deepEqual(q.graphicSpec, p.editPartitionPlot({ target: "partition", focus: { key: "a" } }).graphicSpec);
    assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "layout"), p.semanticSpec.resources.find(resource => resource.kind === "layout"));
    assert.deepEqual(events.map(event => [event.type, event.phase, event.revision]), [["focusHierarchy", "commit", 1], ["focusHierarchy", "settled", 1]]);
    assert.equal(events[0].selectionChanges.length, 1); assert.ok(events[0].selectionChanges[0].hiddenKeys.length);
    assert.deepEqual(session.dispatch({ type: "frame", scene: initial.scene, version: 100, generation: initial.generation }), { status: "stale" });
    const restored = deserializeProgram(serializeProgram(q)); assert.deepEqual(restored.graphicSpec, q.graphicSpec);
    session.dispatch(focus(null));
    assert.deepEqual(visible(session.getState().program), rows.map(row => row.id));
    assert.equal(getMarkItems(session.getState().program).find(item => item.fields.id === "b").properties.fill, "red");
    assert.equal(serializeProgram(p), before); session.destroy();
  }
});

test("focus pruning follows the session policy and source deletion uses native ancestor recovery", () => {
  const p = program(), session = createInteractionSession({ program: p, bindings: [], selectionPolicy: "drop" });
  session.dispatch(focus({ key: "a1" }));
  const next = session.getState().program.reviseData({ source: "rows", id: "updated", values: rows.filter(row => row.id !== "a1") });
  session.updateProgram(next);
  const info = inspectProgram(session.getState().program).views[0].partition;
  assert.equal(info.recovery.reason, "ancestor"); assert.deepEqual(visible(session.getState().program), ["a", "a2"]);
  session.dispatch(focus(null));
  assert.equal(getMarkItems(session.getState().program).some(item => item.properties.fill === "red"), false);
  assert.equal(session.getState().program.semanticSpec.layers[0].partitionView.recovery, undefined);
  session.destroy();
});

test("scoped hierarchy focus preserves siblings and typed scalar node targets", () => {
  const child = program(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const s = createInteractionSession({ program: p, bindings: [] });
  s.dispatch({ ...focus({ key: "a" }), target: { childPath: ["left"], id: "partition" } });
  assert.equal(s.getState().program.children.right, child);
  assert.deepEqual(visible(s.getState().program.children.left), ["a", "a1", "a2"]);
  assert.deepEqual(visible(child), rows.map(row => row.id)); s.destroy();
  const typed = chart().createCanvas({ width: 400, height: 300 }).createData({ values: [{ id: 1, parent: null }, { id: "1", parent: 1, v: 2 }, { id: false, parent: 1, v: 4 }] })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v" }).layoutHierarchy({ id: "l", method: "partition" }).createPartitionPlot({ id: "partition" });
  const t = createInteractionSession({ program: typed, bindings: [] }); t.dispatch(focus({ key: "1" })); assert.deepEqual(visible(t.getState().program), ["1"]);
  t.dispatch(focus({ key: false })); assert.deepEqual(visible(t.getState().program), [false]); t.destroy();
});

test("invalid and unsupported hierarchy focus retains committed program, trace and revision", () => {
  const p = program(), s = createInteractionSession({ program: p, bindings: [] }), before = serializeProgram(p); let getterCalls = 0;
  for (const payload of [{ focus: { key: "missing" } }, { focus: { key: "a", path: ["a"] } }, { focus: { key: null } },
    { focus: { path: [] } }, {}, { focus: undefined }, { focus: null, rootVisible: false },
    { get focus() { getterCalls++; return null; } }]) assert.throws(() => s.dispatch({ type: "focusHierarchy", target: "partition", payload }));
  assert.equal(getterCalls, 0); assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0); assert.equal(serializeProgram(p), before); s.destroy();
  const plain = basic().createCanvas(), b = createInteractionSession({ program: plain, bindings: [] });
  assert.throws(() => b.dispatch(focus(null)), /editPartitionPlot/); assert.equal(b.getState().program, plain); b.destroy();
  const tree = source().layoutHierarchy({ id: "tree-layout", hierarchy: "h", method: "tree", options: { nodeSize: [10, 10], siblingGap: 1, depthGap: 1, orientation: "vertical" } }).createTreePlot({ id: "tree" });
  const t = createInteractionSession({ program: tree, bindings: [] }); assert.throws(() => t.dispatch({ ...focus(null), target: "tree" })); assert.equal(t.getState().program, tree); t.destroy();
});
