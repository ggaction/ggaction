import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, prepareImageRendering } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { planTransition, sampleTransition, createAnimationPlayer, serializeAnimation, deserializeAnimation } from "../../src/animation.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { render } from "../../src/renderers/canvas/index.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createHash } from "node:crypto";

const points = () => chart().createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { id: "x", domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 10], nice: false } })
  .selectMarks({ id: "picked", target: "points", items: [], empty: "none" });
const moved = p => p.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 9, y: 9 }] });
const options = { durationMs: 100, easing: "linear" };
const plan = (from, to) => planTransition({ from, to, options });
const keyboard = (target = "points") => ({ type: "keyboard", targets: [{ target, activation: { type: "select", selection: "picked", mode: "toggle" } }] });
const tick = () => new Promise(resolve => setImmediate(resolve));
const frameCommand = (s, frame, version = s.getState().frameVersion + 1) => ({ type: "frame", frame, version, generation: s.getState().generation });

test("authentic frames atomically publish exact hit and native focus without authoring or history", () => {
  const p = points(), before = serializeProgram(p), frame = sampleTransition(plan(p, moved(p)), 50);
  const s = createInteractionSession({ program: p, bindings: [keyboard()] }), events = [];
  s.dispatch({ type: "focus", move: "first" });
  s.subscribe(event => { events.push(event); if (event.type === "frame") assert.deepEqual(event.state.focus.screenPoint, { x: 120, y: 90 }); });
  assert.equal(s.dispatch(frameCommand(s, frame)).status, "applied");
  assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().frameAssets, null);
  s.dispatch({ type: "inspect", point: { x: 120, y: 90 }, slop: 0 });
  assert.equal(s.getState().hit.target.itemKey, getMarkItems(p)[0].key);
  assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0); assert.equal(s.getState().history.undoCount, 0);
  assert.equal(serializeProgram(p), before);
  s.dispatch({ type: "activate" }); assert.equal(s.getState().history.undoCount, 1);
  assert.equal(s.getState().animationFrame, null); assert.equal(s.getState().frameAssets, null);
  assert.deepEqual(events.slice(-2).map(event => [event.type, event.phase]), [["select", "commit"], ["select", "settled"]]);
  assert.equal(s.dispatch({ ...frameCommand(s, frame), generation: 0 }).status, "stale"); s.destroy();
});

test("Basic authentic weighted inspection preserves its constructor boundary and current item focus", () => {
  const p = basic().createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const frame = sampleTransition(plan(p, p.encodeColor({ value: "red" })), 50);
  const s = createInteractionSession({ program: p, bindings: [{ type: "keyboard", targets: [{ target: "points" }] }] });
  s.dispatch(frameCommand(s, frame)); s.dispatch({ type: "focus", move: "first" });
  s.dispatch({ type: "inspect", point: s.getState().focus.screenPoint, slop: 0 }); assert.equal(s.getState().hit.target.itemKey, getMarkItems(p)[0].key);
  assert.equal(s.dispatch({ type: "activate" }).status, "unchanged"); assert.equal(s.getState().program, p);
  assert.throws(() => s.dispatch({ type: "select", target: "points", payload: { id: "picked", select: { items: [] } } }), /Full|support|method/);
  assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().history.undoCount, 0); s.destroy();
});

