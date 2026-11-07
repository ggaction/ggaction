import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram } from "../../src/persistence.js";

const base = () => chart().createCanvas({ width: 200, height: 160 });
const tick = () => new Promise(resolve => setImmediate(resolve));
function surface(options = {}) {
  const observers = [], listeners = new Map();
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = 0; observers.push(this); }
    observe(element, config) { this.element = element; this.options = config; if (options.observeError) throw new Error("observe failed"); }
    disconnect() { this.disconnected++; if (options.disconnectError) throw new Error("disconnect failed"); }
    resize(width, height) { this.callback([{ target: this.element, contentRect: { width, height } }]); }
  }
  const element = { ownerDocument: { defaultView: { ResizeObserver } },
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 160 }; },
    addEventListener(type, callback) { listeners.set(type, callback); }, removeEventListener(type) { listeners.delete(type); } };
  return { element, observers, listeners };
}

test("explicit resize observation emits content-box CSS measurements without authoring or DPR inference", () => {
  const p = base(), before = serializeProgram(p), s = createInteractionSession({ program: p }), host = surface(), events = [];
  s.subscribe(e => events.push(e)); s.mount(host.element, { observeResize: true, rootTransform: [2, 0, 0, 2, 0, 0] });
  const version = s.getState().frameVersion, observer = host.observers[0];
  assert.deepEqual(observer.options, { box: "content-box" });
  for (const dimensions of [[300, 180], [300, 180], [0, 0], [200.5, 160.25]]) observer.resize(...dimensions);
  assert.deepEqual(events.filter(e => e.type === "resize").map(e => e.size), [{ width: 300, height: 180 }, { width: 0, height: 0 }, { width: 200.5, height: 160.25 }]);
  assert.equal(s.getState().program, p); assert.equal(s.getState().frameVersion, version); assert.equal(s.getState().revision, 0); assert.equal(s.getState().history.undoCount, 0);
  assert.ok(Object.isFrozen(events.at(-1).size)); assert.equal(serializeProgram(p), before); s.destroy(); assert.equal(observer.disconnected, 1);
});

test("observation defaults off and invalid or unsupported hosts preserve an existing mount", () => {
  const s = createInteractionSession({ program: base() }), first = surface(), next = surface();
  s.mount(first.element); assert.equal(first.observers.length, 0); const before = s.getState();
  for (const observeResize of [null, 1, "true"]) assert.throws(() => s.mount(next.element, { observeResize }), /boolean/);
  next.element.ownerDocument.defaultView.ResizeObserver = undefined;
  assert.throws(() => s.mount(next.element, { observeResize: true }), /host ResizeObserver/);
  assert.equal(s.getState(), before); assert.equal(first.listeners.size, 3); assert.equal(next.listeners.size, 0);
  const unmount = s.mount(next.element, { observeResize: false }); assert.equal(first.listeners.size, 0); assert.equal(next.listeners.size, 3);
  assert.equal(unmount(), true); assert.equal(unmount(), false); s.destroy();
});

test("100 mount and detach cycles disconnect once and ignore notifications from previous surfaces", () => {
  const s = createInteractionSession({ program: base() }), events = []; s.subscribe(e => events.push(e));
  const observers = [];
  for (let i = 0; i < 100; i++) {
    const host = surface(), off = s.mount(host.element, { observeResize: true }), observer = host.observers[0]; observers.push(observer);
    observer.resize(i + 1, 100); const count = events.length;
    if (i % 2) off(); else { const other = surface(); s.mount(other.element); }
    assert.equal(observer.disconnected, 1); assert.equal(host.listeners.size, 0);
    const now = events.length; observer.resize(999, 999); assert.equal(events.length, now); assert.ok(now > count);
  }
  s.destroy(); assert.equal(s.destroy(), false); assert.ok(observers.every(observer => observer.disconnected === 1));
  const count = events.length; observers.forEach(observer => observer.resize(1, 1)); assert.equal(events.length, count);
});

test("observe failures unwind only the attempted mount even when its disposer also throws", () => {
  const s = createInteractionSession({ program: base() }), first = surface(), second = surface({ observeError: true, disconnectError: true });
  s.mount(first.element, { observeResize: true }); const before = s.getState();
  assert.throws(() => s.mount(second.element, { observeResize: true }), /observe failed/);
  assert.equal(second.listeners.size, 0); assert.equal(second.observers[0].disconnected, 1);
  assert.equal(first.listeners.size, 3); assert.equal(first.observers[0].disconnected, 0); assert.equal(s.getState(), before); s.destroy();
});

