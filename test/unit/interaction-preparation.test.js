import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, prepareImageRendering } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram } from "../../src/persistence.js";
import { render } from "../../src/renderers/canvas/index.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createHash } from "node:crypto";

const base = () => chart().createCanvas({ width: 200, height: 160 }).createParameter({ id: "n", value: 0 });
const edit = (value, transactionId = `n-${value}`) => ({ type: "setParameter", target: "n", payload: { value }, transactionId });
const tick = () => new Promise(resolve => setImmediate(resolve));
function controlled(program = base(), bindings = []) {
  const calls = [], events = [];
  const session = createInteractionSession({ program, bindings, assetResolver(request) {
    return new Promise((resolve, reject) => calls.push({ request, resolve, reject }));
  } });
  session.subscribe(event => events.push(event));
  const disposed = [];
  const lease = name => ({ dispose() { disposed.push(name); } });
  return { session, calls, events, disposed, lease };
}
async function initial(context) {
  await tick(); context.calls[0].resolve(context.lease("initial"));
  assert.equal((await context.session.whenSettled()).status, "settled");
}

test("native candidates wait for exact preparation before one commit, history entry and settled event", async () => {
  const p = base(), before = serializeProgram(p), c = controlled(p), { session: s } = c;
  assert.equal(s.getState().assets, null); assert.equal(s.getState().preparation.transactionId, "interaction-initial");
  await initial(c); const assets = s.getState().assets;
  assert.deepEqual(s.dispatch(edit(2)), { status: "queued" });
  const waiting = s.whenSettled(); await tick();
  assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0); assert.equal(s.getState().history.undoCount, 0);
  assert.equal(s.getState().assets, assets);
  assert.deepEqual(c.calls[1].request.resourceRevisionVector, [{ childPath: [], kind: "parameter", id: "n", revision: 1 }]);
  assert.equal(c.calls[1].request.baseRevision, 0); assert.equal(c.calls[1].request.sessionGeneration, 0);
  assert.ok(Object.isFrozen(c.calls[1].request)); assert.ok(Object.isFrozen(c.calls[1].request.resourceRevisionVector[0]));
  assert.equal(c.calls[1].request.signal.aborted, false);
  c.calls[1].resolve(c.lease("two")); assert.equal((await waiting).status, "settled");
  assert.equal(s.getState().revision, 1); assert.equal(s.getState().history.undoCount, 1); assert.equal(s.getState().preparation, null);
  assert.deepEqual(c.events.filter(e => e.type === "setParameter").map(e => [e.phase, e.transactionId, e.revision]), [["commit", "n-2", 1], ["settled", "n-2", 1]]);
  assert.deepEqual(c.disposed, ["initial"]); assert.equal(c.calls[0].request.signal.aborted, true);
  assert.equal(serializeProgram(p), before); s.destroy(); assert.deepEqual(c.disposed, ["initial", "two"]);
});

test("superseded results abort immediately, dispose late leases once and cannot overwrite newer state", async () => {
  const c = controlled(), s = c.session; await initial(c);
  s.dispatch(edit(1)); const old = s.whenSettled(); await tick();
  s.dispatch(edit(2)); const latest = s.whenSettled(); await tick();
  assert.equal((await old).status, "cancelled"); assert.equal(c.calls[1].request.signal.aborted, true);
  c.calls[2].resolve(c.lease("two")); await latest; const committed = s.getState();
  c.calls[1].resolve(c.lease("late")); await tick();
  assert.equal(s.getState(), committed); assert.deepEqual(c.disposed, ["initial", "late"]);
  assert.deepEqual(c.events.filter(e => e.type === "setParameter").map(e => [e.transactionId, e.phase]), [["n-1", "cancel"], ["n-2", "commit"], ["n-2", "settled"]]);
  s.destroy(); assert.deepEqual(c.disposed, ["initial", "late", "two"]);
});

