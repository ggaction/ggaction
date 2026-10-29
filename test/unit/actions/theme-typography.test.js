import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

function sample() {
  return chart().createCanvas({ width: 640, height: 480, margin: 120 })
    .createData({ values: [{ x: 1, y: 2, group: "A", label: "One" }, { x: 2, y: 3, group: "B", label: "Two" }] })
    .createScatterPlot({ id: "dots", x: "x", y: "y", color: "group" })
    .createTextMark({ id: "labels", data: "data" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "label" })
    .createTitle({ text: "Main title", subtitle: "Subtitle" });
}
const text = program => Object.values(program.graphicSpec.objects).flatMap(graphic =>
  graphic.items?.filter(item => (item.type ?? graphic.type) === "text").map(item => item.properties) ??
  (graphic.type === "text" ? [graphic.properties] : []));
const typography = program => text(program).map(({ fill, ...properties }) => properties);

test("global typography themes restore each native text role after removal", () => {
  const p = sample(), before = serializeProgram(p);
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 16, fontWeight: "bold" } } });
  assert.ok(text(q).length > 10);
  assert.ok(text(q).every(properties => properties.fontSize === 16 && properties.fontWeight === "bold"));
  assert.deepEqual(typography(q.removeTheme()), typography(p));
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("explicit typography and axis role tokens outrank global text defaults", () => {
  const p = sample().editTextMark({ target: "labels", fontSize: 12, fontWeight: 0 })
    .editTitle({ titleStyle: { fontSize: 22, fontWeight: 600 } });
  const q = p.applyTheme({ theme: { base: "light", tokens: { fontSize: 17, fontWeight: "bold", axisLabelFontSize: 15 } } });
  assert.equal(q.markConfigs.labels.fontSize, 12);
  assert.equal(q.markConfigs.labels.fontWeight, 0);
  assert.equal(q.materializationConfigs.title.titleStyle.fontSize, 22);
  assert.equal(q.materializationConfigs.title.titleStyle.fontWeight, 600);
  assert.equal(q.guideConfigs.axis.x.labels.fontSize, 15);
  assert.equal(q.guideConfigs.axis.y.labels.fontSize, 15);
  assert.equal(q.guideConfigs.axis.x.labels.fontWeight, "bold");
  assert.deepEqual(typography(q.removeTheme()), typography(p));
});

test("future text owners inherit global typography and reset when a partial theme is replaced", () => {
  const p = chart().applyTheme({ theme: { base: "light", tokens: { fontSize: 18, fontWeight: 700 } } })
    .createCanvas({ width: 300, height: 240, margin: 80 }).createData({ values: [{ x: 1, y: 2, text: "A" }] })
    .createTextMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" });
  assert.equal(p.markConfigs.text.fontSize, 18);
  assert.equal(p.markConfigs.text.fontWeight, 700);
  const q = p.applyTheme({ theme: "dark" });
  assert.equal(q.markConfigs.text.fontSize, 12);
  assert.equal(q.markConfigs.text.fontWeight, "normal");
  for (const tokens of [{ fontSize: 0 }, { fontSize: Infinity }, { fontWeight: "" }, { fontWeight: NaN }]) {
    assert.throws(() => q.applyTheme({ theme: { base: "light", tokens } }));
  }
});

test("facade-authored typography and named text highlights retain precedence", () => {
  const p = chart().createCanvas({ width: 400, height: 300, margin: 70 })
    .createData({ values: [{ x: 1, y: 2, label: "A" }, { x: 2, y: 3, label: "B" }] })
    .createTextPlot({ id: "plot", x: "x", y: "y", text: "label", guides: false, style: { fontSize: 12, fontWeight: 0 } })
    .highlightMarks({ id: "chosen", target: "plot", select: { field: "x", op: "max" }, fontSize: 24, opacity: 0.4 });
  const q = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 16, fontWeight: 700 } } });
  assert.equal(q.markConfigs.plot.fontSize, 12);
  assert.equal(q.markConfigs.plot.fontWeight, 0);
  assert.deepEqual(text(q).map(properties => properties.fontSize).sort((a, b) => a - b), [12, 24]);
  assert.equal(text(q).find(properties => properties.fontSize === 24).opacity, 0.4);
  assert.deepEqual(typography(q.removeTheme()), typography(p));
});


