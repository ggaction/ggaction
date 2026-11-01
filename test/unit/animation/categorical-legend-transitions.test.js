import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { normalizeCategoricalLegendAnimationState, prepareCategoricalLegendInterpolation, sampleCategoricalLegendInterpolation } from "../../../src/materialization/animation/categoricalLegendState.js";
import { validateAnimationGuides } from "../../../src/animation/guideTracks.js";

const base = (legend = {}, channels = ["color"]) => {
  let p = chart().createCanvas({ width: 900, height: 650, margin: 200 })
    .createData({ id: "rows", values: [{ id: 1, x: 1, y: 1, g: "A" }, { id: 2, x: 2, y: 2, g: "B" }] })
    .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  for (const channel of channels) p = p[{ color: "encodeColor", stroke: "encodeStroke", shape: "encodeShape" }[channel]]({ field: "g" });
  return p.createLegend({ channels, offset: 20, title: "Group", ...legend });
};
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const entries = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [{ decision, node: frame.scene.nodes[index] }] : []);
const endpoint = p => { const e = projectAnimationEndpoint(p); return { ...e, guides: projectGuideAnimationState(p, e) }; };
const equalOffline = p => { const restored = deserializeAnimation(serializeAnimation(p)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(p, time), sampleTransition(restored, time)); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("categorical native symbols interpolate declared dimensions with stable value and recipe roles", () => {
  const from = base({ title: false, symbol: { layers: [{ type: "line", length: 20 }, { type: "point", size: 4 }, { type: "swatch", width: 10, height: 8 }] } });
  const to = from.editCanvas({ width: 1000 }).editLegend({ symbol: { layers: [{ type: "line", length: 40 }, { type: "point", size: 8 }, { type: "swatch", width: 20, height: 16 }] } });
  const p = plan(from, to), middle = sampleTransition(p, 50), items = entries(middle);
  assert.equal(items.length, 8); assert.ok(items.every(x => x.decision.kernel === "guide-geometry"));
  assert.equal(new Set(items.map(x => x.decision.guideKey)).size, 8);
  const line = items.find(x => x.node.type === "line").node.properties;
  near(line.x2 - line.x1, 30);
  near(items.find(x => x.node.type === "circle").node.properties.radius, 6);
  const swatch = items.find(x => x.node.type === "rect").node.properties;
  near(swatch.width, 15); near(swatch.height, 12);
  assert.strictEqual(sampleTransition(p, 0).graphicSpec, from.graphicSpec);
  const rebased = plan(middle, to); assert.strictEqual(sampleTransition(rebased, 0), middle);
  assert.ok(entries(sampleTransition(rebased, 50)).every(x => x.decision.kernel === "guide-geometry"));
  equalOffline(p); equalOffline(rebased);
});

test("categorical forward proof retains edge layout, hard breaks and exact native text alignment", () => {
  for (const position of ["left", "right", "top", "bottom"]) for (const titlePosition of ["left", "right"].includes(position) ? ["top"] : ["top", "left"]) {
    const p = base({ position, titlePosition, title: "A\nB", labels: { align: "right" }, ...(titlePosition === "top" ? { titleStyle: { align: "left" } } : {}), rowPadding: 4, titlePadding: 6 });
    const e = endpoint(p); assert.equal(e.guides.filter(x => x?.kind === "categorical-legend").length, 5);
    assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
    const q = p.editCanvas({ width: 980, height: 700 }).editLegend({ offset: 25, itemGap: 25, rowPadding: 8, titlePadding: 10 });
    assert.ok(entries(sampleTransition(plan(p, q), 50)).every(x => x.decision.kernel === "guide-geometry"), `${position}/${titlePosition}`);
  }
});

test("categorical shape and stroke channels reuse native polygon geometry and appearance interpolation", () => {
  for (const channels of [["shape"], ["color", "shape"], ["stroke"]]) {
    const p = base({ symbol: { layers: [{ type: "point", size: 5 }] } }, channels);
    const q = p.editCanvas({ width: 1000 });
    const frame = sampleTransition(plan(p, q), 50);
    assert.ok(entries(frame).every(x => x.decision.kernel === "guide-geometry")); equalOffline(plan(p, q));
  }
  const from = base(), to = from.editScale({ id: "color", range: ["red", "blue"] }).editCanvas({ width: 1000 });
  const middle = sampleTransition(plan(from, to), 50);
  assert.ok(entries(middle).every(x => x.decision.kernel === "guide-geometry"));
  assert.notDeepEqual(entries(middle).filter(x => x.node.type === "rect").map(x => x.node.properties.fill), ["red", "blue"]);
  const noStroke = base({ symbol: { layers: [{ type: "line" }] } }).editLegendBlock({ target: "points", channel: "color", symbol: { stroke: "none" } });
  assert.ok(entries(sampleTransition(plan(noStroke, noStroke.editCanvas({ width: 1000 })), 50)).every(x => x.decision.kernel === "guide-geometry"));
  const fill = base({ symbol: { layers: [{ type: "swatch" }] } }, ["shape"]).editLegendBlock({ target: "points", channel: "shape", symbol: { fill: "red" } });
  assert.ok(entries(sampleTransition(plan(fill, fill.editCanvas({ width: 1000 })), 50)).every(x => x.decision.kernel === "guide-geometry"));
  const polygon = { polygon: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 1 }] };
  const shaped = base({ symbol: { layers: [{ type: "point", size: 5 }] } }, ["shape"]).editScale({ id: "shape", range: [polygon, "circle"] });
  const shapedPlan = plan(shaped, shaped.editCanvas({ width: 1000 }));
  assert.ok(entries(sampleTransition(shapedPlan, 50)).every(x => x.decision.kernel === "guide-geometry")); equalOffline(shapedPlan);
});

