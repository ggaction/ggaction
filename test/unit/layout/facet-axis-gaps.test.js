import assert from "node:assert/strict";
import test from "node:test";
import { resolveFacetLayout } from "../../../src/layout/facets.js";
import { resolveFacetContentFlow, resolveFacetContentFooters } from "../../../src/layout/facetContentFlow.js";
import { getErrorDetails } from "../../../src/diagnostics.js";

const cells = (width = 100, height = 80) => ["a", "b", "c", "d"].map(id => ({ id, width, height }));
const points = result => result.children.map(({ x, y }) => [x, y]);
const withoutGap = ({ gap: _gap, ...rest }) => rest;
const content = [
  { id: "a", bounds: { left: -4, right: 10, top: -3, bottom: 8 } },
  { id: "b", bounds: { left: -2, right: 12, top: -4, bottom: 6 } },
  { id: "c", bounds: { left: -1, right: 8, top: -7, bottom: 9 } }
];

test("equal axis gaps preserve scalar geometry and immutable caller intent", () => {
  for (const gap of [0, 1, 16, 47.5]) {
    for (const spacing of ["canvas", "plot"]) {
      const options = { children: cells(), columns: 2, spacing, padding: 3,
        ...(spacing === "plot" ? { plots: cells().map(({ id }) => ({ id, x: 10, y: 8, width: 70, height: 60 })) } : {}) };
      const input = { x: gap, y: gap };
      const pair = resolveFacetLayout({ ...options, gap: input });
      const scalar = resolveFacetLayout({ ...options, gap });
      assert.deepEqual(withoutGap(pair), withoutGap(scalar));
      assert.equal(scalar.gap, gap);
      assert.deepEqual(pair.gap, input);
      assert.notEqual(pair.gap, input);
      assert.ok(Object.isFrozen(pair.gap));
      input.x += 1;
      assert.equal(pair.gap.x, gap);
    }
    const options = { children: content, columns: 2 };
    assert.deepEqual(withoutGap(resolveFacetContentFlow({ ...options, gap: { x: gap, y: gap } })),
      withoutGap(resolveFacetContentFlow({ ...options, gap })));
  }
});

test("asymmetric canvas tracks retain unequal sizes, alignment, padding and ragged order", () => {
  const children = [{ id: "a", width: 80, height: 60 }, { id: "b", width: 120, height: 80 },
    { id: "c", width: 100, height: 70 }];
  const options = { children, columns: 2, align: "end", gap: { x: 13, y: 29 }, padding: 5 };
  const saved = structuredClone(options);
  const result = resolveFacetLayout(options);
  assert.deepEqual(points(result), [[25, 25], [118, 5], [5, 114]]);
  assert.deepEqual([result.width, result.height], [243, 189]);
  assert.deepEqual(result.children.map(({ id, row, column }) => [id, row, column]),
    [["a", 0, 0], ["b", 0, 1], ["c", 1, 0]]);
  assert.deepEqual(options, saved);
});

test("plot spacing allocates each outer margin once with independent track distances", () => {
  for (const fixture of [
    { width: 120, height: 120, margin: { left: 64, top: 73, right: 8, bottom: 28 }, gap: { x: 82, y: 47 },
      expected: [[64, 73], [266, 73], [64, 240], [266, 240]], frame: [394, 388] },
    { width: 200, height: 130, margin: { left: 30, top: 70, right: 8, bottom: 28 }, gap: { x: 43, y: 52 },
      expected: [[30, 70], [273, 70], [30, 252], [273, 252]], frame: [481, 410] }
  ]) {
    const { width, height, margin, gap } = fixture;
    const children = cells(width + margin.left + margin.right, height + margin.top + margin.bottom);
    const plots = children.map(({ id }) => ({ id, x: margin.left, y: margin.top, width, height }));
    const layout = resolveFacetLayout({ children, plots, columns: 2, spacing: "plot", gap });
    assert.deepEqual(layout.children.map((child, i) => [child.x + plots[i].x, child.y + plots[i].y]), fixture.expected);
    assert.deepEqual([layout.width, layout.height], fixture.frame);
  }
});

test("keyed sparse cells retain explicit positions and occupied track widths", () => {
  const children = cells().slice(0, 3).map((child, i) => ({ ...child,
    row: i === 1 ? 1 : 0, column: i === 2 ? 1 : 0 }));
  const layout = resolveFacetLayout({ children, columns: 2, gap: { x: 17, y: 31 } });
  assert.deepEqual(points(layout), [[0, 0], [0, 111], [117, 0]]);
  assert.deepEqual([layout.width, layout.height], [217, 191]);
});