test("stale frame payloads remain unread and cloned, foreign and offline frames fail atomically", () => {
  const p = points(), transition = plan(p, moved(p)), frame = sampleTransition(transition, 50), s = createInteractionSession({ program: p });
  s.dispatch(frameCommand(s, frame)); const before = s.getState(); let reads = 0;
  const unread = new Proxy({}, { get() { reads++; throw new Error("read stale frame"); }, ownKeys() { reads++; throw new Error("enumerated stale frame"); } });
  for (const c of [{ version: 0, generation: 0 }, { version: 100, generation: 1 }]) assert.equal(s.dispatch({ type: "frame", frame: unread, ...c }).status, "stale");
  assert.equal(reads, 0);
  for (const invalid of [structuredClone(frame), sampleTransition(plan(points(), moved(points())), 50), sampleTransition(deserializeAnimation(serializeAnimation(transition)).plan, 50)]) {
    assert.throws(() => s.dispatch(frameCommand(s, invalid)), /authentic|current native program|native endpoint metadata/); assert.equal(s.getState(), before);
  }
  assert.throws(() => s.dispatch({ ...frameCommand(s, frame), scene: frame.scene }), /exactly one/);
  assert.throws(() => s.dispatch({ type: "frame", version: 2, generation: 0 }), /exactly one/);
  const restored = createInteractionSession({ program: deserializeProgram(serializeProgram(p)) });
  assert.throws(() => restored.dispatch(frameCommand(restored, frame)), /current native program/); restored.destroy(); s.destroy();
});

test("enter and exit shapes are inspectable but focus and activation intersect current native items", () => {
  const a = points(), b = a.reviseData({ source: "rows", id: "next", values: [{ id: "b", x: 9, y: 9 }] }), frame = sampleTransition(plan(a, b), 50);
  for (const p of [a, b]) {
    const s = createInteractionSession({ program: p, bindings: [keyboard()] }), key = getMarkItems(p)[0].key;
    s.dispatch(frameCommand(s, frame)); s.dispatch({ type: "focus", move: "first" });
    assert.equal(s.getState().focus.itemKey, key);
    assert.equal(s.dispatch({ type: "focus", move: "next" }).status, "unchanged");
    for (const point of [{ x: 40, y: 146 }, { x: 200, y: 34 }]) {
      s.dispatch({ type: "inspect", point, slop: 0 }); assert.ok(s.getState().hit.target);
    }
    const other = getMarkItems(p === a ? b : a)[0].key;
    assert.throws(() => s.dispatch({ type: "focus", target: "points", itemKey: other }), /not painted/);
    s.dispatch({ type: "activate" }); assert.equal(s.getState().history.undoCount, 1); s.destroy();
  }
});

test("overlapping enter, exit and weighted shapes keep one candidate per item and one native click transaction", () => {
  const values = ids => ids.map(id => ({ id, x: 5, y: 5 }));
  const a = points().reviseData({ source: "rows", id: "overlap", values: values(["a", "b", "c"]) }).encodeRadius({ value: 12 });
  const b = a.reviseData({ source: "overlap", id: "end", values: values(["a", "b", "d"]) }).encodeColor({ value: "red" });
  const beforeKeys = getMarkItems(a).map(item => item.key), afterKeys = getMarkItems(b).map(item => item.key);
  const transition = plan(a, b), keys = { a: beforeKeys[0], b: beforeKeys[1], c: beforeKeys[2], d: afterKeys[2] };
  for (const [program, native] of [[a, "before"], [b, "after"]]) for (const time of [0, 25, 50, 75, 100]) {
    const frame = sampleTransition(transition, time), listeners = new Map(), events = [], original = serializeProgram(program);
    const s = createInteractionSession({ program, bindings: [{ type: "select", target: "points", selection: "picked", mode: "toggle", slop: 0 }, keyboard()] });
    s.mount({ addEventListener(type, listener) { listeners.set(type, listener); }, removeEventListener(type) { listeners.delete(type); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 180 }) });
    s.dispatch(frameCommand(s, frame)); s.subscribe(event => events.push(event));
    s.dispatch({ type: "inspect", point: { x: 120, y: 90 }, slop: 0 });
    const expected = time === 0 ? ["c", "b", "a"] : time === 100 ? ["d", "b", "a"] : ["c", "d", "b", "a"];
    const hits = s.getState().hit.candidates;
    assert.deepEqual(hits.map(item => item.itemKey), expected.map(name => keys[name]));
    assert.equal(new Set(hits.map(item => item.itemKey)).size, hits.length);
    assert.equal(events.filter(event => event.type === "inspect").length, 1);
    assert.equal(s.getState().history.undoCount, 0);
    listeners.get("click")({ button: 0, detail: 0, clientX: 120, clientY: 90 });
    const selected = native === "before" ? time === 100 ? "b" : "c" : time === 0 ? "b" : "d";
    assert.deepEqual(resolveStoredSelection(s.getState().program, "picked").keys, [keys[selected]]);
    assert.equal(s.getState().history.undoCount, 1); assert.equal(s.getState().animationFrame, null);
    assert.deepEqual(events.filter(event => event.type === "select").map(event => event.phase), ["commit", "settled"]);
    assert.equal(serializeProgram(program), original); s.destroy(); assert.equal(listeners.size, 0);
  }
});

