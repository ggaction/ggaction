import assert from "node:assert/strict";
import test from "node:test";
import { cloneAndFreeze, freezeOwned } from "../../../src/core/immutable.js";
import { prepareHitShape, hitShapeWork } from "../../../src/grammar/hitShapes.js";
import { prepareHitIndex, hitIndex, MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK } from "../../../src/grammar/hitIndex.js";
import { createTransitionScene } from "../../../src/scene.js";
import { ChartProgram } from "../../../src/ChartProgram.js";

const identity = [1, 0, 0, 1, 0, 0];
const box = (x = 0, y = 0, overrides = {}) => prepareHitShape({ geometry: { type: "rect", rect: { x, y, width: 10, height: 10 } },
  paint: { fill: true, stroke: null, opacity: 1 }, transform: identity, clips: [], ...overrides });
const info = (itemKey = "item", overrides = {}) => ({ itemKey, ownerId: "mark", role: "mark", childPath: [], rowKeys: ["r1"],
  resourceRefs: [{ kind: "data", id: "table", logicalId: "original", revision: 4 }], ...overrides });
const entry = (nodeKey, shape = box(), metadata = info(nodeKey)) => ({ nodeKey, shape, metadata, zIndex: 0 });
const scene = keys => cloneAndFreeze({ version: 2, width: 100, height: 100, nodes: keys.map(key => ({ key })) });
const run = (entries, point = { x: 5, y: 5 }, options = {}) => {
  const source = scene(entries.map(e => e.nodeKey)); return hitIndex(prepareHitIndex(source, entries.map((e, i) => ({ ...e, zIndex: i }))), source, point, options);
};

test("index returns every overlapping owner in scene z-order with exact immutable provenance", () => {
  const source = scene(["back", "middle", "front"]), shape = box();
  const entries = [entry("front", shape, info("a", { childPath: ["right"] })), entry("back", shape, info("z")), entry("middle", shape, info("b"))];
  entries[0].zIndex = 2; entries[1].zIndex = 0; entries[2].zIndex = 1;
  const index = prepareHitIndex(source, entries), result = hitIndex(index, source, { x: 5, y: 5 });
  assert.deepEqual(result.candidates.map(c => [c.itemKey, c.zIndex]), [["a", 2], ["b", 1], ["z", 0]]);
  assert.equal(result.target, result.candidates[0]); assert.equal(result.statistics.tested, 1);
  assert.deepEqual(result.target.localPoint, { x: 5, y: 5 }); assert.deepEqual(result.target.screenPoint, { x: 5, y: 5 });
  assert.deepEqual(result.target.rowKeys, ["r1"]); assert.deepEqual(result.target.resourceRefs, entries[0].metadata.resourceRefs);
  entries[0].metadata.rowKeys.push("later"); entries[0].metadata.resourceRefs[0].revision = 7;
  assert.deepEqual(result.target.rowKeys, ["r1"]); assert.equal(result.target.resourceRefs[0].revision, 4);
  assert.ok(Object.isFrozen(result.target.resourceRefs[0])); assert.ok(!Object.isFrozen(entries[0].metadata));
  assert.throws(() => result.candidates.push(result.target), TypeError);
});

test("decorative primitives collapse by semantic owner and child path without dropping edge bundles", () => {
  const shape = box(), item = info("shared", { role: "edge" });
  const entries = [entry("edge", shape, item), entry("arrow", shape, structuredClone(item)),
    entry("other", shape, info("other", { role: "edge" })), entry("child", shape, info("shared", { role: "edge", childPath: ["child"] }))];
  const result = run(entries);
  assert.deepEqual(result.candidates.map(c => [c.itemKey, c.childPath, c.zIndex]), [["shared", ["child"], 3], ["other", [], 2], ["shared", [], 1]]);
  assert.throws(() => run([entry("x", shape, item), entry("y", shape, info("shared", { role: "label" }))]), /identical semantic/);
});

test("guide roles remain explicit and do not infer marks or datasets from graphic identifiers", () => {
  const roles = ["axis-tick", "axis-title", "legend-item", "facet-header", "chart-title"];
  const entries = roles.map((role, i) => entry(`arbitrary-${i}`, box(i * 20), info(`key-${i}`, { ownerId: `owner-${i}`, role,
    childPath: i > 2 ? ["panel"] : [], rowKeys: [], resourceRefs: [] })));
  const source = scene(entries.map(e => e.nodeKey)), index = prepareHitIndex(source, entries);
  for (let i = 0; i < roles.length; i++) {
    const result = hitIndex(index, source, { x: i * 20 + 5, y: 5 });
    assert.equal(result.target.role, roles[i]); assert.equal(result.target.ownerId, `owner-${i}`);
    assert.deepEqual(result.target.rowKeys, []); assert.deepEqual(result.target.resourceRefs, []);
  }
});

