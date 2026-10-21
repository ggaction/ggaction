import assert from "node:assert/strict";
import test from "node:test";
import {mapSequentialColors} from "../../../../src/grammar/scales/color.js";
import {gammaColorVectors} from "../../../fixtures/nonpositive-color-gamma.js";

for (const vector of gammaColorVectors) {
  test(`${vector.interpolation} gamma ${vector.gamma} preserves literal ${vector.range.join(" to ")} colors`, () => {
    assert.deepEqual(mapSequentialColors(vector.positions, [0, 1], vector.range, {
      interpolation: vector.interpolation, gamma: vector.gamma
    }), vector.colors);
    if (vector.gamma === 1) assert.deepEqual(mapSequentialColors(vector.positions, [0, 1], vector.range, {
      interpolation: vector.interpolation
    }), vector.colors);
  });
}

test("zero and negative-zero fix lightness at the right endpoint, including the zero position", () => {
  for (const gamma of [0, -0]) for (const interpolation of ["cubehelix", "cubehelix-long"]) {
    assert.deepEqual(mapSequentialColors([0, .25, .5, 1], [0, 1], ["black", "white"], {interpolation, gamma}), Array(4).fill("#ffffff"));
  }
});

test("negative zero-position singularities have finite chromatic, neutral and constant output", () => {
  for (const interpolation of ["cubehelix", "cubehelix-long"]) {
    for (const [range, expected] of [
      [["yellow", "red"], "#000000"], [["#75190b", "#90f2a4"], "#00ffff"],
      [["black", "white"], "#ffffff"], [["white", "black"], "#000000"],
      [["#75190b", "#75190b"], "#75190b"]
    ]) assert.deepEqual(mapSequentialColors([0], [0, 1], range, {interpolation, gamma: -.1}), [expected]);
  }
});

test("clamp precedes nonpositive gamma and reversed domains preserve the same swatches", () => {
  for (const vector of gammaColorVectors.filter(v => v.gamma <= 0)) {
    const options = {interpolation: vector.interpolation, gamma: vector.gamma};
    assert.deepEqual(mapSequentialColors([-2, 3], [0, 1], vector.range, {...options, clamp: true}), [vector.colors[0], vector.colors.at(-1)]);
    assert.deepEqual(mapSequentialColors(vector.positions, [1, 0], vector.range, options), vector.colors.toReversed());
  }
});

test("nonpositive gamma applies independently to right-owned half-open range segments", () => {
  for (const gamma of [0, -.1]) for (const interpolation of ["cubehelix", "cubehelix-long"]) {
    const options = {interpolation, gamma}, positions = [0, .125, .25, .375, .5, .625, .75, .875, 1];
    const first = mapSequentialColors([0, .25, .5, .75], [0, 1], ["yellow", "red"], options);
    const second = mapSequentialColors([0, .25, .5, .75, 1], [0, 1], ["red", "yellow"], options);
    assert.deepEqual(mapSequentialColors(positions, [0, 1], ["yellow", "red", "yellow"], options), [...first, ...second]);
  }
});

test("invalid gamma numbers, incompatible modes and nonzero overflow remain errors", () => {
  for (const gamma of [Infinity, -Infinity, NaN, "0", null, true]) assert.throws(() => mapSequentialColors([.5], [0, 1], ["yellow", "red"], {interpolation: "cubehelix", gamma}), /finite number/);
  for (const interpolation of ["rgb", "hsl", "lab", "hcl"]) for (const gamma of [0, -.1]) assert.throws(() => mapSequentialColors([.5], [0, 1], ["yellow", "red"], {interpolation, gamma}), /requires cubehelix/);
  assert.throws(() => mapSequentialColors([-.25], [0, 1], ["yellow", "red"], {interpolation: "cubehelix-long", gamma: -.1}), /nonfinite/);
  assert.throws(() => mapSequentialColors([.5], [0, 1], ["yellow", "red"], {interpolation: "cubehelix", gamma: -2000}), /nonfinite/);
  assert.throws(() => mapSequentialColors([.5], [0, 1], ["yellow", "red"], {interpolation: "cubehelix", gamma: -900}), /nonfinite/);
  assert.throws(() => mapSequentialColors([-.25], [0, 1], ["yellow", "red"], {interpolation: "cubehelix", gamma: .5}), /nonfinite/);
});

test("raw missing-value fallback is separate from the negative zero-position color boundary", () => {
  assert.deepEqual(mapSequentialColors([NaN, 0, 1], [0, 1], ["yellow", "red"], {interpolation: "cubehelix-long", gamma: -.1, unknown: "#123456"}), ["#123456", "#000000", "#ff0000"]);
  assert.throws(() => mapSequentialColors([NaN], [0, 1], ["yellow", "red"], {interpolation: "cubehelix", gamma: -.1}), /finite/);
});
