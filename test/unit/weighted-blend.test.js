import test from "node:test";
import assert from "node:assert/strict";
import { weightedRGBA, accumulateBlendPixels, encodeBlendPixels } from "../../src/grammar/weightedBlend.js";
import { validateConcreteGraphicProperties } from "../../src/grammar/schemas/concreteGraphic.js";
import { translateWeightedBlendSources } from "../../src/grammar/schemas/weightedBlend.js";

const source = (weight, overrides = {}) => ({ weight, type: "rect", properties: { x: 0, y: 0, width: 10, height: 10, fill: "red", stroke: "none", strokeWidth: 0 }, offset: [0, 0], clip: { x: 0, y: 0, width: 10, height: 10 }, clips: [], ...overrides });
test("weighted linear-light color preserves alpha rather than source-over attenuation", () => {
  const half = weightedRGBA([[1, 0, 0, 1], [0, 0, 1, 1]], [.5, .5]);
  assert.ok(Math.abs(half[0] - .7353569830524495) < 1e-14);
  assert.deepEqual(half, [half[0], 0, half[0], 1]);
  const translucent = weightedRGBA([[1, 0, 0, .25], [0, 0, 1, .75]], [.5, .5]);
  assert.equal(translucent[3], .5);
  assert.ok(Math.abs(translucent[0] - .5370987304831942) < 1e-14);
  assert.ok(Math.abs(translucent[2] - .8808250210902997) < 1e-14);
  assert.deepEqual(weightedRGBA([[1, .3, .2, 0], [0, 1, 0, 0]], [.5, .5]), [0, 0, 0, 0]);
});
test("endpoints, source splitting and order are conserved", () => {
  const a = [1, .2, .1, 0], b = [.2, .4, .6, .8];
  assert.deepEqual(weightedRGBA([a, b], [1, 0]), a);
  assert.deepEqual(weightedRGBA([a, b], [0, 1]), b);
  assert.deepEqual(weightedRGBA([a, b, b], [.5, .25, .25]), weightedRGBA([a, b], [.5, .5]));
  assert.deepEqual(weightedRGBA([b, a], [.5, .5]), weightedRGBA([a, b], [.5, .5]));
  assert.deepEqual(weightedRGBA(Array.from({ length: 64 }, () => b), Array(64).fill(1 / 64)).map(x => Math.round(x * 1e12)), b.map(x => Math.round(x * 1e12)));
});
test("streaming pixel reduction has independent literal output and rejects malformed buffers", () => {
  const pixels = new Float64Array(8);
  accumulateBlendPixels(pixels, new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]), .5);
  accumulateBlendPixels(pixels, new Uint8ClampedArray([0, 0, 255, 255, 0, 255, 0, 255]), .5);
  assert.deepEqual([...encodeBlendPixels(pixels)], [188, 0, 188, 255, 0, 255, 0, 128]);
  assert.throws(() => accumulateBlendPixels(new Float64Array(4), new Uint8ClampedArray(8), 1));
  assert.throws(() => encodeBlendPixels(new Float64Array([2, 0, 0, 1])));
  assert.throws(() => encodeBlendPixels(new Float64Array([NaN, 0, 0, 1])));
});
test("closed concrete sources validate inactive branches and reject recursion, getters and invalid weights", () => {
  const properties = { sources: [source(.5), source(.5)] };
  assert.equal(validateConcreteGraphicProperties("weighted-blend", properties), properties);
  for (const sources of [[], [source(1)], Array.from({ length: 65 }, () => source(1 / 65)), [source(-1), source(2)], [source(.3), source(.3)], [source(NaN), source(1)], [source(1), source(0, { type: "weighted-blend" })]]) {
    assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources }));
  }
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: [source(1), source(0, { properties: { fill: "red", opacity: -1 } })] }));
  let reads = 0;
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: [source(1), source(0, { properties: { get fill() { reads++; return "red"; } } })] }));
  assert.equal(reads, 0);
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", {}));
});

