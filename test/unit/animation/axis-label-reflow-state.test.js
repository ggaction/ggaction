import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { valuesFromTickConfig } from "../../../src/materialization/guides/tickValues.js";
import { resolveCartesianAxisFrameBounds } from "../../../src/materialization/coordinateBounds.js";
import { normalizeAxisLabelReflow, prepareAxisLabelReflow, resolveAxisLabelReflow,
  prepareAxisLabelReflowPair, sampleAxisLabelReflow, axisLabelReflowMatchesNodes } from "../../../src/materialization/animation/axisLabelReflowState.js";

const style = { fontSize: 10, fontFamily: "Fixture", fontWeight: 400 };
const responsive = { sequence: ["wrap", "skip", "rotate"], maxLines: 2, skipStride: 2, rotationCandidates: [-Math.PI / 2] };
// A literal monospaced measuring fixture. It does not call the production
// query collector or text measurement algorithm to determine expected widths.
function profile(texts) {
  const queries = new Set([""]);
  for (const text of texts) for (const line of text.split(/\r\n|\r|\n/u)) {
    queries.add(line);
    for (const value of [line, line.trim().split(/\s+/u).join(" ")]) {
      for (let i = 0; i < value.length; i++) for (let j = i + 1; j <= value.length; j++) queries.add(value.slice(i, j));
    }
  }
  return { schemaVersion: 1, id: "fixture", measurements: [...queries].map(text => ({ ...style, fontStyle: "normal", text, width: text.length * 5 })) };
}
function input(width = 60, extra = {}) {
  const values = [0, 1, 2];
  return { values, channel: "x", frame: { x: 50, y: 40, width, height: 80 }, canvas: { width: 400, height: 300 },
    scale: { type: "linear", domain: [0, 2], range: [50, 50 + width] },
    config: { ...style, position: "bottom", offset: 8, rotation: 0, overlap: "error", format: "auto", responsive,
      labelMap: values.map(value => ({ value, label: "AAAA BBBB" })) },
    profile: profile(["AAAA BBBB"]), responsive: { minPlotSize: { width: 40, height: 40 } },
    margin: { top: 20, right: 30, bottom: 20, left: 20 }, ...extra };
}
const prepare = width => prepareAxisLabelReflow(input(width));
const lines = layout => resolveAxisLabelReflow(layout).entries;
const raw = value => structuredClone(value);

test("reflow samples the current native width and retains raw identities as line counts change", () => {
  const a = prepare(40), b = prepare(160), before = raw(a);
  assert.deepEqual(lines(a).map(x => [x.value, x.line, x.properties.text]), [
    [0, 0, "AAAA"], [0, 1, "BBBB"], [1, 0, "AAAA"], [1, 1, "BBBB"], [2, 0, "AAAA"], [2, 1, "BBBB"]
  ]);
  const mid = sampleAxisLabelReflow(a, b, .5).layout;
  assert.equal(mid.frame.width, 100);
  assert.deepEqual(lines(mid).map(x => [x.value, x.line, x.properties.x, x.properties.y, x.properties.text]), [
    [0, 0, 50, 128, "AAAA BBBB"], [1, 0, 100, 128, "AAAA BBBB"], [2, 0, 150, 128, "AAAA BBBB"]
  ]);
  assert.deepEqual(resolveAxisLabelReflow(mid).requiredBounds, { left: 27.5, right: 172.5, top: 128, bottom: 138 });
  assert.strictEqual(sampleAxisLabelReflow(a, b, 0).layout, a);
  assert.strictEqual(sampleAxisLabelReflow(a, b, 1).layout, b);
  assert.deepEqual(a, before); assert.ok(Object.isFrozen(mid.config.base.labelMap));
  assert.deepEqual(sampleAxisLabelReflow(a, b, .5), sampleAxisLabelReflow(a, b, .5));
});

