import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { getMarkItems } from "../../src/inspection.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const base = (factory = chart) => factory().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }, { id: "b", x: 2, y: 2 }, { id: "c", x: 3, y: 3 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
  .createParameter({ id: "threshold", value: 2 });
const select = (select, extra = {}) => ({ type: "select", target: "points", payload: { id: "picked", select }, ...extra });
const where = { version: 2, registry: "standard@1", root: { type: "binary", op: "gte",
  left: { type: "field", name: "x" }, right: { type: "parameter", id: "threshold" } } };
const ids = program => {
  const resolved = resolveStoredSelection(program, "picked"), keys = new Set(resolved.keys);
  return resolved.items.filter(item => keys.has(item.key)).map(item => item.fields.id);
};

test("selection commands commit existing resources with exact immutable events and refreshed hit frames", () => {
  const program = base(), original = serializeProgram(program), session = createInteractionSession({ program, bindings: [] }), events = [];
  session.subscribe(event => events.push(event));
  assert.deepEqual(session.dispatch(select({ field: "x", op: "range", min: 2, maxInclusive: false, max: 3 }, { transactionId: "choose", origin: "user" })), { status: "applied" });
  const current = session.getState().program;
  assert.deepEqual(ids(current), ["b"]);
  assert.deepEqual(events.map(event => [event.type, event.phase, event.transactionId, event.origin, event.revision]), [
    ["select", "commit", "choose", "user", 1], ["select", "settled", "choose", "user", 1]
  ]);
  for (const event of events) {
    assert.equal(event.previous, program); assert.equal(event.current, current);
    assert.deepEqual(event.affectedOwners, [{ childPath: [], id: "points" }]);
    assert.equal(event.state.program, current); assert.ok(Object.isFrozen(event));
  }
  assert.equal(current.trace.children.at(-1).op, "selectMarks");
  assert.equal(session.getState().revision, 1); assert.equal(session.getState().generation, 1); assert.equal(session.getState().frameVersion, 1);
  assert.equal(serializeProgram(program), original);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(current))), ["b"]);
  assert.deepEqual(session.dispatch({ type: "frame", scene: null, version: 100, generation: 0 }), { status: "stale" });
  assert.equal(session.getState().program, current);
  session.destroy();
});

test("clear retains named label and conditional consumers while parameter commands refresh AST membership", () => {
  const program = base().selectMarks({ id: "picked", where })
    .highlightMarks({ selection: "picked", color: "red", bringToFront: false })
    .createMarkLabels({ id: "labels", source: "points", field: "id", selection: "picked" })
    .encodeOpacity({ target: "points", conditions: [{ when: { selection: "picked" }, value: { value: .5 } }], otherwise: { value: 1 } });
  const session = createInteractionSession({ program }), events = [];
  session.subscribe(event => events.push(event));
  session.dispatch({ type: "setParameter", target: "threshold", payload: { value: 3 }, causeTransactionId: "host", origin: "linked" });
  const revised = session.getState().program;
  assert.deepEqual(ids(revised), ["c"]);
  assert.deepEqual(getMarkItems(revised, { target: "labels" }).map(item => item.fields.id), ["c"]);
  assert.deepEqual(events.map(event => event.causeTransactionId), ["host", "host"]);
  assert.deepEqual(events[0].affectedOwners, [{ childPath: [], id: "threshold" }]);
  session.dispatch({ type: "clearSelection", target: "points", payload: { id: "picked" } });
  const cleared = session.getState().program;
  assert.deepEqual(ids(cleared), []); assert.ok(cleared.materializationConfigs.selections.picked);
  assert.ok(cleared.materializationConfigs.highlights.picked);
  assert.deepEqual(getMarkItems(cleared, { target: "labels" }), []);
  assert.deepEqual(getMarkItems(cleared, { target: "points" }).map(item => item.properties.opacity), [1, 1, 1]);
  assert.equal(events.length, 4);
  const state = session.getState();
  assert.deepEqual(session.dispatch({ type: "setParameter", target: "threshold", payload: { value: 3 } }), { status: "unchanged" });
  assert.equal(session.getState(), state); assert.equal(events.length, 4); session.destroy();
});

test("all selection modes reuse the domain set policy and clear preserves explicit empty meaning", () => {
  const program = base(), keys = getMarkItems(program, { target: "points" }).map(item => item.key), session = createInteractionSession({ program });
  session.dispatch(select({ items: [keys[0]], empty: "none" }));
  for (const [mode, incoming, expected] of [
    ["add", [keys[1]], ["a", "b"]], ["toggle", [keys[0], keys[2]], ["b", "c"]],
    ["subtract", [keys[1]], ["c"]], ["intersect", [keys[0]], []], ["replace", [], ["a", "b", "c"]]
  ]) {
    session.dispatch(select({ items: incoming, empty: mode === "replace" ? "all" : "none" }, { payload: { id: "picked", select: { items: incoming, empty: mode === "replace" ? "all" : "none" }, mode } }));
    assert.deepEqual(ids(session.getState().program), expected);
  }
  session.dispatch({ type: "clearSelection", target: "points", payload: { id: "picked" } });
  assert.deepEqual(ids(session.getState().program), []); session.destroy();
});

