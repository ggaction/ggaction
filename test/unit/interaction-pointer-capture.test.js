import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { prepareSelectionCapture } from "../../src/interaction/pointerCapture.js";

const program = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
  .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } })
  .selectMarks({ id: "picked", target: "points", items: [] });
const create = p => createInteractionSession({ program: p ?? program(), bindings: [{ type: "select", target: "points", selection: "picked", mode: "toggle" }] });
function target() {
  const listeners = new Map(); return {
    addEventListener(type, fn) { const set = listeners.get(type) ?? new Set(); set.add(fn); listeners.set(type, set); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    fire(type, extra = {}) { for (const fn of [...listeners.get(type) ?? []]) fn({ pointerId: 1, pointerType: "mouse", button: 0, clientX: 60, clientY: 80, ...extra }); },
    callbacks: () => [...listeners.values()].flatMap(set => [...set]),
    count: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0)
  };
}
function surface(separate = false) {
  const host = target(), captures = new Set(), window = target();
  return Object.assign(host, {
    captures, window, ...(separate ? { ownerDocument: { defaultView: window } } : {}),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 200 }),
    setPointerCapture(id) { captures.add(id); }, hasPointerCapture: id => captures.has(id),
    releasePointerCapture(id) { captures.delete(id); host.fire("lostpointercapture", { pointerId: id }); }
  });
}
function selected(session) { const resolved = resolveStoredSelection(session.getState().program, "picked"); return resolved.items.filter(item => resolved.keys.includes(item.key)).map(item => item.fields.id); }

test("captured pointer up commits once and suppresses the browser click while keyboard activation stays available", () => {
  const source = program(), before = serializeProgram(source), session = create(source), host = surface(), events = [];
  session.mount(host); session.subscribe(event => { if (event.phase) events.push(event); });
  host.fire("pointerdown"); assert.deepEqual([...host.captures], [1]); assert.equal(session.getState().program, source);
  host.fire("pointermove", { clientX: 62 }); host.fire("pointerup", { clientX: 62 });
  assert.deepEqual(selected(session), ["a"]); assert.equal(host.captures.size, 0);
  host.fire("click", { detail: 1 }); assert.deepEqual(selected(session), ["a"]);
  assert.deepEqual(events.map(event => event.phase), ["commit", "settled"]); assert.equal(events[0].transactionId, events[1].transactionId);
  host.fire("click", { detail: 0 }); assert.deepEqual(selected(session), []); assert.equal(session.getState().revision, 2);
  assert.equal(serializeProgram(source), before); session.destroy(); assert.equal(host.count(), 0);
});

test("three CSS pixels cancel click selection once and one hundred later moves cannot commit", () => {
  const source = program(), session = create(source), host = surface(), events = [];
  session.mount(host, { rootTransform: [2, 0, 0, 2, 0, 0] }); session.subscribe(event => { if (event.phase) events.push(event); });
  host.fire("pointerdown", { clientX: 110, clientY: 140 });
  for (let i = 1; i <= 100; i++) host.fire("pointermove", { clientX: 110 + i, clientY: 140 });
  host.fire("pointerup", { clientX: 210, clientY: 140 }); host.fire("click", { detail: 1 });
  assert.deepEqual(events.map(event => [event.phase, event.diagnostics[0]?.message]), [["cancel", "movement"]]);
  assert.equal(session.getState().program, source); assert.equal(session.getState().revision, 0); assert.equal(host.captures.size, 0);
  session.destroy();
});

test("a final up beyond the threshold is processed even without a preceding move", () => {
  const session = create(), host = surface(), phases = []; session.mount(host); session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  host.fire("pointerdown"); host.fire("pointerup", { clientX: 70 }); host.fire("click", { detail: 1 });
  assert.deepEqual(phases, ["cancel"]); assert.deepEqual(selected(session), []); session.destroy();
});

test("Escape, pointer cancellation, lost capture and host blur restore the exact baseline and release all captures", () => {
  for (const [event, extra] of [["keydown", { key: "Escape" }], ["pointercancel", {}], ["lostpointercapture", {}], ["blur", {}]]) {
    const source = program(), original = serializeProgram(source), session = create(source), host = surface(), phases = [];
    session.mount(host); session.subscribe(result => { if (result.phase) phases.push(result.phase); });
    host.fire("pointerdown"); host.fire("pointermove", { clientX: 61 }); host.fire(event, extra); host.fire("pointerup"); host.fire("click", { detail: 1 });
    assert.deepEqual(phases, ["cancel"]); assert.equal(session.getState().program, source); assert.equal(serializeProgram(source), original); assert.equal(host.captures.size, 0);
    session.destroy();
  }
});