test("raw ticks omitted by native skip return at intermediate widths without endpoint indices", () => {
  const make = width => { const args = input(width); args.config.responsive = { ...responsive, maxLines: 1 }; return prepareAxisLabelReflow(args); };
  const a = make(60), b = make(160), mid = sampleAxisLabelReflow(a, b, .5).layout;
  assert.deepEqual(lines(a).map(x => x.value), [0, 2]);
  assert.deepEqual(lines(mid).map(x => x.value), [0, 1, 2]);
  assert.deepEqual(a.values, [0, 1, 2]);
  assert.deepEqual(resolveAxisLabelReflow(a).decision.indices, [0, 2]);
  assert.equal(resolveAxisLabelReflow(a).decision.stage, "skip");
  assert.equal(resolveAxisLabelReflow(mid).decision.stage, "native");
  assert.equal(Object.hasOwn(lines(mid)[1], "sourceIndex"), false);
});

test("native responsive rotation is recalculated while explicit width remains fixed", () => {
  const make = width => { const args = input(width); args.config = { ...args.config, maxWidth: 200, wrap: "word",
    responsive: { ...responsive, maxLines: 1 } }; return prepareAxisLabelReflow(args); };
  const a = make(20), b = make(160);
  assert.equal(resolveAxisLabelReflow(a).decision.stage, "rotate");
  assert.equal(lines(a)[0].properties.rotation, -Math.PI / 2);
  const mid = sampleAxisLabelReflow(a, b, .5).layout;
  assert.equal(mid.config.maxWidth, 200);
  assert.deepEqual(lines(mid).map(x => x.properties.x), [50, 95, 140]);
  assert.equal(Object.hasOwn(lines(mid)[0].properties, "rotation"), false);
});

test("zero visible nodes preserve raw membership, exact font bindings and potential output limits", () => {
  const args = input(); args.config.labelMap = args.values.map(value => ({ value, label: "" }));
  const binding = { resource: { kind: "font", id: "face", revision: 0 }, identity: { family: "Fixture", style: "normal", weight: 400,
    contentHash: "a".repeat(64), metricsProviderVersion: "literal@1" } };
  args.profile = { schemaVersion: 2, id: "font", fonts: [binding], measurements: [] };
  const empty = prepareAxisLabelReflow(args);
  assert.deepEqual(lines(empty), []); assert.deepEqual(empty.values, [0, 1, 2]);
  assert.deepEqual(empty.metrics.fonts, [binding]);
  assert.equal(resolveAxisLabelReflow(empty).requiredBounds, null);
  const noValues = prepareAxisLabelReflow({ ...input(), values: [] });
  assert.deepEqual(lines(noValues), []); assert.deepEqual(noValues.values, []);
  const skipped = input(); skipped.config.responsive = { ...responsive, maxLines: 1 };
  skipped.config.labelMap = [{ value: 0, label: "" }, { value: 1, label: "A\nB" }, { value: 2, label: "" }];
  const dormant = prepareAxisLabelReflow(skipped);
  assert.deepEqual(lines(dormant), []);
  assert.equal(resolveAxisLabelReflow(dormant).maxNodes, 2);
});

test("current state survives JSON restoration and repeated semantic rebase without old plan references", () => {
  const a = prepare(40), b = prepare(160), mid = sampleAxisLabelReflow(a, b, .5).layout;
  const restored = normalizeAxisLabelReflow(JSON.parse(JSON.stringify(mid)));
  assert.deepEqual(lines(restored), lines(mid));
  const again = sampleAxisLabelReflow(restored, b, .5).layout;
  assert.equal(again.frame.width, 130);
  assert.deepEqual(lines(again).map(x => x.properties.x), [50, 115, 180]);
  assert.deepEqual(sampleAxisLabelReflow(b, restored, 1).layout, restored);
  let current = a;
  for (let i = 0; i < 40; i++) current = sampleAxisLabelReflow(current, i % 2 ? a : b, .3).layout;
  assert.equal(JSON.stringify(current).includes('"plan"'), false);
  assert.deepEqual(lines(normalizeAxisLabelReflow(raw(current))), lines(current));
});

