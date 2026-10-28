import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { layoutHierarchyTree } from "../../../src/grammar/hierarchy/tree.js";
import { naiveHierarchyTree } from "../../oracles/hierarchy-tree.js";

const options = { nodeSize: [2, 4], siblingGap: 2, depthGap: 6, orientation: "vertical" };
const model = parents => normalizeHierarchyNodes(parents.map((parentKey, key) => ({ key, parentKey, value: 1 })));
const positions = result => result.nodes.map(({ x, y }) => [x, y]);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("tidy tree has literal sibling centers, parent midpoints and depth spacing", () => {
  const hierarchy = model([null, 0, 0, 1, 1]);
  const result = layoutHierarchyTree(hierarchy, options);
  assert.deepEqual(positions(result), [[0, 0], [-2, 10], [-4, 20], [0, 20], [2, 10]]);
  assert.deepEqual(result.nodes.map(node => node.key), hierarchy.nodes.map(node => node.key));
  assert.deepEqual(result.nodes.map(node => node.parentKey), hierarchy.nodes.map(node => node.parentKey));
  assert.deepEqual(result.options, options);
});

test("contour conflicts shift whole child subtrees and match an independent descendant-scan oracle", () => {
  const shapes = [[null, 0, 0, 1, 1, 2, 2], [null, 0, 0, 1, 3, 4, 2], [null, 0, 0, 1, 2, 4, 5],
    [null, 0, 0, 0, 1, 4, 2, 6, 3, 8, 9]];
  let seed = 17;
  for (let trial = 0; trial < 40; trial++) {
    const parents = [null];
    for (let index = 1; index < 25; index++) { seed = (1664525 * seed + 1013904223) >>> 0; parents.push(seed % index); }
    shapes.push(parents);
  }
  for (const shape of shapes) {
    const hierarchy = model(shape), result = layoutHierarchyTree(hierarchy, options);
    assert.deepEqual(result.nodes.map(({ key, x, y }) => ({ key, x, y })), naiveHierarchyTree(hierarchy, 4, 10));
    const byKey = new Map(result.nodes.map(node => [node.key, node]));
    for (const node of hierarchy.nodes) {
      if (node.childrenKeys.length) {
        close(byKey.get(node.key).x, (byKey.get(node.childrenKeys[0]).x + byKey.get(node.childrenKeys.at(-1)).x) / 2);
      }
    }
    for (let depth = 0; depth <= Math.max(...result.nodes.map(node => node.depth)); depth++) {
      const row = result.nodes.filter(node => node.depth === depth);
      for (let i = 1; i < row.length; i++) assert.ok(row[i].x - row[i - 1].x >= 4);
    }
  }
});

test("horizontal tree is the exact transpose of the same ordered tidy result", () => {
  const hierarchy = model([null, 0, 0, 1, 1, 2]);
  const vertical = layoutHierarchyTree(hierarchy, options), horizontal = layoutHierarchyTree(hierarchy, { ...options, orientation: "horizontal" });
  assert.deepEqual(positions(horizontal), positions(vertical).map(([x, y]) => [y, x]));
});

test("radial tree reuses clockwise degrees and distributes full-circle siblings without duplicate seam endpoints", () => {
  const hierarchy = model([null, 0, 0]);
  const result = layoutHierarchyTree(hierarchy, { ...options, orientation: "radial", startAngle: 0, sweep: 360, radius: 10 });
  assert.deepEqual(result.nodes.map(node => [node.theta, node.radius]), [[180, 0], [90, 10], [270, 10]]);
  close(result.nodes[1].x, 10); close(result.nodes[1].y, 0);
  close(result.nodes[2].x, -10); close(result.nodes[2].y, 0);
  const deep = layoutHierarchyTree(model([null, 0, 1]), { ...options, orientation: "radial", startAngle: 30, sweep: 180, radius: 20 });
  assert.deepEqual(deep.nodes.map(node => [node.theta, node.radius]), [[120, 0], [120, 10], [120, 20]]);
  deep.nodes.forEach(node => close(Math.hypot(node.x, node.y), node.radius));
});

