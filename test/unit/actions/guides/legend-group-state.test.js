import { legendFixtureBounds } from "../../../oracles/legend-occupied.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { validateLegendGroupState } from "../../../../src/grammar/legendGroups.js";
import { collectGuideConfigReferences } from "../../../../src/core/resourceReferences.js";

const values = [{ x: 1, y: 2, g: "A", n: 1 }, { x: 2, y: 3, g: "B", n: 2 }];
function base() {
  return chart().createCanvas({ width: 1000, height: 900, margin: { left: 200, right: 300, top: 200, bottom: 200 } })
    .createData({ id: "data", values }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .encodeSize({ field: "n" }).encodeOpacity({ field: "n" });
}
function group(p) { return p.guideConfigs.legendGroups.points; }

test("group intent is immutable, single-owned and inherited by newly created members", () => {
  const p = base(), snapshot = JSON.stringify(p);
  const at = { x: 20, y: 30 };
  const q = p.createLegend({ channels: ["color"], at })
    .createLegend({ channels: ["size"] }).createLegend({ channels: ["opacity"] });
  at.x = 900;
  assert.deepEqual(group(q), { placement: { at: { x: 20, y: 30 } }, blockLayout: "column" });
  assert.equal(group(q).members, undefined);
  assert.equal(JSON.stringify(p), snapshot);
  assert.ok(Object.isFrozen(group(q).placement.at));
  const refs = collectGuideConfigReferences(q);
  assert.ok(refs.some(r => r.kind === "mark" && r.id === "points" && r.path.includes("legendGroups")));
  assert.throws(() => q.createLegend({ channels: ["strokeWidth"], at: { x: 21, y: 30 } }));
});

test("explicit group transitions preserve policy and reject conflicting new members atomically", () => {
  const p = base().createLegend({ channels: ["color"], position: "top-left", blockLayout: "row" });
  const snapshot = JSON.stringify(p);
  assert.throws(() => p.createLegend({ channels: ["size"], position: "bottom-right" }), /conflicts/);
  assert.throws(() => p.createLegend({ channels: ["size"], blockLayout: "column" }), /conflicts/);
  assert.equal(JSON.stringify(p), snapshot);
  const q = p.createLegend({ channels: ["size"] }).editLegendLayout({ at: { x: 0, y: 0 } });
  assert.deepEqual(group(q), { placement: { at: { x: 0, y: 0 } }, blockLayout: "row" });
  const r = q.editLegendLayout({ position: "bottom-left" });
  assert.equal(group(r).placement.at, undefined);
  assert.equal(group(r).placement.offset, 8);
  assert.equal(group(r).blockLayout, "row");
  assert.deepEqual(group(q).placement, { at: { x: 0, y: 0 } });
});

test("closed persisted group state rejects malformed unions and restores exact editable graphics", () => {
  const p = base().createLegend({ channels: ["color"], at: { x: 201, y: 79 }, blockLayout: "row" });
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.guideConfigs, p.guideConfigs);
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assert.deepEqual(restored.editCanvas({ width: 1001 }).guideConfigs.legendGroups, p.guideConfigs.legendGroups);
  for (const invalid of [null, [], { points: {} },
    { points: { placement: { at: { x: 1, y: 2 }, position: "right" }, blockLayout: "row" } },
    { points: { placement: { at: { x: 1, y: Infinity } }, blockLayout: "row" } },
    { points: { placement: { position: "right", align: "left", offset: 8 }, blockLayout: "row" } },
    { points: { placement: { at: { x: 1, y: 2 } }, blockLayout: "grid" } }]) {
    assert.throws(() => validateLegendGroupState(invalid));
  }
});

test("whole group removal cleans its owner and ordinary calls retain the legacy owner", () => {
  const legacy = base().createLegend({ channels: ["color"] });
  assert.equal(legacy.guideConfigs.legendGroups, undefined);
  const p = legacy.editLegendLayout({ at: { x: 20, y: 30 } });
  const q = p.removeLegend();
  assert.equal(q.guideConfigs.legendGroups, undefined);
  assert.equal(q.createLegend({ channels: ["color"] }).guideConfigs.legendGroups, undefined);
  assert.equal(p.removeMark({ target: "points" }).guideConfigs.legendGroups, undefined);
});