test("window keyboard and blur listeners are scoped to a current mount and removed at disposal", () => {
  const session = create(), host = surface(true), events = []; session.mount(host); session.subscribe(event => { if (event.phase) events.push(event); });
  assert.equal(host.window.count(), 2); host.window.fire("keydown", { key: "Enter" });
  host.fire("pointerdown"); host.window.fire("keydown", { key: "Escape" });
  assert.equal(events.length, 1); assert.equal(events[0].phase, "cancel");
  host.fire("pointerdown"); host.window.fire("blur"); assert.equal(events.length, 2);
  const late = [...host.callbacks(), ...host.window.callbacks()]; session.destroy();
  assert.equal(host.count(), 0); assert.equal(host.window.count(), 0);
  for (const callback of late) callback({ key: "Escape", pointerId: 1, clientX: 60, clientY: 80 });
  assert.equal(events.length, 2);
});

test("external edits and replacement programs cancel the old gesture before accepting the new baseline", () => {
  for (const operation of ["command", "program"]) {
    const source = program(), session = create(source), host = surface(), events = []; session.mount(host); session.subscribe(event => events.push(event));
    host.fire("pointerdown");
    if (operation === "command") session.dispatch({ type: "select", target: "points", payload: { id: "picked", select: { field: "id", op: "eq", value: "b" } } });
    else session.updateProgram(source.editMarkSelection({ selection: "picked", field: "id", op: "eq", value: "b" }));
    assert.equal(events[0].phase, "cancel"); assert.equal(events[0].current, source); assert.deepEqual(selected(session), ["b"]);
    host.fire("pointerup"); host.fire("click", { detail: 1 }); assert.deepEqual(selected(session), ["b"]); assert.equal(host.captures.size, 0);
    session.destroy();
  }
});

test("invalid replacement leaves capture active while absent selection stays dormant", () => {
  const session = create(), host = surface(), events = []; session.mount(host); session.subscribe(event => { if (event.phase) events.push(event.phase); });
  host.fire("pointerdown"); assert.throws(() => session.updateProgram({}), /program|resource|data|undefined/i); assert.equal(host.captures.size, 1);
  host.fire("pointerup"); assert.deepEqual(events, ["commit", "settled"]);
  session.updateProgram(session.getState().program.removeMarkSelection({ selection: "picked" }));
  host.fire("pointerdown"); host.fire("pointerup"); assert.equal(host.captures.size, 0); session.destroy();
});

test("remount during commit retains synthetic-click suppression across SVG root replacement", () => {
  const session = create(), first = surface(), second = surface(), events = []; session.mount(first);
  session.subscribe(event => { if (event.phase) events.push(event.phase); if (event.phase === "commit") session.mount(second); });
  first.fire("pointerdown"); first.fire("pointerup"); second.fire("click", { detail: 1 });
  assert.deepEqual(selected(session), ["a"]); assert.deepEqual(events, ["commit", "settled"]); assert.equal(first.count(), 0);
  second.fire("pointerdown"); second.fire("pointerup"); assert.deepEqual(selected(session), []); session.destroy();
});

test("unmount, remount and destroy finish cleanup even when a cancel subscriber throws", () => {
  for (const operation of ["unmount", "remount", "destroy"]) {
    const session = create(), host = surface(true), replacement = surface(), unmount = session.mount(host);
    session.subscribe(event => { if (event.phase === "cancel") throw new Error("subscriber failure"); }); host.fire("pointerdown");
    assert.throws(() => operation === "unmount" ? unmount() : operation === "remount" ? session.mount(replacement) : session.destroy(), /subscriber failure/);
    assert.equal(host.count(), 0); assert.equal(host.window.count(), 0); assert.equal(host.captures.size, 0);
    assert.equal(session.getState().mounted, operation === "remount"); assert.equal(session.getState().destroyed, operation === "destroy");
    session.destroy(); assert.equal(replacement.count(), 0);
  }
});

