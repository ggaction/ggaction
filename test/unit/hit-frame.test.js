import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { ChartProgram } from "../../src/ChartProgram.js";
import { cloneAndFreeze } from "../../src/core/immutable.js";
import { createTransitionScene, renderTransitionScene } from "../../src/scene.js";
import { prepareHitShape } from "../../src/grammar/hitShapes.js";
import { createHitFrameBridge } from "../../src/interaction/hitFrame.js";

const metadata = itemKey => ({ itemKey, ownerId: "points", role: "mark", childPath: [], rowKeys: ["row"],
  resourceRefs: [{ kind: "data", id: "table", logicalId: "original", revision: 1 }] });
const frame = (version, dots = [{ key: "point", x: 20, opacity: 1 }]) => {
  const objects = { canvas: { type: "canvas", properties: { width: 160, height: 50 } } };
  for (const dot of dots) objects[dot.key] = { type: "circle", properties: { x: dot.x, y: 25, radius: 6, opacity: dot.opacity,
    fill: "#336699", stroke: "none", strokeWidth: 0 } };
  const program = new ChartProgram({ graphicSpec: { objects, order: ["canvas", ...dots.map(d => d.key)] } });
  const scene = createTransitionScene(program, { format: "canvas" });
  const entries = scene.nodes.map((node, i) => ({ nodeKey: node.key, zIndex: i, metadata: metadata(dots[i].itemKey ?? dots[i].key),
    shape: prepareHitShape({ geometry: { type: "circle", x: node.properties.x, y: node.properties.y, radius: node.properties.radius },
      paint: { fill: true, stroke: null, opacity: node.properties.opacity }, transform: [1, 0, 0, 1, 0, 0], clips: [] }) }));
  return { program, input: { scene, entries, version } };
};
const at = (bridge, x, options) => bridge.hit({ x, y: 25 }, options);

test("current intermediate frame hits its visible location and excludes both endpoints", () => {
  const start = frame(0), mid = frame(1, [{ key: "point", x: 70, opacity: 1 }]), end = frame(2, [{ key: "point", x: 120, opacity: 1 }]);
  const before = JSON.stringify([start.program, mid.program, end.program]), bridge = createHitFrameBridge(start.input);
  assert.equal(at(bridge, 20).target.itemKey, "point"); assert.equal(at(bridge, 70).target, null);
  assert.deepEqual(bridge.updateFrame(mid.input), { applied: true, version: 1 });
  assert.equal(at(bridge, 70).target.itemKey, "point"); assert.equal(at(bridge, 20).target, null); assert.equal(at(bridge, 120).target, null);
  assert.equal(at(bridge, 70).frameVersion, 1); assert.equal(bridge.getState().scene, mid.input.scene);
  assert.deepEqual(bridge.updateFrame(end.input), { applied: true, version: 2 });
  assert.equal(at(bridge, 120).target.itemKey, "point"); assert.equal(at(bridge, 70).target, null);
  assert.equal(JSON.stringify([start.program, mid.program, end.program]), before);
});

test("rendered intermediate Canvas at DPR1/2/3 agrees with the CSS semantic target", () => {
  const mid = frame(7, [{ key: "point", x: 70, opacity: 1 }]), bridge = createHitFrameBridge(mid.input);
  for (const pixelRatio of [1, 2, 3]) {
    const canvas = createCanvas(160 * pixelRatio, 50 * pixelRatio), context = canvas.getContext("2d");
    renderTransitionScene(mid.input.scene, context, { pixelRatio });
    for (const [x, expected] of [[20, false], [70, true], [120, false]]) {
      const alpha = context.getImageData(x * pixelRatio, 25 * pixelRatio, 1, 1).data[3];
      assert.equal(alpha === 255, expected); assert.equal(at(bridge, x).target !== null, expected);
    }
  }
});

test("enter/exit visibility and crossfade decorative duplicates retain one logical candidate", () => {
  const initial = frame(0, [{ key: "exit", x: 60, opacity: 1, itemKey: "shared" }, { key: "enter", x: 60, opacity: 0, itemKey: "shared" }]);
  const bridge = createHitFrameBridge(initial.input);
  assert.equal(at(bridge, 60).candidates.length, 1); assert.equal(at(bridge, 60).target.zIndex, 0);
  bridge.updateFrame(frame(1, [{ key: "exit", x: 60, opacity: 0.5, itemKey: "shared" },
    { key: "enter", x: 60, opacity: 0.5, itemKey: "shared" }, { key: "other", x: 60, opacity: 1, itemKey: "other" }]).input);
  assert.deepEqual(at(bridge, 60).candidates.map(c => c.itemKey), ["other", "shared"]);
  bridge.updateFrame(frame(2, [{ key: "exit", x: 60, opacity: 0, itemKey: "shared" }, { key: "enter", x: 60, opacity: 1, itemKey: "shared" }]).input);
  assert.equal(at(bridge, 60).candidates.length, 1); assert.equal(at(bridge, 60).target.zIndex, 1);
  bridge.updateFrame(frame(3, [{ key: "gone", x: 60, opacity: 0 }]).input);
  assert.equal(at(bridge, 60).target, null); assert.equal(at(bridge, 60, { hitInvisible: true }).target.itemKey, "gone");
});