test("native Horizon default display labels keep original band keys and explicit label override precedence", () => {
  const from = chart().createCanvas({ width: 900, height: 650, margin: 200 })
    .createData({ values: [{ time: 0, value: -4 }, { time: 1, value: 4 }, { time: 2, value: -2 }] })
    .createHorizonPlot({ id: "h", x: "time", y: "value", bands: 2, guides: false })
    .createLegend({ target: "h", offset: 20 })
    .editLegendBlock({ target: "h", channel: "color", labelMap: [{ value: "positive:1", label: "High" }] });
  const transition = plan(from, from.editCanvas({ width: 1000 })), frame = sampleTransition(transition, 50);
  const items = entries(frame); assert.ok(items.every(x => x.decision.kernel === "guide-geometry"));
  assert.equal(items.filter(x => x.node.type === "text" && x.node.properties.text === "High").length, 1);
  equalOffline(transition);
});

test("categorical raw values remain distinct through duplicate display labels, hiding and nested scope", () => {
  const p = base().editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: "A", label: "same\nlabel" }, { value: "B", label: "same\nlabel" }] });
  const panels = p => hconcat({ id: "panels", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const transition = plan(panels(p), panels(p.editCanvas({ width: 1000 }))), middle = sampleTransition(transition, 50);
  const items = entries(middle); assert.equal(items.length, 10); assert.equal(new Set(items.map(x => x.decision.guideKey)).size, 10);
  assert.ok(items.filter(x => x.decision.role === "guide-legend-label").every(x => x.node.properties.lines.length === 2)); equalOffline(transition);
  const hidden = p.editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: "A", label: "" }] });
  assert.equal(endpoint(hidden).guides.filter(x => x?.kind === "categorical-legend").length, 4);
});

