import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const rows = Array.from({ length: 8 }, (_, i) => ({ x: i, y: i + 1, group: i % 2 ? "B" : "A", panel: String(i % 4), amount: i + 1 }));
function source() {
  return chart().createCanvas({ plot: { width: 60, height: 275 }, margin: { top: 35, right: 5, bottom: 60, left: 45 } })
    .createData({ id: "rows", values: rows })
    .createScatterPlot({ x: "x", y: "y", color: "group", guides: false });
}
const facet = (p = source(), legend = { position: "top-left" }) => p.facet({ field: "panel", columns: 4, spacing: "plot", gap: 2,
  guides: { axes: "outer", legend } });
const saved = p => serializeProgram(p);
const ownerBounds = p => resolveConcreteGraphicBounds(p.graphicSpec, `${p.compositionSpec.id}-shared-legend`, p.materializationConfigs.textMetrics);

test("a declared parent legend uses the 246-pixel final union without changing 60-pixel child plots", () => {
  const base = source(), before = saved(base), p = facet(base);
  const { plot } = resolveFacetProgramLayout(p);
  assert.equal(plot.width, 246);
  assert.equal(plot.height, 275);
  const bounds = ownerBounds(p);
  assert.equal(bounds.left, plot.x + 8);
  assert.equal(bounds.top, plot.y + 8);
  assert.equal(p.compositionSpec.facet.guides.legend.type, "authored-legend");
  for (const child of Object.values(p.children)) {
    assert.equal(child.materializationConfigs.canvas.plot.width, 60);
    assert.equal(child.guideConfigs.legend, undefined);
    assert.equal(child.compositionSpec, undefined);
  }
  assert.equal(saved(base), before);
});

test("whole, focused and block edits own the parent and final removal cannot resurrect it", () => {
  const p = facet(), before = saved(p), children = p.children;
  const q = p.editLegendTitle({ fontSize: 11 }).editLegendLabels({ fontSize: 10 })
    .editLegendBlock({ target: "scatterPlot", channel: "color", labelMap: [{ value: "A", label: "First" }] });
  assert.equal(q.guideConfigs.legend.color.titleStyle.fontSize, 11);
  assert.equal(q.guideConfigs.legend.color.labels.fontSize, 10);
  assert.deepEqual(q.children, children);
  assert.equal(q.compositionSpec.facet.guides.legend.blocks.color.config.inferredTitle, true);
  const removed = q.removeLegend({ channels: ["color"] });
  assert.equal(removed.compositionSpec.facet.guides.legend, false);
  assert.equal(removed.guideConfigs.legend, undefined);
  assert.equal(removed.editCompositionLayout({ gap: 5 }).guideConfigs.legend, undefined);
  assert.throws(() => removed.editLegendTitle({ fontSize: 12 }), /existing facet parent legend/u);
  assert.equal(saved(p), before);
});

test("declaration, re-declaration, layout replay and editable import converge", () => {
  const p = facet();
  const createdLater = facet(source(), false).editFacetGuides({ legend: { position: "top-left" } });
  assert.deepEqual(createdLater.graphicSpec, p.graphicSpec);
  assert.deepEqual(deserializeProgram(saved(p)).editCompositionLayout({ gap: 8 }).graphicSpec,
    p.editCompositionLayout({ gap: 8 }).graphicSpec);
  assert.deepEqual(p.editFacetGuides({ legend: false }).editFacetGuides({ legend: { position: "top-left" } }).graphicSpec, p.graphicSpec);
});

test("every native anchor and free placement uses the final parent plot", () => {
  for (const position of ["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"]) {
    const p = facet(source(), { position });
    const { plot } = resolveFacetProgramLayout(p), bounds = ownerBounds(p);
    if (position.endsWith("left") && position !== "left") assert.equal(bounds.left, plot.x + 8);
    if (position.endsWith("right") && position !== "right") assert.equal(bounds.right, plot.x + plot.width - 8);
    if (position.startsWith("top-")) assert.equal(bounds.top, plot.y + 8);
    if (position.startsWith("bottom-")) assert.equal(bounds.bottom, plot.y + plot.height - 8);
    if (["left", "right"].includes(position)) assert.equal(bounds.top, plot.y);
  }
  const free = facet(source(), { at: { x: 20, y: 30 } });
  const { plot } = resolveFacetProgramLayout(free), bounds = ownerBounds(free);
  assert.equal(bounds.left, plot.x + 20);
  assert.equal(bounds.top, plot.y + 30);
});

