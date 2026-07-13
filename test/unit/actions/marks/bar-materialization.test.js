import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

const cars = loadCars().filter(row => Number.isFinite(row.Displacement));

function encodedHistogram() {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Displacement", bin: { maxBins: 10 } })
    .encodeY();
}

test("materializes one concrete rect per non-empty bin", () => {
  const program = encodedHistogram();
  const bars = program.graphicSpec.objects.bars;

  assert.equal(bars.children.length, 9);
  assert.deepEqual(
    bars.children.map(child => child.properties.fill),
    Array(9).fill("#4c78a8")
  );
  assert.deepEqual(
    bars.children.map(child => child.properties.stroke),
    Array(9).fill("white")
  );
  assert.equal(
    bars.children.every(child => child.properties.strokeWidth === 0.5),
    true
  );
  assert.equal(bars.children[0].properties.x, 80);
  assert.equal(bars.children.at(-1).properties.x < 372, true);
  assert.equal(
    bars.children.reduce((sum, child) => sum + child.properties.width, 0),
    292
  );
  assert.equal(Object.isFrozen(bars.children[0].properties), true);
});

test("supports existing semantic color grouping during rematerialization", () => {
  const program = encodedHistogram()
    .editSemantic({
      property: "layer[bars].encoding.color.field",
      value: "Origin"
    })
    .editSemantic({
      property: "layer[bars].encoding.color.fieldType",
      value: "nominal"
    })
    .editSemantic({
      property: "layer[bars].encoding.color.scale",
      value: "color"
    })
    .createScale({
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    })
    .rematerializeBarMark({ id: "bars" });

  assert.equal(program.graphicSpec.objects.bars.children.length, 15);
  assert.deepEqual(
    program.graphicSpec.objects.bars.children.slice(0, 3).map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518", "#e45756"]
  );
});

test("validates complete bar materialization prerequisites", () => {
  const mark = chart()
    .createData({ id: "values", values: [{ value: 1 }] })
    .createBarMark({ id: "bars" });

  assert.throws(
    () => mark.rematerializeBarMark({ id: "bars" }),
    /requires binned x/
  );
  assert.throws(
    () => mark.rematerializeBarMark({ id: "missing" }),
    /Unknown bar mark/
  );
  assert.throws(
    () => mark.rematerializeBarMark({ id: "bars", color: "red" }),
    /Unknown rematerializeBarMark option/
  );
});
