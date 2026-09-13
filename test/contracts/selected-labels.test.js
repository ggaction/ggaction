import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { assertAtomicFailures } from "../support/program-state.js";

const values = [
  { category: "A", value: 1 },
  { category: "B", value: 5 },
  { category: "C", value: 3 }
];

function bars({ id = "B", data = "data", rows = values } = {}) {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 24 })
    .createData({ id: data, values: rows })
    .createBarPlot({
      id,
      data,
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    });
}

function labelTexts(program, id = "L") {
  return program.graphicSpec.objects[id].items.map(item => item.properties.text);
}

function sourceItems(program, id = "B") {
  return program.graphicSpec.objects[id].items;
}

test("labels only inline-selected final items while preserving source order and body", () => {
  const before = bars();
  const selector = Object.freeze({ field: "value", op: "max", count: 2 });
  const options = Object.freeze({
    id: "L",
    source: "B",
    field: "value",
    select: selector
  });
  const labeled = before.createMarkLabels(options);

  assert.deepEqual(options, {
    id: "L",
    source: "B",
    field: "value",
    select: { field: "value", op: "max", count: 2 }
  });
  assert.deepEqual(labelTexts(labeled), ["5", "3"]);
  assert.equal(sourceItems(labeled).length, 3);
  assert.deepEqual(labeled.markConfigs.L.labelAuthoring.selection, {
    kind: "inline",
    selector: {
      grain: "item",
      field: "value",
      op: "max",
      count: 2,
      ties: "first"
    }
  });
  assert.equal(Object.hasOwn(labeled.markConfigs.L.labelAuthoring.selection, "indices"), false);
  assert.equal(before.graphicSpec.objects.L, undefined);
  assert.equal(before.markConfigs.L, undefined);
});

test("uses the existing first and all tie policies without reordering selected labels by rank", () => {
  const tied = bars({ rows: [
    { category: "A", value: 5 },
    { category: "B", value: 5 },
    { category: "C", value: 3 }
  ] });
  const first = tied.createMarkLabels({
    id: "L",
    field: "value",
    select: { field: "value", op: "max", count: 1, ties: "first" }
  });
  const all = tied.createMarkLabels({
    id: "L",
    field: "value",
    select: { field: "value", op: "max", count: 1, ties: "all" }
  });
  assert.deepEqual(labelTexts(first), ["5"]);
  assert.deepEqual(labelTexts(all), ["5", "5"]);

  const reordered = bars()
    .createMarkLabels({
      id: "L",
      field: "value",
      select: { field: "value", op: "max", count: 2 }
    })
    .orderCategories({
      target: "B",
      channel: "x",
      values: ["C", "A", "B"]
    });
  assert.deepEqual(labelTexts(reordered), ["3", "5"]);
});

test("treats an empty match as a valid empty label collection", () => {
  const before = bars();
  const sourceLayer = structuredClone(before.semanticSpec.layers.find(layer => layer.id === "B"));
  const sourceGraphic = structuredClone(before.graphicSpec.objects.B);
  const domain = [...before.resolvedScales.y.domain];
  const labeled = before.createMarkLabels({
    id: "L",
    field: "value",
    select: { field: "value", op: "gt", value: 10 }
  });

  assert.deepEqual(labelTexts(labeled), []);
  assert.deepEqual(labeled.semanticSpec.layers.find(layer => layer.id === "B"), sourceLayer);
  assert.deepEqual(labeled.graphicSpec.objects.B, sourceGraphic);
  assert.deepEqual(labeled.resolvedScales.y.domain, domain);
});

test("keeps semantic share values relative to the complete final source", () => {
  const labeled = chart()
    .createCanvas({ width: 240, height: 200, margin: 24 })
    .createData({ values: [
      { category: "A", value: 1 },
      { category: "A", value: 1 },
      { category: "B", value: 6 }
    ] })
    .createPiePlot({
      id: "P",
      category: "category",
      value: "value",
      aggregate: "sum",
      guides: false
    })
    .createMarkLabels({
      id: "L",
      source: "P",
      content: "share",
      format: ".1%",
      select: { field: "value", op: "max" }
    });

  assert.deepEqual(labelTexts(labeled), ["75.0%"]);
  assert.deepEqual(
    labelTexts(labeled.editMarkLabelSelection({ target: "L", all: true })),
    ["25.0%", "75.0%"]
  );
});