test("resolver rejection and invalid leases preserve committed program, trace, history and accepted assets", async () => {
  const c = controlled(), s = c.session; await initial(c); const before = s.getState();
  for (const invalid of [false, true]) {
    s.dispatch(edit(invalid ? 2 : 1)); const ready = s.whenSettled(); await tick();
    const call = c.calls.at(-1);
    if (invalid) call.resolve({ images: {}, dispose() { c.disposed.push("invalid"); } });
    else call.reject(new Error("offline"));
    assert.equal((await ready).status, "error");
    assert.equal(s.getState().program, before.program); assert.equal(s.getState().history.undoCount, 0); assert.equal(s.getState().revision, 0);
    assert.equal(s.getState().assets, before.assets); assert.equal(call.request.signal.aborted, true);
  }
  assert.deepEqual(c.events.filter(e => e.type === "setParameter").map(e => e.phase), ["error", "error"]);
  assert.deepEqual(c.disposed, ["invalid"]);
  s.dispatch(edit(3)); await tick(); const call = c.calls.at(-1), ready = s.whenSettled();
  assert.throws(() => s.dispatch(edit(NaN)), /finite/); assert.equal(call.request.signal.aborted, false);
  call.resolve(c.lease("three")); await ready; s.destroy();
});

test("history and external updates prepare snapshots afresh and apply history only after acceptance", async () => {
  const c = controlled(), s = c.session; await initial(c); const first = s.getState().program;
  s.dispatch(edit(1)); await tick(); c.calls.at(-1).resolve(c.lease("one")); await s.whenSettled(); const second = s.getState().program;
  s.dispatch({ type: "undo", transactionId: "back" }); await tick();
  assert.equal(s.getState().program, second); assert.equal(s.getState().history.undoCount, 1); assert.equal(c.calls.at(-1).request.program, first);
  c.calls.at(-1).resolve(c.lease("back")); await s.whenSettled(); assert.equal(s.getState().program, first); assert.equal(s.getState().history.redoCount, 1);
  const outside = first.editCanvas({ width: 300 });
  s.updateProgram(outside, { history: "record", origin: "replay" }); await tick();
  assert.equal(s.getState().program, first); assert.equal(s.getState().history.redoCount, 1);
  c.calls.at(-1).resolve(c.lease("outside")); await s.whenSettled(); assert.equal(s.getState().program, outside);
  assert.equal(s.getState().history.undoCount, 1); assert.equal(s.getState().history.redoCount, 0);
  assert.deepEqual(c.events.slice(-2).map(e => e.type), ["program", "assets"]);
  assert.equal(c.events.at(-2).origin, "replay");
  s.dispatch({ type: "reset" }); await tick(); c.calls.at(-1).resolve(c.lease("reset")); await s.whenSettled();
  assert.equal(s.getState().program, first); s.destroy();
});

test("async subscriber reentry uses the same transaction loop guard and later IDs remain FIFO", async () => {
  const c = controlled(), s = c.session; await initial(c);
  let repeats = 0;
  s.subscribe(event => {
    if (event.type === "setParameter" && event.phase === "commit" && event.transactionId === "n-1") {
      repeats++; assert.equal(s.dispatch(edit(9, "n-1")).status, "queued");
      s.dispatch(edit(2));
    }
  });
  s.dispatch(edit(1)); await tick(); c.calls.at(-1).resolve(c.lease("one")); await s.whenSettled(); await tick();
  assert.equal(repeats, 1); assert.equal(c.calls.length, 3); assert.equal(c.calls.at(-1).request.transactionId, "n-2");
  c.calls.at(-1).resolve(c.lease("two")); await s.whenSettled();
  assert.deepEqual(c.events.filter(e => e.type === "setParameter").map(e => [e.transactionId, e.phase]), [["n-1", "commit"], ["n-1", "settled"], ["n-2", "commit"], ["n-2", "settled"]]);
  s.destroy();
});