test("changing one axis moves only that axis in canvas, plot and content kernels", () => {
  for (const spacing of ["canvas", "plot", "content"]) {
    const resolve = spacing === "content" ? resolveFacetContentFlow : resolveFacetLayout;
    const options = spacing === "content" ? { children: content, columns: 2 } : {
      children: cells(), columns: 2, spacing,
      ...(spacing === "plot" ? { plots: cells().map(({ id }) => ({ id, x: 10, y: 8, width: 70, height: 60 })) } : {})
    };
    const base = resolve({ ...options, gap: { x: 17, y: 31 } });
    for (const axis of ["x", "y"]) {
      const next = resolve({ ...options, gap: { x: 17, y: 31, [axis]: axis === "x" ? 18 : 32 } });
      next.children.forEach((child, index) => {
        assert.equal(child[axis] - base.children[index][axis], child[axis === "x" ? "column" : "row"]);
        const other = axis === "x" ? "y" : "x";
        assert.equal(child[other], base.children[index][other]);
      });
    }
  }
});

test("content gaps preserve independent full-bound packing and shared footer ownership", () => {
  const flow = resolveFacetContentFlow({ children: content, columns: 2, gap: { x: 7, y: 11 } });
  assert.deepEqual(points(flow), [[0, 0], [19, 0], [0, 26]]);
  assert.deepEqual(flow.bounds, { left: -4, right: 31, top: -4, bottom: 35 });
  assert.deepEqual(resolveFacetContentFooters({ flow, footers: [{ id: "left", column: 0 }, { id: "right", column: 1 }] }),
    [{ id: "left", column: 0, ownerId: "c", x: 0, y: 35 },
      { id: "right", column: 1, ownerId: "b", x: 19, y: 35 }]);
});

test("closed gap pairs reject invalid shape and unused invalid axes", () => {
  const invalid = [null, [], {}, { x: 1 }, { y: 2 }, { x: 1, y: 2, z: 3 },
    { x: 1, y: 2, [Symbol("extra")]: 0 }, { x: -1, y: 2 }, { x: 1, y: NaN },
    { x: Infinity, y: 0 }, { x: 0, y: "2" }, new Date()];
  for (const gap of invalid) {
    assert.throws(() => resolveFacetLayout({ children: cells().slice(0, 1), gap }));
    assert.throws(() => resolveFacetContentFlow({ children: content.slice(0, 1), gap }));
  }
  for (const [gap, path, actual] of [[{ x: -1, y: 2 }, "gap.x", -1], [{ x: 1, y: Infinity }, "gap.y", Infinity]]) {
    assert.throws(() => resolveFacetLayout({ children: cells(), gap }), error => {
      const details = getErrorDetails(error);
      assert.equal(details.optionPath, path);
      assert.equal(details.actual, actual);
      return true;
    });
  }
});

test("header clearance checks each axis without borrowing from the other", () => {
  const children = cells(200, 140);
  const options = { children, columns: 2, spacing: "plot",
    plots: children.map(({ id }) => ({ id, x: 80, y: 20, width: 100, height: 100 })),
    headerLayout: { cellRows: { top: [8, 14], bottom: [6, 0] },
      cellColumns: { left: [5, 16], right: [12, 0] } } };
  for (const [gap, path, actual, limit] of [[{ x: 27, y: 200 }, "gap.x", 27, 28],
    [{ x: 200, y: 19 }, "gap.y", 19, 20], [27, "gap", 27, 28]]) {
    assert.throws(() => resolveFacetLayout({ ...options, gap }), error => {
      const details = getErrorDetails(error);
      assert.equal(details.optionPath, path);
      assert.equal(details.actual, actual);
      assert.equal(details.limit, limit);
      return true;
    });
  }
  assert.doesNotThrow(() => resolveFacetLayout({ ...options, gap: { x: 28, y: 20 } }));
});

test("finite gap inputs reject accumulated overflow separately on both axes", () => {
  for (const axis of ["x", "y"]) {
    const children = cells(axis === "x" ? 1e308 : 1, axis === "y" ? 1e308 : 1);
    const gap = { x: 0, y: 0, [axis]: 1e308 };
    const axisOverflow = error => {
      assert.match(error.message, /finite/i);
      assert.equal(getErrorDetails(error).optionPath, `gap.${axis}`);
      assert.equal(getErrorDetails(error).actual, gap[axis]);
      return true;
    };
    assert.throws(() => resolveFacetLayout({ children, columns: 2, gap }), axisOverflow);
    const bound = axis === "x" ? { left: 0, right: 1e308, top: 0, bottom: 1 } : { left: 0, right: 1, top: 0, bottom: 1e308 };
    assert.throws(() => resolveFacetContentFlow({ children: cells().map(({ id }) => ({ id, bounds: bound })), columns: 2, gap }), axisOverflow);
  }
});
