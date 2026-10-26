import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { describeLegendBlock } from "../../../../src/grammar/legendBlocks.js";

const cuts = [5, 10, 15, 20, 25];
const colors = ["#30123b", "#466be3", "#28bbec", "#a4fc3b", "#faba39", "#7a0403"];
const areas = [50, 100, 150, 200, 250, 300];
const shapes = ["circle", "square", "triangle-up", "cross", "diamond"];
const rows = Array.from({ length: 30 }, (_, v) => ({ x: v, y: 0, v, other: v, panel: v % 2, band: v < 15 ? "low" : "high" }));
const options = { combine: "color-size-shape", values: [0, 5, 10, 15, 20, 25], itemGap: 30 };
function source(channel = "stroke") {
  let p = chart().createCanvas({ width: 1000, height: 800, margin: 250 })
    .createData({ id: "data", values: rows })
    .createPointMark({ id: "points", fill: "none", stroke: "black", strokeWidth: 2, opacity: 0.7 })
    .encodeX({ field: "x" }).encodeY({ field: "y" });
  p = p[channel === "color" ? "encodeColor" : "encodeStroke"]({ field: "v", fieldType: "quantitative",
    scale: { type: "threshold", domain: cuts, range: colors } });
  return p.encodeSize({ field: "v", scale: { type: "threshold", domain: cuts, range: areas } })
    .encodeShape({ field: "v", scale: { domain: cuts, range: shapes, unknown: "circle" } });
}
function paintedArea(item) {
  const p = item.properties;
  if (item.type === "circle") return Math.PI * p.radius ** 2;
  if (item.type === "rect") return p.width * p.height;
  const vertices = p.commands.filter(c => c.op === "M" || c.op === "L");
  return Math.abs(vertices.reduce((sum, a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    return sum + a.x * b.y - b.x * a.y;
  }, 0)) / 2;
}
const symbols = p => p.graphicSpec.objects.colorSizeLegendSymbols.items;
const labels = p => p.graphicSpec.objects.colorSizeLegendLabels.items.map(i => i.properties.text);

test("three-channel interval samples preserve ordinal shape, source points and exact scale ownership", () => {
  for (const channel of ["color", "stroke"]) {
    const seed = source(channel), snapshot = serializeProgram(seed);
    const p = seed.createLegend({ ...options, channels: [channel, "size", "shape"] });
    assert.deepEqual(labels(p), ["< 5", "5–10", "10–15", "15–20", "20–25", "≥ 25"]);
    assert.deepEqual(symbols(p).map(i => i.type), ["circle", "circle", "rect", "path", "path", "path"]);
    symbols(p).forEach((item, i) => {
      assert.equal(item.properties[channel === "color" ? "fill" : "stroke"], colors[i]);
      assert.equal(item.properties.opacity, 0.7);
      assert.equal(item.properties.strokeWidth, 2);
      assert.ok(Math.abs(paintedArea(item) - areas[i]) < 1e-7);
    });
    assert.deepEqual(p.graphicSpec.objects.points, seed.graphicSpec.objects.points);
    assert.equal(p.graphicSpec.objects.points.items.length, 30);
    p.graphicSpec.objects.points.items.forEach((item, v) => {
      const expected = v === 10 ? "rect" : [15, 20, 25].includes(v) ? "path" : "circle";
      assert.equal(item.type, expected, `value ${v}`);
      assert.ok(Math.abs(paintedArea(item) - areas[Math.floor(v / 5)]) < 1e-7);
    });
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.deepEqual(p.semanticSpec.guides.legend.colorSize, {
      colorScale: channel, sizeScale: "size", shapeScale: "shape", colorChannel: channel, title: "v"
    });
    const block = describeLegendBlock(p, "colorSize", p.guideConfigs.legend.colorSize);
    assert.deepEqual([...block.channels].sort(), [channel, "size", "shape"].sort());
    assert.deepEqual(block.scaleIds, [channel, "size", "shape"]);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.deepEqual(p.rematerializeLegend().graphicSpec, p.graphicSpec);
    assert.equal(serializeProgram(seed), snapshot);
  }
});

