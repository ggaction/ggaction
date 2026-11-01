import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectAxisLabelGroups, validateAxisLabelGroups, resolveAxisLabelGroup, axisLabelGroupOrigin } from "../../../src/materialization/animation/axisLabelGroups.js";
import { validateAnimationPlacement } from "../../../src/grammar/animation/placement.js";
import { validateGeoAnimationFrame } from "../../../src/materialization/animation/geoPresentation.js";

const copy = value => structuredClone(value);
function build(labels = {}, width = 400) {
  return chart().createCanvas({ width, height: 500, margin: 80 })
    .createData({ values: [{ x: "AAAA BBBB", y: 2 }, { x: "CCCC DDDD", y: 3 }] })
    .createBarPlot({ x: "x", y: "y", guides: { axes: {
      x: { title: false, ticksAndLabels: { labels: { maxWidth: 35, wrap: "word", ...labels } } },
      y: { title: false }
    }, legend: false } });
}
const prepare = program => { const endpoint = projectAnimationEndpoint(program); return { endpoint, state: projectAxisLabelGroups(program, endpoint) }; };

test("native axis groups preserve raw values, every line and exact concrete drawing slots", () => {
  const program = build({ colorMap: [{ value: "AAAA BBBB", color: "red" }] }), before = serializeProgram(program);
  const { endpoint, state } = prepare(program), group = state.groups[0], output = resolveAxisLabelGroup(group);
  assert.equal(state.groups.length, 1); assert.equal(group.reason, undefined);
  assert.deepEqual(state.items.filter(Boolean).map(item => [item.value, item.line]), [["AAAA BBBB", 0], ["AAAA BBBB", 1], ["CCCC DDDD", 0], ["CCCC DDDD", 1]]);
  assert.deepEqual(output.map(item => item.properties.text), ["AAAA", "BBBB", "CCCC", "DDDD"]);
  assert.deepEqual(output.map(item => item.properties.fill), ["red", "red", "#334155", "#334155"]);
  // Native bar band centers are 140 and 260 in the explicit [80,320] frame.
  assert.deepEqual(output.map(item => item.properties.x), [140, 140, 260, 260]);
  assert.deepEqual(output.map(item => item.properties.y), [438, 452.4, 438, 452.4]);
  assert.equal(group.placement.insertion, endpoint.collections[group.placement.ordinal].index);
  assert.deepEqual(validateAxisLabelGroups(copy(state), endpoint), state);
  assert.equal(serializeProgram(program), before); assert.ok(Object.isFrozen(state.groups[0].presentation.styles));
  const origin = axisLabelGroupOrigin(state, 0, "AAAA BBBB");
  assert.strictEqual(origin.program, program); assert.deepEqual({ ...origin, program: null }, { kind: "guide-label", program: null, childPath: [], ownerId: "x", value: "AAAA BBBB" });
  assert.equal(axisLabelGroupOrigin(state, 0, "missing"), undefined);
  assert.equal(axisLabelGroupOrigin(copy(state), 0, "AAAA BBBB"), undefined);
});

test("empty native collections retain their raw membership and actual ordered collection placement", () => {
  const unit = build({ labelMap: [{ value: "AAAA BBBB", label: "" }, { value: "CCCC DDDD", label: "" }] });
  const program = hconcat({ id: "panels", programs: [{ id: "empty", program: unit }, { id: "visible", program: build() }] });
  const { endpoint, state } = prepare(program);
  assert.equal(state.groups.length, 2); assert.deepEqual(state.groups[0].layout.values, ["AAAA BBBB", "CCCC DDDD"]);
  assert.equal(state.items.filter(item => item?.group === 0).length, 0);
  assert.equal(resolveAxisLabelGroup(state.groups[0]).length, 0);
  assert.ok(state.groups[0].placement.ordinal < state.groups[1].placement.ordinal);
  assert.deepEqual(state.groups.map(group => group.scope.namespaces), [["panels-empty"], ["panels-visible"]]);
  assert.deepEqual(axisLabelGroupOrigin(state, 0, "AAAA BBBB").childPath, ["empty"]);
  assert.deepEqual(validateAxisLabelGroups(copy(state), endpoint), state);
});

test("responsive native groups preserve raw colors for currently skipped ticks", () => {
  const values = Array.from({ length: 8 }, (_, index) => ({ x: `Long category ${index}`, y: index + 1 }));
  const program = chart().createCanvas({ width: 220, height: 600, margin: 10, responsive: { minPlotSize: { width: 40, height: 40 } } })
    .createData({ values }).createBarPlot({ x: "x", y: "y", guides: { axes: { x: { title: false,
      ticksAndLabels: { labels: { responsive: { maxLines: 1 }, maxWidth: 300, colorMap: [{ value: "Long category 1", color: "red" }] } } }, y: { title: false } }, legend: false } });
  const { state } = prepare(program), group = state.groups[0];
  assert.equal(group.layout.values.length, 8); assert.ok(state.items.filter(Boolean).length < 8);
  assert.equal(group.presentation.styles[1].fill, "red");
  assert.deepEqual(resolveAxisLabelGroup(group).map(item => item.properties.text), program.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text));
});

