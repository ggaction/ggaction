import assert from "node:assert/strict";
import test from "node:test";
import { cloneAndFreeze, freezeOwned } from "../../../src/core/immutable.js";
import { prepareHitShape } from "../../../src/grammar/hitShapes.js";
import { prepareHitIndex, hitIndex } from "../../../src/grammar/hitIndex.js";

const metadata = () => ({ itemKey: "k", ownerId: "mark", role: "point", childPath: ["left"], rowKeys: ["r0"],
  resourceRefs: [{ kind: "data", id: "rows", logicalId: "source", revision: 3 }] });
const source = () => cloneAndFreeze({ version: 2, width: 20, height: 20, nodes: [{ key: "n" }] });
const shape = () => prepareHitShape({ geometry: { type: "circle", x: 5, y: 5, radius: 2 },
  paint: { fill: true, stroke: null, opacity: 1 }, transform: [1, 0, 0, 1, 0, 0], clips: [] });
const entry = value => ({ nodeKey: "n", shape: shape(), metadata: value, zIndex: 0 });
const target = (index, scene) => hitIndex(index, scene, { x: 5, y: 5 }).target;

// Literal ledger: scene key1 + entry1 + node key1 + metadata244 + bounds1.
test("owned metadata proof preserves exact literal work on first preparation and reuse", () => {
  const value = cloneAndFreeze(metadata()), scene = source(), entries = [entry(value)];
  assert.equal(JSON.stringify(value.resourceRefs[0]).length, 61);
  assert.equal(JSON.stringify(value).length, 164);
  const required = 248;
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.throws(() => prepareHitIndex(scene, entries, { maxWork: required - 1 }), /work budget/);
    const index = prepareHitIndex(scene, entries, { maxWork: required });
    assert.equal(target(index, scene).rowKeys, value.rowKeys);
    assert.deepEqual(target(index, scene).resourceRefs, value.resourceRefs);
  }
  for (const value of [metadata(), structuredClone(metadata()), Object.freeze(metadata())]) {
    assert.throws(() => prepareHitIndex(scene, [entry(value)], { maxWork: required - 1 }), /work budget/);
    assert.ok(target(prepareHitIndex(scene, [entry(value)], { maxWork: required }), scene));
  }
});

test("caller and shallow-owned metadata remain isolated and are revalidated after mutation", () => {
  for (const wrap of [x => x, Object.freeze, freezeOwned]) {
    const value = wrap(metadata()), scene = source(), entries = [entry(value)];
    const index = prepareHitIndex(scene, entries);
    value.rowKeys[0] = "changed"; value.resourceRefs[0].revision = 4;
    assert.deepEqual(target(index, scene).rowKeys, ["r0"]);
    assert.equal(target(index, scene).resourceRefs[0].revision, 3);
    const changed = prepareHitIndex(scene, entries);
    assert.deepEqual(target(changed, scene).rowKeys, ["changed"]);
    value.resourceRefs[0].revision = -1;
    assert.throws(() => prepareHitIndex(scene, entries));
  }
});

test("owned noncanonical field order still uses the canonical semantic signature", () => {
  const native = metadata(), reordered = cloneAndFreeze({ resourceRefs: [{ revision: 3, logicalId: "source", id: "rows", kind: "data" }],
    rowKeys: native.rowKeys, childPath: native.childPath, role: native.role, ownerId: native.ownerId, itemKey: native.itemKey });
  const scene = cloneAndFreeze({ version: 2, nodes: [{ key: "n" }, { key: "m" }] });
  const a = entry(cloneAndFreeze(native)), b = { ...entry(reordered), nodeKey: "m", zIndex: 1 };
  for (let i = 0; i < 2; i++) {
    const result = hitIndex(prepareHitIndex(scene, [a, b]), scene, { x: 5, y: 5 });
    assert.equal(result.candidates.length, 1); assert.equal(result.target.zIndex, 1);
    assert.deepEqual(Object.keys(result.target.resourceRefs[0]), ["kind", "id", "logicalId", "revision"]);
  }
  const conflict = cloneAndFreeze({ ...native, role: "other" });
  assert.throws(() => prepareHitIndex(scene, [a, { ...b, metadata: conflict }]), /identical semantic/);
});

test("metadata reuse grants no scene, shape, accessor or resource authority", () => {
  const value = cloneAndFreeze(metadata()), scene = source(), good = entry(value), index = prepareHitIndex(scene, [good]);
  assert.throws(() => prepareHitIndex(structuredClone(scene), [good]), /immutable/);
  assert.throws(() => prepareHitIndex(source(), [{ ...good, nodeKey: "foreign" }]), /exact scene/);
  assert.throws(() => prepareHitIndex(scene, [{ ...good, shape: structuredClone(good.shape) }]), /prepared geometry/);
  for (const invalid of [cloneAndFreeze({ ...metadata(), extra: 1 }), cloneAndFreeze({ ...metadata(), resourceRefs: [{ kind: "data", id: "rows", logicalId: "source", revision: -1 }] })]) {
    assert.throws(() => prepareHitIndex(scene, [entry(invalid)]));
  }
  let reads = 0; const accessor = { ...metadata() };
  Object.defineProperty(accessor, "rowKeys", { enumerable: true, get() { reads++; return ["r0"]; } });
  Object.freeze(accessor); assert.throws(() => prepareHitIndex(scene, [entry(accessor)]), /accessors/); assert.equal(reads, 0);
  assert.deepEqual(target(index, scene).rowKeys, ["r0"]);
});

test("partial ownership and noncanonical ref order cannot authorize a mutable descendant", () => {
  for (let depth = 0; depth < 4; depth++) {
    const value = metadata();
    if (depth >= 1) value.childPath = cloneAndFreeze(value.childPath);
    if (depth >= 2) value.rowKeys = cloneAndFreeze(value.rowKeys);
    if (depth >= 3) value.resourceRefs = freezeOwned(value.resourceRefs);
    freezeOwned(value);
    const scene = source(), entries = [entry(value)], index = prepareHitIndex(scene, entries);
    value.resourceRefs[0].revision = -1;
    assert.throws(() => prepareHitIndex(scene, entries));
    assert.equal(target(index, scene).resourceRefs[0].revision, 3);
  }
  const value = metadata(); value.resourceRefs = [{ revision: 3, logicalId: "source", id: "rows", kind: "data" }];
  const scene = source(), index = prepareHitIndex(scene, [entry(cloneAndFreeze(value))]);
  assert.deepEqual(Object.keys(target(index, scene).resourceRefs[0]), ["kind", "id", "logicalId", "revision"]);
});