test("empty, singleton, zero-size and forest trees preserve explicit identities", () => {
  assert.deepEqual(layoutHierarchyTree(normalizeHierarchyNodes([]), options).nodes, []);
  const singleton = layoutHierarchyTree(model([null]), options);
  assert.deepEqual(positions(singleton), [[0, 0]]);
  const radial = { ...options, orientation: "radial", radius: 0, startAngle: 0, sweep: 360, nodeSize: [0, 0], siblingGap: 0, depthGap: 0 };
  assert.deepEqual(layoutHierarchyTree(normalizeHierarchyNodes([]), radial).nodes, []);
  const collapsed = layoutHierarchyTree(model([null, 0, 0]), radial);
  assert.ok(collapsed.nodes.every(node => node.theta === 180 && node.radius === 0 && node.x === 0 && node.y === 0));
  assert.equal(layoutHierarchyTree(model([null]), radial).nodes[0].radius, 0);
  const forest = normalizeHierarchyNodes([{ key: "a", parentKey: null, value: 0 }, { key: "b", parentKey: null, value: 1 }], { forest: true });
  const result = layoutHierarchyTree(forest, options);
  assert.equal(result.nodes[0].synthetic, true);
  assert.deepEqual(positions(result), [[0, 0], [-2, 10], [2, 10]]);
});

test("tree scaling and translation-free input identity preserve contour relationships and caller ownership", () => {
  const hierarchy = model([null, 0, 0, 1, 1, 2]), before = JSON.stringify(hierarchy), requested = structuredClone(options);
  const result = layoutHierarchyTree(hierarchy, requested), originalOptions = structuredClone(options);
  requested.nodeSize[0] = 999;
  assert.deepEqual(result.options, originalOptions);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.nodes) && Object.isFrozen(result.nodes[0]) && Object.isFrozen(result.options.nodeSize));
  const scaled = layoutHierarchyTree(hierarchy, { ...options, nodeSize: [4, 8], siblingGap: 4, depthGap: 12 });
  assert.deepEqual(positions(scaled), positions(result).map(([x, y]) => [2 * x, 2 * y]));
  assert.equal(JSON.stringify(hierarchy), before);
});

test("tree rejects invalid layout options, malformed models and finite overflow without changing input", () => {
  const hierarchy = model([null, 0, 0]), before = JSON.stringify(hierarchy);
  for (const patch of [
    { extra: 1 }, { nodeSize: null }, { nodeSize: [1] }, { nodeSize: [-1, 1] }, { nodeSize: [Infinity, 1] },
    { siblingGap: -1 }, { depthGap: NaN }, { orientation: "auto" }, { radius: 1 },
    { orientation: "radial", radius: -1, startAngle: 0, sweep: 360 },
    { orientation: "radial", radius: 1, startAngle: NaN, sweep: 360 },
    { orientation: "radial", radius: 1, startAngle: 0, sweep: 0 },
    { orientation: "radial", radius: 1, startAngle: 0, sweep: 361 },
    { orientation: "radial", radius: 1, startAngle: Number.MAX_VALUE, sweep: 360 },
    { nodeSize: [Number.MAX_VALUE, 1], siblingGap: Number.MAX_VALUE },
    { nodeSize: [1, Number.MAX_VALUE], depthGap: Number.MAX_VALUE },
    { maxNodes: 2 }
  ]) assert.throws(() => layoutHierarchyTree(hierarchy, { ...options, ...patch }));
  const extreme = { ...options, nodeSize: [Number.MAX_VALUE, 1], siblingGap: 0 };
  assert.deepEqual(positions(layoutHierarchyTree(hierarchy, extreme)), [[0, 0], [-Number.MAX_VALUE / 2, 7], [Number.MAX_VALUE / 2, 7]]);
  assert.throws(() => layoutHierarchyTree(model([null, 0, 0, 0]), extreme), /finite/);
  assert.throws(() => layoutHierarchyTree(null, options));
  assert.throws(() => layoutHierarchyTree(hierarchy, null));
  assert.equal(JSON.stringify(hierarchy), before);
});

test("tree charges layout work cumulatively after shared model validation", () => {
  const hierarchy = structuredClone(model([null]));
  hierarchy.nodes[0].key = hierarchy.rootKey = "k".repeat(9_999_920);
  const before = hierarchy.nodes[0].key;
  assert.throws(() => layoutHierarchyTree(hierarchy, options), /tree work/);
  assert.equal(hierarchy.nodes[0].key, before);
});

test("tree keeps a ten-thousand-level chain linear in contour storage and finite", () => {
  const rows = Array.from({ length: 10_001 }, (_, key) => ({ key, parentKey: key === 0 ? null : key - 1, value: 1 }));
  const hierarchy = normalizeHierarchyNodes(rows, { maxNodes: 10_001 });
  const result = layoutHierarchyTree(hierarchy, { ...options, maxNodes: 10_001 });
  assert.equal(result.nodes.length, 10_001);
  assert.deepEqual(positions(result).at(-1), [0, 100_000]);
  assert.ok(result.nodes.every(node => node.x === 0));
});
