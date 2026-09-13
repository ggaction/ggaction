import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { assertAtomicFailures } from "../support/program-state.js";

const values = Array.from({ length: 8 }, (_, index) => ({
  category: `Category-${index}-very-long`,
  value: index + 1
}));

function bars() {
  return chart()
    .createCanvas({ width: 180, height: 220, margin: 20 })
    .createData({ values })
    .createBarPlot({
      id: "B",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    });
}

function withTwoLabels() {
  return bars()
    .createMarkLabels({
      id: "L1",
      source: "B",
      field: "category",
      fontSize: 16,
      layout: { leader: {} }
    })
    .createMarkLabels({ id: "L2", source: "B", value: "retained" });
}

function attachedLabelIds(program, source = "B") {
  return program.semanticSpec.layers
    .filter(layer => layer.mark?.type === "text" && layer.source === source)
    .map(layer => layer.id)
    .sort();
}

test("removes one attached label and its leader while preserving its source and siblings", () => {
  const before = withTwoLabels();
  const beforeSemantic = structuredClone(before.semanticSpec);
  const beforeGraphic = structuredClone(before.graphicSpec);
  const sourceLayer = structuredClone(before.semanticSpec.layers.find(layer => layer.id === "B"));
  const sourceGraphic = structuredClone(before.graphicSpec.objects.B);
  const retainedLayer = structuredClone(before.semanticSpec.layers.find(layer => layer.id === "L2"));
  const retainedGraphic = structuredClone(before.graphicSpec.objects.L2);
  const leader = before.materializationConfigs.labelLayouts.L1.leaderId;
  const options = Object.freeze({ target: "L1" });

  assert.equal(before.graphicSpec.objects[leader].type, "line");
  const removed = before.removeMarkLabels(options);

  assert.deepEqual(options, { target: "L1" });
  assert.deepEqual(attachedLabelIds(removed), ["L2"]);
  assert.equal(removed.graphicSpec.objects.L1, undefined);
  assert.equal(removed.graphicSpec.objects[leader], undefined);
  assert.equal(removed.materializationConfigs.labelLayouts?.L1, undefined);
  assert.equal(removed.markConfigs.L1, undefined);
  assert.deepEqual(removed.semanticSpec.layers.find(layer => layer.id === "B"), sourceLayer);
  assert.deepEqual(removed.graphicSpec.objects.B, sourceGraphic);
  assert.deepEqual(removed.semanticSpec.layers.find(layer => layer.id === "L2"), retainedLayer);
  assert.deepEqual(removed.graphicSpec.objects.L2, retainedGraphic);
  assert.equal(removed.context.currentMark, "L2");
  assert.deepEqual(before.semanticSpec, beforeSemantic);
  assert.deepEqual(before.graphicSpec, beforeGraphic);
});

test("removes every label owned by a source and returns active label context to that source", () => {
  const before = withTwoLabels();
  const sourceLayer = structuredClone(before.semanticSpec.layers.find(layer => layer.id === "B"));
  const sourceGraphic = structuredClone(before.graphicSpec.objects.B);
  const leader = before.materializationConfigs.labelLayouts.L1.leaderId;
  const options = Object.freeze({ source: "B" });
  const removed = before.removeMarkLabels(options);

  assert.deepEqual(options, { source: "B" });
  assert.deepEqual(attachedLabelIds(removed), []);
  assert.equal(removed.graphicSpec.objects.L1, undefined);
  assert.equal(removed.graphicSpec.objects.L2, undefined);
  assert.equal(removed.graphicSpec.objects[leader], undefined);
  assert.equal(removed.materializationConfigs.labelLayouts, undefined);
  assert.equal(removed.markConfigs.L1, undefined);
  assert.equal(removed.markConfigs.L2, undefined);
  assert.deepEqual(removed.semanticSpec.layers.find(layer => layer.id === "B"), sourceLayer);
  assert.deepEqual(removed.graphicSpec.objects.B, sourceGraphic);
  assert.equal(removed.context.currentMark, "B");
  assert.deepEqual(
    removed.trace.children.at(-1).children.map(child => child.op),
    ["editGraphics", "editGraphics", "editSemantic", "editGraphics", "editSemantic"]
  );
});

