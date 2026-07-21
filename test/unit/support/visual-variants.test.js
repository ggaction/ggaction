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

test("defaults approved visual artifacts to the chart-variants capability", () => {
  assert.deepEqual(defineVisualVariant(required).artifact, {
    scope: "charts",
    capability: "chart-variants"
  });
});

test("accepts approved capability and active-review artifact scopes", () => {
  assert.deepEqual(defineVisualVariant({
    ...required,
    artifact: { capability: "polar-points" }
  }).artifact, { scope: "charts", capability: "polar-points" });
  assert.deepEqual(defineVisualVariant({
    ...required,
    artifact: { scope: "review" }
  }).artifact, { scope: "review" });
});

test("rejects incomplete or expanded visual artifact scopes", () => {
  assert.throws(
    () => defineVisualVariant({ ...required, artifact: { scope: "charts" } }),
    /requires capability/
  );
  assert.throws(
    () => defineVisualVariant({
      ...required,
      artifact: { capability: "polar-points", chart: "duplicate-owner" }
    }),
    /unknown artifact option/
  );
  assert.throws(
    () => defineVisualVariant({
      ...required,
      artifact: { roadmap: "roadmap4", phase: "phase3" }
    }),
    /unknown artifact option/
  );
});

test("accepts only complete compact visual signatures", () => {
  const visualSignature = {
    inkRatio: { min: 0.1, max: 0.2 },
    inkBounds: { x: 2, y: 3, width: 90, height: 70, tolerance: 2 }
  };
  assert.deepEqual(defineVisualVariant({ ...required, visualSignature }).visualSignature, visualSignature);
  assert.throws(() => defineVisualVariant({
    ...required,
    visualSignature: { inkRatio: { min: 0.2, max: 0.1 } }
  }), /invalid visual signature/);
});

test("parses displayed chains without evaluating data bindings", () => {
  assert.deepEqual(displayedActionOperations(`chart()
    .createData({ values: rowsFromAnyScope })
    .createPointMark();`), ["createData", "createPointMark"]);
  assert.deepEqual(displayedActionOperations(`hconcat({ programs: [left, right] });`), ["hconcat"]);
  assert.deepEqual(displayedActionOperations(`overview
    .editCompositionLayout({ gap: 20 })
    .replaceCompositionChild({ target: "right", program: detail });`), [
    "editCompositionLayout", "replaceCompositionChild"
  ]);
  assert.throws(() => displayedActionOperations("createPointMark();"), /start/);
  assert.throws(() => displayedActionOperations("chart().createPointMark()"), /semicolon/);
});

test("allows semicolons inside displayed string arguments", () => {
  assert.deepEqual(
    displayedActionCalls(`chart().createTitle({ subtitle: "Height; color" });`),
    [
      { op: "createTitle", args: { subtitle: "Height; color" } }
    ]
  );
});

test("matches displayed actions against the canonical executable trace", () => {
  const variant = defineVisualVariant(required);
  assert.doesNotThrow(() => assertDisplayedProgram(variant, {
    trace: { children: [{ op: "createPointMark", args: {} }] }
  }));
  assert.throws(() => assertDisplayedProgram(variant, {
    trace: { children: [{ op: "createBarMark" }] }
  }), /displayed action flow/);
  assert.doesNotThrow(() => assertDisplayedProgram({
    chart: "dashboard",
    variant: "replacement",
    callChain: "overview.editCompositionLayout({ gap: 8 }).replaceCompositionChild({ target: 'detail', program });"
  }, {
    trace: { children: [
      { op: "hconcat" },
      { op: "editCompositionLayout", args: { gap: 8 } },
      { op: "replaceCompositionChild", args: { target: "detail", programType: "Object" } }
    ] }
  }));
});

test("rejects displayed literal arguments that drift from the executable trace", () => {
  const variant = {
    chart: "cars",
    variant: "field-drift",
    callChain: `chart()
      .createData({ values: rows })
      .createPointMark()
      .encodeX({ field: "Horsepower", scale: { domain: [0, 200] } });`
  };
  const matching = {
    trace: { children: [
      { op: "createData", args: { valuesCount: 2 } },
      { op: "createPointMark", args: {} },
      {
        op: "encodeX",
        args: { field: "Horsepower", scale: { domainCount: 2 } }
      }
    ] }
  };

  assert.doesNotThrow(() => assertDisplayedProgram(variant, matching));
  assert.throws(() => assertDisplayedProgram(variant, {
    trace: { children: matching.trace.children.map(node =>
      node.op === "encodeX"
        ? { ...node, args: { ...node.args, field: "Weight_in_lbs" } }
        : node
    ) }
  }), /encodeX.field/);
});