test("policy, content and domain compatibility are explicit instead of interpolating endpoint pixels", () => {
  const a = prepare(60);
  for (const mutate of [x => x.config.base.labelMap[0].label = "different", x => x.config.base.fontSize = 11,
    x => x.values.reverse()]) {
    const args = input(160); const initial = prepareAxisLabelReflow(args), value = raw(initial); mutate(value);
    // Some mutations cannot form an internally consistent prepared endpoint.
    assert.throws(() => normalizeAxisLabelReflow(value), /closure|first raw value/);
  }
  for (const mutate of [x => x.config.wrap = "character", x => x.constraints.titleBounds = { left: 0, right: 1, top: 0, bottom: 1 }]) {
    const value = raw(prepare(160)); mutate(value);
    assert.deepEqual(prepareAxisLabelReflowPair(a, normalizeAxisLabelReflow(value)), { kind: "crossfade", reason: "guide-layout" });
  }
  const changed = input(160); changed.config = { ...changed.config, maxWidth: 200, wrap: "word" };
  assert.deepEqual(prepareAxisLabelReflowPair(a, prepareAxisLabelReflow(changed)), { kind: "crossfade", reason: "guide-layout" });
  const reversed = input(160); reversed.scale.range.reverse();
  // Continuous domains keep native mapping direction and exact finite values.
  assert.equal(prepareAxisLabelReflowPair(a, prepareAxisLabelReflow(reversed)).kind, "axis-label-reflow");
});

test("time formatting requires a proven intermediate string closure and explicit maps remain eligible", () => {
  const start = Date.UTC(2020, 0, 1), end = Date.UTC(2020, 0, 3);
  const make = (domain, mapped) => {
    const args = input(200); args.values = [start, end]; args.scale = { type: "time", domain, range: [50, 250] };
    args.profile = undefined;
    args.config = { ...args.config, overlap: "allow", maxWidth: 80, wrap: "word",
      labelMap: mapped ? args.values.map(value => ({ value, label: "fixed" })) : [] };
    return prepareAxisLabelReflow(args);
  };
  const a = make([start, end], false), b = make([start - 1, end + 1], false);
  assert.deepEqual(prepareAxisLabelReflowPair(a, b), { kind: "crossfade", reason: "guide-layout" });
  assert.equal(prepareAxisLabelReflowPair(a, a).kind, "axis-label-reflow");
  const c = make([start, end], true), d = make([start - 1, end + 1], true);
  assert.equal(sampleAxisLabelReflow(c, d, .5).kind, "axis-label-reflow");
  assert.deepEqual(lines(sampleAxisLabelReflow(c, d, .5).layout).map(x => x.properties.text), ["fixed", "fixed"]);
});

test("changed native policy is an explicit fallback while invalid work never becomes a fallback", () => {
  const a = prepare(60), args = input(160); args.config = { ...args.config, maxWidth: 200, wrap: "word" };
  const b = prepareAxisLabelReflow(args);
  assert.deepEqual(sampleAxisLabelReflow(a, b, .5), { kind: "crossfade", reason: "guide-layout" });
  assert.throws(() => sampleAxisLabelReflow(a, prepare(160), .5, () => { throw new Error("host work counter"); }), /host work counter/);
  const discrete = input(); discrete.values = ["a", "b", "c"]; discrete.scale = { type: "ordinal", domain: discrete.values, range: [50, 110] };
  discrete.config.labelMap = discrete.values.map(value => ({ value, label: "A" })); discrete.profile = profile(["A"]);
  const left = prepareAxisLabelReflow(discrete); discrete.scale.range.reverse(); const right = prepareAxisLabelReflow(discrete);
  assert.deepEqual(prepareAxisLabelReflowPair(left, right), { kind: "crossfade", reason: "scale-direction" });
});

test("a temporary native line expansion that exceeds the Canvas has an explicit layout fallback", () => {
  const make = width => {
    const args = input(width, { canvas: { width: 400, height: 140 } });
    args.config.labelMap = [{ value: 0, label: "A" }, { value: 1, label: "AAAA BBBB" }, { value: 2, label: "A" }];
    return prepareAxisLabelReflow(args);
  };
  const a = make(15), b = make(160);
  assert.equal(resolveAxisLabelReflow(a).decision.stage, "skip");
  assert.equal(resolveAxisLabelReflow(b).decision.stage, "native");
  assert.deepEqual(sampleAxisLabelReflow(a, b, 25 / 145), { kind: "crossfade", reason: "guide-layout" });
  assert.deepEqual(lines(a).map(x => x.value), [0, 2]);
});

