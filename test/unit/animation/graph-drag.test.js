import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, prepareImageRendering, render } from "../../../src/index.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createInteractionSession } from "../../../src/interaction.js";
import { planTransition, sampleTransition } from "../../../src/animation.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { animationGraphFrame } from "../../support/animation-graph-frame.js";

const options = { durationMs: 100, easing: "linear" };
const layout = p => p.semanticSpec.resources.find(r => r.kind === "layout");
function surface() {
  const listeners = new Map(), pending = new Map(), captures = new Set(); let id = 0;
  return { listeners, pending, captures,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 700, height: 300 }),
    addEventListener(key, fn) { const set = listeners.get(key) ?? new Set(); set.add(fn); listeners.set(key, set); },
    removeEventListener(key, fn) { listeners.get(key)?.delete(fn); },
    setPointerCapture: key => captures.add(key), releasePointerCapture: key => captures.delete(key), hasPointerCapture: key => captures.has(key),
    requestAnimationFrame: fn => { pending.set(++id, fn); return id; }, cancelAnimationFrame: key => pending.delete(key),
    fire(type, x = 0, y = 0, extra = {}) { for (const fn of [...listeners.get(type) ?? []]) fn({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x + 10, clientY: y + 20, preventDefault() {}, ...extra }); },
    flush() { const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn()); }
  };
}
function setup(from, frame, configuration = {}) {
  const s = createInteractionSession({ program: from, bindings: [{ type: "moveNode", target: "plot" }], ...configuration }), host = surface();
  s.mount(host); const publish = () => s.dispatch({ type: "frame", frame, version: s.getState().frameVersion + 1, generation: s.getState().generation });
  return { s, host, publish };
}
const nodes = frame => frame.scene.nodes.filter(n => n.type === "circle").map(n => [n.properties.x, n.properties.y]);
const tick = () => new Promise(resolve => setImmediate(resolve));

test("animated node drag starts at current meanings, keeps routed endpoints attached and commits one native history entry", () => {
  const { from, to, frame } = animationGraphFrame(false, true), { s, host, publish } = setup(from, frame), events = [];
  s.subscribe(e => { if (e.phase) events.push(e.phase); }); publish();
  host.fire("pointerdown", 50, 80); host.fire("pointermove", 80, 120); host.flush();
  const preview = s.getState(); assert.equal(preview.program, from); assert.equal(preview.previewProgram, null); assert.equal(preview.animationFrame, frame);
  assert.deepEqual(nodes(preview.previewFrame), [[80, 120], [210, 80]]); assert.equal(preview.history.undoCount, 0);
  const meaning = animationFrameProvenance(preview.previewFrame).graphs.groups[0];
  assert.deepEqual(meaning.edges[0].points[0], { x: 80, y: 120 }); assert.deepEqual(meaning.edges[0].points.at(-1), { x: 210, y: 80 });
  s.dispatch({ type: "inspect", point: { x: 80, y: 120 }, slop: 0 }); assert.equal(s.getState().hit.target.ownerId, "plot");
  host.fire("pointerup", 80, 120); const next = s.getState().program;
  assert.equal(layout(next).revision, 1); assert.equal(next.semanticSpec.resources.find(r => r.kind === "edge-route").revision, 1);
  assert.deepEqual(layout(next).options.options.positions, [{ key: "a", x: 80, y: 120 }, { key: "b", x: 210, y: 80 }]);
  assert.equal(s.getState().previewFrame, null); assert.equal(s.getState().animationFrame, null); assert.equal(s.getState().history.undoCount, 1);
  assert.deepEqual(events, ["preview", "preview", "commit", "settled"]);
  s.dispatch({ type: "undo" }); assert.equal(s.getState().program, from);
  s.dispatch({ type: "redo" }); assert.equal(s.getState().program, next);
  // A host can start release or reverse playback from the last exact preview.
  assert.equal(sampleTransition(planTransition({ from: preview.previewFrame, to: next, options }), 0), preview.previewFrame);
  assert.equal(sampleTransition(planTransition({ from: preview.previewFrame, to, options }), 0), preview.previewFrame);
  s.destroy(); assert.equal(host.captures.size, 0);
});