test("treats an existing source with no labels as a successful deterministic no-op", () => {
  const before = withTwoLabels().removeMarkLabels({ source: "B" });
  const options = Object.freeze({ source: "B" });
  const removed = before.removeMarkLabels(options);
  assert.deepEqual(options, { source: "B" });
  assert.strictEqual(removed.semanticSpec, before.semanticSpec);
  assert.strictEqual(removed.graphicSpec, before.graphicSpec);
  assert.strictEqual(removed.materializationConfigs, before.materializationConfigs);
  assert.strictEqual(removed.context, before.context);
  assert.equal(removed.trace.children.at(-1).op, "removeMarkLabels");
  assert.deepEqual(removed.trace.children.at(-1).children, []);
});

test("cleans label-target interaction state but preserves source selections", () => {
  const sourceSelected = withTwoLabels().selectMarks({
    id: "source-selection",
    target: "B",
    field: "value",
    op: "max"
  });
  const configured = sourceSelected
    ._withSelectionConfig("label-selection", {
      target: "L1",
      selector: { field: "category", op: "eq", value: values[0].category }
    })
    ._withHighlightConfig("label-highlight", {
      target: "L1",
      selection: "label-selection",
      markType: "text",
      style: { fill: "red" },
      dimOthers: false,
      bringToFront: false
    })
    ._withContext({ currentSelection: "label-selection" });
  const removed = configured.removeMarkLabels({ target: "L1" });

  assert.ok(removed.materializationConfigs.selections["source-selection"]);
  assert.equal(removed.materializationConfigs.selections["label-selection"], undefined);
  assert.equal(removed.materializationConfigs.highlights, undefined);
  assert.equal(removed.context.currentSelection, undefined);
});

test("rejects invalid or externally referenced targets before changing any state", () => {
  const base = withTwoLabels();
  const independent = base
    .createTextMark({ id: "note", data: "data", text: "note" })
    .encodeX({ target: "note", field: "category", fieldType: "nominal" })
    .encodeY({ target: "note", field: "value", fieldType: "quantitative" });
  const externallyReferenced = base._withLegendConfig("series", {
    target: "L1",
    field: "category",
    channels: ["color"]
  });
  const both = Object.freeze({ target: "L1", source: "B" });

  assertAtomicFailures(independent, [
    { operation: () => independent.removeMarkLabels(), error: /exactly one/ },
    { operation: () => independent.removeMarkLabels(both), error: /exactly one/, inputs: [both] },
    { operation: () => independent.removeMarkLabels({ target: "missing" }), error: /Unknown attached label/ },
    { operation: () => independent.removeMarkLabels({ source: "missing" }), error: /Unknown label source/ },
    { operation: () => independent.removeMarkLabels({ target: "note" }), error: /Unknown attached label/ },
    { operation: () => independent.removeMarkLabels({ target: "L1", extra: true }), error: /Unknown removeMarkLabels option/ }
  ]);
  assertAtomicFailures(externallyReferenced, [{
    operation: () => externallyReferenced.removeMarkLabels({ source: "B" }),
    error: /guide\.legend\.series\.target/
  }]);
});

test("does not resurrect removed labels during source, scale, Canvas, or theme replay", () => {
  const sourceGraphic = structuredClone(withTwoLabels().graphicSpec.objects.B);
  const options = Object.freeze({ source: "B" });
  const removed = withTwoLabels().removeMarkLabels(options);
  const replayed = removed
    .editBarMark({ target: "B", opacity: 0.7 })
    .encodeY({ target: "B", field: "value", aggregate: "sum" })
    .editScale({ id: "y", domain: [0, 12] })
    .editCanvas({ width: 260, height: 280 })
    .applyTheme({ theme: "dark" });

  assert.deepEqual(attachedLabelIds(replayed), []);
  assert.deepEqual(options, { source: "B" });
  assert.equal(Object.keys(replayed.graphicSpec.objects).some(id => id === "L1" || id === "L2" || id.includes("label-leaders")), false);
  assert.equal(replayed.materializationConfigs.labelLayouts, undefined);
  assert.equal(replayed.semanticSpec.layers.some(layer => layer.id === "B"), true);
  assert.notDeepEqual(replayed.graphicSpec.objects.B, sourceGraphic);
});