test("disconnect failures still remove listeners and make destruction terminal", () => {
  const s = createInteractionSession({ program: base() }), host = surface({ disconnectError: true });
  s.mount(host.element, { observeResize: true }); assert.throws(() => s.destroy(), /disconnect failed/);
  assert.equal(host.listeners.size, 0); assert.equal(host.observers[0].disconnected, 1); assert.equal(s.getState().destroyed, true); assert.equal(s.destroy(), false);
  assert.doesNotThrow(() => host.observers[0].resize(300, 200));
});

test("host resize policy uses prepared native updates and supersedes earlier measured candidates", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }), host = surface(), pending = [], events = [];
  s.subscribe(e => {
    events.push(e);
    if (e.type === "resize" && e.size.width && e.size.height) s.updateProgram(request => new Promise(resolve => pending.push({ request, resolve, size: e.size })), { history: "record", origin: "user" });
  });
  s.mount(host.element, { observeResize: true }); const observer = host.observers[0];
  observer.resize(300, 200); await tick(); const first = s.whenSettled(); observer.resize(400, 250); await tick(); const second = s.whenSettled();
  assert.equal((await first).status, "cancelled"); assert.equal(pending[0].request.signal.aborted, true); assert.equal(s.getState().program, p);
  pending[1].resolve(pending[1].request.program.editCanvas(pending[1].size)); await second;
  const current = s.getState(); assert.equal(current.program.graphicSpec.objects.canvas.properties.width, 400); assert.equal(current.history.undoCount, 1);
  pending[0].resolve(pending[0].request.program.editCanvas(pending[0].size)); await tick(); assert.equal(s.getState(), current);
  observer.resize(0, 0); await tick(); assert.equal(pending.length, 2); assert.equal(s.getState().program, current.program);
  observer.resize(500, 300); await tick(); const third = s.whenSettled(); s.destroy(); assert.equal((await third).status, "cancelled");
  const count = events.length; pending[2].resolve(p); observer.resize(600, 400); await tick(); assert.equal(events.length, count);
  assert.deepEqual(events.filter(e => e.type === "update").map(e => e.status), ["cancelled", "settled", "cancelled"]);
});

test("subscriber destruction and reentry use FIFO and prevent further entries in one host notification", () => {
  const s = createInteractionSession({ program: base() }), host = surface(), events = [];
  s.mount(host.element, { observeResize: true });
  s.subscribe(e => { events.push(e); if (e.type === "resize") { s.destroy(); throw new Error("resize subscriber"); } });
  assert.throws(() => host.observers[0].resize(300, 200), /resize subscriber/);
  assert.equal(s.getState().destroyed, true); assert.equal(host.listeners.size, 0); assert.equal(host.observers[0].disconnected, 1);
  assert.deepEqual(events.map(e => e.type), ["resize", "destroy"]);
});

test("malformed measurements and observer implementations reject before changing committed state", () => {
  const s = createInteractionSession({ program: base() }), host = surface(), events = []; s.subscribe(e => events.push(e));
  s.mount(host.element, { observeResize: true }); const observer = host.observers[0], before = s.getState();
  for (const pair of [[NaN, 2], [1, Infinity], [-1, 2], ["1", 2]]) assert.throws(() => observer.resize(...pair), /finite non-negative/);
  assert.throws(() => observer.callback({}), /entry budget/); assert.throws(() => observer.callback(Array(257).fill({})), /entry budget/);
  assert.throws(() => observer.callback(Array(2).fill({ target: host.element, contentRect: { width: 1, height: 1 } })), /duplicate/);
  observer.callback([]); observer.callback([{ target: {}, contentRect: { width: 1, height: 1 } }]);
  assert.equal(s.getState(), before); assert.equal(events.length, 1);
  const bad = surface(); bad.element.ownerDocument.defaultView.ResizeObserver = class { disconnect() {} };
  assert.throws(() => s.mount(bad.element, { observeResize: true }), /observe and disconnect/); assert.equal(bad.listeners.size, 0); assert.equal(s.getState(), before); s.destroy();
});
