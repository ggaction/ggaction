import assert from "node:assert/strict";
import test from "node:test";

import { loadJobs } from "../../../support/data.js";
import { createJobsGroupedBarValues } from "../reference-values.js";
import { signedJobs } from "./manifest.js";
import {
  createDivergingLayoutPrimitives,
  createOverlayLayoutPrimitives
} from "./primitive-programs.js";

const jobs = loadJobs();
const layout = {
  width: 720,
  height: 460,
  margin: { top: 40, right: 140, bottom: 70, left: 80 },
  band: 0.72
};

function graphicProperties(program) {
  return program.graphicSpec.objects.bars.children.map(child => child.properties);
}

function expectedProperties(values) {
  return values.rects.map(rect => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill: rect.fill,
    stroke: "white",
    strokeWidth: 0.5
  }));
}

test("locks overlay bars to one shared band without automatic opacity", () => {
  const values = createJobsGroupedBarValues(jobs, {
    ...layout,
    layout: "overlay"
  });
  const program = createOverlayLayoutPrimitives(jobs);
  const encoding = program.semanticSpec.layers[0].encoding;

  assert.equal(values.rects.length, 30);
  for (const year of values.years) {
    const partition = values.rects.filter(rect => rect.year === year);
    assert.deepEqual(partition.map(rect => rect.sex), ["men", "women"]);
    assert.equal(partition[0].x, partition[1].x);
    assert.equal(partition[0].width, partition[1].width);
  }
  assert.equal(encoding.color.layout, "overlay");
  assert.equal(encoding.xOffset, undefined);
  assert.equal(program.semanticSpec.scales.some(scale => scale.id === "xOffset"), false);
  assert.equal(
    graphicProperties(program).every(properties => properties.opacity === undefined),
    true
  );
  assert.equal(
    program.graphicSpec.order.indexOf("horizontalGridLines") <
      program.graphicSpec.order.indexOf("bars"),
    true
  );
  assert.equal(
    program.graphicSpec.order.indexOf("bars") <
      program.graphicSpec.order.indexOf("colorLegendSymbols"),
    true
  );
  assert.deepEqual(graphicProperties(program), expectedProperties(values));
});

test("locks diverging bars to separate positive and negative accumulation", () => {
  const values = createJobsGroupedBarValues(signedJobs, {
    ...layout,
    field: "signedPerc",
    layout: "diverging"
  });
  const program = createDivergingLayoutPrimitives(signedJobs);
  const encoding = program.semanticSpec.layers[0].encoding;

  assert.equal(values.scales.y.domain[0] < 0, true);
  assert.equal(values.scales.y.domain[1] > 0, true);
  assert.equal(encoding.y.field, "signedPerc");
  assert.equal(encoding.y.stack, "zero");
  assert.equal(encoding.color.layout, "diverging");
  for (const year of values.years) {
    const partition = values.rects.filter(rect => rect.year === year);
    assert.deepEqual(partition.map(rect => rect.sex), ["men", "women"]);
    assert.equal(partition[0].stackStart, 0);
    assert.equal(partition[0].stackEnd > 0, true);
    assert.equal(partition[1].stackStart, 0);
    assert.equal(partition[1].stackEnd < 0, true);
    assert.equal(partition[0].x, partition[1].x);
  }
  assert.deepEqual(graphicProperties(program), expectedProperties(values));
});

test("keeps future layout actions out of Gate B primitive traces", () => {
  for (const program of [
    createOverlayLayoutPrimitives(jobs),
    createDivergingLayoutPrimitives(signedJobs)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    assert.equal(operations.includes("encodeColor"), false);
    assert.equal(operations.includes("encodeY"), false);
    assert.equal(operations.includes("encodeBarWidth"), false);
  }
});

test("omits missing cells and zero diverging graphics", () => {
  const rows = [
    { year: 2000, sex: "men", signedPerc: 2 },
    { year: 2000, sex: "women", signedPerc: -1 },
    { year: 2001, sex: "men", signedPerc: 0 }
  ];
  const values = createJobsGroupedBarValues(rows, {
    ...layout,
    field: "signedPerc",
    layout: "diverging"
  });

  assert.equal(values.cells.length, 3);
  assert.deepEqual(
    values.rects.map(rect => [rect.year, rect.sex]),
    [[2000, "men"], [2000, "women"]]
  );
});