test("content and font edits keep the canonical group and converge after full rematerialization", () => {
  const p = base().createLegend({ channels: ["color"], at: { x: 10, y: 20 } })
    .createLegend({ channels: ["size"], values: [1, 2] });
  const q = p.editLegendBlock({ target: "points", channel: "size", title: "Magnitude", text: { fontSize: 16, color: "purple" } })
    .editLegendLabels({ color: "green" });
  assert.deepEqual(group(q), group(p));
  assert.deepEqual(q.rematerializeLegend().graphicSpec, q.graphicSpec);
  const restored = deserializeProgram(serializeProgram(q));
  assert.deepEqual(restored.editCanvas({ width: 1001 }).editCanvas({ width: 1000 }).graphicSpec, q.graphicSpec);
  assert.equal(q.graphicSpec.objects.sizeLegendTitle.properties.text, "Magnitude");
  assert.equal(q.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontSize, 16);
});

test("group planning works through public facade creation without a second placement owner", () => {
  const p = chart().createCanvas({ width: 1000, height: 900, margin: 200 })
    .createData({ id: "data", values })
    .createScatterPlot({ x: "x", y: "y", color: "g", guides: { legend: { at: { x: 20, y: 30 } } } });
  assert.deepEqual(p.guideConfigs.legendGroups.scatterPlot, {
    placement: { at: { x: 20, y: 30 } }, blockLayout: "column"
  });
});

