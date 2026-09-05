import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";

const rows = [-2, 0, 4, 8].map((value, x) => ({ value, x, category: String(x), row: "r" }));
const colors = ["blue", "red"];
function definition(type, midpoint = false) {
  return { id: "colors", type,
    domain: type === "threshold" ? [3] : type === "quantile" ? [-2, 0, 4, 8] : [-2, 8],
    range: type === "sequential" ? ["blue", "white", "red"] : colors,
    ...(midpoint ? { midpoint: 0 } : {}) };
}
function make(kind, { type = "sequential", legend = true } = {}) {
  let p = chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ id: "data", values: rows });
  if (kind === "point") p = p.createPointMark({ id: "m" }).encodeX({ field: "x" }).encodeY({ field: "value" });
  if (kind === "bar") p = p.createBarMark({ id: "m" }).encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "value", aggregate: "sum" });
  if (kind === "rect") p = p.createRectMark({ id: "m" }).encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "row", fieldType: "nominal" });
  p = p.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition(type, type === "sequential") });
  return legend ? p.createLegend({ target: "m", channels: ["color"] }) : p;
}
const fills = (p, id = "m") => p.graphicSpec.objects[id].items.map(x => x.properties.fill);
const scale = p => p.semanticSpec.scales.find(x => x.id === "colors");
const snapshot = p => JSON.stringify({ semantic: p.semanticSpec, graphic: p.graphicSpec, configs: p.materializationConfigs, resolved: p.resolvedScales, context: p.context, trace: p.actionTree });

