import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { prepareAxisAnimationLayout, resolveAxisAnimationLabelBounds } from "../../../src/materialization/animation/axisLabelState.js";
import { prepareAxisTitleAnimationLayout, normalizeAxisTitleAnimationState, resolveAxisTitleAnimationGeometry,
  axisTitleAnimationMatchesNode, prepareAxisTitleInterpolation, sampleAxisTitleInterpolation } from "../../../src/materialization/animation/axisTitleState.js";
import { resolveCartesianAxisFrameBounds } from "../../../src/materialization/coordinateBounds.js";
import { valuesFromTickConfig } from "../../../src/materialization/guides/tickValues.js";
import { axisGraphicIds } from "../../../src/selectors/axes.js";
import { cartesianPosition } from "../../../src/grammar/animation/cartesianPosition.js";
import { axisThemeOffset } from "../../../src/actions/theme/state.js";
import { ANIMATION_GUIDE_VERSION } from "../../../src/grammar/animation/guideState.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const base = () => chart().createCanvas({ width: 700, height: 600, margin: 150 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
function state(program, channel = "x") {
  const config = program.guideConfigs.axis[channel].title, labelConfig = program.guideConfigs.axis[channel].labels;
  const frame = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, channel);
  const { width, height } = program.graphicSpec.objects.canvas.properties, canvas = { width, height };
  const scale = program.resolvedScales[config.scale], profile = program.materializationConfigs.textMetrics;
  const edgeAligned = program.materializationConfigs.canvas?.plot !== undefined || program.materializationConfigs.canvas?.responsive !== undefined;
  const labels = labelConfig === undefined ? null : prepareAxisAnimationLayout({ values: valuesFromTickConfig(program, labelConfig),
    scale: program.resolvedScales[labelConfig.scale], config: labelConfig, channel, frame, canvas, profile, edgeAligned });
  const anchor = { kind: "title", channel, frame,
    anchor: typeof config.at === "number" ? { kind: "value", mapping: cartesianPosition(config.at, scale), alongOffset: config.alongOffset ?? 0 }
      : { kind: "range", range: scale.range, at: config.at, alongOffset: config.alongOffset ?? 0 },
    policy: { side: config.position, offset: 0, align: config.align ?? null, baseline: config.baseline ?? "middle" } };
  const layout = prepareAxisTitleAnimationLayout({ anchor, canvas, config, text: program.semanticSpec.guides.axis[channel].title,
    profile, labels, preferred: axisThemeOffset(program.materializationConfigs.theme, "title") ?? (channel === "x" ? 42 : 52), unclamped: edgeAligned });
  return { identity: { namespaces: [], owner: channel, component: "title", value: null, line: 0 }, kind: "title-layout", layout };
}
function matches(state, program, channel = "x") {
  const native = program.graphicSpec.objects[axisGraphicIds(channel)[3]];
  assert.ok(axisTitleAnimationMatchesNode(state, native));
  const geometry = resolveAxisTitleAnimationGeometry(state);
  for (const [key, value] of Object.entries(geometry.properties)) {
    if (typeof value === "number") near(value, native.properties[key]);
    else assert.deepEqual(value, native.properties[key]);
  }
}

test("dependent title states replay native inferred and label-relative clearance on every side", () => {
  for (const channel of ["x", "y"]) for (const position of channel === "x" ? ["top", "bottom"] : ["left", "right"]) {
    for (const offset of [undefined, { from: "labels", gap: 7 }]) {
      const create = channel === "x" ? "createXAxis" : "createYAxis";
      const a = base()[create]({ position, ticksAndLabels: { values: [0, 10], labels: { rotation: { value: 30, unit: "degrees" }, flush: false } },
        title: { text: "Native title", ...(offset === undefined ? {} : { offset }) } });
      const before = serializeProgram(a), b = a.editCanvas({ width: 800, height: 700 });
      matches(state(a, channel), a, channel); matches(state(b, channel), b, channel);
      const plan = prepareAxisTitleInterpolation(state(a, channel), state(b, channel));
      assert.equal(plan.kind, "guide");
      for (const progress of [0, .25, .5, .75, 1]) {
        const sampled = sampleAxisTitleInterpolation(plan, progress);
        assert.equal(sampled.kind, "guide");
        matches(sampled.state, a.editCanvas({ width: 700 + progress * 100, height: 600 + progress * 100 }), channel);
      }
      assert.equal(serializeProgram(a), before);
    }
  }
});

