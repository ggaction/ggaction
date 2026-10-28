import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { layoutHierarchyTreemap } from "../../../src/grammar/hierarchy/treemap.js";
import { hierarchyRows } from "../../oracles/hierarchy.js";
import { rationalSquarify } from "../../oracles/hierarchy-treemap.js";

const options = { size: [100, 60], padding: 0, method: "slice-dice" };
const area = r => (r.x1 - r.x0) * (r.y1 - r.y0);
const close = (a, b, scale = Math.max(1, Math.abs(b))) => assert.ok(Math.abs(a - b) <= 2e-12 * scale, `${a} != ${b}`);
const rect = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
const flat = weights => normalizeHierarchyNodes([{ key: "root", parentKey: null }, ...weights.map((value, key) => ({ key, parentKey: "root", value }))]);

function invariants(result) {
  const byKey = new Map(result.nodes.map(node => [node.key, node]));
  let leavesAndOwn = 0, paddingArea = 0;
  for (const node of result.nodes) {
    assert.ok(Object.values(node.rect).every(Number.isFinite));
    assert.ok(node.rect.x0 <= node.rect.x1 && node.rect.y0 <= node.rect.y1);
    close(node.area, area(node.rect));
    const pieces = [...node.childrenKeys.map(key => byKey.get(key).rect), node.residualRect];
    for (const piece of pieces) {
      assert.ok(piece.x0 >= node.content.x0 && piece.x1 <= node.content.x1 && piece.y0 >= node.content.y0 && piece.y1 <= node.content.y1);
      assert.ok(piece.x0 <= piece.x1 && piece.y0 <= piece.y1);
    }
    for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
      const overlapX = Math.min(pieces[i].x1, pieces[j].x1) - Math.max(pieces[i].x0, pieces[j].x0);
      const overlapY = Math.min(pieces[i].y1, pieces[j].y1) - Math.max(pieces[i].y0, pieces[j].y0);
      assert.ok(overlapX <= 1e-12 || overlapY <= 1e-12);
    }
    if (node.totalValue > 0) close(pieces.reduce((sum, piece) => sum + area(piece), 0), area(node.content));
    leavesAndOwn += area(node.residualRect);
    paddingArea += node.area - area(node.content);
  }
  if (result.nodes.length) close(leavesAndOwn + paddingArea, result.nodes[0].area);
}

test("slice-dice alternates axes with literal nested rectangles and source lineage", () => {
  const model = normalizeHierarchyNodes(hierarchyRows), result = layoutHierarchyTreemap(model, options);
  assert.deepEqual(result.nodes.map(node => node.rect), [rect(0, 0, 100, 60), rect(0, 0, 60, 60), rect(0, 0, 60, 20), rect(0, 20, 60, 60), rect(60, 0, 100, 60)]);
  result.nodes.forEach((node, i) => {
    assert.deepEqual(node.childOrder, model.nodes[i].childrenKeys);
    assert.deepEqual(node.sourceRows, model.nodes[i].sourceRows);
    assert.equal(node.key, model.nodes[i].key);
    close(node.area / 6000, node.totalValue / model.totalValue);
  });
  invariants(result);
});

test("squarify anchors an exact rational oracle and keeps an equal-aspect row unchanged", () => {
  const weights = [6, 6, 4, 3, 2, 2, 1], expected = rationalSquarify(weights, 6, 4);
  const literals = [rect(0, 0, 3, 2), rect(0, 2, 3, 4), rect(3, 0, 33 / 7, 7 / 3), rect(33 / 7, 0, 6, 7 / 3),
    rect(3, 7 / 3, 21 / 5, 4), rect(21 / 5, 7 / 3, 27 / 5, 4), rect(27 / 5, 7 / 3, 6, 4)];
  expected.forEach((r, i) => Object.keys(r).forEach(key => close(r[key], literals[i][key])));
  const result = layoutHierarchyTreemap(flat(weights), { size: [6, 4], padding: 0, method: "squarify" });
  result.nodes.slice(1).forEach((node, i) => Object.keys(node.rect).forEach(key => close(node.rect[key], expected[i][key])));
  const tie = layoutHierarchyTreemap(flat([1, 1]), { size: [2, 2], padding: 0, method: "squarify" });
  assert.deepEqual(tie.nodes.slice(1).map(node => node.rect), [rect(0, 0, 1, 2), rect(1, 0, 2, 2)]);
  invariants(result); invariants(tie);
});

test("squarify matches independently enumerated rational row minima on varied integer fixtures", () => {
  let seed = 31;
  for (let trial = 0; trial < 30; trial++) {
    const weights = Array.from({ length: 8 }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed % 15 + 1; });
    const width = trial % 7 + 2, height = trial % 5 + 2;
    const expected = rationalSquarify(weights, width, height);
    const result = layoutHierarchyTreemap(flat(weights), { size: [width, height], padding: 0, method: "squarify" });
    result.nodes.slice(1).forEach((node, i) => Object.keys(node.rect).forEach(key => close(node.rect[key], expected[i][key])));
    invariants(result);
  }
});

test("treemap preserves inclusive residual and stable descending child order without synthetic children", () => {
  const rows = [{ key: "r", parentKey: null, value: 10 }, { key: "a", parentKey: "r", value: 2 }, { key: "b", parentKey: "r", value: 4 }];
  for (const method of ["slice-dice", "squarify"]) {
    const model = normalizeHierarchyNodes(rows, { valueMode: "inclusive" });
    const result = layoutHierarchyTreemap(model, { ...options, method });
    assert.equal(result.nodes.length, 3);
    assert.deepEqual(result.nodes[0].residualRect, rect(60, 0, 100, 60));
    assert.equal(area(result.nodes[0].residualRect), 2400);
    invariants(result);
  }
  const model = flat([1, 4, 4, 0, 2]);
  const result = layoutHierarchyTreemap(model, { ...options, method: "squarify" });
  assert.deepEqual(result.nodes[0].childOrder, [2, 3, 5, 1, 4].map(index => model.nodes[index].key));
  assert.deepEqual(result.nodes.map(node => node.key), model.nodes.map(node => node.key));
  assert.equal(result.nodes[4].area, 0);
  invariants(result);
});