test("local block anchors and selected typography remain parent-owned across replay", () => {
  const p = facet().editLegendLayout({ channel: "color", position: "bottom-right" })
    .editLegendLabels({ channel: "color", fontSize: 10 });
  const q = p.editCompositionLayout({ gap: 8 }), { plot } = resolveFacetProgramLayout(q), bounds = ownerBounds(q);
  assert.equal(bounds.right, plot.x + plot.width - 8);
  assert.equal(bounds.bottom, plot.y + plot.height - 8);
  assert.equal(q.guideConfigs.legend.color.labels.fontSize, 10);
  assert.equal(q.guideConfigs.legend.color.blockOverrides['["color"]'].position, "bottom-right");
  assert.deepEqual(deserializeProgram(saved(p)).graphicSpec, p.graphicSpec);
});

test("a smaller union, unknown source owner, unsupported composition or internal input tag fails atomically", () => {
  const p = facet(), before = saved(p);
  assert.throws(() => p.editLegendTitle({ title: "Parent legend" }).editCompositionLayout({ columns: 1, spacing: "canvas", gap: 20 }), /does not fit/u);
  assert.throws(() => p.editLegend({ target: "missing", title: "No" }), /Unknown legend target/u);
  assert.throws(() => source().facet({ field: "panel", guides: { legend: { type: "authored-legend", blocks: {}, groups: {} } } }), /internal type/u);
  assert.throws(() => p.editFacetGuides({ legend: { type: "authored-legend", blocks: {}, groups: {} } }), /internal type/u);
  assert.throws(() => source().hconcat({ children: [source()] }).editLegendTitle({ fontSize: 11 }));
  assert.equal(saved(p), before);
});

test("legacy shared defaults stay exact and can be edited into a parent owner then reset", () => {
  const p = facet(source(), "shared");
  const q = p.editLegendTitle({ fontSize: 10 });
  assert.equal(q.compositionSpec.facet.guides.legend.type, "authored-legend");
  assert.equal(q.guideConfigs.legend.color.titleStyle.fontSize, 10);
  assert.deepEqual(q.editFacetGuides({ legend: "shared" }).graphicSpec, p.graphicSpec);
});

test("parent defaults ignore an incidental child legend style and preserve raw scale samples", () => {
  const p = facet(source().createLegend({ labels: { fontSize: 30 } }));
  assert.equal(p.guideConfigs.legend.color.labels.fontSize, 12);
  assert.deepEqual(p.resolvedScales, source().resolvedScales);
});

test("parent-native graphics render through PNG and PDF and have no private runtime context", async () => {
  const p = facet().editLegendBorder({ border: { strokeDash: [4, 2] } });
  assert.ok((await renderToPNGBuffer(p)).buffer.length > 100);
  assert.ok((await renderToPDFBuffer(p)).buffer.length > 100);
  assert.equal(p.context.facetLegendIntrinsic, undefined);
  assert.equal(p.context.deferGuideLayoutValidation, undefined);
  assert.deepEqual(deserializeProgram(saved(p)).graphicSpec, p.graphicSpec);
});