test("polar and parallel typography restores their eleven-point label defaults", () => {
  const polar = chart().createCanvas({ plot: { width: 180, height: 180 }, margin: 90 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 20 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r", scale: { zero: true } })
    .createThetaAxis().createRadialAxis();
  const parallel = chart().createCanvas({ width: 600, height: 400, margin: 100 })
    .createData({ values: [{ a: 0, b: 10 }, { a: 10, b: 20 }] })
    .createParallelCoordinates({ dimensions: ["a", "b"], guides: { legend: false } })
    .editParallelAxis({ field: "a", labels: { fontSize: 11, fontWeight: 0 } });
  for (const base of [polar, parallel]) {
    const themed = base.applyTheme({ theme: { base: "light", tokens: { fontSize: 15, fontWeight: 700, axisTitleFontSize: 19 } } });
    const titles = Object.entries(themed.graphicSpec.objects).filter(([id]) => /Titles?$/.test(id));
    assert.ok(titles.length > 0);
    assert.ok(titles.every(([, object]) => (object.items ?? [object]).every(item => item.properties.fontSize === 19)));
    assert.deepEqual(typography(themed.removeTheme()), typography(base));
  }
  const themed = parallel.applyTheme({ theme: { base: "light", tokens: { fontSize: 15, fontWeight: 700 } } });
  assert.equal(themed.guideConfigs.axis.parallel.axes.dimensions[0].labels.fontSize, 11);
  assert.equal(themed.guideConfigs.axis.parallel.axes.dimensions[0].labels.fontWeight, 0);
  assert.equal(themed.guideConfigs.axis.parallel.axes.dimensions[1].labels.fontSize, 15);
});

test("facet headers and nested descendants preserve explicit and local typography", () => {
  const source = chart().createCanvas({ width: 250, height: 200, margin: 40 })
    .createData({ values: [{ x: 1, y: 2, group: "A", label: "One" }, { x: 2, y: 3, group: "B", label: "Two" }] })
    .createTextMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "label" });
  const facet = source.facet({ id: "fac", field: "group", headers: { fontSize: 12, fontWeight: 0 } });
  const themed = facet.applyTheme({ theme: { base: "light", tokens: { fontSize: 18, fontWeight: 700 } }, scope: "descendants" });
  assert.ok(themed.graphicSpec.objects["fac-headers"].items.every(item => item.properties.fontSize === 12 && item.properties.fontWeight === 0));
  assert.ok(Object.values(themed.children).every(child => text(child).every(properties => properties.fontSize === 18)));
  assert.deepEqual(typography(themed.removeTheme()), typography(facet));
  const local = source.applyTheme({ theme: { base: "light", tokens: { fontSize: 14 } } });
  const pair = hconcat({ programs: [{ id: "local", program: local }, { id: "plain", program: source }] });
  const parent = pair.applyTheme({ theme: { base: "light", tokens: { fontSize: 20, fontWeight: "bold" } }, scope: "descendants" });
  assert.equal(parent.children.local.markConfigs.text.fontSize, 20);
  const restored = parent.removeTheme();
  assert.equal(restored.children.local.markConfigs.text.fontSize, 14);
  assert.equal(restored.children.plain.markConfigs.text.fontSize, 12);
  assert.deepEqual(deserializeProgram(serializeProgram(parent)).graphicSpec, parent.graphicSpec);
});

test("resource label typography preserves layouts, per-node overrides, and role resets", () => {
  const base = chart().createCanvas({ width: 300, height: 200, margin: 0 })
    .createData({ values: [{ id: "root", parent: null, value: 2 }, { id: "leaf", parent: "root", value: 1 }] })
    .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method: "tree", options: { nodeSize: [20, 20], siblingGap: 30, depthGap: 40, orientation: "vertical" } })
    .createTreePlot({ id: "tree", labels: { overrides: [{ key: "leaf", fontSize: 11, fontWeight: 0 }] } });
  const themed = base.applyTheme({ theme: { base: "light", tokens: { fontSize: 17, fontWeight: "bold" } } });
  const labels = themed.graphicSpec.objects.tree.items.filter(item => item.type === "text");
  assert.deepEqual(labels.map(item => [item.properties.fontSize, item.properties.fontWeight]), [[17, "bold"], [11, 0]]);
  assert.equal(themed.semanticSpec.resources, base.semanticSpec.resources);
  assert.deepEqual(themed.removeTheme().graphicSpec, base.graphicSpec);
  const reset = themed.editTreePlot({ labels: false }).editTreePlot({ labels: { fontSize: 12 } })
    .applyTheme({ theme: { base: "dark", tokens: { fontSize: 20, fontWeight: 700 } } });
  assert.ok(reset.graphicSpec.objects.tree.items.filter(item => item.type === "text").every(item => item.properties.fontSize === 12 && item.properties.fontWeight === 700));
});


