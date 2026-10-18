import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { mapSequentialColors } from "../../../../src/grammar/scales/color.js";
import { referenceNeutralHclColor } from "../../../oracles/color-interpolation.js";

const rgb = color => [1, 3, 5].map(i => Number.parseInt(color.slice(i, i + 2), 16) / 255);
const ramp = ["#4682b4", "#fdfdfd"];
const values = Array.from({ length: 9 }, (_, i) => i / 8);
const witnesses = {
  d50: ["#4682b4", "#6090bd", "#789fc6", "#8faecf", "#a5bed8", "#bbcde2", "#d1ddeb", "#e7edf4", "#fdfdfd"],
  d65: ["#4682b4", "#6190bd", "#799fc6", "#90aecf", "#a6bdd8", "#bccde2", "#d2ddeb", "#e7edf4", "#fdfdfd"]
};

test("neutral HCL endpoints follow the chromatic hue and exact independent Lab-plane witnesses", () => {
  for (const whitePoint of ["d50", "d65"]) {
    const expected = values.map(t => referenceNeutralHclColor(...ramp.map(rgb), t, whitePoint));
    assert.deepEqual(expected, witnesses[whitePoint]);
    for (const interpolation of ["hcl", "hcl-long"]) {
      assert.deepEqual(mapSequentialColors(values, [0, 1], ramp, { interpolation, whitePoint }), expected);
      assert.deepEqual(mapSequentialColors(values, [0, 1], ramp.toReversed(), { interpolation, whitePoint }), expected.toReversed());
      assert.deepEqual(mapSequentialColors(values, [1, 0], ramp, { interpolation, whitePoint }), expected.toReversed());
    }
  }
});

test("two neutral HCL endpoints interpolate only lightness for either white point and hue mode", () => {
  for (const whitePoint of ["d50", "d65"]) for (const range of [["#000000", "#ffffff"], ["#808080", "#c0c0c0"], ["#fdfdfd", "#fdfdfd"]]) {
    const expected = values.map(t => referenceNeutralHclColor(...range.map(rgb), t, whitePoint));
    for (const interpolation of ["hcl", "hcl-long"]) {
      assert.deepEqual(mapSequentialColors(values, [0, 1], range, { interpolation, whitePoint }), expected);
      assert.equal(expected[0], range[0]);
      assert.equal(expected.at(-1), range[1]);
    }
  }
});

test("neutral piecewise color matches all original cells and an independent whole-domain grid exactly", () => {
  const fixture = JSON.parse(fs.readFileSync(new URL("../../../fixtures/colors/neutral-heatmap-cells.json", import.meta.url)));
  for (const interpolation of ["hcl", "hcl-long"]) {
    const options = { interpolation, whitePoint: fixture.whitePoint };
    assert.deepEqual(mapSequentialColors(fixture.cells.map(c => c.value), fixture.domain, fixture.range, options), fixture.cells.map(c => c.expected));
    const grid = Array.from({ length: 16385 }, (_, i) => -9 + 18 * i / 16384);
    const expected = grid.map(value => {
      const stops = value <= 0 ? fixture.range.slice(0, 2) : fixture.range.slice(1);
      const t = value <= 0 ? (value + 9) / 9 : value / 9;
      return referenceNeutralHclColor(...stops.map(rgb), t, "d50");
    });
    assert.deepEqual(mapSequentialColors(grid, fixture.domain, fixture.range, options), expected);
  }
});

test("neutral hue borrowing preserves clamp, midpoint and explicit endpoints", () => {
  for (const interpolation of ["hcl", "hcl-long"]) {
    assert.deepEqual(mapSequentialColors([-1, 0, .5, 1, 2], [0, 1], ramp, { interpolation, whitePoint: "d50", clamp: true }), [ramp[0], ramp[0], witnesses.d50[4], ramp[1], ramp[1]]);
    const range = [...ramp, "#d2b48c"];
    const expected = [range[0], witnesses.d50[4], range[1], referenceNeutralHclColor(rgb(range[1]), rgb(range[2]), .5, "d50"), range[2]];
    assert.deepEqual(mapSequentialColors([-2, -1, 0, 4, 8], [-2, 8], range, { interpolation, whitePoint: "d50", midpoint: 0 }), expected);
  }
});

test("chromatic and near-gray endpoints and other interpolation modes retain their prior exact colors", () => {
  const fixture = JSON.parse(fs.readFileSync(new URL("../../../fixtures/colors/non-neutral-interpolation.json", import.meta.url)));
  for (const row of fixture.vectors) assert.deepEqual(mapSequentialColors(row.values, [0, 1], row.range, row.options), row.expected);
});