test("replays attached collision layout and removes stale leaders as membership changes", () => {
  const labeled = bars().createMarkLabels({
    id: "L",
    field: "value",
    layout: {
      axis: "y",
      leader: { stroke: "#64748b", strokeWidth: 1 }
    }
  });
  const selected = labeled.editMarkLabelSelection({
    target: "L",
    select: { field: "value", op: "max" }
  });
  assert.deepEqual(labelTexts(selected), ["5"]);
  assert.equal(selected.materializationConfigs.labelLayouts.L.axis, "y");
  assert.equal(selected.materializationConfigs.labelLayouts.L.resolution.overlapAfter, 0);

  const empty = selected.editMarkLabelSelection({
    target: "L",
    select: { field: "value", op: "gt", value: 10 }
  });
  assert.deepEqual(labelTexts(empty), []);
  assert.deepEqual(empty.materializationConfigs.labelLayouts.L.resolution, {
    overlapBefore: 0,
    overlapAfter: 0,
    displaced: 0,
    leaders: 0,
    maximumDisplacement: 0,
    warnings: []
  });
  assert.equal(empty.graphicSpec.objects["L-label-leaders"], undefined);
});

test("replays named membership on selection edit and protects the live dependency", () => {
  const labeled = bars()
    .selectMarks({
      id: "chosen",
      target: "B",
      field: "value",
      op: "gt",
      value: 4
    })
    .createMarkLabels({
      id: "L",
      source: "B",
      field: "value",
      selection: "chosen"
    })
    .highlightMarks({ selection: "chosen", color: "#dc2626" });
  assert.deepEqual(labelTexts(labeled), ["5"]);

  const edited = labeled.editMarkSelection({
    selection: "chosen",
    field: "value",
    op: "gt",
    value: 2
  });
  assert.deepEqual(labelTexts(edited), ["5", "3"]);
  assert.deepEqual(
    edited.trace.children.at(-1).children.map(child => child.op),
    [
      "editGraphics",
      "rematerializeBarMark",
      "rematerializeTextMark",
      "rematerializeMarkHighlights"
    ]
  );
  assert.throws(
    () => edited.removeMarkSelection({ selection: "chosen" }),
    /referenced by attached labels: L/
  );
  assert.doesNotThrow(() => edited.removeMarkHighlight({ selection: "chosen" }));

  const all = edited.editMarkLabelSelection({ target: "L", all: true });
  assert.deepEqual(labelTexts(all), ["1", "5", "3"]);
  assert.deepEqual(all.markConfigs.L.labelAuthoring.selection, { kind: "all" });
  const released = all.removeMarkSelection({ selection: "chosen" });
  assert.equal(released.materializationConfigs.selections, undefined);
  assert.deepEqual(labelTexts(released), ["1", "5", "3"]);
});

test("replaces label membership atomically and leaves named selections after label removal", () => {
  const named = bars()
    .selectMarks({
      id: "chosen",
      target: "B",
      field: "value",
      op: "max",
      count: 1
    })
    .createMarkLabels({ id: "L", field: "value", selection: "chosen" });
  const inline = named.editMarkLabelSelection({
    target: "L",
    select: { field: "value", op: "min", count: 2 }
  });
  assert.deepEqual(labelTexts(inline), ["1", "3"]);
  assert.equal(inline.markConfigs.L.labelAuthoring.selection.kind, "inline");

  const removed = named.removeMarkLabels({ target: "L" });
  assert.ok(removed.materializationConfigs.selections.chosen);
  assert.doesNotThrow(() => removed.removeMarkSelection({ selection: "chosen" }));
});