test("title anchors retain raw numeric scale mapping instead of interpolating concrete x", () => {
  const a = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Value", at: 5, offset: { from: "labels", gap: 9 } } });
  const b = a.editXScale({ domain: [0, 20] }), sa = state(a), sb = state(b);
  const middle = sampleAxisTitleInterpolation(prepareAxisTitleInterpolation(sa, sb), .5);
  matches(middle.state, a.editXScale({ domain: [0, 15] }));
  near(middle.properties.x, 150 + 400 / 3);
  assert.notEqual(middle.properties.x, (resolveAxisTitleAnimationGeometry(sa).properties.x + resolveAxisTitleAnimationGeometry(sb).properties.x) / 2);
  const again = sampleAxisTitleInterpolation(prepareAxisTitleInterpolation(middle.state, sb), .5);
  matches(again.state, a.editXScale({ domain: [0, 17.5] }));
});

test("hard-break titles and hidden labels reuse exact measured native line bounds", () => {
  const a = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { flush: true,
    labelMap: [{ value: 0, label: "First\nline" }, { value: 5, label: "" }, { value: 10, label: "Last" }] } },
    title: { text: "Two\nlines", offset: { from: "labels", gap: 7 } } });
  const sa = state(a), b = a.editCanvas({ width: 800 });
  assert.equal(resolveAxisTitleAnimationGeometry(sa).properties.lines.length, 2);
  const bounds = resolveAxisAnimationLabelBounds({ ...sa.layout.labels, frame: sa.layout.frame, canvas: sa.layout.canvas });
  assert.equal(bounds.labelBounds.length, 3);
  const sampled = sampleAxisTitleInterpolation(prepareAxisTitleInterpolation(sa, state(b)), .5);
  matches(sampled.state, a.editCanvas({ width: 750 }));
  const restored = normalizeAxisTitleAnimationState(structuredClone(sampled.state));
  assert.deepEqual(restored, sampled.state);
  assert.deepEqual(resolveAxisTitleAnimationGeometry(restored), resolveAxisTitleAnimationGeometry(sampled.state));
});

test("inferred titles without labels preserve preferred and theme offsets", () => {
  for (const theme of [false, true]) {
    let a = base(); if (theme) a = a.applyTheme({ theme: "dark" });
    a = a.createXAxis({ ticksAndLabels: false, title: { text: "Measure" } });
    const sa = state(a), b = a.editCanvas({ width: 800 });
    assert.equal(sa.layout.labels, null);
    matches(sa, a);
    matches(sampleAxisTitleInterpolation(prepareAxisTitleInterpolation(sa, state(b)), .5).state, a.editCanvas({ width: 750 }));
  }
});

test("dependent title closed proof rejects corrupt bounds, metrics, roles and accessor inputs", () => {
  const a = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Title", offset: { from: "labels", gap: 7 } } });
  const original = state(a);
  const bad = [s => s.extra = true, s => s.identity.line = 1, s => s.identity.value = 1, s => s.layout.anchor.frame = s.layout.frame,
    s => s.layout.anchor.policy.offset = 3, s => s.layout.canvas.width = 0, s => s.layout.text = "", s => s.layout.style.fontWeight = 450,
    s => s.layout.style.fontFamily = "", s => s.layout.style.rotation = Infinity, s => s.layout.style.overlap = "ignore",
    s => s.layout.clearance.gap = -1, s => s.layout.clearance.kind = "other", s => s.layout.labels.frame = s.layout.frame,
    s => s.layout.labels = null, s => s.layout.labels.config.position = "top", s => s.layout.metrics.measurements.push({ ...s.layout.metrics.measurements[0], text: "unused" })];
  for (const mutate of bad) { const s = structuredClone(original); mutate(s); assert.throws(() => normalizeAxisTitleAnimationState(s)); }
  let reads = 0; const getter = structuredClone(original);
  Object.defineProperty(getter.layout.anchor, "frame", { enumerable: true, get() { reads++; return {}; } });
  assert.throws(() => normalizeAxisTitleAnimationState(getter), /own data|accessor/); assert.equal(reads, 0);
  const cloned = structuredClone(original), normalized = normalizeAxisTitleAnimationState(cloned); cloned.layout.text = "changed";
  assert.equal(normalized.layout.text, "Title"); assert.ok(Object.isFrozen(normalized.layout.labels));
  const altered = { ...a.graphicSpec.objects.xAxisTitle, properties: { ...a.graphicSpec.objects.xAxisTitle.properties, fontSize: 30 } };
  assert.equal(axisTitleAnimationMatchesNode(original, altered), false);
});