test("nested vectors distinguish equal local resource IDs and include dataset logical identity", async () => {
  const left = base().createData({ id: "rows", values: [{ value: 1 }] });
  const right = left.editParameter({ target: "n", value: 3 });
  const c = controlled(hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] })); await tick();
  const vector = c.calls[0].request.resourceRevisionVector;
  assert.deepEqual(vector.filter(ref => ref.kind === "parameter").map(ref => [ref.childPath, ref.id, ref.revision]), [[["left"], "n", 0], [["right"], "n", 1]]);
  assert.deepEqual(vector.filter(ref => ref.kind === "data").map(ref => [ref.childPath, ref.id, ref.logicalId, ref.revision]), [[["left"], "rows", left.semanticSpec.datasets[0].logicalId, 0], [["right"], "rows", left.semanticSpec.datasets[0].logicalId, 0]]);
  c.calls[0].resolve(c.lease("nested")); await c.session.whenSettled(); c.session.destroy();
});

test("100 mount/destroy cycles cancel pending jobs, release listeners and ignore successful late callbacks", async () => {
  const p = base(); let callbacks = 0, releases = 0;
  for (let index = 0; index < 100; index++) {
    const c = controlled(p, [{ type: "inspect" }]), listeners = new Set();
    const host = { addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); }, getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } };
    const unmount = c.session.mount(host); assert.equal(listeners.size, 3); await tick();
    c.session.subscribe(event => { if (event.type === "assets" && event.status === "settled") callbacks++; });
    const ready = c.session.whenSettled(); assert.equal(c.session.destroy(), true); assert.equal(c.session.destroy(), false);
    assert.equal((await ready).status, "cancelled"); assert.equal(listeners.size, 0); assert.equal(unmount(), false); assert.equal(c.calls[0].request.signal.aborted, true);
    c.calls[0].resolve({ dispose() { releases++; } }); await tick(); assert.equal(c.session.getState().assets, null);
  }
  assert.equal(callbacks, 0); assert.equal(releases, 100);
});

test("destroy survives throwing subscribers and disposers and leaves no accepted lease", async () => {
  const c = controlled(), s = c.session; await initial(c);
  s.subscribe(event => { if (event.type === "setParameter" && event.phase === "commit") { s.destroy(); throw new Error("observer failed"); } });
  s.dispatch(edit(1)); await tick(); c.calls.at(-1).resolve({ dispose() { c.disposed.push("broken"); throw new Error("dispose failed"); } });
  await assert.rejects(s.whenSettled(), /observer failed/); assert.equal(s.getState().destroyed, true);
  assert.equal(s.getState().assets, null); assert.deepEqual(c.disposed, ["initial", "broken"]); assert.equal(s.destroy(), false);
  assert.throws(() => s.dispatch(edit(2)), /disposed/);
});

test("Basic sessions accept authentic image preparations and keep their exact graphic identity", async () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#008000"/></svg>');
  const image = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml", byteLength: bytes.length,
    width: 2, height: 2, payload: { encoding: "base64", data: bytes.toString("base64") } };
  let p = basic().createCanvas({ width: 30, height: 20, margin: 0 }).createGraphics({ id: "picture", type: "image", parent: "plot-main" });
  for (const [property, value] of Object.entries({ image, x: 2, y: 2, width: 12, height: 12 })) p = p.editGraphics({ target: "picture", property, value });
  let releases = 0, decodes = 0;
  const s = createInteractionSession({ program: p, bindings: [], async assetResolver({ program, signal }) {
    const images = await prepareImageRendering(program, { signal, async decode({ bytes }) {
      decodes++; const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true };
    } });
    return { images, dispose() { releases++; } };
  } });
  await s.whenSettled(); const prepared = s.getState().assets;
  const canvas = createCanvas(30, 20); render(p, canvas.getContext("2d"), prepared);
  assert.deepEqual([...canvas.getContext("2d").getImageData(5, 5, 1, 1).data], [0, 128, 0, 255]); assert.equal(decodes, 1);
  assert.equal(prepared.images.kind, "image-rendering"); assert.ok(Object.isFrozen(prepared));
  s.destroy(); assert.equal(releases, 1); assert.throws(() => render(p, canvas.getContext("2d"), prepared), /abort/i);
});