test("native categorical, interval, size, opacity and continuous representations share the same parent lifecycle", () => {
  const wide = () => source().editCanvas({ plot: { width: 400, height: 300 } });
  const cases = [
    ["color", p => p, { channels: ["color"] }],
    ["gradient", p => p.encodeColor({ field: "amount", fieldType: "quantitative" }), { channels: ["color"], gradient: { length: 120, opacity: 0.5 }, direction: "horizontal", titlePosition: "bottom" }],
    ["gradient", p => p.encodeColor({ field: "amount", fieldType: "quantitative" }), { channels: ["color"], representation: "symbols", count: 3 }],
    ["interval", p => p.encodeColor({ field: "amount", fieldType: "quantitative", scale: { type: "threshold", domain: [3, 6], range: ["red", "green", "blue"] } }), { channels: ["color"] }],
    ["strokeGradient", p => p.encodeStroke({ field: "amount", fieldType: "quantitative" }), { channels: ["stroke"], gradient: { length: 120 } }],
    ["strokeInterval", p => p.encodeStroke({ field: "amount", fieldType: "quantitative", scale: { type: "threshold", domain: [3, 6], range: ["red", "green", "blue"] } }), { channels: ["stroke"] }],
    ["strokeWidth", p => p.removeMark({ target: "scatterPlot" }).createRuleMark({ id: "rules" })
      .encodeY({ field: "y", fieldType: "quantitative" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeX2({ field: "amount", fieldType: "quantitative" })
      .encodeStrokeWidth({ field: "amount", scale: { domain: [0, 8] } }), { channels: ["strokeWidth"], count: 3 }],
    ["size", p => p.encodeSize({ field: "amount" }), { channels: ["size"], count: 3 }],
    ["opacity", p => p.encodeOpacity({ field: "amount" }), { channels: ["opacity"], count: 3 }]
  ];
  for (const [kind, build, options] of cases) {
    const p = facet(build(wide()), { ...options, position: "top-left", border: { strokeDash: [4, 2] } });
    const changed = p.editLegendTitle({ fontSize: 10 }).editLegendLabels({ fontSize: 9 });
    assert.ok(changed.compositionSpec.facet.guides.legend.blocks[kind], kind);
    assert.deepEqual(deserializeProgram(saved(changed)).editCompositionLayout({ gap: 8 }).graphicSpec,
      changed.editCompositionLayout({ gap: 8 }).graphicSpec, kind);
  }
});

test("partial removal preserves automatic samples and unrelated block overrides", () => {
  const p = facet(source().editCanvas({ plot: { width: 400, height: 300 } }).encodeSize({ field: "amount" }),
    { position: "top-left", channels: ["color", "size"], blockLayout: "column" })
    .editLegendBlock({ target: "scatterPlot", channel: "size", text: { color: "red" } });
  const q = p.removeLegend({ channels: ["color"] }).editCompositionLayout({ gap: 8 });
  assert.deepEqual(Object.keys(q.guideConfigs.legend), ["size"]);
  assert.equal(q.guideConfigs.legend.size.sampling.mode, "auto");
  assert.equal(q.guideConfigs.legend.size.blockOverrides['["size"]'].text.color, "red");
  assert.equal(q.removeLegend({ channels: ["size"] }).compositionSpec.facet.guides.legend, false);
});

test("theme defaults, explicit native appearance, source data and local anchors survive later reflow", () => {
  const p = facet().editLegendLabels({ color: "red" });
  const themed = p.applyTheme({ theme: "dark" });
  assert.equal(themed.guideConfigs.legend.color.labels.color, "red");
  assert.equal(themed.editCompositionLayout({ gap: 8 }).guideConfigs.legend.color.labels.color, "red");
  const automatic = facet().applyTheme({ theme: "dark" });
  assert.equal(automatic.guideConfigs.legend.color.labels.color, "#e2e8f0");
  assert.equal(automatic.editCompositionLayout({ gap: 8 }).guideConfigs.legend.color.labels.color, "#e2e8f0");
  const revised = p.reviseData({ source: "rows", id: "newRows", values: rows.map((row, i) => ({ ...row, group: i % 3 ? row.group : "C" })) });
  assert.ok(revised.guideConfigs.legend.color.domain.includes("C"));
  assert.equal(revised.guideConfigs.legend.color.labels.color, "red");
});


test("shared promotion with local positions places those blocks against the parent union", () => {
  const native = source().editCanvas({ plot: { width: 400, height: 300 } })
    .createLegend().editLegendLayout({ channel: "color", position: "bottom-right" });
  const p = facet(native, "shared"), { plot } = resolveFacetProgramLayout(p), bounds = ownerBounds(p);
  assert.equal(p.compositionSpec.facet.guides.legend, "shared");
  assert.equal(bounds.right, plot.x + plot.width - 8);
  assert.equal(bounds.bottom, plot.y + plot.height - 8);
  assert.deepEqual(deserializeProgram(saved(p)).editCompositionLayout({ gap: 8 }).graphicSpec,
    p.editCompositionLayout({ gap: 8 }).graphicSpec);
});

test("combined size-shape owners use the same native mapping and parent block lifecycle", () => {
  const native = source().editCanvas({ plot: { width: 400, height: 300 } })
    .encodeShape({ field: "group" }).encodeSize({ field: "group", fieldType: "nominal", scale: { type: "ordinal", range: [25, 100] } });
  const p = facet(native, { position: "top-left", channels: ["shape", "size"], combine: "size-shape" })
    .editLegendLabels({ channel: "size", color: "red" });
  assert.deepEqual(p.guideConfigs.legend.series.sizeAreas, [25, 100]);
  assert.equal(Object.keys(p.guideConfigs.legend).length, 1);
  assert.deepEqual(deserializeProgram(saved(p)).graphicSpec, p.graphicSpec);
  assert.equal(p.removeLegend({ channels: ["shape"] }).compositionSpec.facet.guides.legend, false);
});

test("stored parent intent rejects malformed tags, orphan blocks, unknown config keys and materialization divergence", () => {
  const p = facet(), envelope = JSON.parse(saved(p));
  for (const change of [
    state => { state.compositionSpec.facet.guides.legend.type = "wrong"; },
    state => { state.compositionSpec.facet.guides.legend.extra = true; },
    state => { state.compositionSpec.facet.guides.legend.blocks = {}; },
    state => { state.compositionSpec.facet.guides.legend.blocks.unknown = state.compositionSpec.facet.guides.legend.blocks.color; },
    state => { state.compositionSpec.facet.guides.legend.blocks.color.config.extra = true; },
    state => { state.compositionSpec.facet.guides.legend.blocks.color.config.inferredOffset = "yes"; },
    state => { state.compositionSpec.facet.guides.legend.blocks.color.config.title = "different"; },
    state => { state.compositionSpec.facet.guides.legend.groups = { missing: {} }; },
    state => { delete state.materializationConfigs.guides.legend.color; }
  ]) {
    const state = structuredClone(decodeValue(envelope.payload)); change(state);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) })));
  }
});