test("Y anchors use nonlinear semantic scale values with fixed character wrapping and current offsets", () => {
  const make = (range, height, offset) => {
    const args = input(); delete args.config.responsive; delete args.responsive; delete args.margin;
    args.channel = "y"; args.scale = { type: "log", domain: [1, 100], range };
    args.values = [1, 10, 100]; args.frame = { x: 100, y: 50, width: 60, height };
    args.config = { ...args.config, position: "left", overlap: "allow", offset, alongOffset: 2,
      maxWidth: 20, wrap: "character", lineHeight: 15,
      labelMap: args.values.map(value => ({ value, label: "ABCD" })) };
    args.profile = profile(["ABCD"]);
    return prepareAxisLabelReflow(args);
  };
  const a = make([50, 150], 100, 8), b = make([50, 250], 200, 12);
  const mid = sampleAxisLabelReflow(a, b, .5).layout;
  assert.deepEqual(lines(mid).map(x => [x.properties.x, x.properties.y]), [[90, 52], [90, 127], [90, 202]]);
  assert.equal(mid.config.base.offset, 10); assert.equal(mid.config.lineHeight, 15);
  assert.equal(mid.constraints.minPlotSize, null);
  const tooWide = raw(mid); tooWide.config.maxWidth = null;
  assert.throws(() => normalizeAxisLabelReflow(tooWide), /lineHeight requires/);
  const reversed = raw(mid); reversed.constraints.titleBounds = { left: 2, right: 1, top: 0, bottom: 1 };
  assert.throws(() => normalizeAxisLabelReflow(reversed), /reversed/);
});

test("font-bound reflow admits only the measured closure and never estimates a missing substring", () => {
  const args = input(), binding = { resource: { kind: "font", id: "face", revision: 0 }, identity: {
    family: "Fixture", style: "normal", weight: 400, contentHash: "a".repeat(64), metricsProviderVersion: "literal@1" } };
  args.profile = { ...args.profile, schemaVersion: 2, fonts: [binding] };
  const a = prepareAxisLabelReflow(args);
  assert.equal(a.metrics.schemaVersion, 2);
  const bad = raw(args); bad.profile.measurements = bad.profile.measurements.filter(x => x.text !== "AA");
  assert.throws(() => prepareAxisLabelReflow(bad), /exact prepared measurement/);
  const restored = raw(a); restored.metrics.measurements.pop();
  assert.throws(() => normalizeAxisLabelReflow(restored), /exact query closure/);
  assert.deepEqual(lines(a).map(x => x.properties.text), ["AAAA", "BBBB", "AAAA", "BBBB", "AAAA", "BBBB"]);
});

test("native node proof checks current font style, line ownership and exact drawing order", () => {
  const state = prepare(60), nodes = lines(state).map(entry => ({ type: entry.type, properties: { ...style, ...entry.properties } }));
  assert.equal(axisLabelReflowMatchesNodes(state, nodes), true);
  assert.equal(axisLabelReflowMatchesNodes(state, nodes.slice(1)), false);
  for (const [property, value] of [["text", "different"], ["fontFamily", "other"], ["fontSize", 11], ["fontWeight", 700],
    ["fontStyle", "italic"], ["rotation", .5], ["lines", ["AAAA"]]]) {
    const changed = raw(nodes); changed[0].properties[property] = value;
    assert.equal(axisLabelReflowMatchesNodes(state, changed), false, property);
  }
  const reversed = raw(nodes); reversed.reverse(); assert.equal(axisLabelReflowMatchesNodes(state, reversed), false);
  const changed = raw(nodes); changed[0].type = "path"; assert.equal(axisLabelReflowMatchesNodes(state, changed), false);
  const familyDefault = input(); familyDefault.config.fontFamily = "sans-serif"; familyDefault.profile = undefined;
  const defaultState = prepareAxisLabelReflow(familyDefault);
  const defaults = lines(defaultState).map(entry => ({ type: entry.type, properties: { ...entry.properties, fontSize: 10 } }));
  assert.equal(axisLabelReflowMatchesNodes(defaultState, defaults), true);
});