test("resolver options and lease records reject accessors without invoking them", async () => {
  let reads = 0;
  assert.throws(() => createInteractionSession({ program: base(), assetResolver: null }), /function/);
  assert.throws(() => createInteractionSession({ program: base(), get assetResolver() { reads++; return () => ({}); } }), /accessors/);
  const c = controlled(); await tick();
  c.calls[0].resolve({ get dispose() { reads++; return () => {}; } });
  assert.equal((await c.session.whenSettled()).status, "error"); assert.equal(reads, 0); c.session.destroy();
});

test("cancelled restores and external preparations keep the original committed snapshot and history", async () => {
  const c = controlled(), s = c.session; await initial(c);
  s.dispatch(edit(1)); await tick(); c.calls.at(-1).resolve(c.lease("one")); await s.whenSettled(); const previous = s.getState().program;
  s.dispatch({ type: "undo" }); const undo = s.whenSettled(); await tick();
  c.calls.at(-1).reject(new Error("font unavailable")); assert.equal((await undo).status, "error");
  assert.equal(s.getState().program, previous); assert.equal(s.getState().history.undoCount, 1);
  s.dispatch({ type: "undo" }); const cancelled = s.whenSettled(); await tick();
  s.updateProgram(previous.editCanvas({ width: 400 })); await tick(); assert.equal((await cancelled).status, "cancelled");
  c.calls.at(-1).reject(new Error("decoder unavailable")); assert.equal((await s.whenSettled()).status, "error");
  assert.equal(s.getState().program, previous); assert.equal(s.getState().history.undoCount, 1);
  s.updateProgram(previous.editCanvas({ width: 500 })); const update = s.whenSettled(); await tick(); s.destroy();
  assert.equal((await update).status, "cancelled"); assert.equal(s.getState().program, previous);
  assert.deepEqual(c.events.filter(e => e.type === "undo").map(e => e.phase), ["error", "cancel"]);
  assert.deepEqual(c.events.filter(e => e.type === "assets").map(e => e.status), ["settled", "error", "cancelled"]);
});

test("immediate replacement skips unused resolver calls and no-op restores cancel only the pending job", async () => {
  const c = controlled(), s = c.session;
  const initial = s.whenSettled(); s.dispatch(edit(1)); const first = s.whenSettled();
  s.dispatch({ type: "undo" }); assert.equal((await initial).status, "cancelled"); assert.equal((await first).status, "cancelled");
  await tick(); assert.equal(c.calls.length, 0); assert.equal(s.getState().revision, 0);
  s.dispatch(edit(2)); await tick(); const promise = s.whenSettled(); s.destroy(); c.calls[0].reject(new Error("aborted host"));
  assert.equal((await promise).status, "cancelled"); await tick(); assert.equal(s.getState().destroyed, true);
});

test("asynchronous subscriber failures reject their job and discard queued edits without rolling back a commit", async () => {
  const c = controlled(), s = c.session; await initial(c);
  const unsubscribe = s.subscribe(event => {
    if (event.type === "setParameter" && event.phase === "commit") { s.dispatch(edit(8)); throw new Error("listener broke"); }
  });
  s.dispatch(edit(1)); await tick(); c.calls.at(-1).resolve(c.lease("one"));
  await assert.rejects(s.whenSettled(), /listener broke/); await tick();
  assert.equal(c.calls.length, 2); assert.equal(s.getState().revision, 1); assert.equal(s.getState().history.undoCount, 1);
  unsubscribe(); s.destroy(); assert.deepEqual(c.disposed, ["initial", "one"]);
});