test("every animated drag teardown restores its exact accepted frame without a native commit", () => {
  const { from, frame } = animationGraphFrame(false, true);
  for (const reason of ["Escape", "pointercancel", "lostpointercapture", "blur", "unmount", "remount", "source", "reverse", "destroy"]) {
    const { s, host, publish } = setup(from, frame); publish(); const initial = s.getState(), events = [];
    s.subscribe(e => { if (e.phase) events.push(e.phase); });
    host.fire("pointerdown", 50, 80); host.fire("pointermove", 80, 120); host.flush();
    if (reason === "Escape") host.fire("keydown", 0, 0, { key: "Escape" });
    else if (reason === "unmount") s.mount(surface())(); else if (reason === "remount") s.mount(surface());
    else if (reason === "source") s.updateProgram(from);
    else if (reason === "reverse") s.dispatch({ type: "frame", frame, version: s.getState().frameVersion + 1, generation: s.getState().generation });
    else if (reason === "destroy") s.destroy(); else host.fire(reason);
    assert.equal(s.getState().program, from, reason); assert.equal(s.getState().previewFrame, null, reason); assert.equal(s.getState().history.undoCount, 0);
    if (!["source", "destroy"].includes(reason)) { assert.equal(s.getState().animationFrame, frame); assert.deepEqual(s.getState().scene, initial.scene); }
    assert.deepEqual(events, ["preview", "cancel"], reason); assert.equal(host.captures.size, 0); assert.equal(host.pending.size, 0); s.destroy();
  }
});

test("nested animated dragging maps negative CSS scale without changing sibling native scope", () => {
  const { from, to } = animationGraphFrame(), compose = p => hconcat({ id: "pair", programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  const p = compose(from), frame = sampleTransition(planTransition({ from: p, to: compose(to), options }), 50);
  const s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: { childPath: ["b"], id: "plot" } }] }), host = surface();
  const transform = [-2, 0, 0, 1, 1500, 0]; s.mount(host, { rootTransform: transform });
  s.dispatch({ type: "frame", frame, version: s.getState().frameVersion + 1, generation: s.getState().generation });
  const body = frame.scene.nodes.filter(n => n.type === "circle")[2], x = 1500 - 2 * (body.properties.x + body.offset[0]), y = body.properties.y + body.offset[1];
  host.fire("pointerdown", x, y); host.fire("pointermove", x - 60, y + 40); host.flush();
  assert.deepEqual(nodes(s.getState().previewFrame), [[50, 80], [210, 80], [80, 120], [210, 80]]);
  host.fire("pointerup", x - 60, y + 40); assert.equal(s.getState().program.children.a, from);
  assert.deepEqual(layout(s.getState().program.children.b).options.options.positions, [{ key: "a", x: 80, y: 120 }, { key: "b", x: 210, y: 80 }]); s.destroy();
});