test("strict boundaries reject missing fields, getters, duplicate raw values and corrupted metrics", () => {
  const a = prepare(60);
  for (const mutate of [x => delete x.config.base.fontSize, x => x.extra = true,
    x => x.values[1] = x.values[0], x => x.values[1] = null, x => x.values[1] = 100,
    x => x.channel = "theta", x => x.edgeAligned = null, x => x.frame.width = -1,
    x => x.canvas.width = 0, x => x.config.maxWidth = 0, x => x.config.lineHeight = 1,
    x => x.config.responsive.sequence.reverse(), x => x.constraints.margin.left = -1,
    x => x.constraints.minPlotSize.width = 0, x => delete x.constraints.minPlotSize.height,
    x => x.metrics.measurements.pop(), x => x.metrics.measurements.push({ ...x.metrics.measurements[0], text: "extra" })]) {
    const value = raw(a); mutate(value); assert.throws(() => normalizeAxisLabelReflow(value));
  }
  let reads = 0;
  const value = raw(a); Object.defineProperty(value.mapping, "scale", { enumerable: true, get() { reads++; return a.mapping.scale; } });
  assert.throws(() => normalizeAxisLabelReflow(value), /own data/); assert.equal(reads, 0);
  const missing = raw(a); delete missing.constraints.margin;
  Object.defineProperty(Object.prototype, "margin", { configurable: true, get() { reads++; return a.constraints.margin; } });
  try { assert.throws(() => normalizeAxisLabelReflow(missing), /every field/); }
  finally { delete Object.prototype.margin; }
  assert.equal(reads, 0);
  assert.throws(() => sampleAxisLabelReflow(a, a, NaN), /progress/);
});

test("query, potential line and cumulative work limits reject before exposing partial layouts", () => {
  const args = input(); args.values = Array.from({ length: 10001 }, (_, i) => i);
  assert.throws(() => prepareAxisLabelReflow(args), /count|closure|work/);
  const many = input(); many.values = Array.from({ length: 1200 }, (_, i) => i); many.scale.domain = [0, 1199];
  many.config.overlap = "allow"; many.config.labelMap = many.values.map(value => ({ value, label: "ABCDEFGHIJ" }));
  assert.throws(() => prepareAxisLabelReflow(many), /potential lines/);
  const a = prepare(60); let consumed = 0;
  assert.throws(() => resolveAxisLabelReflow(a, count => { consumed += count; if (consumed > 100) throw new RangeError("shared work exhausted"); }), /shared work exhausted/);
  assert.ok(consumed > 100); assert.equal(lines(a).length, 6);
});

function fromProgram(p, owner = "x", channel = "x") {
  const stored = p.guideConfigs.axis[owner].labels, config = { ...stored }; delete config.responsiveResult;
  return prepareAxisLabelReflow({ channel, config, values: valuesFromTickConfig(p, config), scale: p.resolvedScales[config.scale],
    frame: resolveCartesianAxisFrameBounds(p, channel, config.position, config.scale, owner),
    canvas: { width: p.graphicSpec.objects.canvas.properties.width, height: p.graphicSpec.objects.canvas.properties.height },
    profile: p.materializationConfigs.textMetrics, responsive: p.materializationConfigs.canvas.responsive,
    margin: p.materializationConfigs.canvas.margin, edgeAligned: true });
}
test("prepared native reflow equals independent public axis materialization at every sampled width", () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ x: `Long category ${i}`, y: i + 1 }));
  const build = width => chart().createCanvas({ width, height: 600, margin: 10, responsive: { minPlotSize: { width: 40, height: 40 } } })
    .createData({ values: rows }).createBarPlot({ x: "x", y: "y", guides: { axes: {
      x: { title: false, ticksAndLabels: { labels: { responsive: { maxLines: 1 }, maxWidth: 300 } } }, y: { title: false }
    }, legend: false } });
  for (const width of [220, 400, 800]) {
    const p = build(width), before = serializeProgram(p), state = fromProgram(p), actual = p.graphicSpec.objects.xAxisLabels.items;
    const expected = lines(state);
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++) for (const [key, value] of Object.entries(expected[i].properties)) assert.deepEqual(actual[i].properties[key], value);
    assert.deepEqual(resolveAxisLabelReflow(state).decision, p.guideConfigs.axis.x.labels.responsiveResult);
    assert.equal(serializeProgram(p), before);
  }
});