for (const kind of ["point", "bar", "rect"]) {
  for (const type of ["quantize", "quantile", "threshold"]) {
    test(`transitions ${kind} color through ${type} with and without a legend`, () => {
      for (const legend of [false, true]) {
        const p = make(kind, { legend }); const before = snapshot(p);
        const q = p.editScale(definition(type));
        const direct = make(kind, { type, legend });
        assert.deepEqual(fills(q), fills(direct));
        assert.deepEqual(q.resolvedScales.colors, direct.resolvedScales.colors);
        assert.equal(Object.hasOwn(scale(q), "midpoint"), false);
        assert.equal(Object.hasOwn(scale(q), "interpolate"), false);
        if (legend) {
          assert.equal(q.guideConfigs.legend.gradient, undefined);
          assert.equal(q.graphicSpec.objects.colorGradientStrips, undefined);
          assert.equal(q.guideConfigs.legend.interval.target, "m");
          assert.equal(q.graphicSpec.objects.colorLegendSymbols.items.length, 2);
          assert.deepEqual(q.guideConfigs.legend.interval.labels, p.guideConfigs.legend.gradient.labels);
        }
        const back = q.editScale(definition("sequential"));
        assert.equal(Object.hasOwn(scale(back), "midpoint"), false);
        assert.deepEqual(fills(back), fills(make(kind, { legend }).editScale({ id: "colors", midpoint: "auto" })));
        if (legend) {
          assert.equal(back.guideConfigs.legend.interval, undefined);
          assert.equal(back.guideConfigs.legend.gradient.count, 5);
          assert.equal(back.graphicSpec.objects.colorLegendSymbols, undefined);
        }
        const reassigned = p.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition(type) });
        assert.deepEqual(reassigned.semanticSpec, q.semanticSpec);
        assert.deepEqual(reassigned.graphicSpec, q.graphicSpec);
        assert.equal(snapshot(p), before);
      }
    });
  }
}
test("preserves common legend style, explicit hidden title, and later focused editors", () => {
  const p = make("point").editLegend({ target: "m", title: "Measured value", labels: { color: "navy", fontSize: 11 }, titleStyle: { fontSize: 14 }, border: { color: "gray", padding: 5 }, offset: 24, align: "center" }).editLegend({ target: "m", title: false });
  const q = p.editScale(definition("quantize"));
  for (const key of ["title", "titleVisible", "inferredTitle", "labels", "titleStyle", "border", "offset", "align"]) {
    assert.deepEqual(q.guideConfigs.legend.interval[key], p.guideConfigs.legend.gradient[key], key);
  }
  assert.equal(q.graphicSpec.objects.colorLegendTitle, undefined);
  const edited = q.editLegendLabels({ target: "m", color: "green" }).editLegendTitle({ target: "m", title: "auto" });
  assert.equal(edited.guideConfigs.legend.interval.title, "value");
  assert.equal(edited.guideConfigs.legend.interval.titleVisible, true);
  const back = edited.editScale(definition("sequential"));
  assert.equal(back.guideConfigs.legend.gradient.labels.color, "green");
  assert.equal(back.guideConfigs.legend.gradient.inferredTitle, true);
});
test("rejects custom family styles and unsupported placement without losing any state", () => {
  const sources = [
    make("point").editLegend({ count: 3 }),
    make("point").editLegend({ gradient: { length: 130 } }),
    make("point").editLegend({ align: "left" }),
    make("point", { type: "quantize" }).editLegend({ position: "top", columns: 2 }),
    make("point", { type: "quantize" }).editLegend({ position: "top", direction: "vertical" }),
    make("point", { type: "quantize" }).editLegend({ position: "top", titlePosition: "left" }),
    make("point", { type: "quantize" }).editLegend({ symbol: { width: 18 } }),
    make("point", { type: "quantize" }).editLegend({ itemGap: 32 })
  ];
  for (const p of sources) {
    const target = scale(p).type === "sequential" ? "quantize" : "sequential";
    const before = snapshot(p);
    assert.throws(() => p.editScale(definition(target)), /legend transition/);
    assert.throws(() => p.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition(target) }), /legend transition/);
    assert.equal(snapshot(p), before);
  }
});
test("requires explicit domains when extent, sample, or threshold meaning changes", () => {
  const p = make("point", { legend: false });
  assert.throws(() => p.editScale({ id: "colors", type: "quantile" }), /explicit domain/);
  assert.throws(() => p.encodeColor({ field: "value", fieldType: "quantitative", scale: { type: "quantile" } }), /explicit domain/);
  const thresholds = p.editScale(definition("threshold"));
  assert.throws(() => thresholds.editScale({ id: "colors", type: "sequential" }), /explicit domain/);
  assert.equal(p.editScale({ id: "colors", type: "quantize", range: colors }).resolvedScales.colors.thresholds[0], 3);
});
test("preflights shared quantitative and temporal consumers before changing a scale", () => {
  const p = make("point", { legend: false }).editScale({ id: "colors", midpoint: "auto" })
    .createPointMark({ id: "temporal" }).encodeColor({ target: "temporal", field: "value", fieldType: "temporal", temporalUnit: "timestamp", scale: { id: "colors" } });
  const before = snapshot(p);
  assert.throws(() => p.editScale(definition("quantize")), /incompatible/);
  assert.throws(() => p.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition("threshold") }), /incompatible/);
  assert.equal(snapshot(p), before);
});
test("rematerializes every shared mark, guide and Canvas edit after transition", () => {
  const p = make("point").createPointMark({ id: "other" })
    .encodeColor({ target: "other", field: "value", fieldType: "quantitative", scale: { id: "colors" } });
  const q = p.editScale(definition("quantize"));
  assert.deepEqual(fills(q, "m"), fills(q, "other"));
  const resized = q.editCanvas({ width: 1100 }).editScale({ id: "colors", domain: [-2, 18] });
  assert.deepEqual(fills(resized), ["blue", "blue", "blue", "red"]);
  assert.deepEqual(fills(resized), fills(resized, "other"));
  assert.equal(resized.guideConfigs.legend.interval.scale, "colors");
});
test("a transition that cannot fit the new legend rolls back completely", () => {
  const p = make("point"); const before = snapshot(p);
  assert.throws(() => p.editScale({ id: "colors", type: "threshold", domain: Array.from({ length: 30 }, (_, i) => i), palette: "viridis" }), /Canvas|inside|layout/);
  assert.equal(snapshot(p), before);
});