test("broad phase preserves narrow holes, clips, CSS dash slop, opacity and local coordinates", () => {
  const stroke = prepareHitShape({ geometry: { type: "line", from: { x: 0, y: 0 }, to: { x: 30, y: 0 } },
    paint: { fill: false, stroke: { width: 2, dash: [4, 8] }, opacity: 1 }, transform: [2, 0, 0, 2, 10, 10], clips: [] });
  const entries = [entry("line", stroke), entry("invisible", box(40, 0, { paint: { fill: true, stroke: null, opacity: 0 } }))];
  assert.equal(run(entries, { x: 14, y: 15 }).target.itemKey, "line");
  assert.deepEqual(run(entries, { x: 14, y: 15 }).target.localPoint, { x: 2, y: 2.5 });
  assert.equal(run(entries, { x: 26, y: 10 }).target, null);
  assert.equal(run(entries, { x: 45, y: 5 }).target, null);
  assert.equal(run(entries, { x: 45, y: 5 }, { hitInvisible: true }).target.itemKey, "invisible");
  const clipped = box(0, 0, { clips: [{ geometry: { type: "rect", rect: { x: 0, y: 0, width: 3, height: 10 } }, transform: identity }] });
  assert.equal(run([entry("clip", clipped)]).target, null);
  const singular = box(0, 0, { transform: [0, 0, 0, 0, 1, 1] });
  const result = run([entry("singular", singular)], { x: 1, y: 1 });
  assert.equal(result.target, null); assert.equal(result.diagnostics[0].code, "hit-transform-singular");
});

test("balanced spatial search agrees with an independent rectangle oracle and prunes distant items", () => {
  const entries = Array.from({ length: 4096 }, (_, i) => ({ ...entry(`node-${i}`, box((i % 64) * 20, Math.floor(i / 64) * 20)), zIndex: i }));
  const source = scene(entries.map(e => e.nodeKey)), index = prepareHitIndex(source, entries);
  for (let i = 0; i < 40; i++) {
    const x = (i * 37) % 1280 + 0.5, y = (i * 53) % 1280 + 0.5;
    const expected = entries.flatMap((e, j) => x >= (j % 64) * 20 && x <= (j % 64) * 20 + 10 &&
      y >= Math.floor(j / 64) * 20 && y <= Math.floor(j / 64) * 20 + 10 ? [e.nodeKey] : []).reverse();
    const result = hitIndex(index, source, { x, y });
    assert.deepEqual(result.candidates.map(c => c.itemKey), expected);
    assert.ok(result.statistics.visited < 100); assert.ok(result.statistics.tested <= 1);
  }
  assert.equal(hitIndex(index, source, { x: -100, y: -100 }).statistics.tested, 0);
});

test("empty and unpainted scenes have no targets, and exact current scene identity rejects stale copies", () => {
  const source = scene([]), index = prepareHitIndex(source, []);
  assert.deepEqual(hitIndex(index, source, { x: 0, y: 0 }).candidates, []);
  assert.equal(hitIndex(index, source, { x: 0, y: 0 }).statistics.visited, 0);
  assert.throws(() => hitIndex(index, cloneAndFreeze(structuredClone(source)), { x: 0, y: 0 }), /stale/);
  assert.throws(() => hitIndex({}, source, { x: 0, y: 0 }), /prepared index/);
  const empty = box(0, 0, { paint: { fill: false, stroke: null, opacity: 1 } });
  assert.equal(run([entry("empty", empty)]).target, null);
  assert.equal(run([entry("extreme", box(-1e307, -1e307))], { x: 1e307, y: 1e307 }).target, null);
  assert.throws(() => hitShapeWork({}), /prepared geometry/);
});

test("index accepts existing immutable Canvas scene output with explicit semantic mapping", () => {
  const program = new ChartProgram({ graphicSpec: { objects: { canvas: { type: "canvas", properties: { width: 100, height: 100 } },
    dot: { type: "circle", properties: { x: 20, y: 20, radius: 10, fill: "red", stroke: "none", strokeWidth: 0 } } }, order: ["canvas", "dot"] } });
  const source = createTransitionScene(program, { format: "canvas" });
  const shape = prepareHitShape({ geometry: { type: "circle", x: 20, y: 20, radius: 10 }, paint: { fill: true, stroke: null, opacity: 1 }, transform: identity, clips: [] });
  const index = prepareHitIndex(source, [entry(source.nodes[0].key, shape)]);
  assert.equal(hitIndex(index, source, { x: 20, y: 20 }).candidates.length, 1);
  assert.equal(createTransitionScene(program, { format: "canvas" }), source);
});

