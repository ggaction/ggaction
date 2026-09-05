import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

function base() {
  return chart().createCanvas({ width: 640, height: 420,
    margin: { left: 60, right: 180, top: 40, bottom: 60 } })
    .createData({ values: [{ x: 1, y: 2, m: 10, group: "A" },
      { x: 2, y: 3, m: 20, group: "B" }, { x: 3, y: 5, m: 30, group: "B" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } })
    .createLegend({ channels: ["size"] });
}
const props = (p, id, key) => p.graphicSpec.objects[id].items.map(item => item.properties[key]);

test("edits standalone size content and replays exact equal-area samples and styles", () => {
  const p = base();
  const snapshot = JSON.stringify(p);
  const args = { count: 3, title: "Mass", labels: { color: "#123456", fontWeight: 700 }, titleStyle: { color: "#654321" } };
  const q = p.editLegend(args);
  assert.deepEqual(props(q, "sizeLegendSymbols", "radius"), [2, Math.sqrt(20), 6]);
  assert.deepEqual(props(q, "sizeLegendSymbols", "y"), [92, 132, 172]);
  assert.deepEqual(props(q, "sizeLegendLabels", "text"), ["10", "20", "30"]);
  assert.deepEqual(props(q, "sizeLegendLabels", "x"), [534, 534, 534]);
  assert.equal(q.semanticSpec.guides.legend.size.title, "Mass");
  assert.equal(q.graphicSpec.objects.sizeLegendTitle.properties.x, 490);
  assert.equal(q.graphicSpec.objects.sizeLegendTitle.properties.y, 60);
  const replay = q.editLegend({ labels: { offset: 32 } }).editCanvas({ width: 740 })
    .editScale({ id: "size", domain: [0, 40] });
  assert.deepEqual(props(replay, "sizeLegendLabels", "text"), ["0", "20", "40"]);
  assert.deepEqual(props(replay, "sizeLegendLabels", "x"), [654, 654, 654]);
  assert.deepEqual(props(replay, "sizeLegendSymbols", "radius"), [2, Math.sqrt(20), 6]);
  assert.equal(replay.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontWeight, 700);
  assert.equal(replay.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "#123456");
  assert.equal(JSON.stringify(p), snapshot);
  assert.deepEqual(args.labels, { color: "#123456", fontWeight: 700 });
});

test("hides and restores the size title through focused edits without recreating samples", () => {
  const p = base().editLegendSymbols({ count: 3 }).editLegendTitle({ title: "Mass" });
  const hidden = p.editLegendTitle({ title: false }).editLegendTitle({ color: "red" });
  assert.equal(hidden.graphicSpec.objects.sizeLegendTitle, undefined);
  assert.equal(hidden.editCanvas({ width: 740 }).graphicSpec.objects.sizeLegendTitle, undefined);
  const restored = hidden.editLegendTitle({ title: "auto" });
  assert.equal(restored.graphicSpec.objects.sizeLegendTitle.properties.text, "m");
  assert.equal(restored.graphicSpec.objects.sizeLegendTitle.properties.fill, "red");
  assert.deepEqual(restored.graphicSpec.objects.sizeLegendSymbols, p.graphicSpec.objects.sizeLegendSymbols);
  assert.equal(restored.trace.children.at(-1).children[0].op, "editLegend");
  const removed = restored.removeLegend({ channels: ["size"] });
  assert.equal(removed.guideConfigs.legend, undefined);
  assert.equal(removed.createLegend({ channels: ["size"], count: 3 }).graphicSpec.objects.sizeLegendSymbols.items.length, 3);
});

test("keeps content edits through filtered data and independent categorical owners", () => {
  const p = base().editLegend({ count: 3, title: "Mass", labels: { fontWeight: 700 } });
  const filtered = p.filterMarks({ target: "points", field: "group", op: "eq", value: "B" });
  assert.deepEqual(props(filtered, "sizeLegendLabels", "text"), ["20", "25", "30"]);
  assert.equal(filtered.graphicSpec.objects.sizeLegendTitle.properties.text, "Mass");
  const independent = p.editCanvas({ margin: { left: 180, right: 180, top: 40, bottom: 60 } })
    .createPointMark({ id: "other" }).encodeX({ field: "x", scale: { id: "otherX" } })
    .encodeY({ field: "y", scale: { id: "otherY" } }).encodeColor({ field: "group" })
    .createLegend({ target: "other", channels: ["color"], position: "left", labels: { color: "red" } });
  const q = independent.editLegendLabels({ target: "points", color: "blue" });
  assert.equal(q.graphicSpec.objects.sizeLegendTitle.properties.y, 60);
  assert.equal(q.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "blue");
  assert.equal(q.guideConfigs.legend.color.labels.color, "red");
  const resizedContent = independent.editLegend({ target: "points", count: 2, title: "Longer size title" });
  for (const id of ["colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"]) {
    assert.deepEqual(resizedContent.graphicSpec.objects[id], independent.graphicSpec.objects[id]);
  }
  assertAtomicFailures(independent, [{ operation: () => independent.editLegend({ count: 3 }) }]);
});

test("rejects unsupported standalone size options and invalid proposals atomically", () => {
  const p = base();
  const failures = [{}, { count: 1 }, { count: 3.5 }, { count: 10001 }, { title: "" },
    { count: 3, labels: { fontSize: 0 } }, { labels: { offset: -1 } },
    { titleStyle: { offset: 10 } }, { target: "other", count: 3 }, { target: null, count: 3 }];
  for (const option of ["symbol", "gradient", "order"]) {
    failures.push({ [option]: {} });
  }
  assertAtomicFailures(p, failures.map(args => ({ operation: () => p.editLegend(args), inputs: [args] })));
  assert.throws(() => p.editLegendLayout({ position: "left" }), /margin space/);
  const basic = basicChart().createCanvas({ margin: { right: 180 } }).createData({ values: [{ x: 1, y: 2, m: 3 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeSize({ field: "m" });
  const basicLegend = basic.createLegend({ channels: ["size"] });
  assert.equal(basicLegend.graphicSpec.objects.sizeLegendSymbols.items.length, 5);
  assert.equal(basicLegend.editLegend, undefined);
});