test("exact font profiles reject unprepared typography atomically", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const base = chart().createCanvas({ width: 300, height: 220, margin: 50 })
    .createData({ values: [{ x: 1, y: 2, text: "AB" }] }).createTextMark()
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" });
  const prepared = await prepareFontResource(base, { kind: "create", id: "font", uri: "fixture:typography",
    expectedHash, mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const withFont = base.createFontResource({ prepared, requestToken: "current" });
  const metrics = await prepareTextMetrics(withFont, { id: "exact", fonts: ["font"] }, { requestToken: "current", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(({ text, fontSize }) => [...text].reduce((sum, letter) => sum + ({ A: 0.6, B: 0.8 }[letter] ?? 0), 0) * fontSize) }) });
  const exact = withFont.applyTextMetrics({ prepared: metrics, requestToken: "current" }), before = serializeProgram(exact);
  for (const [tokens, code] of [[{ fontSize: 19 }, "metrics-required"], [{ fontWeight: 700 }, "unresolved-font"]]) {
    assert.throws(() => exact.applyTheme({ theme: { base: "light", tokens } }), error => error.assetCode === code);
    assert.equal(serializeProgram(exact), before);
  }
  const themed = exact.removeTextMetrics().applyTheme({ theme: { base: "light", tokens: { fontSize: 19 } } });
  assert.equal(themed.graphicSpec.objects.text.items[0].properties.fontSize, 19);
});


test("guide facade and legend block typography stays explicit at equal default values", () => {
  const source = chart().createCanvas({ width: 500, height: 400, margin: 100 })
    .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "group" })
    .createGuides({ axes: false, legend: { labels: { fontSize: 12, fontWeight: 0 }, titleStyle: { fontSize: 13 } } });
  const changed = source.applyTheme({ theme: { base: "light", tokens: { fontSize: 19, fontWeight: 700 } } });
  assert.ok(changed.graphicSpec.objects.colorLegendLabels.items.every(item => item.properties.fontSize === 12 && item.properties.fontWeight === 0));
  assert.equal(changed.graphicSpec.objects.colorLegendTitle.properties.fontSize, 13);
  const block = source.editLegendBlock({ target: "point", channel: "color", text: { fontSize: 10, fontWeight: 600 } })
    .applyTheme({ theme: { base: "dark", tokens: { fontSize: 19, fontWeight: 700 } } });
  assert.ok(block.graphicSpec.objects.colorLegendLabels.items.every(item => item.properties.fontSize === 10 && item.properties.fontWeight === 600));
});

test("unmodified facet headers inherit and restore their bold twelve-point family default", () => {
  const base = chart().createCanvas({ width: 240, height: 180, margin: 40 })
    .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).facet({ id: "fac", field: "group" });
  const themed = base.applyTheme({ theme: { base: "light", tokens: { fontSize: 16, fontWeight: "normal" } } });
  assert.ok(text(themed).every(properties => properties.fontSize === 16 && properties.fontWeight === "normal"));
  assert.deepEqual(typography(themed.removeTheme()), typography(base));
});

test("recreating a text owner clears its previous authored typography", () => {
  const base = chart().createCanvas({ width: 250, height: 180, margin: 40 })
    .createData({ values: [{ x: 1, y: 2, label: "A" }] })
    .createTextMark({ fontSize: 20 }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "label" })
    .removeMark({ target: "text" }).createTextMark()
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "label" });
  const themed = base.applyTheme({ theme: { base: "light", tokens: { fontSize: 18 } } });
  assert.equal(themed.markConfigs.text.fontSize, 18);
  assert.equal(themed.removeTheme().markConfigs.text.fontSize, 12);
});