test("validates exclusive selection modes, ownership, fields, and edit targets before writing", () => {
  const base = bars();
  const selected = base.selectMarks({
    id: "chosen",
    target: "B",
    field: "value",
    op: "max"
  });
  const withOther = selected
    .createData({ id: "other-data", values })
    .createBarPlot({
      id: "Other",
      data: "other-data",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    });
  const aggregate = bars({ rows: [
    { category: "A", value: 1, raw: 10 },
    { category: "A", value: 2, raw: 20 }
  ] });
  const labeled = selected.createMarkLabels({ id: "L", selection: "chosen" });
  const independent = selected.createTextMark({ id: "note", data: "data", text: "note" });
  const both = Object.freeze({
    id: "L",
    select: { field: "value", op: "max" },
    selection: "chosen"
  });

  assertAtomicFailures(selected, [
    { operation: () => selected.createMarkLabels(both), error: /select or selection/, inputs: [both] },
    { operation: () => selected.createMarkLabels({ id: "L", selection: "missing" }), error: /Unknown label selection/ },
    { operation: () => selected.createMarkLabels({ id: "L", select: true }), error: /Mark selector must be a plain object/ },
    { operation: () => selected.createMarkLabels({ id: "L", select: { field: "missing", op: "max" } }), error: /not uniquely defined/ }
  ]);
  assertAtomicFailures(withOther, [{
    operation: () => withOther.createMarkLabels({
      id: "other-labels",
      source: "Other",
      selection: "chosen"
    }),
    error: /must target source mark "Other"/
  }]);
  assertAtomicFailures(aggregate, [{
    operation: () => aggregate.createMarkLabels({
      id: "L",
      field: "value",
      select: { field: "raw", op: "max" }
    }),
    error: /not uniquely defined/
  }]);
  assertAtomicFailures(labeled, [
    { operation: () => labeled.editMarkLabelSelection({ target: "L" }), error: /exactly one/ },
    { operation: () => labeled.editMarkLabelSelection({ target: "L", all: false }), error: /all must be true/ },
    { operation: () => labeled.editMarkLabelSelection({ target: "L", all: true, select: { field: "value", op: "max" } }), error: /exactly one/ },
    { operation: () => labeled.editMarkLabelSelection({ target: "L", selection: "missing" }), error: /Unknown label selection/ },
    { operation: () => labeled.editMarkLabelSelection({ target: "L", all: true, extra: 1 }), error: /Unknown editMarkLabelSelection option/ }
  ]);
  assertAtomicFailures(independent, [
    { operation: () => independent.editMarkLabelSelection({ target: "note", all: true }), error: /Unknown attached label target/ },
    { operation: () => independent.editMarkLabelSelection({ all: true }), error: /requires target/ }
  ]);
});

test("reevaluates inline membership after mark filtering, reencoding, Canvas, and theme replay", () => {
  const labeled = bars().createMarkLabels({
    id: "L",
    field: "value",
    select: { field: "value", op: "max", count: 2 }
  });
  const replayed = labeled
    .filterMarks({ target: "B", field: "value", op: "gte", value: 3 })
    .encodeY({ target: "B", field: "value", aggregate: "sum" })
    .editCanvas({ width: 300, height: 220 })
    .applyTheme({ theme: "dark" });

  assert.deepEqual(labelTexts(replayed), ["5", "3"]);
  assert.equal(sourceItems(replayed).length, 2);
  assert.deepEqual(replayed.markConfigs.L.labelAuthoring.selection.selector, {
    grain: "item",
    field: "value",
    op: "max",
    count: 2,
    ties: "first"
  });
});

test("evaluates new and edited label membership before source highlight geometry", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 180, margin: 24 })
    .createData({ values: [
      { series: "A", x: 1, y: 2 },
      { series: "A", x: 2, y: 4 },
      { series: "B", x: 1, y: 3 },
      { series: "B", x: 2, y: 5 }
    ] })
    .createLineMark({ id: "lines" })
    .encodeX({ target: "lines", field: "x" })
    .encodeY({ target: "lines", field: "y" })
    .encodeGroup({ target: "lines", field: "series" })
    .selectMarks({
      id: "series-a",
      target: "lines",
      field: "series",
      op: "eq",
      value: "A"
    })
    .highlightMarks({ selection: "series-a", offset: { x: 12, y: 8 } });
  const clean = base.removeMarkHighlight({ selection: "series-a" })
    .createMarkLabels({
      id: "clean-label",
      source: "lines",
      field: "series",
      selection: "series-a"
    });
  const highlighted = base.createMarkLabels({
    id: "L",
    source: "lines",
    field: "series",
    selection: "series-a"
  });
  assert.deepEqual(
    highlighted.graphicSpec.objects.L.items.map(item => item.properties),
    clean.graphicSpec.objects["clean-label"].items.map(item => item.properties)
  );

  const edited = highlighted.editMarkLabelSelection({ target: "L", all: true });
  const cleanAll = clean.editMarkLabelSelection({ target: "clean-label", all: true });
  assert.deepEqual(
    edited.graphicSpec.objects.L.items.map(item => item.properties),
    cleanAll.graphicSpec.objects["clean-label"].items.map(item => item.properties)
  );
});
