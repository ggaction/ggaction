import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { loadJobs } from "../../support/data.js";
import { centerCallChain } from "./manifest.js";
import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";
import { createCenteredAreaStream } from "./public.program.js";

test("matches primitives through the public center layout", () => {
  const jobs = loadJobs();
  const primitive = createCenteredAreaStreamPrimitives(jobs);
  const program = createCenteredAreaStream(jobs);

  assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram: program });
  assertDisplayedProgram({
    chart: "centered-area-stream",
    variant: "jobs-center-stack",
    callChain: centerCallChain
  }, program);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createAreaMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "createGuides",
    "createTitle"
  ]);
  assert.deepEqual(
    program.trace.children[5].children
      .filter(node => ["layoutSeries"].includes(node.op))
      .map(node => node.op),
    ["layoutSeries"]
  );
  assert.deepEqual(program.resolvedScales.y.domain, [-18_000_000, 18_000_000]);
  assert.equal(program.graphicSpec.objects.occupations.items.length, 5);
});