test("closed metadata, ownership, duplicate, accessor and size failures remain atomic", () => {
  const shape = box(), source = scene(["a"]), good = entry("a", shape), index = prepareHitIndex(source, [good]);
  for (const entries of [[{ ...good, extra: true }], [{ ...good, zIndex: NaN }], [entry("absent", shape)], [good, good], [entry("a", {})],
    [entry("a", shape, info("", {}))], [entry("a", shape, info("a", { rowKeys: ["r", "r"] }))],
    [entry("a", shape, info("a", { resourceRefs: [{ kind: "font", id: "f", revision: -1 }] }))],
    [entry("a", shape, info("a", { resourceRefs: [{ kind: "font", id: "f", revision: 0 }, { kind: "font", id: "f", revision: 0 }] }))]]) {
    assert.throws(() => prepareHitIndex(source, entries));
  }
  assert.throws(() => prepareHitIndex(structuredClone(source), [good]), /immutable/);
  assert.throws(() => prepareHitIndex(scene(["a", "a"]), [good]), /unique/);
  assert.throws(() => prepareHitIndex(freezeOwned({ version: 2, nodes: freezeOwned([{ key: "a" }]) }), [good]), /immutable own/);
  assert.throws(() => prepareHitIndex(source, new Array(MAX_HIT_INDEX_ITEMS + 1)), /item budget/);
  assert.throws(() => prepareHitIndex(source, [entry("a", shape, info("a", { childPath: new Array(MAX_HIT_INDEX_ITEMS + 1) }))]), /item budget/);
  assert.throws(() => prepareHitIndex(source, [entry("a", shape, info("a", { resourceRefs: new Array(MAX_HIT_INDEX_ITEMS + 1) }))]), /item budget/);
  let reads = 0; const accessor = { ...good }; Object.defineProperty(accessor, "metadata", { enumerable: true, get() { reads++; return good.metadata; } });
  assert.throws(() => prepareHitIndex(source, [accessor]), /accessors/); assert.equal(reads, 0);
  const large = "x".repeat(MAX_HIT_INDEX_WORK + 1);
  assert.throws(() => prepareHitIndex(source, [entry("a", shape, info(large))]), /work budget/);
  assert.equal(hitIndex(index, source, { x: 5, y: 5 }).target.itemKey, "a");
  assert.equal(Object.isFrozen(good), false);
});

test("overlapping complex narrow phases stop at the cumulative query work bound", () => {
  const commands = [{ op: "M", x: 0, y: 0 }, ...Array.from({ length: 15000 }, (_, i) => ({ op: "L", x: i % 2 ? 10 : 0, y: i % 3 ? 10 : 0 })), { op: "Z" }];
  const shape = () => prepareHitShape({ geometry: { type: "path", commands, fillRule: "evenodd" }, paint: { fill: true, stroke: null, opacity: 1 }, transform: identity, clips: [] });
  const entries = Array.from({ length: 35 }, (_, i) => entry(`complex-${i}`, shape()));
  const source = scene(entries.map(e => e.nodeKey)), index = prepareHitIndex(source, entries);
  assert.throws(() => hitIndex(index, source, { x: 5, y: 5 }), /work budget/);
  assert.equal(hitIndex(index, source, { x: -100, y: -100 }).target, null);
});


test("equal z-order uses painted distance then stable item key and explicit child scope", () => {
  const line = y => prepareHitShape({ geometry: { type: "line", from: { x: 0, y }, to: { x: 10, y } },
    paint: { fill: false, stroke: { width: 2 }, opacity: 1 }, transform: identity, clips: [] });
  const entries = [entry("far", line(8), info("far")), entry("near", line(6), info("z")),
    entry("tie-b", line(6), info("b")), entry("tie-a", line(6), info("a")),
    entry("child", line(6), info("a", { childPath: ["x"] })), entry("owner", line(6), info("a", { ownerId: "other" }))];
  const source = scene(entries.map(e => e.nodeKey)), index = prepareHitIndex(source, entries);
  const result = hitIndex(index, source, { x: 5, y: 5 });
  assert.deepEqual(result.candidates.map(c => [c.itemKey, c.ownerId, c.childPath, c.distance]),
    [["a", "mark", ["x"], 0], ["a", "mark", [], 0], ["a", "other", [], 0], ["b", "mark", [], 0], ["z", "mark", [], 0], ["far", "mark", [], 2]]);
});

test("inherited scene and reference accessors are never evaluated", () => {
  let reads = 0;
  const version = Object.getOwnPropertyDescriptor(Object.prototype, "version"), kind = Object.getOwnPropertyDescriptor(Object.prototype, "kind");
  try {
    Object.defineProperty(Object.prototype, "version", { configurable: true, get() { reads++; return 2; } });
    const input = freezeOwned({ nodes: freezeOwned([]) });
    assert.throws(() => prepareHitIndex(input, []), /immutable/);
    Object.defineProperty(Object.prototype, "kind", { configurable: true, get() { reads++; return "font"; } });
    assert.throws(() => prepareHitIndex(scene(["a"]), [entry("a", box(), info("a", { resourceRefs: [{ id: "font", revision: 0 }] }))]));
    assert.equal(reads, 0);
  } finally {
    if (version) Object.defineProperty(Object.prototype, "version", version); else delete Object.prototype.version;
    if (kind) Object.defineProperty(Object.prototype, "kind", kind); else delete Object.prototype.kind;
  }
});