test("explicit child paths retain namespace identity and leave sibling selections unchanged", () => {
  const child = base(), program = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const target = { childPath: ["left"], id: "points" }, key = getMarkItems(program, { target })[1].key;
  const session = createInteractionSession({ program }), events = [];
  session.subscribe(event => events.push(event));
  session.dispatch(select({ items: [key] }, { target }));
  const next = session.getState().program;
  assert.deepEqual(ids(next.children.left), ["b"]); assert.equal(next.children.right, program.children.right);
  assert.deepEqual(events[0].affectedOwners, [target]);
  session.dispatch(select({ field: "x", op: "gt", value: 2 }, { target }));
  assert.deepEqual(ids(session.getState().program.children.left), ["c"]);
  session.dispatch({ type: "setParameter", target: { childPath: ["left"], id: "threshold" }, payload: { value: 3 } });
  assert.equal(session.getState().program.children.right, program.children.right);
  session.dispatch({ type: "clearSelection", target, payload: { id: "picked" } });
  assert.deepEqual(ids(session.getState().program.children.left), []); session.destroy();
});

test("facet edits address the retained source and reject individual generated cell writes", () => {
  const program = base().facet({ field: "id" }), session = createInteractionSession({ program });
  const target = { childPath: [], id: "points", facetSource: true };
  session.dispatch(select({ field: "x", op: "gte", value: 2 }, { target }));
  assert.deepEqual(Object.values(session.getState().program.children).flatMap(ids), ["b", "c"]);
  session.dispatch({ type: "clearSelection", target, payload: { id: "picked" } });
  assert.deepEqual(Object.values(session.getState().program.children).flatMap(ids), []);
  const state = session.getState();
  assert.throws(() => session.dispatch(select({ items: [] }, { target: { childPath: [program.compositionSpec.children[0]], id: "points" } })), /Facet cells/);
  assert.equal(session.getState().program, state.program); session.destroy();
});

test("rejected transactions publish one error and preserve program trace, revision and frame", () => {
  const program = base(), session = createInteractionSession({ program }), events = [], before = serializeProgram(program);
  session.subscribe(event => events.push(event));
  const failed = [
    select({ field: "absent", op: "eq", value: 1 }),
    select({ items: [] }, { payload: { id: "picked", select: { items: [] }, mode: "toggle" } }),
    { type: "setParameter", target: "threshold", payload: { value: "bad" } },
    { type: "clearSelection", target: "points", payload: { id: "missing" } },
    select({ items: [] }, { target: ["points"] }),
    select({ items: [] }, { target: { childPath: [], id: "points", facetSource: true } }),
    select({ items: [] }, { target: { childPath: ["absent"], id: "points" } })
  ];
  for (const command of failed) {
    const state = session.getState(); assert.throws(() => session.dispatch(command));
    assert.equal(session.getState().program, state.program); assert.equal(session.getState().scene, state.scene);
    assert.equal(session.getState().revision, 0); assert.equal(session.getState().frameVersion, 0);
  }
  assert.equal(events.length, failed.length); assert.ok(events.every(event => event.phase === "error" && event.previous === program && event.current === program && event.diagnostics.length === 1));
  assert.equal(serializeProgram(program), before); session.destroy();
});

test("selection commands cannot retarget an existing identity or inject action options through selectors", () => {
  const program=base().selectMarks({id:"picked",target:"points",items:[]}),session=createInteractionSession({program});
  for (const command of [
    select({items:[]},{target:"other"}),
    select({items:[],target:"other"}),
    select({items:[]},{target:{childPath:[]}}),
    select({items:[]},{target:{childPath:Array(1025).fill("child"),id:"points"}}),
    select({items:[]},{payload:{id:"picked",select:{items:[]},mode:"union"}})
  ]) assert.throws(()=>session.dispatch(command));
  assert.equal(session.getState().program,program); assert.equal(session.getState().revision,0); session.destroy();
});

test("Basic keeps inspection without accepting unsupported authoring editors", () => {
  const program = base(basic), session = createInteractionSession({ program }), events = [];
  session.subscribe(event => events.push(event));
  assert.throws(() => session.dispatch(select({ items: [] })), /does not support selectMarks/);
  for (const value of [2, 4]) assert.throws(() => session.dispatch({ type: "setParameter", target: "threshold", payload: { value } }), /does not support editParameter/);
  assert.equal(session.getState().program, program);
  assert.deepEqual(events.map(event => event.phase), ["error", "error", "error"]); session.destroy();
});