test("nested sampled frames retain namespace through transformed mount, plain frame replacement and unmount", () => {
  const p = points(), a = hconcat({ id: "pair", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const b = hconcat({ id: "pair", programs: [{ id: "left", program: moved(p) }, { id: "right", program: moved(p) }] });
  const frame = sampleTransition(plan(a, b), 50), target = { childPath: ["right"], id: "points" };
  const s = createInteractionSession({ program: a, bindings: [keyboard(target)] }); s.dispatch(frameCommand(s, frame)); s.dispatch({ type: "focus", move: "first" });
  const original = s.getState().focus.screenPoint;
  const off = s.mount({ addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400 }) }, { rootTransform: [0, 2, -2, 0, 500, 0] });
  assert.deepEqual(s.getState().focus.screenPoint, { x: 500 - original.y * 2, y: original.x * 2 });
  s.dispatch({ type: "inspect", point: s.getState().focus.screenPoint, slop: 0 }); assert.deepEqual(s.getState().hit.target.childPath, ["right"]);
  off(); assert.deepEqual(s.getState().focus.screenPoint, original); assert.equal(s.getState().animationFrame, frame);
  s.dispatch({ type: "frame", scene: s.getState().scene, version: s.getState().frameVersion + 1, generation: 0 });
  assert.equal(s.getState().animationFrame, null); s.destroy();
});

function controlled(p = points()) {
  const calls = [], releases = [], events = [];
  const s = createInteractionSession({ program: p, bindings: [keyboard()], assetResolver: request => new Promise((resolve, reject) => calls.push({ request, resolve, reject })) });
  s.subscribe(event => events.push(event));
  return { s, calls, releases, events, lease: name => ({ dispose() { releases.push(name); } }) };
}
async function ready(c) { await tick(); c.calls[0].resolve(c.lease("initial")); await c.s.whenSettled(); c.s.dispatch({ type: "focus", move: "first" }); }

test("transient preparations retain committed assets and publish frame, focus and lease in one event", async () => {
  const p = points(), transition = plan(p, moved(p)), frame = sampleTransition(transition, 50), c = controlled(p), s = c.s; await ready(c);
  const before = s.getState(); assert.equal(s.dispatch(frameCommand(s, frame, 10)).status, "queued"); const pending = s.whenSettled(); await tick();
  const request = c.calls[1].request;
  assert.equal(request.frame, frame); assert.equal(request.program, p); assert.equal(request.frameVersion, 10); assert.equal(request.baseRevision, 0); assert.equal(request.sessionGeneration, 0);
  assert.equal(s.getState().animationFrame, null); assert.equal(s.getState().scene, before.scene); assert.equal(s.getState().focus, before.focus); assert.equal(s.getState().assets, before.assets);
  c.calls[1].resolve(c.lease("frame")); assert.equal((await pending).status, "settled");
  assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().assets, before.assets); assert.ok(s.getState().frameAssets); assert.deepEqual(c.releases, []);
  const accepted = s.getState(), next = sampleTransition(transition, 75); s.dispatch(frameCommand(s, next, 11)); await tick();
  assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().frameAssets, accepted.frameAssets);
  c.calls[2].reject(new Error("decoder unavailable")); assert.equal((await s.whenSettled()).status, "error");
  assert.equal(s.getState().scene, accepted.scene); assert.equal(s.getState().focus, accepted.focus); assert.equal(s.getState().frameAssets, accepted.frameAssets);
  s.dispatch(frameCommand(s, next, 12)); await tick(); c.calls[3].resolve(c.lease("next")); await s.whenSettled();
  assert.deepEqual(c.releases, ["frame"]); assert.equal(c.calls[1].request.signal.aborted, true);
  assert.equal(s.getState().program, p); assert.equal(s.getState().history.undoCount, 0); assert.equal(s.getState().revision, 0);
  s.destroy(); assert.deepEqual(c.releases, ["frame", "initial", "next"]);
});

