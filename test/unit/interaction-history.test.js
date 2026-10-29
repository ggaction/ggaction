import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { getMarkItems } from "../../src/inspection.js";

const base = (factory = chart) => factory().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }, { id: "b", x: 2, y: 2 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const choose = (value, target = "points") => ({ type: "select", target, payload: { id: "picked", select: { field: "id", op: "eq", value } } });
const counts = session => [session.getState().history.undoCount, session.getState().history.redoCount];

test("history restores exact native snapshots and trace with one ordered transaction and stale-frame invalidation", () => {
  const original = base(), saved = serializeProgram(original), session = createInteractionSession({ program: original }), events = [];
  session.subscribe(event => events.push(event));
  session.dispatch(choose("a")); const first = session.getState().program;
  session.dispatch(choose("b")); const second = session.getState().program, old = session.getState();
  assert.deepEqual(counts(session), [2, 0]);
  session.dispatch({ type: "undo", transactionId: "back", origin: "user", causeTransactionId: "button" });
  assert.equal(session.getState().program, first); assert.deepEqual(counts(session), [1, 1]);
  for (const event of events.slice(-2)) {
    assert.equal(event.type, "undo"); assert.equal(event.transactionId, "back"); assert.equal(event.origin, "user");
    assert.equal(event.causeTransactionId, "button"); assert.equal(event.previous, second); assert.equal(event.current, first);
    assert.equal(event.revision, 3); assert.deepEqual(event.affectedOwners, [{ childPath: [], id: "points" }]);
    assert.deepEqual(event.selectionChanges, []); assert.ok(Object.isFrozen(event.state.history));
  }
  assert.deepEqual(events.slice(-2).map(event => event.phase), ["commit", "settled"]);
  assert.equal(session.dispatch({ type: "frame", scene: null, generation: old.generation, version: old.frameVersion + 100 }).status, "stale");
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, second);
  session.dispatch({ type: "reset" }); assert.equal(session.getState().program, original); assert.deepEqual(counts(session), [3, 0]);
  assert.deepEqual(events.at(-1).affectedOwners, []);
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, second);
  assert.equal(serializeProgram(original), saved);
  assert.deepEqual(deserializeProgram(serializeProgram(first)).graphicSpec, first.graphicSpec);
  session.destroy(); assert.deepEqual(counts(session), [0, 0]); assert.equal(session.destroy(), false);
});

test("bounded histories evict oldest snapshots, zero disables undo and every new branch discards redo", () => {
  const original = base().createParameter({ id: "value", value: 0 });
  for (const limit of [0, 2]) {
    const session = createInteractionSession({ program: original, historyLimit: limit }), versions = [original];
    for (let value = 1; value <= 4; value++) {
      session.dispatch({ type: "setParameter", target: "value", payload: { value } }); versions.push(session.getState().program);
    }
    assert.deepEqual(counts(session), [limit, 0]);
    if (limit) {
      session.dispatch({ type: "undo" }); session.dispatch({ type: "undo" });
      assert.equal(session.getState().program, versions[2]); assert.equal(session.dispatch({ type: "undo" }).status, "unchanged");
      session.dispatch({ type: "redo" }); assert.equal(session.getState().program, versions[3]);
      session.dispatch({ type: "setParameter", target: "value", payload: { value: 20 } });
      assert.deepEqual(counts(session), [2, 0]); assert.equal(session.dispatch({ type: "redo" }).status, "unchanged");
    } else assert.equal(session.dispatch({ type: "undo" }).status, "unchanged");
    session.dispatch({ type: "reset" }); assert.equal(session.getState().program, original);
    session.destroy();
  }
  const defaulted = createInteractionSession({ program: original }); assert.equal(defaulted.getState().history.limit, 100); defaulted.destroy();
  const maximum = createInteractionSession({ program: original, historyLimit: 10_000 }); maximum.destroy();
});

test("external updates reset or explicitly record history without replacing the original reset baseline", () => {
  const initial = base(), session = createInteractionSession({ program: initial }), events = [];
  session.subscribe(event => events.push(event)); session.dispatch(choose("a")); const selected = session.getState().program;
  const outside = selected.editCanvas({ width: 500 });
  session.updateProgram(outside, { history: "record", origin: "linked" }); assert.deepEqual(counts(session), [2, 0]);
  assert.equal(events.at(-1).origin, "linked"); assert.equal(events.at(-1).history, "record");
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, selected);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, outside);
  session.updateProgram(outside, { history: "record" }); assert.deepEqual(counts(session), [2, 0]);
  session.updateProgram(outside.editCanvas({ width: 600 })); assert.deepEqual(counts(session), [0, 0]);
  assert.equal(events.at(-1).origin, "programmatic"); assert.equal(events.at(-1).history, "reset");
  session.dispatch({ type: "reset" }); assert.equal(session.getState().program, initial); assert.deepEqual(counts(session), [1, 0]);
  const state = session.getState(); assert.equal(session.dispatch({ type: "reset" }).status, "unchanged"); assert.equal(session.getState(), state);
  session.destroy();
});