test("three-channel sampling rejects missing representatives, incompatible mappings and mapped overrides atomically", () => {
  const seed = source(), before = serializeProgram(seed);
  for (const patch of [{ values: undefined }, { values: [0, 10, 15, 20, 25] },
    { values: [5, 10, 15, 20, 25, 30] }, { values: [0, 5, 5, 15, 20, 25] }, { count: 6 },
    { channels: ["color", "size"] }, { symbol: { shape: "circle" } }, { symbol: { size: 20 } },
    { symbol: { stroke: "black" } }]) {
    assert.throws(() => seed.createLegend({ ...options, ...patch }), undefined, JSON.stringify(patch));
  }
  assert.throws(() => seed.encodeShape({ field: "other" }).createLegend(options), /same.*field|grain/);
  assert.throws(() => seed.editSizeScale({ domain: [4, 10, 15, 20, 25] }).createLegend(options), /threshold|boundar/);
  assert.equal(serializeProgram(seed), before);
});

test("each channel alias edits one shared block and changing a bound scale rematerializes it", () => {
  const p = source().createLegend(options), before = serializeProgram(p);
  for (const channel of ["stroke", "size", "shape"]) {
    const edited = p.editLegendBlock({ target: "points", channel, text: { fontSize: 15 },
      labelMap: [{ value: 0, label: "low" }], symbol: { opacity: 0.4 } });
    assert.equal(labels(edited)[0], "low");
    assert.equal(symbols(edited)[0].properties.opacity, 0.4);
    assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
    assert.equal(edited.removeLegend({ channels: [channel] }).guideConfigs.legend?.colorSize, undefined);
    assert.throws(() => p.editLegendBlock({ target: "points", channel, symbol: { stroke: "red" } }), /mapped|mapping/);
  }
  const recolored = p.editStrokeScale({ target: "points", range: [...colors].reverse() });
  assert.deepEqual(symbols(recolored).map(i => i.properties.stroke), [...colors].reverse());
  const resized = p.editSizeScale({ range: areas.map(v => v * 2) }).editCanvas({ width: 1100 });
  symbols(resized).forEach((item, i) => assert.ok(Math.abs(paintedArea(item) - 2 * areas[i]) < 1e-7));
  assert.throws(() => p.editSizeScale({ domain: [4, 10, 15, 20, 25] }), /threshold|boundar/);
  assert.equal(serializeProgram(p), before);
});

test("explicit combination edits preserve the block and splitting requires an explicit request", () => {
  const p = source().editCanvas({ height: 1400 }).createLegend(options);
  const edited = p.editLegend({ channels: ["stroke", "shape", "size"], title: "Shared" });
  assert.equal(edited.guideConfigs.legend.colorSize.combine, "color-size-shape");
  assert.equal(edited.guideConfigs.legend.colorSize.title, "Shared");
  assert.equal(p.editLegend({ symbol: { opacity: 0.3 } }).guideConfigs.legend.colorSize.symbol.opacity, 0.3);
  assert.throws(() => p.editLegend({ channels: ["stroke", "size"] }), /separate/);
  const split = p.editLegend({ combine: "separate" });
  assert.equal(split.guideConfigs.legend.colorSize, undefined);
  assert.deepEqual(Object.keys(split.guideConfigs.legend).sort(), ["series", "size", "strokeInterval"]);
  const merged = split.editLegend(options);
  assert.deepEqual(merged.graphicSpec, p.graphicSpec);
  for (const channel of ["stroke", "size", "shape"]) {
    assert.equal(p.removeEncoding({ target: "points", channel }).guideConfigs.legend?.colorSize, undefined);
  }
});

test("clipped shared three-channel legends survive facet, grid and repeat restoration and reflow", () => {
  const seed = source();
  const legend = { ...options, target: "points", channels: ["stroke", "size", "shape"],
    position: "top-left", clipHeight: 8 };
  const unit = seed.createLegend(legend);
  assert.deepEqual(unit.editLegend({ clipHeight: "auto" }).graphicSpec,
    seed.createLegend({ ...legend, clipHeight: undefined }).graphicSpec);
  for (const host of [p => p.facet({ field: "panel", columns: 2, guides: { legend } }),
    p => p.facetGrid({ rows: { field: "panel" }, columns: { field: "band" }, guides: { legend } }),
    p => p.repeatCharts({ target: "points", channel: "x", fields: ["x", "other"], guides: { legend } })]) {
    const p = host(seed), before = serializeProgram(p);
    assert.equal(p.semanticSpec.guides.legend.colorSize.shapeScale, "shape");
    const edited = p.editLegendLayout({ channel: "shape", position: "bottom-left" })
      .editLegendSymbols({ channel: "stroke", symbol: { opacity: 0.3 } }).editCompositionLayout({ gap: 35 });
    assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
    assert.equal(edited.removeLegend({ channels: ["shape"] }).semanticSpec.guides.legend?.colorSize, undefined);
    assert.throws(() => p.editFacetScales({ shape: "independent" }), /shared encoded scales/);
    assert.equal(serializeProgram(p), before);
  }
});