test("embedded nested descriptors and cycles are rejected without executing source code", () => {
  let reads = 0;
  const a = source(.5), b = source(.5);
  b.properties.strokeDash = [1, 2];
  Object.defineProperty(b.properties.strokeDash, 0, { enumerable: true, get() { reads++;return 1; } });
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: [a, b] }), /accessors/);
  assert.equal(reads, 0);
  b.properties.strokeDash = [b.properties];
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: [a, b] }), /cycles/);
});

test("source schema is closed and budgets include inactive sources and every clip", () => {
  const valid = sources => validateConcreteGraphicProperties("weighted-blend", { sources });
  const clip = { x: 0, y: 0, width: 10, height: 10 };
  for (const overrides of [{ extra: true }, { offset: [0] }, { offset: [0, Infinity] },
    { properties: { ...source(0).properties, blend: "multiply" } },
    { properties: { x: 0, y: 0, width: 1, height: 1 } },
    { clip: { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }] } },
    { clips: Array(65).fill(clip) }]) assert.throws(() => valid([source(1), source(0, overrides)]));
  assert.throws(() => valid(Array.from({ length: 17 }, () => source(1 / 17, { clips: Array(64).fill(clip) }))), /budget/);
  for (const value of [() => {}, Symbol("value"), 1n]) assert.throws(() => valid([source(1), source(0, { extra: value })]), /serializable/);
  for (const colors of [[], [[1, 0, 0, 1], [0, 0, 1]], [[1, 0, 0, 1], [0, NaN, 1, 1]]]) assert.throws(() => weightedRGBA(colors, [.5, .5]));
  assert.throws(() => encodeBlendPixels(new Float64Array([1, 0, 0, 0])), /premultiplied/);
  assert.throws(() => encodeBlendPixels(new Float64Array(3)), /budget/);
});

test("all ordinary source kinds share their existing concrete validators and local translation", () => {
  const sources = [source(.5, { type: "circle", properties: { x: 2, y: 3, radius: 1, fill: "red", stroke: "none", strokeWidth: 0 } }),
    source(.5, { type: "line", properties: { x1: 0, y1: 0, x2: 5, y2: 5, stroke: "blue", strokeWidth: 1 },
      clips: [{ type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 5, y: 5 }] }] })];
  validateConcreteGraphicProperties("weighted-blend", { sources });
  const moved = translateWeightedBlendSources(sources, 3, 4);
  assert.deepEqual(moved[0].offset, [3, 4]);assert.equal(moved[0].properties, sources[0].properties);
  assert.deepEqual(moved[0].clip, { x: 3, y: 4, width: 10, height: 10 });
  assert.deepEqual(moved[1].clips[0].commands[0], { op: "M", x: 3, y: 4 });
  assert.deepEqual(sources[0].offset, [0, 0]);
  validateConcreteGraphicProperties("weighted-blend", { sources: [sources[0], source(.5, {
    type: "path", properties: { commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 5, y: 5 }], fill: "none", stroke: "blue", strokeWidth: 1 } })] });
});

test("native fill-only and stroke-only sources need no invented paint fields", () => {
  const commands = [{ op: "M", x: 0, y: 0 }, { op: "L", x: 5, y: 5 }];
  for (const [type, properties] of [["circle", { x: 2, y: 3, radius: 1, fill: "red" }],
    ["path", { commands, fill: "red" }], ["path", { commands, stroke: "blue", strokeWidth: 1 }]]) {
    const pair = [source(.5, { type, properties }), source(.5, { type, properties })];
    validateConcreteGraphicProperties("weighted-blend", { sources: pair });
    assert.deepEqual(pair[0].properties, properties);
  }
  for (const [type, properties] of [["circle", { x: 2, y: 3, radius: 1, fill: "red", stroke: "blue" }],
    ["path", { commands }], ["path", { commands, stroke: "blue" }]]) {
    assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: [source(1), source(0, { type, properties })] }), /fully materialized/);
  }
});