test("facet grids and repeated fields retain the same parent owner during source and header edits", () => {
  const native = source().editCanvas({ plot: { width: 240, height: 220 } });
  const programs = [
    native.facetGrid({ rows: { field: "group" }, columns: { field: "panel" }, combinations: "observed",
      guides: { legend: { position: "top-left" } } }),
    native.repeatCharts({ channel: "x", fields: ["x", "amount"], guides: { legend: { position: "top-left" } } })
  ];
  for (const p of programs) {
    const q = p.editLegendTitle({ title: "Groups" }).editFacetHeaders({ fontSize: 10 })
      .editFacetSource({ program: native.encodeColor({ field: "panel" }) });
    assert.equal(q.guideConfigs.legend.color.title, "Groups");
    assert.equal(q.guideConfigs.legend.color.inferredTitle, false);
    assert.deepEqual(deserializeProgram(saved(q)).editCompositionLayout({ gap: 25 }).graphicSpec,
      q.editCompositionLayout({ gap: 25 }).graphicSpec);
  }
});

test("automatic titles follow source fields, while independent appearance scales and removed targets reject", () => {
  const p = facet(), before = saved(p);
  const changed = p.editFacetSource({ program: source().encodeColor({ field: "panel" }) });
  assert.equal(changed.guideConfigs.legend.color.title, "panel");
  assert.equal(changed.guideConfigs.legend.color.inferredTitle, true);
  assert.throws(() => p.editFacetScales({ color: "independent" }), /shared encoded scales/u);
  const other = chart().createCanvas({ width: 300, height: 300, margin: 60 })
    .createData({ id: "rows", values: rows }).createScatterPlot({ id: "other", x: "x", y: "y", color: "group", guides: false });
  assert.throws(() => p.editFacetSource({ program: other }));
  assert.equal(saved(p), before);
});

test("measured text reflows the parent without resizing a child and rejects a too-wide label atomically", () => {
  const profile = width => ({ schemaVersion: 1, id: "measured", measurements: [
    { text: "B", fontFamily: "sans-serif", fontSize: 12, fontWeight: 400, width }
  ] });
  const p = facet(), before = saved(p);
  const measured = p.applyTextMetrics({ profile: profile(120) });
  assert.equal(resolveFacetProgramLayout(measured).plot.width, 246);
  assert.ok(ownerBounds(measured).right - ownerBounds(measured).left > ownerBounds(p).right - ownerBounds(p).left);
  assert.deepEqual(measured.removeTextMetrics().graphicSpec, p.graphicSpec);
  assert.throws(() => p.applyTextMetrics({ profile: profile(400) }), /fit/u);
  assert.equal(saved(p), before);
});


test("child Canvas revisions keep parent intent and update the exact plot union", () => {
  const p = facet(), before = saved(p);
  const q = p.editFacetSource({ program: source().editCanvas({ plot: { width: 80, height: 275 } }) });
  assert.equal(resolveFacetProgramLayout(q).plot.width, 326);
  assert.equal(ownerBounds(q).left, resolveFacetProgramLayout(q).plot.x + 8);
  assert.equal(saved(p), before);
});