test("inherited fixed paint stays live and explicit overrides reset without changing mapped area", () => {
  const seed = source(), p = seed.createLegend(options);
  const inherited = p.editPointMark({ target: "points", opacity: 0.2, strokeWidth: 3 });
  assert.equal(symbols(inherited)[0].properties.opacity, 0.2);
  assert.equal(symbols(inherited)[0].properties.strokeWidth, 3);
  const changed = inherited.editLegend({ symbol: { opacity: 0.9, fill: "white" } });
  assert.equal(symbols(changed)[0].properties.opacity, 0.9);
  assert.equal(symbols(changed)[0].properties.fill, "white");
  assert.deepEqual(changed.editLegend({ symbol: "auto" }).graphicSpec, inherited.graphicSpec);
  for (const patch of [{ colorChannel: "color" }, { shapeScale: "size" },
    { sampling: { mode: "auto", count: 6 } }, { symbol: { type: "point", stroke: "red" } }]) {
    const configs = structuredClone(p.materializationConfigs);
    Object.assign(configs.guides.legend.colorSize, patch);
    assert.throws(() => serializeProgram(p._clone({ materializationConfigs: configs })));
  }
});

test("representative edits, shape-scale edits and data revisions keep exact ordinal evaluation", () => {
  const p = source().createLegend(options), before = serializeProgram(p);
  const alternate = p.editLegendBlock({ target: "points", channel: "shape", values: [1, 6, 11, 16, 21, 26] });
  assert.ok(symbols(alternate).every(item => item.type === "circle"));
  assert.deepEqual(labels(alternate), labels(p));
  assert.deepEqual(alternate.editLegend({ values: options.values }).graphicSpec, p.graphicSpec);
  assert.throws(() => p.editLegendBlock({ target: "points", channel: "shape", values: "auto" }), /explicit/);
  const changed = p.editShapeScale({ range: ["diamond", "circle", "square", "triangle-up", "cross"] });
  assert.deepEqual(symbols(changed).map(i => i.type), ["circle", "path", "circle", "rect", "path", "path"]);
  const revised = p.reviseData({ source: "data", id: "revised", values: rows.map(row => ({ ...row, v: row.v === 10 ? 11 : row.v })) });
  assert.deepEqual(symbols(revised), symbols(p));
  assert.equal(revised.graphicSpec.objects.points.items[10].type, "circle");
  assert.equal(serializeProgram(p), before);
});

test("quantize and quantile use their actual shared boundaries and preserve fallback shapes", () => {
  for (const type of ["quantize", "quantile"]) {
    const seed = source("color").editColorScale({ type, domain: type === "quantize" ? [0, 30] : "auto", range: colors })
      .editSizeScale({ type, domain: type === "quantize" ? [0, 30] : "auto", range: areas });
    const thresholds = seed.resolvedScales.color.thresholds;
    const p = seed.createLegend({ ...options, values: [0, ...thresholds] });
    assert.equal(symbols(p).length, 6);
    symbols(p).forEach((item, i) => assert.ok(Math.abs(paintedArea(item) - areas[i]) < 1e-7));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});

test("ambiguous hue ownership and invalid point paint require explicit compatible choices", () => {
  const seed = source().encodeColor({ target: "points", field: "v", fieldType: "quantitative",
    scale: { type: "threshold", domain: cuts, range: colors } });
  assert.throws(() => seed.createLegend(options), /select channels explicitly/);
  const p = seed.createLegend({ ...options, channels: ["stroke", "shape", "size"] });
  assert.equal(p.guideConfigs.legend.colorSize.colorChannel, "stroke");
  for (const symbol of [{ type: "line" }, { opacity: 2 }, { strokeWidth: -1 }, { fill: "" }]) {
    assert.throws(() => p.editLegend({ symbol }));
  }
  assert.throws(() => source("color").createLegend({ ...options, symbol: { fill: "red" } }), /mapped/);
  const zero = source().editSizeScale({ range: [0, ...areas.slice(1)] }).createLegend(options);
  assert.equal(paintedArea(symbols(zero)[0]), 0);
});