test("ambiguous target groups require an explicit target and failed opt-in leaves the original untouched", () => {
  const p = base().createLegend({ channels: ["size"] })
    .createPointMark({ id: "other" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).createLegend({ channels: ["color"] });
  const before = JSON.stringify(p);
  assert.throws(() => p.editLegendLayout({ at: { x: 0, y: 0 } }), /target|ambiguous/);
  assert.equal(JSON.stringify(p), before);
  const q = p.editLegendLayout({ target: "points", at: { x: 20, y: 20 } });
  assert.ok(q.guideConfigs.legendGroups.points);
  assert.equal(q.guideConfigs.legendGroups.other, undefined);
});

test("shared facet and repeat replay retain free and corner group placement through persistence", () => {
  const p = base().createLegend({ channels: ["color"], at: { x: 10, y: 20 } });
  for (const source of [p, p.editLegendLayout({ position: "bottom-right" })]) {
    for (const q of [source.facet({ field: "g", guides: { legend: "shared" } }), source.repeatCharts({ channel: "x", fields: ["x", "y"], guides: { legend: "shared" } })]) {
      assert.deepEqual(q.guideConfigs.legendGroups, source.guideConfigs.legendGroups);
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
      assert.equal(q.actionStack.length, 0);
      assert.deepEqual(q.editCompositionLayout({ gap: 20 }).guideConfigs.legendGroups, source.guideConfigs.legendGroups);
    }
  }
});

test("legacy no-opt-in rematerialization remains exact and does not introduce group state", () => {
  for (const position of ["right", "left", "top", "bottom", "top-left"]) {
    const p = base().createLegend({ channels: ["color"], position, offset: 60 });
    const q = p.rematerializeLegend();
    assert.equal(q.guideConfigs.legendGroups, undefined);
    assert.deepEqual(q.graphicSpec, p.graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});


test("new group defaults come from the selected native family rather than a generic offset", () => {
  const p = base();
  for (const channel of ["color", "size", "opacity"]) {
    const q = p.createLegend({ channels: [channel], blockLayout: "row" });
    assert.equal(group(q).placement.offset, channel === "color" ? 8 : 30);
    assert.equal(group(q).placement.position, "right");
  }
});


test("free creation can author horizontal item layout independently of block layout", () => {
  const p = base().createLegend({ channels: ["color"], at: { x: 10, y: 20 }, direction: "horizontal" });
  assert.deepEqual(group(p).placement, { at: { x: 10, y: 20 } });
  const labels = p.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties);
  assert.equal(labels[0].y, labels[1].y);
  assert.ok(labels[0].x < labels[1].x);
});

test("group overflow remains an atomic failure with explicit inner plot sizing", () => {
  const p = chart().createCanvas({ plot: { width: 300, height: 300 }, margin: 20 })
    .createData({ values }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
  const before = serializeProgram(p);
  for (const options of [
    { at: { x: -1000, y: 0 } }, { at: { x: 1000, y: 0 } },
    { position: "top", blockLayout: "row", offset: 100 },
    { position: "bottom", blockLayout: "row", offset: 100 }
  ]) {
    assert.throws(() => p.createLegend({ channels: ["color"], ...options }), /Canvas space/);
    assert.equal(serializeProgram(p), before);
  }
  const q = p.createLegend({ channels: ["color"], at: { x: 10, y: 10 } });
  const snapshot = serializeProgram(q);
  assert.throws(() => q.editLegendLayout({ at: { x: 400, y: 0 } }), /Canvas space/);
  assert.equal(serializeProgram(q), snapshot);
});


test("mark teardown removes a retained empty legend group after its last encoding legend disappears", () => {
  const p = chart().createCanvas({ width: 600, height: 500, margin: 100 })
    .createData({ values }).createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeOpacity({ field: "n" })
    .createLegend({ at: { x: 10, y: 10 } });
  const q = p.encodeOpacity({ value: 0.5 });
  assert.equal(q.guideConfigs.legend, undefined);
  const r = q.removeMark({ target: "points" });
  assert.equal(r.guideConfigs.legendGroups, undefined);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(r)));
  assert.ok(q.guideConfigs.legendGroups.points);
});


test("constant-only appearance assignments do not create ambiguous legend group candidates", () => {
  const p = chart().createCanvas({ width: 1000, height: 800, margin: 200 })
    .createData({ values }).createPointMark({ id: "mapped" })
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .createLineMark({ id: "constant" }).encodeStrokeDash({ value: [2, 2] });
  const q = p.createLegend({ blockLayout: "row" });
  assert.ok(q.guideConfigs.legendGroups.mapped);
  assert.equal(q.guideConfigs.legendGroups.constant, undefined);
  assert.equal(q.guideConfigs.legend.color.target, "mapped");
});


function independentSharedFrame(program) {
  const objects = program.graphicSpec.objects;
  const shared = objects[`${program.compositionSpec.id}-shared-legend`].properties;
  const source = legendFixtureBounds(program);
  const legend = { left: source.left + shared.x, right: source.right + shared.x,
    top: source.top + shared.y, bottom: source.bottom + shared.y };
  const canvases = objects.canvas.children.map(id => objects[id]).filter(object => object.type === "canvas" && object.properties !== shared);
  assert.equal(canvases.length, program.compositionSpec.children.length);
  const plots = program.compositionSpec.children.map((id, index) => {
    const margin = program.children[id].materializationConfigs.canvas.margin;
    const canvas = canvases[index].properties;
    return { left: canvas.x + margin.left, right: canvas.x + canvas.width - margin.right,
      top: canvas.y + margin.top, bottom: canvas.y + canvas.height - margin.bottom };
  });
  const plot = { left: Math.min(...plots.map(p => p.left)), right: Math.max(...plots.map(p => p.right)),
    top: Math.min(...plots.map(p => p.top)), bottom: Math.max(...plots.map(p => p.bottom)) };
  return { legend, plot };
}

function assertSharedAnchor(program, placement) {
  const { plot, legend } = independentSharedFrame(program);
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} versus ${expected}`);
  if (placement.at !== undefined) {
    close(legend.left - plot.left, placement.at.x);
    close(legend.top - plot.top, placement.at.y);
  } else if (placement.position.includes("-")) {
    close(placement.position.endsWith("left") ? legend.left - plot.left : plot.right - legend.right, 8);
    close(placement.position.startsWith("top") ? legend.top - plot.top : plot.bottom - legend.bottom, 8);
  } else {
    const gap = placement.position === "top" ? plot.top - legend.bottom
      : placement.position === "bottom" ? legend.top - plot.bottom
        : placement.position === "left" ? plot.left - legend.right : legend.left - plot.right;
    close(gap, placement.offset);
  }
}

test("explicit shared facet and repeat promotion use every canonical group anchor and offset", () => {
  for (const position of ["left", "right", "top", "bottom"]) for (const offset of [10, 60]) {
    const source = base().createLegend({ channels: ["color"], position, offset, blockLayout: "row" });
    for (const q of [source.facet({ field: "g", guides: { legend: "shared" } }),
      source.repeatCharts({ channel: "x", fields: ["x", "y"], guides: { legend: "shared" } })]) {
      assertSharedAnchor(q, { position, offset });
      assertSharedAnchor(q.editCompositionLayout({ gap: 20 }), { position, offset });
      assertSharedAnchor(deserializeProgram(serializeProgram(q)), { position, offset });
    }
  }
  for (const placement of [{ at: { x: 10, y: 20 } }, { position: "bottom-right" }, { position: "top-left" }]) {
    const source = base().createLegend({ channels: ["color"], ...placement, blockLayout: "row" });
    const q = source.facet({ field: "g", guides: { legend: "shared" } });
    assertSharedAnchor(q, placement);
    assertSharedAnchor(q.editCompositionLayout({ gap: 20 }), placement);
  }
});