test("cancellation subscriber failures still abort the job and do not start a replacement", async () => {
  const c = controlled(), s = c.session; await initial(c);
  const unsubscribe = s.subscribe(event => { if (event.phase === "cancel") throw new Error("cancel listener broke"); });
  s.dispatch(edit(1)); const promise = s.whenSettled(); await tick();
  assert.throws(() => s.dispatch(edit(2)), /cancel listener broke/); await assert.rejects(promise, /cancel listener broke/);
  assert.equal(c.calls[1].request.signal.aborted, true); assert.equal(s.getState().revision, 0); assert.equal(s.getState().preparation, null);
  c.calls[1].resolve(c.lease("late")); await tick(); unsubscribe(); s.destroy(); assert.deepEqual(c.disposed, ["late", "initial"]);
});

test("a host transform change during preparation is checked before accepting candidate assets", async () => {
  const p = chart().createCanvas({ width: 200, height: 160, margin: 0 }).createAnnotation({ id: "note", space: "screen", x: 10, y: 20, text: "Note" });
  const c = controlled(p), s = c.session; await initial(c);
  s.dispatch({ type: "annotate", target: "note", payload: { dx: 1e308 } }); await tick();
  const host = { addEventListener() {}, removeEventListener() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 160 }; } };
  s.mount(host, { rootTransform: [2, 0, 0, 2, 0, 0] }); const before = s.getState();
  c.calls.at(-1).resolve(c.lease("overflow")); assert.equal((await s.whenSettled()).status, "error");
  assert.equal(s.getState().program, p); assert.equal(s.getState().scene, before.scene); assert.equal(s.getState().revision, 0);
  assert.deepEqual(c.disposed, ["overflow"]); s.destroy();
});

test("invalid completed lease values reject without a commit and preserve the accepted lease", async () => {
  const c = controlled(), s = c.session; await initial(c);
  for (const [index, lease] of [null, {}, { dispose: null }, { dispose() {}, images: null }, { dispose() {}, images: 2 }].entries()) {
    s.dispatch(edit(index + 1)); await tick(); c.calls.at(-1).resolve(lease);
    assert.equal((await s.whenSettled()).status, "error"); assert.equal(s.getState().revision, 0);
  }
  s.destroy(); assert.deepEqual(c.disposed, ["initial"]);
});

test("100 active gesture teardown cycles release capture and scheduled previews before late callbacks", async () => {
  const p = chart().createCanvas({ width: 200, height: 160, margin: 0 }).createAnnotation({ id: "note", space: "screen", x: 40, y: 60, text: "Move", align: "center", baseline: "middle" });
  for (let cycle = 0; cycle < 100; cycle++) {
    const listeners = new Map(), frames = new Map(), captures = new Set(); let next = 0, releases = 0;
    const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 160 }),
      addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); },
      requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); },
      setPointerCapture(id) { captures.add(id); }, releasePointerCapture(id) { captures.delete(id); }, hasPointerCapture(id) { return captures.has(id); } };
    const session = createInteractionSession({ program: p, bindings: [{ type: "annotate", target: "note" }], assetResolver: () => ({ dispose() { releases++; } }) });
    await session.whenSettled(); session.mount(host); const events = []; session.subscribe(event => events.push(event));
    const event = { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 60 };
    listeners.get("pointerdown")(event); listeners.get("pointermove")({ ...event, clientX: 55 });
    assert.equal(captures.size, 1); assert.equal(frames.size, 1); const late = [...frames.values()][0];
    session.destroy(); const count = events.length; late();
    assert.equal(events.length, count); assert.equal(listeners.size, 0); assert.equal(frames.size, 0); assert.equal(captures.size, 0); assert.equal(releases, 1);
    assert.equal(session.getState().program, p); assert.equal(session.getState().previewProgram, null);
    assert.deepEqual(events.filter(event => event.phase).map(event => event.phase), ["cancel"]);
  }
});
