import assert from "node:assert/strict";
import test from "node:test";
import { layoutTrailRibbon, normalizeTrailOptions } from "../../../src/grammar/trail.js";
import { flattenPathCommands, pathFillContains } from "../../../src/grammar/pathGeometry.js";
import { resolvePathSubpaths } from "../../../src/grammar/pathTopology.js";
import { signedPolygonArea } from "../../oracles/geometry.js";

const p = (x, y, width) => ({ x, y, width });
const pairs = result => result.commands.filter(command => command.op === "M" || command.op === "L").map(({ x, y }) => [x, y]);
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test("Trail variable-width straight ribbon has literal normal offsets and trapezoid area", () => {
  const result = layoutTrailRibbon([p(0, 0, 2), p(10, 0, 6)]);
  assert.deepEqual(pairs(result), [[0, 1], [10, 3], [10, -3], [10, -3], [0, -1], [0, 1]]);
  close(Math.abs(signedPolygonArea(pairs(result))), 40);
  assert.equal(result.fillRule, "nonzero");
  assert.equal(pathFillContains(result.commands, { x: 5, y: 1.9 }), true);
  assert.equal(pathFillContains(result.commands, { x: 5, y: 2.1 }), false);
  assert.deepEqual(normalizeTrailOptions(), { lineJoin: "miter", lineCap: "butt", miterLimit: 4, fillRule: "nonzero" });
});

test("Trail miter and bevel joins preserve the independently derived right-angle corners", () => {
  const input = [p(0, 0, 2), p(10, 0, 2), p(10, 10, 2)];
  const miter = layoutTrailRibbon(input), bevel = layoutTrailRibbon(input, { lineJoin: "bevel" });
  assert.ok(pairs(miter).some(([x, y]) => Math.abs(x - 9) < 1e-12 && Math.abs(y - 1) < 1e-12));
  assert.ok(pairs(miter).some(([x, y]) => Math.abs(x - 11) < 1e-12 && Math.abs(y + 1) < 1e-12));
  assert.equal(pathFillContains(miter.commands, { x: 10.9, y: -.9 }), true);
  assert.equal(pathFillContains(bevel.commands, { x: 10.9, y: -.9 }), false);
  const bounded = layoutTrailRibbon(input, { miterLimit: 1 });
  assert.equal(pairs(bounded).some(([x, y]) => Math.abs(x - 11) < 1e-12 && Math.abs(y + 1) < 1e-12), false);
});

test("Trail square caps extend by the local endpoint half-width", () => {
  const input = [p(0, 0, 2), p(10, 0, 6)], result = layoutTrailRibbon(input, { lineCap: "square" });
  const vertices = pairs(result);
  assert.equal(Math.min(...vertices.map(p => p[0])), -1);
  assert.equal(Math.max(...vertices.map(p => p[0])), 13);
  close(Math.abs(signedPolygonArea(vertices)), 60);
});

test("Trail round caps and joins use bounded cubic arcs with actual circle containment", () => {
  const result = layoutTrailRibbon([p(0, 0, 4), p(10, 0, 4)], { lineCap: "round" });
  assert.ok(result.commands.some(command => command.op === "C"));
  assert.equal(pathFillContains(result.commands, { x: -1.8, y: .1 }), true);
  assert.equal(pathFillContains(result.commands, { x: -1.8, y: 1.8 }), false);
  const corner = layoutTrailRibbon([p(0, 0, 4), p(10, 0, 4), p(10, 10, 4)], { lineJoin: "round" });
  assert.ok(corner.commands.some(command => command.op === "C"));
  assert.equal(pathFillContains(corner.commands, { x: 11.2, y: -1.2 }), true);
  assert.equal(pathFillContains(corner.commands, { x: 11.8, y: -1.8 }), false);
});

test("Trail duplicate coordinates keep the last width and every original source index", () => {
  const input = [p(0, 0, 2), p(0, 0, 4), p(10, 0, 6)], before = structuredClone(input);
  const result = layoutTrailRibbon(input);
  assert.deepEqual(result.runs, [[{ x: 0, y: 0, width: 4, sourceIndices: [0, 1] }, { x: 10, y: 0, width: 6, sourceIndices: [2] }]]);
  assert.deepEqual(input, before); input[0].width = 100;
  assert.equal(result.runs[0][0].width, 4);
  assert.throws(() => { result.runs[0][0].sourceIndices.push(4); }, TypeError);
});