test("late async completions are ignored by explicit version without rebuilding stale geometry", async () => {
  const bridge = createHitFrameBridge(frame(0).input), old = frame(1, [{ key: "point", x: 70, opacity: 1 }]), latest = frame(2, [{ key: "point", x: 120, opacity: 1 }]);
  let resolveOld; const pending = new Promise(resolve => { resolveOld = resolve; }).then(value => bridge.updateFrame(value));
  assert.equal(bridge.updateFrame(latest.input).applied, true); resolveOld(old.input);
  assert.deepEqual(await pending, { applied: false, version: 2, reason: "stale-frame" });
  assert.equal(at(bridge, 120).target.itemKey, "point"); assert.equal(at(bridge, 70).target, null);
  const saved = bridge.getState();
  assert.deepEqual(bridge.updateFrame({ version: 2, scene: null, entries: null }), { applied: false, version: 2, reason: "stale-frame" });
  assert.equal(bridge.getState(), saved);
});

test("invalid next frame preserves the exact previous snapshot, scene, targets and caller inputs", () => {
  const initial = frame(3), bridge = createHitFrameBridge(initial.input), previous = bridge.getState(), before = JSON.stringify(initial.program);
  const next = frame(4, [{ key: "point", x: 90, opacity: 1 }]); next.input.entries[0].metadata.resourceRefs[0].revision = -1;
  assert.throws(() => bridge.updateFrame(next.input));
  assert.equal(bridge.getState(), previous); assert.equal(at(bridge, 20).target.itemKey, "point"); assert.equal(at(bridge, 90).target, null);
  assert.equal(JSON.stringify(initial.program), before); assert.equal(Object.isFrozen(next.input.entries[0].metadata), false);
  next.input.entries[0].metadata.resourceRefs[0].revision = 2;
  assert.equal(bridge.updateFrame(next.input).applied, true); assert.equal(at(bridge, 90).target.resourceRefs[0].revision, 2);
  next.input.entries.length = 0; assert.equal(at(bridge, 90).target.itemKey, "point");
});

test("empty frames remove hits atomically and an unchanged scene may advance its explicit version", () => {
  const initial = frame(0), bridge = createHitFrameBridge(initial.input);
  assert.equal(bridge.updateFrame({ ...initial.input, version: 1 }).applied, true);
  assert.equal(bridge.getState().scene, initial.input.scene); assert.equal(at(bridge, 20).frameVersion, 1);
  const empty = { version: 2, scene: cloneAndFreeze({ version: 2, width: 160, height: 50, nodes: [] }), entries: [] };
  bridge.updateFrame(empty); assert.equal(bridge.getState().itemCount, 0); assert.deepEqual(at(bridge, 20).candidates, []);
});

test("destroy is idempotent and rejects late callbacks or queries after releasing current state", async () => {
  const bridge = createHitFrameBridge(frame(0).input), next = frame(1).input;
  const pending = Promise.resolve().then(() => bridge.updateFrame(next));
  assert.equal(bridge.dispose(), true); assert.equal(bridge.dispose(), false);
  assert.throws(() => bridge.getState(), /disposed/); assert.throws(() => at(bridge, 20), /disposed/);
  await assert.rejects(pending, /disposed/);
});

test("closed frame envelope rejects accessors and invalid versions before current state can change", () => {
  const good = frame(0).input, bridge = createHitFrameBridge(good), snapshot = bridge.getState();
  for (const input of [null, { ...good, extra: 1 }, { scene: good.scene, version: 1 },
    ...[-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1].map(version => ({ ...good, version }))]) {
    assert.throws(() => bridge.updateFrame(input)); assert.throws(() => createHitFrameBridge(input));
  }
  let reads = 0; const input = { ...good };
  Object.defineProperty(input, "version", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => bridge.updateFrame(input), /accessors/); assert.equal(reads, 0); assert.equal(bridge.getState(), snapshot);
  assert.throws(() => { bridge.updateFrame = () => {}; }, TypeError);
  assert.throws(() => at(bridge, 20, { slop: NaN })); assert.equal(bridge.getState(), snapshot);
});