test("capture failure, partial host APIs and registration failure preserve programs and existing leases", () => {
  const source = program(), session = create(source), first = surface(), phases = []; session.mount(first);
  session.subscribe(event => { if (event.phase) phases.push(event); });
  const partial = surface(); partial.releasePointerCapture = undefined; assert.throws(() => session.mount(partial), /both capture/); assert.equal(partial.count(), 0);
  const registration = surface(), add = registration.addEventListener;
  registration.addEventListener = (type, fn) => { add(type, fn); if (type === "pointerup") throw new Error("install failure"); };
  assert.throws(() => session.mount(registration), /install failure/); assert.equal(registration.count(), 0); assert.equal(session.getState().mounted, true);
  first.setPointerCapture = id => { first.captures.add(id); throw new Error("capture failure"); };
  assert.throws(() => first.fire("pointerdown"), /capture failure/); assert.equal(first.captures.size, 0); assert.equal(session.getState().program, source);
  assert.deepEqual(phases.map(event => [event.phase, event.diagnostics[0].code]), [["error", "pointer-capture-failed"]]);
  first.fire("pointerup"); session.destroy(); assert.equal(first.count(), 0);
});

test("secondary pointers and nonprimary buttons cannot claim or end the active selection", () => {
  const session = create(), host = surface(); session.mount(host);
  host.fire("pointerdown", { button: 2 }); assert.equal(host.captures.size, 0);
  host.fire("pointerdown"); host.fire("pointerdown", { pointerId: 2 }); host.fire("pointermove", { pointerId: 2, clientX: 200 }); host.fire("pointerup", { pointerId: 2 });
  host.fire("pointercancel", { pointerId: 2 }); assert.deepEqual([...host.captures], [1]);
  host.fire("pointerup"); assert.deepEqual(selected(session), ["a"]); session.destroy();
});

test("empty rectangles abort active capture and singular transforms never acquire it", () => {
  const session = create(), host = surface(), phases = []; session.mount(host); session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  host.fire("pointerdown", { pointerType: undefined, button: undefined });
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }); host.fire("pointermove");
  assert.deepEqual(phases, ["cancel"]); assert.equal(host.captures.size, 0);
  session.mount(host, { rootTransform: [0, 0, 0, 0, 0, 0] }); host.fire("pointerdown"); assert.equal(host.captures.size, 0); session.destroy();
});

test("release failures still finish terminal publication and clean every listener", () => {
  for (const name of ["NotFoundError", "HostFailure"]) {
    const session = create(), host = surface(), phases = []; host.hasPointerCapture = undefined;
    host.releasePointerCapture = id => { host.captures.delete(id); const error = new Error("release failure"); error.name = name; throw error; };
    session.mount(host); session.subscribe(event => { if (event.phase) phases.push(event.phase); }); host.fire("pointerdown");
    if (name === "NotFoundError") host.fire("pointerup"); else assert.throws(() => host.fire("pointerup"), /release failure/);
    assert.deepEqual(phases, ["commit", "settled"]); assert.deepEqual(selected(session), ["a"]); assert.equal(host.captures.size, 0); session.destroy(); assert.equal(host.count(), 0);
  }
  const session = create(), host = surface(); session.mount(host); host.fire("pointerdown");
  const remove = host.removeEventListener; host.removeEventListener = (type, fn) => { remove(type, fn); if (type === "pointermove" || type === "click") throw new Error("remove failure"); };
  assert.throws(() => session.destroy(), /remove failure/); assert.equal(session.getState().destroyed, true); assert.equal(host.count(), 0); assert.equal(host.captures.size, 0);
});

test("queued host input cannot reclaim a remounted lease and direct adapter disposal is idempotent", () => {
  const session = create(), host = surface(), next = surface(); session.mount(host);
  session.subscribe(event => { if (event.phase === "commit") { session.mount(next); host.fire("pointerdown"); host.fire("pointermove"); host.fire("pointercancel"); } });
  host.fire("click", { detail: 0 }); assert.equal(host.captures.size, 0); assert.equal(host.count(), 0); session.destroy();
  const fake = surface(); let live = true, queue = [], starts = 0;
  const adapter = prepareSelectionCapture(fake, { current: () => live, perform: fn => { queue.push(fn); }, point: event => ({ x: event.clientX, y: event.clientY }), begin: () => { starts++; return {}; }, blockClick() {}, select() {}, cancel() {} });
  fake.fire("pointerdown"); queue.shift()(); fake.fire("pointermove"); fake.fire("pointercancel"); live = false;
  for (const fn of queue) fn(); assert.equal(starts, 1); adapter.dispose(); adapter.dispose(); assert.equal(adapter.cancel("blur"), false); assert.equal(fake.count(), 0);
});