test("recursive padding conserves global terminal area plus removed borders and handles exhausted interiors", () => {
  let seed = 11;
  const rows = Array.from({ length: 40 }, (_, key) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return { key, parentKey: key === 0 ? null : seed % key, value: seed % 11 };
  });
  for (const method of ["slice-dice", "squarify"]) for (const padding of [0, 1, 1000]) {
    const result = layoutHierarchyTreemap(normalizeHierarchyNodes(rows, { valueMode: "own-plus-children" }), { ...options, method, padding });
    invariants(result);
    if (padding === 1000) assert.ok(result.nodes.slice(1).every(node => node.area === 0));
  }
});

test("empty, all-zero, singleton, zero-size and forest treemaps retain node metadata", () => {
  for (const method of ["slice-dice", "squarify"]) {
    assert.deepEqual(layoutHierarchyTreemap(normalizeHierarchyNodes([]), { ...options, method }).nodes, []);
    const zero = layoutHierarchyTreemap(flat([0, 0]), { ...options, method });
    assert.ok(zero.nodes.every(node => node.area === 0)); invariants(zero);
    const singleton = layoutHierarchyTreemap(normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 1 }]), { ...options, method });
    assert.deepEqual(singleton.nodes[0].residualRect, singleton.nodes[0].content); invariants(singleton);
    const collapsed = layoutHierarchyTreemap(flat([1, 2]), { ...options, method, size: [0, 50] });
    assert.ok(collapsed.nodes.every(node => node.area === 0)); invariants(collapsed);
    const forest = normalizeHierarchyNodes([{ key: "a", parentKey: null, value: 1 }, { key: "b", parentKey: null, value: 2 }], { forest: true });
    const result = layoutHierarchyTreemap(forest, { ...options, method });
    assert.equal(result.nodes[0].synthetic, true); invariants(result);
  }
});

test("treemap extreme finite dimensions, scaling, and ownership remain explicit", () => {
  const model = flat([1, 2, 3]), before = JSON.stringify(model);
  for (const method of ["slice-dice", "squarify"]) {
    const requested = { ...options, method, size: [...options.size] }, result = layoutHierarchyTreemap(model, requested);
    const twice = layoutHierarchyTreemap(model, { ...options, method, size: [200, 120] });
    result.nodes.forEach((node, i) => Object.keys(node.rect).forEach(key => close(twice.nodes[i].rect[key], node.rect[key] * 2)));
    requested.size[0] = 999;
    assert.equal(result.options.size[0], 100);
    assert.ok(Object.isFrozen(result.nodes[0].rect) && Object.isFrozen(result.nodes[0].sourceRows));
    assert.equal(JSON.stringify(model), before);
  }
  for (const size of [[Number.MAX_VALUE, 1], [Number.MIN_VALUE, 1], [1, Number.MIN_VALUE]]) {
    const result = layoutHierarchyTreemap(flat([1, 1]), { ...options, size, method: "squarify" });
    assert.ok(result.nodes.every(node => Number.isFinite(node.area) && Object.values(node.rect).every(Number.isFinite)));
  }
});

test("treemap rejects invalid inputs, overflowing area, and cumulative work before mutating callers", () => {
  const model = flat([1, 2]), before = JSON.stringify(model);
  for (const patch of [{ size: null }, { size: [1] }, { size: [-1, 2] }, { size: [1, Infinity] }, { size: [Number.MAX_VALUE, 2] },
    { padding: -1 }, { padding: NaN }, { method: "auto" }, { extra: 1 }, { maxNodes: 2 }]) {
    assert.throws(() => layoutHierarchyTreemap(model, { ...options, ...patch }));
  }
  assert.throws(() => layoutHierarchyTreemap(null, options));
  assert.throws(() => layoutHierarchyTreemap(model, null));
  const large = structuredClone(normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 1 }]));
  large.nodes[0].key = large.rootKey = "k".repeat(9_999_920);
  assert.throws(() => layoutHierarchyTreemap(large, options), /treemap work/);
  assert.equal(JSON.stringify(model), before);
});

test("treemap uses iterative hierarchy traversal and bounds worst-case row exploration", () => {
  const chain = Array.from({ length: 10_001 }, (_, key) => ({ key, parentKey: key === 0 ? null : key - 1, value: 1 }));
  const model = normalizeHierarchyNodes(chain, { maxNodes: 10_001 });
  for (const method of ["slice-dice", "squarify"]) {
    const result = layoutHierarchyTreemap(model, { ...options, method, maxNodes: 10_001 });
    assert.equal(result.nodes.length, 10_001);
    assert.deepEqual(result.nodes.at(-1).rect, rect(0, 0, 100, 60));
  }
  const wide = normalizeHierarchyNodes([{ key: "r", parentKey: null }, ...Array.from({ length: 20_000 }, (_, key) => ({ key, parentKey: "r", value: 1 }))], { maxNodes: 20_001 });
  assert.throws(() => layoutHierarchyTreemap(wide, { ...options, size: [100, 100], method: "squarify", maxNodes: 20_001 }), /treemap work/);
});