test("Trail explicit gaps preserve empty and singleton runs without connecting across missing samples", () => {
  assert.deepEqual(layoutTrailRibbon([]).commands, []);
  assert.deepEqual(layoutTrailRibbon([null, null]).runs, []);
  const split = layoutTrailRibbon([p(0, 0, 2), p(10, 0, 2), null, p(20, 0, 2), p(30, 0, 2)]);
  assert.equal(resolvePathSubpaths(split.commands).length, 2);
  assert.equal(pathFillContains(split.commands, { x: 15, y: 0 }), false);
  for (const lineCap of ["butt", "square", "round"]) {
    const single = layoutTrailRibbon([p(4, 5, 2)], { lineCap });
    assert.equal(single.commands.at(-1).op, "Z");
    assert.equal(pathFillContains(single.commands, { x: 4.1, y: 5.1 }), lineCap !== "butt");
  }
});

test("Trail width zero stays degenerate across caps and joins", () => {
  assert.doesNotThrow(() => layoutTrailRibbon([p(0, 0, Number.MIN_VALUE)], { lineCap: "round" }));
  for (const lineCap of ["butt", "square", "round"]) for (const lineJoin of ["miter", "bevel", "round"]) {
    const result = layoutTrailRibbon([p(0, 0, 0), p(10, 0, 0), p(10, 10, 0)], { lineCap, lineJoin });
    assert.equal(pathFillContains(result.commands, { x: 5, y: .1 }), false);
    assert.ok(result.commands.every(command => Object.values(command).every(value => typeof value !== "number" || Number.isFinite(value))));
  }
});

test("Trail true reversals split capped subpaths and retain both authored directions", () => {
  const result = layoutTrailRibbon([p(0, 0, 2), p(10, 0, 2), p(0, 0, 2)], { lineCap: "round" });
  assert.equal(resolvePathSubpaths(result.commands).length, 2);
  assert.deepEqual(result.runs[0].flatMap(sample => sample.sourceIndices), [0, 1, 2]);
  assert.equal(pathFillContains(result.commands, { x: 5, y: .5 }), true);
  const evenodd = layoutTrailRibbon([p(0, 0, 2), p(10, 0, 2), p(0, 0, 2)], { fillRule: "evenodd" });
  assert.equal(pathFillContains(evenodd.commands, { x: 5, y: .5 }, { fillRule: evenodd.fillRule }), false);
});

test("Trail rotations and translations preserve straight-run width and area", () => {
  for (const [dx, dy] of [[3, 4], [-3, 4], [-3, -4], [3, -4], [0, 5]]) {
    const result = layoutTrailRibbon([p(7, -8, 2), p(7 + dx, -8 + dy, 6)]);
    close(Math.abs(signedPolygonArea(pairs(result))), 20);
    for (const [index, width] of [[0, 2], [1, 6]]) {
      const sample = result.runs[0][index], normal = result.commands[index];
      close(Math.hypot(normal.x - sample.x, normal.y - sample.y), width / 2);
    }
  }
});

test("Trail rejects overflow and excessive samples or command work before returning geometry", () => {
  assert.throws(() => layoutTrailRibbon([p(-1e308, 0, 1), p(1e308, 0, 1)]), /finite/);
  assert.throws(() => layoutTrailRibbon([p(1.7e308, 0, 1.7e308)], { lineCap: "square" }), /finite/);
  assert.throws(() => layoutTrailRibbon(Array.from({ length: 10001 }, () => p(0, 0, 0))), /sample count/);
  assert.throws(() => layoutTrailRibbon(Array.from({ length: 6000 }, (_, i) => p(i % 2, Math.floor(i / 2), 2)), { lineJoin: "round" }), /command count/);
  assert.throws(() => layoutTrailRibbon([p(0, 0, 1e308)], { lineCap: "round" }), /path command limit|arc tolerance/);
});

test("Trail validates exact own-data shapes without invoking accessors", () => {
  for (const options of [{ lineJoin: "soft" }, { lineCap: "point" }, { miterLimit: 0 }, { fillRule: "union" }, { curve: "smooth" }, { lineCap: undefined }, { lineJoin: null }]) assert.throws(() => layoutTrailRibbon([], options));
  for (const input of [{}, new Array(1), [p(0, 0, -1)], [p(0, NaN, 1)], [{ x: 0, y: 0 }], [{ ...p(0, 0, 1), extra: 1 }]]) assert.throws(() => layoutTrailRibbon(input));
  let accessed = false;
  assert.throws(() => layoutTrailRibbon([{ x: 0, y: 0, get width() { accessed = true; return 1; } }]), /own data/);
  assert.throws(() => layoutTrailRibbon([], { get lineCap() { accessed = true; return "round"; } }), /own data/);
  assert.equal(accessed, false);
});

test("Trail self crossings have explicit shared fill-rule semantics and finite closed topology", () => {
  const result = layoutTrailRibbon([p(0, 0, 2), p(10, 10, 4), p(0, 10, 6), p(10, 0, 2)]);
  assert.ok(resolvePathSubpaths(result.commands).every(subpath => subpath.closed));
  const flat = flattenPathCommands(result.commands);
  assert.equal(flat.diagnostics.length, 0);
  assert.ok(flat.subpaths.every(run => run.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))));
});