test("superseded and destroyed frame work aborts once and late renderer leases cannot publish", async () => {
  const p = points(), transition = plan(p, moved(p)), c = controlled(p), s = c.s; await ready(c);
  s.dispatch(frameCommand(s, sampleTransition(transition, 25), 10)); const older = s.whenSettled(); await tick();
  s.dispatch(frameCommand(s, sampleTransition(transition, 75), 11)); const newer = s.whenSettled(); await tick();
  assert.equal((await older).status, "cancelled"); assert.equal(c.calls[1].request.signal.aborted, true);
  c.calls[1].resolve(c.lease("late")); await tick(); assert.equal(s.getState().animationFrame, null);
  c.calls[2].resolve(c.lease("accepted")); await newer;
  s.dispatch(frameCommand(s, sampleTransition(transition, 90), 12)); const last = s.whenSettled(); await tick();
  s.destroy(); assert.equal((await last).status, "cancelled"); const count = c.events.length;
  c.calls[3].resolve(c.lease("destroyed-late")); await tick(); assert.equal(c.events.length, count);
  assert.equal(s.getState().frameAssets, null); assert.equal(s.getState().animationFrame, null);
  assert.deepEqual(c.releases, ["late", "initial", "accepted", "destroyed-late"]);
});

test("invalid replacement preserves pending work; native commit cancels its exact generation and accepted lease", async () => {
  const p = points(), frame = sampleTransition(plan(p, moved(p)), 50), c = controlled(p), s = c.s; await ready(c);
  s.dispatch(frameCommand(s, frame, 5)); await tick(); const pending = s.whenSettled();
  assert.throws(() => s.dispatch(frameCommand(s, structuredClone(frame), 6)), /authentic/);
  assert.throws(() => s.dispatch({ type: "select", target: "missing", payload: { selection: "picked", items: [] } }));
  assert.equal(c.calls[1].request.signal.aborted, false); c.calls[1].resolve(c.lease("frame")); await pending;
  s.dispatch(frameCommand(s, frame, 7)); await tick(); const cancelled = s.whenSettled();
  s.dispatch({ type: "activate" }); await tick(); assert.equal((await cancelled).status, "cancelled");
  assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().program, p);
  c.calls[3].resolve(c.lease("selected")); await s.whenSettled();
  assert.equal(s.getState().animationFrame, null); assert.equal(s.getState().frameAssets, null); assert.equal(s.getState().history.undoCount, 1);
  c.calls[2].resolve(c.lease("late")); await tick(); assert.deepEqual(c.releases, ["frame", "initial", "late"]);
  assert.equal(s.dispatch({ ...frameCommand(s, frame, 100), generation: 0 }).status, "stale"); s.destroy();
});