function forcePair() {
  const from = chart().createCanvas({ width: 300, height: 200, margin: 0 })
    .createData({ id: "nodes", keyField: "id", values: [{ id: "a" }, { id: "b" }, { id: "c" }] })
    .createData({ id: "edges", values: [{ id: "ab", from: "a", to: "b" }, { id: "bc", from: "b", to: "c" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "layout", method: "force", options: { iterations: 12, initialPositions: [{ key: "a", x: 40, y: 60 }, { key: "b", x: 150, y: 60 }, { key: "c", x: 230, y: 60 }], pinned: [{ key: "c", fx: 230, fy: 60 }] } })
    .createGraphPlot({ id: "plot", origin: [0, 0], nodes: { radius: 10 } });
  const to = from.editLayout({ node: { key: "a", x: 80, y: 100 } });
  return { from, to, frame: sampleTransition(planTransition({ from, to, options }), 50) };
}

test("animated force release runs the native solver once from current positions and preserves existing pins", () => {
  const { from, frame } = forcePair(), { s, host, publish } = setup(from, frame); publish();
  const current = nodes(frame), [x, y] = current[0]; host.fire("pointerdown", x, y); host.fire("pointermove", x + 20, y + 30); host.flush();
  const preview = s.getState().previewFrame; assert.deepEqual(nodes(preview), current.map((p, i) => i ? p : [x + 20, y + 30]));
  host.fire("pointerup", x + 20, y + 30); const next = s.getState().program;
  assert.equal(layout(next).revision, 1); assert.deepEqual(layout(next).options.options.pinned, [{ key: "c", fx: 230, fy: 60 }, { key: "a", fx: x + 20, fy: y + 30 }]);
  assert.deepEqual(layout(next).options.options.initialPositions.map(p => [p.x, p.y]), nodes(preview));
  assert.deepEqual(next.graphicSpec, from.editLayout({ options: { initialPositions: layout(next).options.options.initialPositions, pinned: layout(next).options.options.pinned } }).graphicSpec);
  assert.notDeepEqual(layout(next).result.nodes[1], layout(from).result.nodes[1]); assert.equal(s.getState().history.undoCount, 1); s.destroy();
});

test("animated previews prepare exact frame assets atomically and release stale or cancelled leases", async () => {
  const { from, frame } = animationGraphFrame(false, true), calls = [], disposed = [], events = [];
  const { s, host, publish } = setup(from, frame, { assetResolver: q => new Promise((resolve, reject) => calls.push({ q, resolve, reject })) });
  const finish = async index => { const { q, resolve } = calls[index]; const images = await prepareImageRendering(q.frame ?? q.program, { decode: async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; }, signal: q.signal }); resolve({ images, dispose() { disposed.push(index); } }); await s.whenSettled(); };
  await tick(); await finish(0); publish(); await tick(); await finish(1); const initial = s.getState();
  s.subscribe(e => events.push(e)); host.fire("pointerdown", 50, 80); host.fire("pointermove", 80, 120); host.flush(); await tick();
  assert.equal(calls[2].q.program, from); assert.notEqual(calls[2].q.frame, frame); assert.equal(s.getState().previewFrame, null); assert.equal(s.getState().scene, initial.scene);
  await finish(2); const accepted = s.getState(), context = createCanvas(1, 1).getContext("2d");
  assert.equal(accepted.animationFrame, frame); assert.equal(accepted.frameAssets, initial.frameAssets); assert.equal(accepted.assets, initial.assets);
  render(accepted.previewFrame, context, accepted.previewAssets); assert.deepEqual([...context.getImageData(80, 120, 1, 1).data], [255, 0, 0, 255]);
  assert.throws(() => render(accepted.previewFrame, context, accepted.frameAssets), /different|changed/);
  host.fire("pointermove", 90, 130); host.flush(); await tick(); const stale = s.whenSettled();
  host.fire("pointermove", 100, 140); host.flush(); await tick(); assert.equal((await stale).status, "cancelled"); assert.equal(calls[3].q.signal.aborted, true);
  await finish(4); calls[3].resolve({ dispose() { disposed.push(3); } }); await tick(); assert.deepEqual(disposed, [2, 3]);
  host.fire("keydown", 0, 0, { key: "Escape" }); assert.equal(s.getState().previewFrame, null); assert.equal(s.getState().previewAssets, null); assert.equal(s.getState().animationFrame, frame);
  render(frame, context, s.getState().frameAssets); assert.deepEqual([...context.getImageData(50, 80, 1, 1).data], [255, 0, 0, 255]);
  assert.equal(s.getState().history.undoCount, 0); assert.deepEqual(events.filter(e => e.phase).map(e => e.phase), ["preview", "preview", "cancel"]);
  s.destroy(); assert.deepEqual(disposed, [2, 3, 4, 0, 1]);
});

test("animated release waits for native assets while cancellation and failures preserve the original frame", async () => {
  for (const action of ["release", "error", "destroy", "source", "reentry"]) {
    const { from, frame } = animationGraphFrame(false, true), calls = [], disposed = [], phases = [];
    const { s, host, publish } = setup(from, frame, { assetResolver: q => new Promise((resolve, reject) => calls.push({ q, resolve, reject })) });
    const lease = id => ({ dispose() { disposed.push(id); } });
    await tick(); calls[0].resolve(lease(0)); await s.whenSettled(); publish(); await tick(); calls[1].resolve(lease(1)); await s.whenSettled();
    s.subscribe(e => { if (e.phase) phases.push(e.phase); if (action === "reentry" && e.phase === "preview") s.destroy(); });
    host.fire("pointerdown", 50, 80); host.fire("pointermove", 80, 120); host.flush(); await tick();
    if (action === "release") {
      calls[2].resolve(lease(2)); await s.whenSettled(); host.fire("pointerup", 90, 130); await tick();
      assert.equal(s.getState().previewFrame, null); assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().scene, frame.scene);
      assert.equal(calls[3].q.frame, undefined); assert.equal(s.getState().program, from); assert.equal(s.getState().history.undoCount, 0);
      calls[3].resolve(lease(3)); await s.whenSettled(); assert.equal(s.getState().history.undoCount, 1); assert.equal(layout(s.getState().program).revision, 1);
      assert.deepEqual(phases, ["preview", "commit", "settled"]); assert.equal(s.getState().animationFrame, null);
    } else if (action === "error") {
      calls[2].reject(new Error("not available")); assert.equal((await s.whenSettled()).status, "error"); assert.equal(s.getState().animationFrame, frame); assert.equal(s.getState().scene, frame.scene); assert.deepEqual(phases, ["error"]);
    } else if (action === "reentry") {
      calls[2].resolve(lease(2)); await s.whenSettled(); assert.equal(s.getState().destroyed, true); assert.deepEqual(phases, ["preview", "cancel"]);
    } else {
      const pending = s.whenSettled(); if (action === "destroy") s.destroy(); else s.updateProgram(from);
      assert.equal((await pending).status, "cancelled"); assert.equal(calls[2].q.signal.aborted, true); calls[2].resolve(lease(2)); await tick();
      assert.equal(disposed.filter(id => id === 2).length, 1); assert.deepEqual(phases, ["cancel"]);
    }
    assert.equal(host.captures.size, 0); assert.equal(s.getState().previewFrame, null);
    if (action !== "release") { assert.equal(s.getState().program, from); assert.equal(s.getState().history.undoCount, 0); }
    s.destroy(); assert.equal(new Set(disposed).size, disposed.length);
  }
});

