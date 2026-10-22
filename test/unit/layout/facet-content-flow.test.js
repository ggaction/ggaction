import assert from "node:assert/strict";
import test from "node:test";
import { resolveFacetContentFlow, resolveFacetContentFooters } from "../../../src/layout/facetContentFlow.js";

const cell = (id, left, right, top, bottom) => ({ id, bounds: { left, right, top, bottom } });

test("full content packing retains unequal neighbor intervals", () => {
  const children = [
    cell("a", -19.123046875, 154, -21, 206),
    cell("b", -24.6845703125, 154, -26, 206),
    cell("c", -19.123046875, 154, -26, 206)
  ];
  const before = structuredClone(children);
  const result = resolveFacetContentFlow({ children, columns: 4, gap: 20 });
  assert.deepEqual(result.children.map(c => [c.x, c.y]), [[0, 0], [199, 0], [393, 0]]);
  assert.deepEqual(result.bounds, { left: -19.123046875, right: 547, top: -26, bottom: 206 });
  assert.equal(result.columns, 3);
  assert.deepEqual(children, before);
  assert(Object.isFrozen(result) && Object.isFrozen(result.children[0].bounds));
});

test("wrapped content keeps logical order while plot heights vary within a row", () => {
  const children = [
    cell("a", -44.1474609375, 143, -26, 146),
    cell("b", -44.1474609375, 143, -26, 146),
    cell("c", -44.1474609375, 143, -26, 146),
    cell("d", -44.1474609375, 143, -21, 146)
  ];
  const result = resolveFacetContentFlow({ children, columns: 2, gap: 20 });
  assert.deepEqual(result.children.map(c => [c.x, c.y]), [[0, 0], [208, 0], [0, 192], [208, 187]]);
  assert.deepEqual(result.children.map(c => c.id), ["a", "b", "c", "d"]);
  assert.deepEqual(result.children.map(c => [c.row, c.column]), [[0, 0], [0, 1], [1, 0], [1, 1]]);
  assert.equal(result.children[2].bounds.top, result.children[3].bounds.top);
  assert.equal(result.bounds.bottom, 338);
});

test("ragged content reserves no phantom cell and increasing gap is monotone", () => {
  const children = [cell("a", -4, 10, -3, 8), cell("b", -2, 12, -4, 6), cell("c", -1, 8, -7, 9)];
  const literal = resolveFacetContentFlow({ children, columns: 2, gap: 5 });
  assert.deepEqual(literal.children.map(c => [c.x, c.y]), [[0, 0], [17, 0], [0, 20]]);
  for (const gap of [0, 1, 5, 20]) {
    const a = resolveFacetContentFlow({ children, columns: 2, gap });
    const b = resolveFacetContentFlow({ children, columns: 2, gap: gap + 1 });
    assert.equal(a.children.length, 3);
    assert.equal(b.children[1].x - a.children[1].x, 1);
    assert.equal(b.children[2].y - a.children[2].y, 1);
    assert(a.children[1].bounds.left >= a.children[0].bounds.right + gap);
    assert(a.children[2].bounds.top >= a.children[0].bounds.bottom + gap);
  }
});

test("single cell and zero-size content retain finite literal extents", () => {
  const r = resolveFacetContentFlow({ children: [cell("a", 0, 0, 0, 0)], gap: 0 });
  assert.deepEqual(r.children[0], { id: "a", column: 0, row: 0, x: 0, y: 0, bounds: { left: 0, right: 0, top: 0, bottom: 0 } });
  assert.deepEqual(r.bounds, { left: 0, right: 0, top: 0, bottom: 0 });
});

test("malformed flow input rejects without modifying caller data", () => {
  const children = [cell("a", -1, 5, -2, 8)];
  const before = structuredClone(children);
  for (const patch of [
    { children: [] }, { columns: 0 }, { columns: 1.5 }, { gap: -1 }, { gap: NaN },
    { children: [children[0], children[0]] },
    { children: [cell("", 0, 1, 0, 1)] },
    { children: [cell("a", 2, 1, 0, 1)] },
    { children: [cell("a", 0, 1, Infinity, Infinity)] },
    { children: [cell("a", 0, 1e308, 0, 1), cell("b", -1e308, 1e308, 0, 1)] },
    { children: [null] }
  ]) assert.throws(() => resolveFacetContentFlow({ children, ...patch }));
  assert.deepEqual(children, before);
});

test("shared footers use the common trailing edge and last logical owner per column", () => {
  const flow = resolveFacetContentFlow({ children: [
    cell("a", -44.1474609375, 143, -26, 146),
    cell("b", -44.1474609375, 143, -26, 146),
    cell("c", -44.1474609375, 143, -26, 146),
    cell("d", -44.1474609375, 143, -21, 146)
  ], columns: 2, gap: 20 });
  const footers = [{ id: "bottom-a", column: 0 }, { id: "bottom-b", column: 1 }];
  const before = structuredClone(footers);
  const result = resolveFacetContentFooters({ flow, footers });
  assert.deepEqual(result, [
    { id: "bottom-a", column: 0, ownerId: "c", x: 0, y: 338 },
    { id: "bottom-b", column: 1, ownerId: "d", x: 208, y: 338 }
  ]);
  assert.deepEqual(footers, before);
  assert(Object.isFrozen(result[0]));
});

test("ragged footer owners remain observed cells and signed offsets apply once", () => {
  const flow = resolveFacetContentFlow({ children: [
    cell("a", -4, 10, -3, 8), cell("b", -2, 12, -4, 6), cell("c", -1, 8, -7, 9)
  ], columns: 2, gap: 5 });
  const result = resolveFacetContentFooters({ flow, footers: [{ id: "last", column: 1 }], offset: -2 });
  assert.deepEqual(result, [{ id: "last", column: 1, ownerId: "b", x: 17, y: 27 }]);
  assert.throws(() => resolveFacetContentFooters({ flow, footers: [{ id: "missing", column: 2 }] }));
  assert.throws(() => resolveFacetContentFooters({ flow, footers: [{ id: "a", column: 0 }, { id: "b", column: 0 }] }));
  assert.throws(() => resolveFacetContentFooters({ flow, footers: [{ id: "a", column: 0 }, { id: "a", column: 1 }] }));
  assert.throws(() => resolveFacetContentFooters({ flow, footers: [], offset: Infinity }));
  const malformed = { ...flow, children: [
    { id: "a", column: 0, row: 0, x: 0 },
    { id: "b", column: 0, row: 2, x: 0 },
    { id: "c", column: 0, row: 0, x: 0 }
  ] };
  assert.throws(() => resolveFacetContentFooters({ flow: malformed, footers: [] }), /duplicate cells/);
});

test("footer placement validates owners, inputs and finite accumulation", () => {
  assert.throws(() => resolveFacetContentFooters(), /resolved content flow/);
  const flow = resolveFacetContentFlow({ children: [cell("a", 0, 1, 0, 1)] });
  assert.throws(() => resolveFacetContentFooters({ flow, footers: null }), /array and finite offset/);
  for (const child of [null, { id: "a", column: -1, row: 0, x: 0 },
    { id: "a", column: 0, row: 0, x: NaN }]) {
    assert.throws(() => resolveFacetContentFooters({ flow: { ...flow, children: [child] }, footers: [] }), /finite occupied cells/);
  }
  assert.throws(() => resolveFacetContentFooters({
    flow: { ...flow, bounds: { ...flow.bounds, bottom: 1e308 } }, footers: [], offset: 1e308
  }), /finite layout bounds/);
  assert.deepEqual(resolveFacetContentFooters({ flow, footers: [] }), []);
});