test("frame subscriber reentry is FIFO and throwing disposal leaves an already published coherent state", async () => {
  const p = points(), transition = plan(p, moved(p)), first = sampleTransition(transition, 25), second = sampleTransition(transition, 75), c = controlled(p), s = c.s; await ready(c);
  s.subscribe(event => { if (event.type === "frame" && event.state.animationFrame === first) assert.equal(s.dispatch(frameCommand(s, second, 8)).status, "queued"); });
  s.dispatch(frameCommand(s, first, 7)); await tick(); const one = s.whenSettled();
  c.calls[1].resolve({ dispose() { c.releases.push("throwing"); throw new Error("lease disposer failed"); } }); await one; await tick();
  assert.equal(s.getState().animationFrame, first); const two = s.whenSettled(); c.calls[2].resolve(c.lease("second"));
  await assert.rejects(two, /lease disposer failed/);
  assert.equal(s.getState().animationFrame, second); assert.deepEqual(s.getState().focus.screenPoint, { x: 160, y: 62 });
  assert.equal(s.getState().history.undoCount, 0); assert.equal(s.getState().program, p); s.destroy();
  assert.deepEqual(c.releases, ["throwing", "initial", "second"]);
});

test("weighted frames preserve actual endpoint hit through mount and pending preparation uses latest transform", async () => {
  const p = points(), target = moved(p).encodeColor({ value: "red" }).editPointMark({shape:"square"}), frame = sampleTransition(plan(p, target), 50), c = controlled(p), s = c.s; await ready(c);
  assert.ok(frame.scene.nodes.some(node => node.type === "weighted-blend"));
  s.dispatch(frameCommand(s, frame, 5)); await tick();
  const off = s.mount({ addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400 }) }, { rootTransform: [2, 0, 0, 2, 10, 15] });
  c.calls[1].resolve(c.lease("weighted")); await s.whenSettled();
  for (const point of [{ x: 90, y: 307 }, { x: 410, y: 83 }]) { s.dispatch({ type: "inspect", point, slop: 0 }); assert.equal(s.getState().hit.candidates.length, 1); }
  assert.equal(s.getState().focus.itemKey, getMarkItems(p)[0].key); off();
  s.dispatch({ type: "inspect", point: { x: 40, y: 146 }, slop: 0 }); assert.equal(s.getState().hit.candidates.length, 1);
  assert.equal(s.getState().animationFrame, frame); s.destroy();
});

test("accepted animation leases prepare embedded image bytes for that exact frame", async () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#008000"/></svg>');
  const image = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml", byteLength: bytes.length,
    width: 2, height: 2, payload: { encoding: "base64", data: bytes.toString("base64") } };
  let p = points().createGraphics({ id: "picture", type: "image", parent: "plot-main" });
  for (const [property, value] of Object.entries({ image, x: 3, y: 3, width: 12, height: 12 })) p = p.editGraphics({ target: "picture", property, value });
  const frame = sampleTransition(plan(p, moved(p)), 100); let released = 0, decoded = 0;
  const s = createInteractionSession({ program: p, async assetResolver({ program, frame, signal }) {
    const images = await prepareImageRendering(frame ?? program, { signal, async decode({ bytes }) { decoded++; const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; } });
    return { images, dispose() { released++; } };
  } });
  await s.whenSettled(); s.dispatch(frameCommand(s, frame)); await s.whenSettled();
  const canvas = createCanvas(240, 180), ctx = canvas.getContext("2d"); render(frame, ctx, s.getState().frameAssets);
  assert.deepEqual([...ctx.getImageData(6, 6, 1, 1).data], [0, 128, 0, 255]); assert.equal(decoded, 2);
  const handles = s.getState().frameAssets; s.updateProgram(p); await s.whenSettled(); assert.equal(s.getState().frameAssets, null);
  assert.throws(() => render(frame, ctx, handles), /abort/); s.destroy(); assert.equal(released, 3);
});

