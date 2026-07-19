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

test("accepts an exact Roadmap 4 phase and capability scope", () => {
  assert.deepEqual(defineVisualVariant({
    ...required,
    artifact: {
      roadmap: "roadmap4",
      phase: "phase3",
      capability: "weighted-theta"
    }
  }).artifact, {
    roadmap: "roadmap4",
    phase: "phase3",
    capability: "weighted-theta"
  });
});

test("accepts only complete compact visual signatures", () => {
  const visualSignature = {
    inkRatio: { min: 0.1, max: 0.2 },
    inkBounds: { x: 2, y: 3, width: 90, height: 70, tolerance: 2 }
  };
  assert.deepEqual(defineVisualVariant({
    ...required,
    visualSignature
  }).visualSignature, visualSignature);
  assert.doesNotThrow(() => defineVisualVariant({
    ...required,
    visualSignature: {
      inkRatio: { min: 0.1, max: 0.2 },
      inkBounds: {
        x: 2,
        y: 3,
        width: 90,
        height: 70,
        tolerance: { x: 2, y: 1, width: 4, height: 1 }
      }
    }
  }));
  assert.throws(() => defineVisualVariant({
    ...required,
    visualSignature: { inkRatio: { min: 0.2, max: 0.1 } }
  }), /invalid visual signature/);
  assert.throws(() => defineVisualVariant({
    ...required,
    visualSignature: {
      inkRatio: { min: 0.1, max: 0.2 },
      inkBounds: {
        x: 2,
        y: 3,
        width: 90,
        height: 70,
        tolerance: { x: 2, y: 1, width: -1, height: 1 }
      }
    }
  }), /invalid visual signature/);
});

test("rejects incomplete or expanded visual artifact scope", () => {
  assert.throws(
    () => defineVisualVariant({
      ...required,
      artifact: { roadmap: "roadmap3", capability: "polar-point" }
    }),
    /requires phase, capability/
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
  assert.deepEqual(displayedActionOperations(`hconcat({
    programs: [left, right]
  });`), ["hconcat"]);
  assert.deepEqual(displayedActionOperations(`overview
    .editCompositionLayout({ gap: 20 })
    .replaceCompositionChild({ target: "right", program: detail });`), [
    "editCompositionLayout", "replaceCompositionChild"
  ]);
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

test("matches a displayed suffix when a call chain starts from an existing program", () => {
  const variant = {
    chart: "dashboard",
    variant: "replacement",
    callChain: "overview.editCompositionLayout({ gap: 8 }).replaceCompositionChild({ target: 'detail', program });"
  };
  assert.doesNotThrow(() => assertDisplayedProgram(variant, {
    trace: {
      children: [
        { op: "hconcat" },
        { op: "editCompositionLayout" },
        { op: "replaceCompositionChild" }
      ]
    }
  }));
});