test("categorical strict restore rejects injected meaning, metrics, accessors and custom shape pollution", () => {
  const p = base(), payload = exportTransitionPlan(plan(p, p.editCanvas({ width: 1000 })));
  const index = payload.from.guides.findIndex(x => x?.kind === "categorical-legend"), original = payload.from.guides[index];
  const corrupt = structuredClone(payload); corrupt.from.guides[index].layout.config.offset += 1;
  assert.throws(() => restoreTransitionPlan(corrupt), /differs/);
  const queries = structuredClone(original); queries.layout.metrics.measurements.push({ ...queries.layout.metrics.measurements[0], text: "unused" });
  assert.throws(() => normalizeCategoricalLegendAnimationState(queries), /query closure/);
  let reads = 0;
  for (const inject of [s => Object.defineProperty(s.layout.config.symbol.layers[0], "width", { enumerable: true, get() { reads++; return 10; } }),
    s => { s.layout.appearance.shapes[0] = Object.defineProperty({}, "polygon", { enumerable: true, get() { reads++; return []; } }); },
    s => { s.layout.appearance.shapes[0] = { polygon: [Object.defineProperty({ y: 0 }, "x", { enumerable: true, get() { reads++; return 1; } })] }; }]) {
    const input = structuredClone(original); inject(input); assert.throws(() => normalizeCategoricalLegendAnimationState(input), /accessors/);
  }
  assert.equal(reads, 0);
});

test("categorical invalid closed state and mutable input cannot change an earlier prepared value", () => {
  const original = endpoint(base()).guides.find(x => x?.kind === "categorical-legend"), input = structuredClone(original);
  const prepared = normalizeCategoricalLegendAnimationState(input); input.layout.frame.plot.width += 10;
  assert.notDeepEqual(normalizeCategoricalLegendAnimationState(input), prepared);
  for (const mutate of [s => s.layout.config.columns = 0, s => s.layout.config.domain[1] = "A", s => s.layout.config.extra = true,
    s => s.layout.appearance.colors = [], s => s.layout.appearance.dashes[0] = [-1], s => s.layout.config.symbol.layers.push(s.layout.config.symbol.layers[0]),
    s => s.layout.config.symbol.layers[0].shadow = { color: "red" }, s => s.layout.config.rowPadding = Infinity, s => s.layout.config.align = "left",
    s => s.identity.value = ["color", ["value", "missing", "swatch"]]]) {
    const bad = structuredClone(original); mutate(bad); assert.throws(() => normalizeCategoricalLegendAnimationState(bad));
  }
  assert.throws(() => sampleCategoricalLegendInterpolation(prepareCategoricalLegendInterpolation(original, original), NaN), /between/);
  const changed = structuredClone(original); changed.identity.owner = "other";
  assert.equal(prepareCategoricalLegendInterpolation(original, changed).reason, "guide-policy");
});

test("categorical layout and text policy changes retain explicit fades and edited graphics are not inferred", () => {
  const from = base();
  for (const to of [from.editLegend({ title: "Changed" }), from.editLegend({ position: "left" }), from.editLegend({ labels: { fontSize: 14 } })]) {
    assert.ok(entries(sampleTransition(plan(from, to), 50)).every(x => x.decision.kind === "crossfade"));
  }
  for (const p of [base({ border: true }), base({ symbol: { layers: [{ type: "line" }] }, overflow: { maxItems: 1, summarySymbol: "first-hidden" } })]) {
    const transition = plan(p, p.editCanvas({ width: 1000 }));
    assert.ok(entries(sampleTransition(transition, 50)).every(x => x.decision.reason === "guide-layout")); equalOffline(transition);
  }
  const inferred = base({ offset: undefined }), automatic = plan(inferred, inferred.editCanvas({ width: 1000 }));
  assert.ok(entries(sampleTransition(automatic, 50)).every(x => x.decision.kernel === "guide-geometry")); equalOffline(automatic);
  const edited = from.editGraphics({ target: "colorLegendSymbols", property: "width", value: 1 });
  assert.ok(entries(sampleTransition(plan(from, edited), 50)).some(x => x.decision.reason === "guide-edited"));
});