test("vertical logarithmic axes retain explicit raw values and native alignment", () => {
  const p = chart().createCanvas({ width: 500, height: 500, margin: 100 })
    .createData({ values: [{ x: 1, y: 1 }, { x: 10, y: 100 }] }).createPointMark().encodeX({ field: "x" })
    .encodeY({ field: "y", scale: { type: "log", domain: [1, 100], nice: false } })
    .createYAxis({ ticksAndLabels: { values: [1, 10, 100], labels: { maxWidth: 40, labelMap: [{ value: 10, label: "A B" }] } }, title: false });
  const { state } = prepare(p), group = state.groups[0];
  assert.equal(group.scope.channel, "y"); assert.deepEqual(group.layout.values, [1, 10, 100]);
  assert.deepEqual(resolveAxisLabelGroup(group).map(item => [item.properties.x, item.properties.y, item.properties.text]), [[88, 400, "1"], [88, 250, "A B"], [88, 100, "100"]]);
  assert.ok(resolveAxisLabelGroup(group).every(item => item.properties.textAlign === "right" && item.properties.textBaseline === "middle"));
});

test("actual native edits preserve explicit fallback instead of inventing new label layout meaning", () => {
  const native = build(), first = native.graphicSpec.objects.xAxisLabels.items[0].id;
  for (const [property, value] of [["fontSize", 16], ["x", 123], ["fill", "blue"]]) {
    const program = native.editGraphics({ target: first, property, value }), { state, endpoint } = prepare(program);
    assert.equal(state.groups[0].reason, "guide-edited", property);
    assert.deepEqual(validateAxisLabelGroups(copy(state), endpoint), state);
  }
  const { state } = prepare(native.editGraphics({ target: "xAxisLabels", property: "opacity", value: .4 }));
  assert.equal(state.groups[0].reason, undefined); assert.ok(state.groups[0].presentation.styles.every(style => style.opacity === .4));
  const simple = native.editXAxisLabels({ maxWidth: false }); assert.equal(prepare(simple).state.groups.length, 0);
  const duplicates = native.editXAxis({ ticksAndLabels: { values: ["AAAA BBBB", "AAAA BBBB"], labels: { overlap: "allow" } } });
  assert.equal(prepare(duplicates).state.groups.length, 0);
  assert.throws(() => projectAxisLabelGroups(native, projectAnimationEndpoint(simple)), /exact native endpoint/);
});

test("closed group transport rejects scope, slot, raw membership, concrete and completeness corruption", () => {
  const { state, endpoint } = prepare(build()), first = state.items.findIndex(Boolean);
  const mutations = [
    state => state.extra = true, state => state.groups[0].extra = true,
    state => delete state.groups[0].presentation, state => state.groups[0].key = "unknown",
    state => state.groups[0].scope.channel = "theta", state => state.groups[0].layout.channel = "y",
    state => state.groups[0].presentation.styles.pop(), state => state.groups[0].presentation.styles[0].x = 3,
    state => state.groups[0].presentation.styles[0].fill = 2,
    state => state.groups[0].presentation.font = {}, state => state.groups[0].reason = "anything",
    state => state.groups[0].placement.insertion++, state => state.groups[0].placement.insertion = -1,
    state => state.groups[0].placement.ordinal++, state => state.groups.push(copy(state.groups[0])),
    state => state.items.pop(), state => state.items[first] = null,
    state => state.items[first].group = 2, state => state.items[first].group = .5,
    state => state.items[first].value = "unknown", state => state.items[first].line = 1,
    state => state.items[first + 1].line = 0, state => state.items[first].extra = true,
    state => state.items[0] = copy(state.items[first])
  ];
  for (const [index, mutate] of mutations.entries()) { const bad = copy(state); mutate(bad); assert.throws(() => validateAxisLabelGroups(bad, endpoint), `mutation ${index}`); }
  const scene = copy(endpoint.scene); scene.nodes[first].properties.text = "forged";
  assert.throws(() => validateAxisLabelGroups(state, { ...endpoint, scene }), /concrete endpoint/);
  const sources = copy(endpoint.sources); sources[first].graphicId = "different";
  assert.throws(() => validateAxisLabelGroups(state, { ...endpoint, sources }), /collection membership/);
  const identity = endpoint.identities.find(Boolean), identities = [...endpoint.identities]; identities[first] = identity;
  assert.throws(() => validateAxisLabelGroups(state, { ...endpoint, identities }), /another native owner/);
});

test("restored current group state needs exact output position without native collection privileges", () => {
  const { state, endpoint } = prepare(build());
  const sampled = { ...endpoint, format: "sampled" }; delete sampled.collections;
  assert.deepEqual(validateAxisLabelGroups(copy(state), sampled), state);
  const bad = copy(state); bad.groups[0].placement.insertion--;
  assert.throws(() => validateAxisLabelGroups(bad, sampled), /line order/);
  const two = prepare(hconcat({ id: "panels", programs: [{ id: "a", program: build() }, { id: "b", program: build() }] }));
  const reversed = copy(two.state); reversed.groups.reverse();
  assert.throws(() => validateAxisLabelGroups(reversed, { ...two.endpoint, format: "sampled" }), /drawing order/);
});