test("history rejects invalid own-data options and preserves history on native and frame-preflight errors", () => {
  const program = base().createParameter({ id: "value", value: 1 });
  for (const historyLimit of [-1, 1.2, Infinity, NaN, null, "1", 10_001]) assert.throws(() => createInteractionSession({ program, historyLimit }), /historyLimit/);
  const session = createInteractionSession({ program }); session.dispatch(choose("a"));
  const before = session.getState();
  for (const command of [{ type: "undo", target: "points" }, { type: "reset", payload: {} }, { type: "redo", origin: "invalid" }, { type: "undo", transactionId: "" }, { type: "redo", causeTransactionId: 1 }]) assert.throws(() => session.dispatch(command));
  for (const configuration of [{ history: "keep" }, { origin: "other" }, { extra: true }, null]) assert.throws(() => session.updateProgram(program, configuration));
  assert.equal(session.getState(), before);
  session.dispatch({ type: "setParameter", target: "value", payload: { value: 1 } }); assert.deepEqual(counts(session), [1, 0]);
  assert.throws(() => session.dispatch({ type: "setParameter", target: "value", payload: { value: "bad" } })); assert.deepEqual(counts(session), [1, 0]);
  assert.throws(() => session.updateProgram({})); assert.deepEqual(counts(session), [1, 0]);
  const current = session.getState(); session.dispatch({ type: "frame", scene: current.scene, generation: current.generation, version: Number.MAX_SAFE_INTEGER });
  const events = []; session.subscribe(event => events.push(event));
  assert.throws(() => session.dispatch({ type: "undo" }), /counter/);
  assert.equal(session.getState().program, before.program); assert.deepEqual(counts(session), [1, 0]);
  assert.deepEqual(events.map(event => event.phase), ["error"]); assert.deepEqual(events[0].affectedOwners, []);
  session.destroy();
});

test("history reentry is FIFO, duplicate transaction loops stop and Basic external snapshots remain supported", () => {
  const session = createInteractionSession({ program: base() }); session.dispatch(choose("a")); session.dispatch(choose("b"));
  const phases = [];
  session.subscribe(event => {
    if (event.type !== "undo") return;
    phases.push(event.phase);
    assert.equal(session.dispatch({ type: "undo", transactionId: event.transactionId, origin: event.origin }).status, "queued");
    if (event.phase === "commit") assert.equal(session.dispatch({ type: "redo", transactionId: "forward" }).status, "queued");
  });
  const second = session.getState().program; session.dispatch({ type: "undo", transactionId: "back" });
  assert.deepEqual(phases, ["commit", "settled"]); assert.equal(session.getState().program, second); assert.deepEqual(counts(session), [2, 0]); session.destroy();
  const program = base(basic), minimal = createInteractionSession({ program }), next = basic().createCanvas({ width: 450, height: 200 });
  minimal.updateProgram(next, { history: "record" }); minimal.dispatch({ type: "undo" }); assert.equal(minimal.getState().program, program);
  minimal.dispatch({ type: "redo" }); assert.equal(minimal.getState().program, next); minimal.destroy();
});

test("linked and hidden selection snapshots restore their own records for later membership reconciliation", () => {
  const child = base().selectMarks({ id: "picked", items: [] }), scope = id => ({ childPath: [id], id: "points" });
  const initial = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: child }] });
  const binding = { type: "linkSelection", id: "join", target: scope("b"), selection: "picked", resolve: "global",
    sources: [{ target: scope("a"), selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] };
  const session = createInteractionSession({ program: initial, bindings: [binding] }); session.dispatch(choose("a", scope("a")));
  const first = session.getState(), key = getMarkItems(first.program, { target: scope("a") })[0].key;
  session.dispatch({ type: "filter", target: scope("a"), payload: { select: { field: "id", op: "eq", value: "b" } } });
  const hidden = session.getState(); session.dispatch({ type: "undo" });
  assert.equal(session.getState().program, first.program); assert.equal(session.getState().linkedSelections, first.linkedSelections);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, hidden.program); assert.equal(session.getState().linkedSelections, hidden.linkedSelections);
  const events = []; session.subscribe(event => events.push(event));
  session.dispatch({ type: "filter", target: scope("a"), payload: { clear: true } });
  assert.ok(events[0].selectionChanges.some(change => change.restoredKeys.includes(key)));
  session.dispatch({ type: "undo" }); session.dispatch(choose("b", scope("a")));
  assert.equal(session.getState().linkedSelections[0].keys.length, 1); assert.deepEqual(counts(session), [3, 0]);
  assert.equal(initial.children.a, child); assert.equal(initial.children.b, child); session.destroy();
});
