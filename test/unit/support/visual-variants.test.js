import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDisplayedProgram,
  defineVisualVariant,
  displayedActionOperations
} from "../../support/visual-variants.js";

const required = Object.freeze({
  chart: "example-chart",
  variant: "baseline",
  title: "Example",
  callChain: "chart().createPointMark();",
  primitive: () => ({}),
  width: 100,
  height: 80,
  regions: Object.freeze([
    Object.freeze({ name: "plot", x: 0, y: 0, width: 100, height: 80 })
  ])
});

test("defaults visual artifact scope to Roadmap 2", () => {
  assert.deepEqual(defineVisualVariant(required).artifact, {
    roadmap: "roadmap2"
  });
});

test("accepts an exact Roadmap 3 phase and capability scope", () => {
  assert.deepEqual(defineVisualVariant({
    ...required,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase2",
      capability: "polar-point"
    }
  }).artifact, {
    roadmap: "roadmap3",
    phase: "phase2",
    capability: "polar-point"
  });
});

test("rejects incomplete or expanded visual artifact scope", () => {
  assert.throws(
    () => defineVisualVariant({
      ...required,
      artifact: { roadmap: "roadmap3", capability: "polar-point" }
    }),
    /requires roadmap, phase, and capability/
  );
  assert.throws(
    () => defineVisualVariant({
      ...required,
      artifact: {
        roadmap: "roadmap3",
        phase: "phase2",
        capability: "polar-point",
        chart: "duplicate-owner"
      }
    }),
    /unknown artifact option/
  );
});

test("parses one displayed chain without evaluating its data bindings", () => {
  assert.deepEqual(displayedActionOperations(`chart()
    .createData({ values: rowsFromAnyScope })
    .createPointMark();`), ["createData", "createPointMark"]);
  assert.throws(() => displayedActionOperations("createPointMark();"), /start/);
  assert.throws(() => displayedActionOperations("chart().createPointMark()"), /semicolon/);
});

test("requires displayed actions to match the canonical executable trace", () => {
  const variant = defineVisualVariant(required);
  const program = {
    trace: { children: [{ op: "createPointMark" }] }
  };
  assert.doesNotThrow(() => assertDisplayedProgram(variant, program));
  assert.throws(
    () => assertDisplayedProgram(variant, {
      trace: { children: [{ op: "createBarMark" }] }
    }),
    /displayed action flow/
  );
});