test("closed data boundaries do not execute inherited or own getters and share the work budget", () => {
  const { state, endpoint } = prepare(build()); let reads = 0;
  for (const field of ["scope", "layout", "presentation", "placement"]) {
    const bad = copy(state); Object.defineProperty(bad.groups[0], field, { enumerable: true, get() { reads++; return state.groups[0][field]; } });
    assert.throws(() => validateAxisLabelGroups(bad, endpoint), /own data/);
  }
  const bad = copy(state); delete bad.groups[0].layout;
  Object.defineProperty(Object.prototype, "layout", { configurable: true, get() { reads++; return state.groups[0].layout; } });
  try { assert.throws(() => validateAxisLabelGroups(bad, endpoint), /every field/); } finally { delete Object.prototype.layout; }
  assert.equal(reads, 0);
  let work = 0; assert.throws(() => validateAxisLabelGroups(state, endpoint, amount => { if ((work += amount) > 500) throw new RangeError("shared work exhausted"); }), /shared work exhausted/);
  assert.ok(work > 500);
  assert.throws(() => validateAxisLabelGroups({ groups: [], items: Array(10001).fill(null) }, endpoint), /10000/);
});

test("native title constraints and named collection clips retain the existing placement owners", () => {
  const base = chart().createCanvas({ width: 500, height: 500, margin: 80 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  const p = base.createXAxis({ ticksAndLabels: { values: [0, 10], labels: { maxWidth: 30 } }, title: { text: "X", offset: 50 } })
    .editGraphics({ target: "xAxisLabels", property: "clip", value: { x: 0, y: 0, width: 450, height: 450 } });
  const { state, endpoint } = prepare(p), group = state.groups[0];
  assert.notEqual(group.layout.constraints.titleBounds, null);
  assert.deepEqual(group.placement.frame.clips.at(-1), [0, 0, 450, 450]);
  assert.equal(group.reason, undefined); assert.deepEqual(validateAxisLabelGroups(copy(state), endpoint), state);
  const inherited = Object.fromEntries(Object.entries(group.presentation.styles[0]).reverse()), changed = copy(state);
  changed.groups[0].presentation.styles[0] = inherited;
  assert.deepEqual(validateAxisLabelGroups(changed, endpoint), state);
});

test("measured native groups bind font bytes and every raw line to the exact prepared profile", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex"), decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const initial = build();
  const font = await prepareFontResource(initial, { kind: "create", id: "face", uri: "fixture:axis", expectedHash, mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "literal@1" }, { requestToken: "font", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const p = initial.createFontResource({ prepared: font, requestToken: "font" });
  const metrics = await prepareTextMetrics(p, { id: "exact", fonts: ["face"], axisLabelReflow: true }, { requestToken: "metrics", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths: queries.map(query => query.text.length * 5) }) });
  const program = p.applyTextMetrics({ prepared: metrics, requestToken: "metrics" }), { state, endpoint } = prepare(program);
  assert.equal(state.groups[0].presentation.font.contentHash, expectedHash);
  assert.ok(resolveAxisLabelGroup(state.groups[0]).every(node => node.properties.font.contentHash === expectedHash));
  for (const mutate of [state => state.groups[0].presentation.font = null,
    state => state.groups[0].presentation.font.metricsProviderVersion = "other",
    state => state.groups[0].layout.metrics.measurements.pop()]) {
    const bad = copy(state); mutate(bad); assert.throws(() => validateAxisLabelGroups(bad, endpoint));
  }
});

test("concrete collection placement retains the existing geographic validation including empty clips", () => {
  const valid = { offset: [-10, 5], clip: [0, 0, 0, 0], clips: [[0, 0, 10, 10]] };
  assert.strictEqual(validateAnimationPlacement(valid), valid); assert.strictEqual(validateGeoAnimationFrame(valid), valid);
  const path = { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 }, { op: "L", x: 0, y: 10 }, { op: "Z" }] };
  const withPath = { ...valid, clips: [path] };
  assert.strictEqual(validateAnimationPlacement(withPath), withPath); assert.strictEqual(validateGeoAnimationFrame(withPath), withPath);
  for (const mutate of [v => delete v.clip, v => v.extra = true, v => v.offset = [0], v => v.offset[0] = Infinity,
    v => v.clip[2] = -1, v => v.clips = {}, v => v.clips[0] = [1, 2, 3], v => v.clips.push({ x: 0, y: 0, width: -1, height: 10 })]) {
    const value = copy(valid); mutate(value);
    assert.throws(() => validateAnimationPlacement(value)); assert.throws(() => validateGeoAnimationFrame(value));
  }
});