// Reuse the same public-only fixture in source and installed-package qualification.
import { cases as publicCases } from "../../../scripts/consumers/fixtures/node/interaction-animation.mjs";
test("public current graph drag renders four formats against an independent native endpoint", async () => {
  await publicCases.find(value => value.id === "interaction-animation/current-graph-drag-four-formats").run();
});

test("changed edge membership rejects an animated drag before capture", () => {
  const { from } = animationGraphFrame(false, true);
  for (const to of [from.reviseData({ source: "edges", id: "without-edges", values: [] })]) {
    const frame = sampleTransition(planTransition({ from, to, options }), 50), { s, host, publish } = setup(from, frame); publish();
    assert.throws(() => host.fire("pointerdown", 40, 60), /edge topology|exact current/);
    assert.equal(s.getState().program, from); assert.equal(s.getState().history.undoCount, 0); assert.equal(host.captures.size, 0); s.destroy();
  }
});

test("current graph labels follow the same native anchor delta and preserve their text", () => {
  const pair = animationGraphFrame(false, true), from = pair.from.editGraphPlot({ labels: {} }), to = pair.to.editGraphPlot({ labels: {} });
  const frame = sampleTransition(planTransition({ from, to, options }), 50), { s, host, publish } = setup(from, frame); publish();
  const labels = frame.scene.nodes.filter(n => n.type === "text"); assert.equal(labels.length, 2);
  host.fire("pointerdown", 50, 80); host.fire("pointermove", 80, 120); host.flush();
  const next = s.getState().previewFrame.scene.nodes.filter(n => n.type === "text");
  assert.deepEqual(next.map(n => [n.properties.x, n.properties.y, n.properties.text]), labels.map((n, i) => [n.properties.x + (i ? 0 : 30), n.properties.y + (i ? 0 : 40), n.properties.text]));
  host.fire("pointercancel"); assert.equal(s.getState().animationFrame, frame); s.destroy();
});