test("dependent title preparation keeps incompatible native policies and unsafe midpoints explicit", () => {
  const a = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Title", offset: { from: "labels", gap: 7 } } });
  const sa = state(a);
  assert.equal(prepareAxisTitleInterpolation(sa, { ...sa, identity: { ...sa.identity, owner: "other" } }).reason, "guide-policy");
  assert.equal(prepareAxisTitleInterpolation(sa, state(a.editXAxisTitle({ text: "Different" }))).reason, "guide-layout");
  assert.equal(prepareAxisTitleInterpolation(sa, state(a.editXAxisLabels({ flush: false, rotation: { value: 20, unit: "degrees" } }))).reason, "guide-layout");
  const prepared = prepareAxisTitleInterpolation(sa, state(a.editCanvas({ width: 800 })));
  assert.throws(() => sampleAxisTitleInterpolation({ ...prepared, version: "unknown" }, .5), /Invalid prepared/);
  assert.throws(() => sampleAxisTitleInterpolation({ ...prepared, kind: "other" }, .5), /Invalid prepared/);
  assert.throws(() => sampleAxisTitleInterpolation(prepared, NaN), /between|finite/);
  assert.equal(prepared.version, ANIMATION_GUIDE_VERSION);
});

test("native midpoint overflow fades without clamping a numeric title anchor", () => {
  const args = alongOffset => ({ ticksAndLabels: { values: [0, 10], labels: { flush: true } },
    title: { text: "T", at: 5, alongOffset, offset: { from: "labels", gap: 7 } } });
  const a = base().createXAxis(args(-300));
  const b = base().editXScale({ domain: [0, 100] }).createXAxis(args(-120));
  const sa = state(a), sb = state(b);
  near(resolveAxisTitleAnimationGeometry(sa).properties.x, 50);
  near(resolveAxisTitleAnimationGeometry(sb).properties.x, 50);
  assert.equal(sampleAxisTitleInterpolation(prepareAxisTitleInterpolation(sa, sb), .5).reason, "guide-layout");
  assert.throws(() => base().editXScale({ domain: [0, 55] }).createXAxis(args(-210)), /does not fit/);
});

test("dependent title defaults, null-label policy and query proof remain closed", () => {
  const a = base().createXAxis({ ticksAndLabels: false, title: { text: "No labels" } }), original = state(a);
  for (const mutate of [s => s.layout.clearance.unclamped = 1, s => s.layout.clearance.preferred = Infinity,
    s => s.layout.anchor.channel = "theta", s => s.layout.style.fontWeight = 1000,
    s => s.layout.style.fontSize = 0, s => s.layout.style.fontWeight = 99]) {
    const copy = structuredClone(original); mutate(copy); assert.throws(() => normalizeAxisTitleAnimationState(copy));
  }
  const withLabels = base().createXAxis({ ticksAndLabels: { values: [0, 10] }, title: { text: "No labels" } });
  assert.equal(prepareAxisTitleInterpolation(original, state(withLabels)).reason, "guide-layout");
  const top = a.editXAxisTitle({ position: "top" });
  assert.equal(prepareAxisTitleInterpolation(original, state(top)).reason, "guide-layout");
  const mismatched = structuredClone(state(withLabels));
  mismatched.layout.labels.channel = "y"; mismatched.layout.labels.config.position = "left";
  assert.throws(() => normalizeAxisTitleAnimationState(mismatched), /channel/);
  const config = a.guideConfigs.axis.x.title, anchor = { ...original.layout.anchor, frame: original.layout.frame };
  assert.throws(() => prepareAxisTitleAnimationLayout({ anchor, canvas: original.layout.canvas, config,
    text: "No labels", preferred: 42, labels: { ...state(withLabels).layout.labels,
      frame: { ...original.layout.frame, x: 1 }, canvas: original.layout.canvas } }), /share their native frame/);
});

test("dependent title exact font metrics retain resource identity and reject missing queries", () => {
  const p = base().createXAxis({ ticksAndLabels: false, title: { text: "Exact" } }), original = state(p);
  const binding = { resource: { kind: "font", id: "face", revision: 2 }, identity: { family: "sans-serif", style: "normal", weight: 600,
    contentHash: "f".repeat(64), metricsProviderVersion: "literal@1" } };
  const profile = { schemaVersion: 2, id: "exact", fonts: [binding], measurements: original.layout.metrics.measurements };
  const args = { anchor: { ...original.layout.anchor, frame: original.layout.frame }, canvas: original.layout.canvas,
    config: p.guideConfigs.axis.x.title, text: "Exact", profile, preferred: 42 };
  const layout = prepareAxisTitleAnimationLayout(args);
  assert.deepEqual(layout.metrics.fonts, [binding]);
  assert.throws(() => prepareAxisTitleAnimationLayout({ ...args, profile: { ...profile, measurements: [] } }), error => error.assetCode === "metrics-required");
  const from = { ...original, layout }, changed = structuredClone(from); changed.layout.metrics.fonts[0].resource.revision++;
  assert.equal(prepareAxisTitleInterpolation(from, changed).reason, "guide-layout");
});
