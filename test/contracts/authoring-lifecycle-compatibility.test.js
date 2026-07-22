import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { ACTION_INDEX } from "../support/action-contracts.js";

const LIFECYCLE_ACTIONS = Object.freeze([
  "removeEncoding",
  "removePointRadius",
  "editMarkSelection",
  "removeMarkHighlight",
  "removeMarkSelection",
  "editBin2DData",
  "editFacetScales",
  "editFacetGuides"
]);

const EXTENDED_ACTIONS = Object.freeze([
  "editLegend",
  "removeLegend",
  "editXAxis",
  "editYAxis",
  "editErrorBar",
  "editErrorBand",
  "editDensity",
  "editRegression",
  "editBoxPlot",
  "editGradientPlot",
  "editCompositionLayout",
  "editPointMark",
  "editArcMark"
]);

const pointRows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", amount: 2 }),
  Object.freeze({ x: 3, y: 4, group: "B", amount: 5 }),
  Object.freeze({ x: 5, y: 1, group: "A", amount: 8 })
]);

function pointLifecycleProgram() {
  return chart()
    .createCanvas({
      width: 320,
      height: 220,
      margin: { top: 20, right: 120, bottom: 40, left: 40 }
    })
    .createData({ id: "rows", values: pointRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeShape({ field: "group" })
    .encodeSize({ field: "amount" })
    .createGuides();
}

test("keeps the completed authoring lifecycle surface Current and fully covered", () => {
  const current = new Map(ACTION_INDEX.actions.map(action => [action.name, action]));
  const planned = new Set(ACTION_INDEX.plannedActions.map(action => action.name));

  for (const name of [...LIFECYCLE_ACTIONS, ...EXTENDED_ACTIONS]) {
    assert.equal(current.get(name)?.status, "implemented", name);
    assert.deepEqual(current.get(name)?.coverage, {
      contract: "complete",
      effects: "complete",
      tests: "complete"
    }, name);
    assert.equal(planned.has(name), false, name);
  }
});

test("composes selective legends, encoding teardown, and selection release", () => {
  const guided = pointLifecycleProgram();
  const highlighted = guided
    .selectMarks({
      id: "focus",
      target: "points",
      field: "group",
      op: "eq",
      value: "A"
    })
    .highlightMarks({
      selection: "focus",
      stroke: "#111827",
      strokeWidth: 2,
      dimOthers: { opacity: 0.2 }
    });
  const legendOptions = Object.freeze({
    target: "points",
    channels: Object.freeze(["size"])
  });
  const selectionOptions = Object.freeze({
    selection: "focus",
    field: "group",
    op: "eq",
    value: "B"
  });
  const withoutSizeLegend = highlighted.removeLegend(legendOptions);
  const withoutShape = withoutSizeLegend.removeEncoding({
    target: "points",
    channel: "shape"
  });
  const editedSelection = withoutShape.editMarkSelection(selectionOptions);
  const withoutHighlight = editedSelection.removeMarkHighlight({
    selection: "focus"
  });
  const released = withoutHighlight.removeMarkSelection({ selection: "focus" });
  const clean = guided
    .removeLegend(legendOptions)
    .removeEncoding({ target: "points", channel: "shape" });

  assert.equal(withoutSizeLegend.graphicSpec.objects.sizeLegendSymbols, undefined);
  assert.ok(withoutSizeLegend.graphicSpec.objects.seriesLegendSymbolPoints);
  assert.equal(
    withoutShape.semanticSpec.layers.find(layer => layer.id === "points")
      .encoding.shape,
    undefined
  );
  assert.equal(withoutShape.graphicSpec.objects.seriesLegendSymbolPoints, undefined);
  assert.ok(withoutShape.graphicSpec.objects.colorLegendSymbolPoints);
  assert.equal(
    editedSelection.materializationConfigs.selections.focus.selector.value,
    "B"
  );
  assert.deepEqual(withoutHighlight.graphicSpec, clean.graphicSpec);
  assert.equal(released.materializationConfigs.selections, undefined);
  assert.equal(released.materializationConfigs.highlights, undefined);
  assert.deepEqual(released.graphicSpec, clean.graphicSpec);

  assert.notEqual(
    highlighted.semanticSpec.layers.find(layer => layer.id === "points")
      .encoding.shape,
    undefined
  );
  assert.notEqual(highlighted.materializationConfigs.highlights.focus, undefined);
  assert.deepEqual(legendOptions.channels, ["size"]);
  assert.equal(selectionOptions.value, "B");
});

const intervalRows = Object.freeze([
  Object.freeze({ time: 1, value: 1, group: "A" }),
  Object.freeze({ time: 1, value: 3, group: "A" }),
  Object.freeze({ time: 2, value: 2, group: "A" }),
  Object.freeze({ time: 2, value: 6, group: "A" }),
  Object.freeze({ time: 1, value: 4, group: "B" }),
  Object.freeze({ time: 1, value: 8, group: "B" }),
  Object.freeze({ time: 2, value: 5, group: "B" }),
  Object.freeze({ time: 2, value: 9, group: "B" })
]);

test("keeps removed boundaries and axis components absent after revision replay", () => {
  const original = chart()
    .createCanvas({ width: 280, height: 200, margin: 45 })
    .createData({ id: "samples", values: intervalRows })
    .createErrorBand({
      id: "band",
      x: { field: "time" },
      y: { field: "value" },
      groupBy: "group",
      boundaries: {}
    })
    .createAxes();
  const statistics = Object.freeze({ center: "median", extent: "iqr" });
  const revised = original
    .editErrorBand({ target: "band", statistics, boundaries: false })
    .editXAxis({ labels: false, title: false })
    .editYAxis({ line: false, ticks: false });
  const resized = revised.editCanvas({ width: 320 });
  const absent = [
    "bandLowerBoundary",
    "bandUpperBoundary",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks"
  ];

  assert.equal(revised.markConfigs.band.errorBand.data, "bandIntervalDataRevision1");
  assert.deepEqual(revised.semanticSpec.layers.map(layer => layer.id), ["band"]);
  for (const id of absent) {
    assert.equal(revised.graphicSpec.objects[id], undefined, id);
    assert.equal(resized.graphicSpec.objects[id], undefined, id);
  }
  assert.deepEqual(
    revised.trace.children.slice(-3).map(node => node.op),
    ["editErrorBand", "editXAxis", "editYAxis"]
  );
  assert.ok(original.graphicSpec.objects.bandLowerBoundary);
  assert.ok(original.graphicSpec.objects.bandUpperBoundary);
  assert.ok(original.graphicSpec.objects.xAxisLabels);
  assert.ok(original.graphicSpec.objects.yAxisLine);
  assert.deepEqual(statistics, { center: "median", extent: "iqr" });
  assert.deepEqual(intervalRows[0], { time: 1, value: 1, group: "A" });
});

const facetRows = Object.freeze([
  Object.freeze({ x: 0, y: 1, facet: "A", category: "u", amount: 2 }),
  Object.freeze({ x: 10, y: 2, facet: "A", category: "v", amount: 3 }),
  Object.freeze({ x: 100, y: 3, facet: "B", category: "u", amount: 4 }),
  Object.freeze({ x: 120, y: 4, facet: "B", category: "v", amount: 5 })
]);

test("facet rederivation preserves teardown and replays retained highlights", () => {
  const unit = chart()
    .createCanvas({
      width: 260,
      height: 200,
      margin: { top: 30, right: 90, bottom: 50, left: 50 }
    })
    .createData({ id: "rows", values: facetRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeColor({ field: "category" })
    .encodeSize({ field: "amount" })
    .removeEncoding({ target: "points", channel: "size" })
    .createGuides()
    .selectMarks({
      id: "selected",
      target: "points",
      field: "category",
      op: "eq",
      value: "u"
    })
    .highlightMarks({
      selection: "selected",
      stroke: "black",
      strokeWidth: 2,
      dimOthers: { opacity: 0.25 }
    });
  const faceted = unit.facet({ field: "facet", columns: 1 });
  const ids = Object.keys(faceted.children);
  const originalChildren = ids.map(id => faceted.children[id]);
  const layoutOptions = Object.freeze({ columns: 2 });
  const scaleOptions = Object.freeze({ x: "independent" });
  const guideOptions = Object.freeze({ axes: "outer", legend: "shared" });
  const laidOut = faceted.editCompositionLayout(layoutOptions);
  const edited = laidOut
    .editFacetScales(scaleOptions)
    .editFacetGuides(guideOptions);

  assert.deepEqual(Object.keys(edited.children), ids);
  assert.deepEqual(
    ids.map(id => laidOut.children[id]),
    originalChildren
  );
  assert.equal(
    ids.every((id, index) => edited.children[id] !== originalChildren[index]),
    true
  );
  assert.deepEqual(
    ids.map(id => edited.children[id].resolvedScales.x.domain),
    [[0, 10], [100, 120]]
  );
  for (const child of Object.values(edited.children)) {
    const encoding = child.semanticSpec.layers.find(
      layer => layer.id === "points"
    ).encoding;
    assert.equal(encoding.size, undefined);
    assert.notEqual(child.materializationConfigs.highlights.selected, undefined);
    assert.equal(
      child.graphicSpec.objects.points.items.some(
        item => item.properties.stroke === "black"
      ),
      true
    );
    assert.equal(
      child.graphicSpec.objects.points.items.some(
        item => item.properties.opacity === 0.25
      ),
      true
    );
  }
  assert.ok(edited.graphicSpec.objects["facet-legend"]);
  assert.equal(
    Object.keys(edited.graphicSpec.objects).some(id => id.includes("sizeLegend")),
    false
  );
  assert.equal(faceted.compositionSpec.columns, 1);
  assert.equal(faceted.compositionSpec.facet.scales.x, "shared");
  assert.deepEqual(layoutOptions, { columns: 2 });
  assert.deepEqual(scaleOptions, { x: "independent" });
  assert.deepEqual(guideOptions, { axes: "outer", legend: "shared" });
});