test("weighted lasso uses admitted current shapes and cancellation restores its exact accepted frame", () => {
  const p = points(), target = moved(p).encodeColor({ value: "red" }), transition = plan(p, target), frame = sampleTransition(transition, 50);
  const listeners = new Map(), raf = new Map(), captures = new Set(); let sequence = 0;
  const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 180 }),
    addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); },
    requestAnimationFrame(fn) { raf.set(++sequence, fn); return sequence; }, cancelAnimationFrame(id) { raf.delete(id); },
    setPointerCapture(id) { captures.add(id); }, releasePointerCapture(id) { captures.delete(id); }, hasPointerCapture(id) { return captures.has(id); } };
  const fire = (type, x = 0, y = 0, extra = {}) => listeners.get(type)?.({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y, ...extra });
  const flush = () => { const calls = [...raf.values()]; raf.clear(); calls.forEach(fn => fn()); };
  const s = createInteractionSession({ program: p, bindings: [{ type: "lasso", target: "points", selection: "picked" }] }), phases = [];
  s.mount(host); s.dispatch(frameCommand(s, frame)); s.subscribe(event => { if (event.phase) phases.push(event.phase); });
  const accepted = s.getState();
  const start = () => { fire("pointerdown", 25, 20); fire("pointermove", 215, 20); fire("pointermove", 215, 155); fire("pointermove", 25, 155); flush(); };
  start(); assert.ok(s.getState().previewProgram); assert.equal(s.getState().program, p);
  fire("keydown", 0, 0, { key: "Escape" }); assert.equal(s.getState().previewProgram, null); assert.equal(s.getState().animationFrame, frame);
  assert.equal(s.getState().scene, accepted.scene); assert.equal(captures.size, 0); assert.equal(s.getState().history.undoCount, 0);
  start(); const next = sampleTransition(transition, 75); s.dispatch(frameCommand(s, next));
  assert.equal(s.getState().previewProgram, null); assert.equal(captures.size, 0); assert.equal(s.getState().animationFrame, next);
  start(); fire("pointerup", 25, 20); assert.equal(s.getState().history.undoCount, 1); assert.equal(s.getState().animationFrame, null);
  assert.deepEqual(resolveStoredSelection(s.getState().program, "picked").keys, [getMarkItems(p)[0].key]);
  assert.deepEqual(phases, ["preview", "cancel", "preview", "cancel", "preview", "preview", "commit", "settled"]); s.destroy();
});

for (const count of [100, 1000]) test(`${count} player interruptions keep session hit, focus and authentic lease retention bounded`, async () => {
  const p = points(), b = moved(p), key = getMarkItems(p)[0].key; let prepared = 0, released = 0, version = 0;
  const s = createInteractionSession({ program: p, bindings: [keyboard()], async assetResolver({ program, frame, signal }) {
    const images = await prepareImageRendering(frame ?? program, { signal, decode() { throw new Error("No image payload expected."); } }); prepared++;
    return { images, dispose() { released++; } };
  } });
  await s.whenSettled(); s.dispatch({ type: "focus", move: "first" });
  const player = createAnimationPlayer({ plan: plan(b, p), clock: { now: () => 0, requestFrame() { throw new Error("Paused player requested a frame."); }, cancelFrame() {} },
    render(frame) { s.dispatch(frameCommand(s, frame, ++version)); } });
  player.seek(50); await s.whenSettled();
  for (let i = 0; i < count; i++) {
    const current = player.getFrame(); player.interrupt({ to: p, options }); assert.equal(player.getFrame(), current); player.seek(50); await s.whenSettled();
    assert.equal(s.getState().animationFrame, player.getFrame()); assert.equal(s.getState().focus.itemKey, key);
    const anchor = s.getState().focus.screenPoint; assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
    s.dispatch({ type: "inspect", point: anchor, slop: 0 }); assert.equal(s.getState().hit.target.itemKey, key);
    assert.equal(prepared - released, 2);
  }
  const accepted = s.getState(), canvas = createCanvas(240, 180);
  render(accepted.animationFrame, canvas.getContext("2d"), accepted.frameAssets);
  assert.throws(() => render(accepted.animationFrame, canvas.getContext("2d"), accepted.assets), /stale|different|match/);
  player.dispose(); s.destroy(); assert.equal(prepared, released);
});
