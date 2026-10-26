import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../../src/index.js";
import { prepareCompositionSnapshots } from "../../../../src/materialization/composition.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const unit = end => chart().createCanvas({ plot: { width: 280, height: 200 }, margin: 80 })
  .createData({ id: "data", values: [{ x: 10, y: 20, g: "A" }, { x: end, y: end * 2, g: "B" }] })
  .createScatterPlot({ id: "plot", x: { field: "x", scale: { nice: false, zero: false } }, y: { field: "y", scale: { nice: false, zero: false } } });
const annotate = p => p.createAnnotation({ id: "note", anchor: "plot-center", data: "data", coordinate: "main", text: "Note" });
function assertNote(p, dx = 0, size = 12) {
  if (p.compositionSpec) {
    const children = p.compositionSpec.facet ? p.children : prepareCompositionSnapshots(p).children;
    for (const child of Object.values(children)) if (child.markConfigs.note) assertNote(child, dx, size);
    return;
  }
  const plot = resolveGraphicBounds(p), note = p.graphicSpec.objects.note.items[0].properties;
  assert.equal(note.x, plot.x + plot.width / 2 + dx);
  assert.equal(note.y, plot.y + plot.height / 2);
  assert.equal(note.fontSize, size);
  assert.deepEqual(p.resolvedScales["note-x"].domain, [0, 1]);
  assert.deepEqual(p.resolvedScales["note-y"].domain, [0, 1]);
}
for (const [compose, channel] of [[hconcat, "y"], [vconcat, "x"]]) for (const faceted of [false, true]) {
  test(`shared ${channel} preserves annotation anchors${faceted ? " within facets" : ""}`, () => {
    const original = annotate(unit(30));
    const left = faceted ? original.facet({ field: "g", columns: 2 }) : original;
    const p = compose({ programs: [{ id: "a", program: left }, { id: "b", program: unit(100) }], share: { [channel]: true } });
    const children = prepareCompositionSnapshots(p).children;
    const scale = children.b.semanticSpec.layers[0].encoding[channel].scale;
    assert.deepEqual(children.a.resolvedScales[scale].domain, channel === "x" ? [10, 100] : [20, 200]);
    assertNote(children.a);
    const action = { method: "editTextMark", options: { target: "note", dx: 15, fontSize: 18 } };
    const next = faceted ? p.editFacetSource({ target: { childPath: ["a"] }, action })
      : p.editTextMark({ target: { childPath: ["a"], id: "note" }, dx: 15, fontSize: 18 });
    assertNote(prepareCompositionSnapshots(next).children.a, 15, 18);
    assertNote(original);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  });
}
test("adding an adjacent chart after annotation keeps private and shared scales separate", () => {
  const p = annotate(unit(30)).createAdjacentPlot({ id: "other", source: "plot", position: "right",
    plot: { action: "createScatterPlot", options: { data: "data", x: "x", y: "y" } }, share: { y: true } });
  assertNote(prepareCompositionSnapshots(p).children.plot);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});
test("data-anchored annotations still follow their source's shared scale", () => {
  const left = unit(30).createAnnotation({ id: "data-note", source: "plot", x: 20, y: 60, text: "Data note" });
  const p = hconcat({ programs: [{ id: "a", program: left }, { id: "b", program: unit(100) }], share: { y: true } });
  const view = prepareCompositionSnapshots(p).children.a;
  assert.deepEqual(view.resolvedScales.y.domain, [20, 200]);
  assert.notEqual(view.graphicSpec.objects["data-note"].items[0].properties.y, left.graphicSpec.objects["data-note"].items[0].properties.y);
});