test("Basic creates typed interval legends and reports unsupported structural transitions clearly", async () => {
  const { chart: basicChart } = await import("../../../../src/basic.js");
  const p = basicChart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ values: rows })
    .createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color: { field: "value", fieldType: "quantitative", scale: definition("quantize") } });
  assert.equal(p.guideConfigs.legend.interval.target, "m");
  assert.throws(() => p.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition("sequential") }), /Full ChartProgram/);
  assert.equal(p.editScale, undefined);
});
test("quantile transitions use final Bar aggregates rather than the source sample", () => {
  const p = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 1 }, { category: "B", value: 4 }, { category: "B", value: 4 }] })
    .createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color: { field: "value", fieldType: "quantitative", scale: { id: "colors" } } });
  const q = p.editScale({ id: "colors", type: "quantile", domain: "auto", range: colors });
  assert.deepEqual(q.resolvedScales.colors.thresholds, [5]);
  assert.deepEqual(q.resolvedScales.colors.domain, [2, 8]);
  assert.deepEqual(fills(q), ["blue", "red"]);
});
test("point unknown fallback is explicit across type changes and remains excluded from domains", () => {
  const p = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ values: [{ x: 0, value: 1 }, { x: 1, value: null }, { x: 2, value: 9 }] })
    .createScatterPlot({ id: "m", x: "x", y: "x", color: { field: "value", fieldType: "quantitative", scale: { id: "colors", unknown: "gray" } }, guides: false });
  const before = snapshot(p);
  assert.throws(() => p.editScale({ id: "colors", type: "quantize", range: colors }), /finite|quantitative/);
  const q = p.editScale({ id: "colors", type: "quantize", range: colors, unknown: "gray" });
  assert.deepEqual(q.resolvedScales.colors.domain, [1, 9]);
  assert.deepEqual(fills(q), ["blue", "gray", "red"]);
  assert.equal(snapshot(p), before);
});
test("highlighted item identity and baseline colors survive scale and legend transitions", () => {
  const p = make("point").selectMarks({ id: "selected", target: "m", field: "value", op: "max" })
    .highlightMarks({ selection: "selected", color: "green", dimOthers: false, bringToFront: false });
  const q = p.editScale(definition("quantize"));
  assert.deepEqual(fills(q), ["blue", "blue", "red", "green"]);
  assert.deepEqual(fills(q.editScale(definition("sequential"))), ["#0000ff", "#6666ff", "#ffcccc", "green"]);
});

test("color legend transitions preserve compatible edges, alignment and title state through both public paths", () => {
  let cases = 0;
  for (const kind of ["point", "bar", "rect"]) for (const type of ["quantize", "quantile", "threshold"])
    for (const position of ["left", "right", "top", "bottom"])
      for (const align of ["left", "right"].includes(position) ? ["center"] : ["left", "center", "right"])
        for (const hidden of [false, true]) {
          const common = { target: "m", channels: ["color"], position, align, offset: 55,
            title: "Value", border: { padding: 5, color: "gray" },
            labels: { offset: 12, color: "navy", fontSize: 11 }, titleStyle: { fontSize: 14 } };
          const source = make(kind, { legend: false }).editCanvas({ width: 1400, height: 1200, margin: 350 })
            .createTitle({ text: "Chart" });
          const create = p => {
            const next = p.createLegend(common);
            return hidden ? next.editLegend({ title: false }) : next;
          };
          const original = create(source), before = snapshot(original);
          const q = original.editScale(definition(type));
          assert.deepEqual(q.graphicSpec, create(source.editScale(definition(type))).graphicSpec);
          const config = q.guideConfigs.legend.interval;
          for (const key of ["target", "position", "align", "offset", "title", "titleVisible", "inferredTitle", "labels", "titleStyle", "border"]) {
            assert.deepEqual(config[key], original.guideConfigs.legend.gradient[key], key);
          }
          const reassigned = original.encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: definition(type) });
          assert.deepEqual(reassigned.graphicSpec, q.graphicSpec);
          assert.deepEqual(reassigned.semanticSpec, q.semanticSpec);
          const back = q.editScale(definition("sequential"));
          assert.deepEqual(back.graphicSpec, create(source.editScale({ ...definition("sequential"), midpoint: "auto" })).graphicSpec);
          assert.deepEqual(q.editCanvas({ width: 1440 }).graphicSpec,
            original.editCanvas({ width: 1440 }).editScale(definition(type)).graphicSpec);
          assert.equal(snapshot(original), before);
          cases += 1;
        }
  assert.equal(cases, 144);
});

test("side single-column interval layout is compatible while horizontal grid settings remain explicit", () => {
  for (const position of ["left", "right"]) {
    const p = make("point", { type: "quantize", legend: false }).editCanvas({ margin: 250 })
      .createLegend({ position, columns: 1 });
    const q = p.editScale(definition("sequential"));
    assert.equal(q.guideConfigs.legend.gradient.position, position);
    assert.equal(q.guideConfigs.legend.gradient.inferredTitle, true);
    assert.deepEqual(q.editLegend({ title: false }).editLegend({ title: "auto" }).graphicSpec, q.graphicSpec);
  }
});