test("queued mutations snapshot payloads and duplicate transactions are suppressed within one FIFO drain", () => {
  const session = createInteractionSession({ program: base() }), events = [];
  const command = select({ field: "x", op: "eq", value: 1 }, { transactionId: "first" });
  session.subscribe(event => {
    if (!event.phase) return;
    events.push([event.transactionId, event.phase]);
    if (event.phase !== "commit" || event.transactionId !== "first") return;
    assert.deepEqual(session.dispatch(command), { status: "queued" });
    const next = select({ field: "x", op: "eq", value: 2 }, { transactionId: "second", origin: "replay" });
    assert.deepEqual(session.dispatch(next), { status: "queued" }); next.payload.select.value = 3;
  });
  session.dispatch(command);
  assert.deepEqual(events, [["first", "commit"], ["first", "settled"], ["second", "commit"], ["second", "settled"]]);
  assert.deepEqual(ids(session.getState().program), ["b"]); assert.equal(session.getState().revision, 2); session.destroy();
});

test("subscriber failure after commit preserves committed state without misreporting an action rejection", () => {
  const session = createInteractionSession({ program: base() }), phases = [];
  const unsubscribe = session.subscribe(event => { if (event.phase) phases.push(event.phase); if (event.phase === "commit") throw new Error("subscriber failed"); });
  assert.throws(() => session.dispatch(select({ items: [], empty: "all" })), /subscriber failed/);
  assert.deepEqual(ids(session.getState().program), ["a", "b", "c"]); assert.deepEqual(phases, ["commit"]);
  unsubscribe(); session.dispatch({ type: "clearSelection", target: "points", payload: { id: "picked" } });
  assert.deepEqual(ids(session.getState().program), []); session.destroy();
});

test("command snapshots reject accessors, cycles, sparse arrays and unbounded work before callbacks", () => {
  const session = createInteractionSession({ program: base() }), state = session.getState(); let reads = 0, events = 0;
  session.subscribe(() => events++);
  const getter = {}; Object.defineProperty(getter, "items", { enumerable: true, get() { reads++; return []; } });
  const cycle = {}; cycle.self = cycle;
  for (const value of [getter, cycle, { items: Array(10000001) }, { field: "x".repeat(10000001) }, { items: [Symbol()] }, { rows: { data: "rows", indices: Array(2) } }]) {
    assert.throws(() => session.dispatch(select(value)));
  }
  for (const extra of [{ transactionId: "" }, { transactionId: "x".repeat(1025) }, { origin: "unknown" }, { causeTransactionId: 4 }]) assert.throws(() => session.dispatch(select({ items: [] }, extra)));
  assert.equal(reads, 0); assert.equal(events, 0); assert.equal(session.getState(), state); session.destroy();
});

test("Calendar aggregated days retain nearest selection and hidden/drop lifecycle across source revisions", () => {
  const rows = [{ id: "a", day: "2024-02-28", value: 0 }, { id: "b", day: "2024-02-29", value: 3 }, { id: "c", day: "2024-02-29", value: 4 }];
  const original = chart().createCanvas({ width: 400, height: 220, margin: 20 })
    .createData({ id: "days", keyField: "id", values: rows })
    .createCalendarLayout({ id: "calendarLayout", date: "day", value: "value", start: "2024-02-28", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "omit" })
    .createCalendarPlot({ color: false, labels: false })
    .selectMarks({ id: "picked", target: "calendar", items: [] });
  const before = serializeProgram(original);
  for (const selectionPolicy of ["keep-hidden", "drop"]) {
    const session = createInteractionSession({ program: original, selectionPolicy, bindings: [] }), events = [];
    session.subscribe(event => events.push(event));
    session.dispatch({ type: "select", target: "calendar", payload: { id: "picked", nearest: { space: "data", fields: ["value"], values: [7], metric: "euclidean", maxDistance: 0 } } });
    const chosen = session.getState().program, selected = resolveStoredSelection(chosen, "picked");
    assert.equal(selected.keys.length, 1);
    assert.equal(selected.items.find(item => item.key === selected.keys[0]).fields.value, 7);
    const filtered = chosen.reviseData({ source: "days", id: "filteredDays", values: rows.slice(0, 1) });
    session.updateProgram(filtered);
    assert.equal(getMarkItems(session.getState().program, { target: "calendar" }).length, 1);
    assert.equal(events.at(-1).selectionChanges[0][selectionPolicy === "drop" ? "droppedKeys" : "hiddenKeys"].length, 1);
    const restored = session.getState().program.reviseData({ source: "filteredDays", id: "restoredDays", values: rows });
    session.updateProgram(restored);
    assert.equal(resolveStoredSelection(session.getState().program, "picked").keys.length, selectionPolicy === "drop" ? 0 : 1);
    if (selectionPolicy === "keep-hidden") assert.equal(events.at(-1).selectionChanges[0].restoredKeys.length, 1);
    session.destroy();
  }
  assert.equal(serializeProgram(original), before);
});
