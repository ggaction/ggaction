import assert from "node:assert/strict";
import test from "node:test";

import {
  createJobsDivergingBar,
  createJobsOverlayBar
} from "../../../../examples/jobs-grouped-bar/program.js";
import { assertChartProgramsEquivalent } from
  "../../../support/chart-equivalence.js";
import { loadJobs } from "../../../support/data.js";
import { createJobsGroupedBarValues } from "../reference-values.js";
import { reassignmentJobs, signedJobs } from "./manifest.js";
import {
  createDivergingLayoutPrimitives,
  createFixedPixelWidthPrimitives,
  createGroupReassignmentPrimitives,
  createOffsetPaddingPrimitives,
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

test("keeps Gate B primitive traces independent of public layout actions", () => {
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

test("locks fixed widths to 14 logical Canvas pixels", () => {
  const values = createJobsGroupedBarValues(jobs, {
    ...layout,
    pixels: 14
  });
  const program = createFixedPixelWidthPrimitives(jobs);

  assert.equal(values.rects.every(rect => rect.width === 14), true);
  assert.equal(
    graphicProperties(program).every(properties => properties.width === 14),
    true
  );
  assert.equal(values.scales.xOffset.bandwidth, 500 / 15 / 2);
  assert.deepEqual(graphicProperties(program), expectedProperties(values));
});

test("locks inner and outer offset padding to independent band geometry", () => {
  const values = createJobsGroupedBarValues(jobs, {
    ...layout,
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  const baseline = createJobsGroupedBarValues(jobs, layout);
  const program = createOffsetPaddingPrimitives(jobs);
  const offset = values.scales.xOffset;

  assert.equal(offset.step, 500 / 15 / 2);
  assert.equal(offset.bandwidth, offset.step * 0.8);
  assert.equal(offset.paddingInner, 0.2);
  assert.equal(offset.paddingOuter, 0.1);
  assert.equal(values.rects.every(rect => rect.width === offset.bandwidth * 0.72), true);
  for (let index = 0; index < 2; index += 1) {
    const paddedCenter = values.rects[index].x + values.rects[index].width / 2;
    const baselineCenter = baseline.rects[index].x + baseline.rects[index].width / 2;
    assert.equal(Math.abs(paddedCenter - baselineCenter) < 1e-12, true);
  }
  assert.deepEqual(graphicProperties(program), expectedProperties(values));
});

test("locks atomic group reassignment to the three-job subset", () => {
  const values = createJobsGroupedBarValues(reassignmentJobs, {
    ...layout,
    groupField: "job",
    legendTitle: "Occupation"
  });
  const program = createGroupReassignmentPrimitives(reassignmentJobs);
  const encoding = program.semanticSpec.layers[0].encoding;

  assert.equal(values.validJobs.length, 90);
  assert.deepEqual(values.groups, ["Actor", "Agent", "Author"]);
  assert.equal(values.cells.length, 45);
  assert.equal(values.rects.length, 45);
  assert.equal(values.cells.every(cell => cell.count === 2), true);
  assert.equal(encoding.color.field, "job");
  assert.equal(encoding.xOffset.field, "job");
  assert.deepEqual(values.scales.color.domain, values.groups);
  assert.deepEqual(values.scales.xOffset.domain, values.groups);
  assert.equal(program.semanticSpec.guides.legend.color.title, "Occupation");
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    values.groups
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.children.map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.deepEqual(graphicProperties(program), expectedProperties(values));
});

test("omits a missing reassigned group cell", () => {
  const rows = reassignmentJobs.filter(row =>
    !(row.year === 1850 && row.job === "Agent")
  );
  const values = createJobsGroupedBarValues(rows, {
    ...layout,
    groupField: "job"
  });

  assert.equal(
    values.rects.some(rect => rect.year === 1850 && rect.job === "Agent"),
    false
  );
  assert.equal(values.rects.length, 44);
});

test("keeps Gate C primitive traces independent of future geometry actions", () => {
  for (const program of [
    createFixedPixelWidthPrimitives(jobs),
    createOffsetPaddingPrimitives(jobs),
    createGroupReassignmentPrimitives(reassignmentJobs)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    assert.equal(operations.includes("encodeBarWidth"), false);
    assert.equal(operations.includes("encodeXOffset"), false);
    assert.equal(operations.includes("encodeColor"), false);
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

test("matches approved layout primitives with public action flows", () => {
  for (const [primitiveProgram, publicProgram] of [
    [createOverlayLayoutPrimitives(jobs), createJobsOverlayBar(jobs)],
    [
      createDivergingLayoutPrimitives(signedJobs),
      createJobsDivergingBar(signedJobs)
    ]
  ]) {
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram });
  }
});

test("rematerializes approved public layouts after Canvas resize", () => {
  for (const program of [
    createJobsOverlayBar(jobs),
    createJobsDivergingBar(signedJobs)
  ]) {
    const edited = program.editCanvas({ width: 760, height: 500 });
    assert.equal(edited.graphicSpec.objects.canvas.properties.width, 760);
    assert.notEqual(
      edited.graphicSpec.objects.bars.children[0].properties.width,
      program.graphicSpec.objects.bars.children[0].properties.width
    );
    assert.notEqual(
      edited.graphicSpec.objects.horizontalGridLines.children[0].properties.x2,
      program.graphicSpec.objects.horizontalGridLines.children[0].properties.x2
    );
    assert.equal(
      edited.semanticSpec.layers[0].encoding.color.layout,
      program.semanticSpec.layers[0].encoding.color.layout
    );
    assert.equal(program.graphicSpec.objects.canvas.properties.width, 720);
  }
});
