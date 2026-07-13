import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createMockCanvasContext } from "../helpers/mockCanvasContext.js";
import {
  createJobsGroupedBarActions,
  renderJobsGroupedBarActions
} from "../programs/jobsGroupedBarActions.js";
import { createJobsGroupedBarPrimitives } from "../programs/jobsGroupedBarPrimitives.js";

const jobs = JSON.parse(
  readFileSync(new URL("../../data/jobs.json", import.meta.url), "utf8")
);

function semanticByScaleId(spec) {
  return {
    ...spec,
    scales: [...spec.scales].sort((left, right) => left.id.localeCompare(right.id))
  };
}

test("authors grouped bar encoding semantics through chart actions", () => {
  const primitive = createJobsGroupedBarPrimitives(jobs);
  const program = createJobsGroupedBarActions(jobs);

  assert.deepEqual(
    semanticByScaleId(program.semanticSpec),
    semanticByScaleId(primitive.semanticSpec)
  );
  assert.deepEqual(program.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(program.resolvedScales.xOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 500 / 15],
    step: 500 / 30,
    bandwidth: 500 / 30
  });

  const actionOps = program.trace.children.map(child => child.op);
  assert.equal(actionOps.includes("encodeX"), true);
  assert.equal(actionOps.includes("encodeY"), true);
  assert.equal(actionOps.includes("encodeBarWidth"), true);
  assert.equal(actionOps.includes("createXAxis"), true);
  assert.equal(actionOps.includes("createLegend"), true);
  const colorNode = program.trace.children.find(child => child.op === "encodeColor");
  assert.equal(
    colorNode.children.some(child => child.op === "encodeXOffset"),
    true
  );

  const replacedPaths = new Set([
    "layer[bars].encoding.xOffset.field",
    "layer[bars].encoding.xOffset.fieldType",
    "layer[bars].encoding.xOffset.scale",
    "scale[xOffset].type",
    "scale[xOffset].domain",
    "scale[xOffset].range",
    "layer[bars].encoding.color.field",
    "layer[bars].encoding.color.fieldType",
    "layer[bars].encoding.color.scale",
    "scale[color].type",
    "scale[color].domain",
    "scale[color].range"
  ]);
  assert.equal(program.trace.children.some(child =>
    child.op === "editSemantic" && replacedPaths.has(child.args.property)
  ), false);
  assert.equal(program.trace.children.some(child =>
    child.op === "editGraphics" && child.args.target === "bars"
  ), false);
  assert.equal(program.trace.children.some(child =>
    child.op === "createGraphics" && [
      "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle"
    ].includes(child.args.id)
  ), false);
  assert.equal(program.trace.children.some(child =>
    child.op === "createGraphics" && [
      "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
    ].includes(child.args.id)
  ), false);
  assert.deepEqual(program.markConfigs.bars, { barWidth: { band: 0.72 } });
  assert.equal(program.graphicSpec.objects.bars.children.length, 30);
});

test("keeps the evolving grouped bar action program render-equivalent", () => {
  const primitive = createJobsGroupedBarPrimitives(jobs);
  const program = createJobsGroupedBarActions(jobs);
  const primitiveContext = createMockCanvasContext();
  const context = createMockCanvasContext();

  renderJobsGroupedBarActions(primitive, primitiveContext);
  renderJobsGroupedBarActions(program, context);
  assert.deepEqual(context.calls, primitiveContext.calls);
});
