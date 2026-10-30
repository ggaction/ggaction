import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGuideAnchor, normalizeBandBoundaryMembers, resolveGuideAnchor, prepareGuideAnchor, sampleGuideAnchor } from "../../../src/grammar/animation/guideAnchors.js";

const frame = { x: 20, y: 30, width: 400, height: 200 };
const title = (patch = {}) => ({ kind: "title", channel: "x", frame,
  anchor: { kind: "range", range: [20, 420], at: "center", alongOffset: 0 },
  policy: { side: "bottom", offset: 15, align: null, baseline: "middle" }, ...patch });
const scale = { type: "band", domain: [1, "1"], range: [20, 420], paddingInner: 0, paddingOuter: 0, align: .5 };
const boundary = (patch = {}) => ({ kind: "band-boundary", channel: "x", frame, scale,
  members: [{ value: 1, edge: "end" }, { value: "1", edge: "start" }], alongOffset: 0, ...patch });
const linear = { value: 5, scale: { type: "linear", domain: [0, 10], range: [230, 30], clamp: false } };
const parallel = (component, patch = {}) => ({ kind: "parallel", component, field: "amount", frame, slot: { index: 1, count: 3 },
  mapping: component === "line" || component === "title" ? null : linear,
  policy: component === "line" ? {} : component === "ticks" ? { length: 8 } : { offset: 12, align: null }, ...patch });
const middle = (a, b) => sampleGuideAnchor(prepareGuideAnchor(a, b), .5);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("title range roles and numeric scale values retain independent native coordinates", () => {
  const a = title(), before = structuredClone(a);
  assert.deepEqual(resolveGuideAnchor(a), { type: "text", properties: { x: 220, y: 245, textAlign: "center", textBaseline: "middle" } });
  const b = title({ frame: { x: 40, y: 50, width: 800, height: 400 }, anchor: { ...a.anchor, range: [40, 840] }, policy: { ...a.policy, offset: 25 } });
  assert.deepEqual(middle(a, b).properties, { x: 330, y: 360, textAlign: "center", textBaseline: "middle" });
  for (const [at, expected] of [["start", 20], ["end", 420]]) assert.equal(resolveGuideAnchor(title({ anchor: { ...a.anchor, at } })).properties.x, expected);
  const mapped = title({ anchor: { kind: "value", mapping: { value: 10, scale: { type: "log", domain: [1, 1000], range: [20, 320], base: 10 } }, alongOffset: 7 } });
  close(resolveGuideAnchor(mapped).properties.x, 127);
  const target = { ...mapped, anchor: { ...mapped.anchor, mapping: { ...mapped.anchor.mapping, value: 100 } } };
  // Semantic value 55 is mapped through log; the screen midpoint would be 177.
  close(middle(mapped, target).properties.x, 27 + 100 * Math.log10(55));
  assert.deepEqual(a, before);
  assert.equal(resolveGuideAnchor(title({ policy: { ...a.policy, offset: -5 } })).properties.y, 225);
  assert.ok(Object.isFrozen(middle(a, b).state.anchor.range));
  assert.deepEqual(sampleGuideAnchor(prepareGuideAnchor(a, b), 0).state, normalizeGuideAnchor(a));
  assert.deepEqual(sampleGuideAnchor(prepareGuideAnchor(a, b), 1).state, normalizeGuideAnchor(b));
});

test("title side, alignment, numeric discrete at and shortest polar angles use native geometry", () => {
  const y = title({ channel: "y", anchor: { kind: "value", mapping: { value: 1, scale }, alongOffset: -5 }, policy: { side: "left", offset: 9, align: "right", baseline: "alphabetic" } });
  assert.deepEqual(resolveGuideAnchor(y).properties, { x: 11, y: 115, textAlign: "right", textBaseline: "alphabetic" });
  const polar = { kind: "title", channel: "theta", frame: { centerX: 100, centerY: 100, availableRadius: 40 }, anchor: null, policy: { offset: 10, align: null } };
  assert.deepEqual(resolveGuideAnchor(polar).properties, { x: 100, y: 150, textAlign: "center", textBaseline: "middle" });
  assert.equal(resolveGuideAnchor({ ...polar, policy: { ...polar.policy, align: "left" } }).properties.textAlign, "left");
  const radial = { ...polar, channel: "radius", policy: { offset: 10, align: null, angle: 350, position: "inside" } };
  const mid = middle(radial, { ...radial, policy: { ...radial.policy, angle: 10 } });
  assert.equal(mid.state.policy.angle, 360);
  close(mid.properties.x, 110); close(mid.properties.y, 80);
  const outside = resolveGuideAnchor({ ...radial, policy: { ...radial.policy, angle: 90, position: "outside" } });
  close(outside.properties.x, 150); close(outside.properties.y, 100);
  assert.equal(outside.properties.textAlign, "left");
});

test("band boundary identity retains all typed memberships independently of selected order", () => {
  const a = boundary(), normalized = normalizeGuideAnchor(a);
  assert.deepEqual(normalizeBandBoundaryMembers([...a.members].reverse().concat(a.members[0])), normalized.members);
  assert.deepEqual(normalizeBandBoundaryMembers(a.members.map(member => ({ edge: member.edge, value: member.value }))), normalized.members);
  assert.deepEqual(resolveGuideAnchor(a), { type: "line", properties: { x1: 220, y1: 30, x2: 220, y2: 230 } });
  const b = boundary({ scale: { ...scale, range: [40, 840] }, frame: { x: 40, y: 50, width: 800, height: 400 }, members: [...a.members].reverse(), alongOffset: 6 });
  assert.deepEqual(middle(a, b).properties, { x1: 333, y1: 40, x2: 333, y2: 340 });
  assert.equal(middle(a, b).state.members.length, 2);
  assert.deepEqual(resolveGuideAnchor(boundary({ channel: "y", scale: { ...scale, range: [420, 20] } })).properties,
    { x1: 20, y1: 220, x2: 420, y2: 220 });
  assert.equal(resolveGuideAnchor(boundary({ members: [{ value: 1, edge: "start" }] })).properties.x1, 20);
  assert.throws(() => normalizeGuideAnchor(boundary({ members: [{ value: 1, edge: "start" }, { value: "1", edge: "end" }] })), /one native edge/);
  assert.throws(() => normalizeGuideAnchor(boundary({ scale: { ...scale, paddingInner: .25 } })), /one native edge/);
  assert.equal(prepareGuideAnchor(a, boundary({ members: [{ value: 1, edge: "end" }] })).reason, "guide-layout");
  assert.equal(prepareGuideAnchor(a, boundary({ scale: { ...scale, range: [420, 20] } })).reason, "scale-direction");
});

test("Parallel field slots remap each raw tick and retain every component's exact role", () => {
  assert.deepEqual(resolveGuideAnchor(parallel("line")).properties, { x1: 220, y1: 30, x2: 220, y2: 230 });
  assert.deepEqual(resolveGuideAnchor(parallel("ticks")).properties, { x1: 216, y1: 130, x2: 224, y2: 130 });
  assert.deepEqual(resolveGuideAnchor(parallel("labels")).properties, { x: 208, y: 130, textAlign: "right", textBaseline: "middle" });
  assert.deepEqual(resolveGuideAnchor(parallel("title")).properties, { x: 220, y: 18, textAlign: "center", textBaseline: "middle" });
  const a = parallel("ticks", { slot: { index: 0, count: 3 } }), b = parallel("ticks", { slot: { index: 2, count: 3 },
    mapping: { value: 5, scale: { ...linear.scale, domain: [0, 20] } }, policy: { length: 12 } });
  const properties = middle(a, b).properties;
  assert.equal(properties.x1, 215); assert.equal(properties.x2, 225);
  close(properties.y1, 230 - 200 / 3); assert.equal(properties.y1, properties.y2);
  assert.equal(middle(a, b).state.field, "amount");
  const labels = parallel("labels", { policy: { offset: 0, align: "center" } });
  assert.equal(resolveGuideAnchor(labels).properties.textAlign, "center");
  const discrete = parallel("labels", { mapping: { value: "1", scale } });
  assert.equal(resolveGuideAnchor(discrete).properties.y, 320);
  assert.equal(prepareGuideAnchor(discrete, { ...discrete, mapping: { value: "1", scale: { ...scale, domain: ["1", 1] } } }).reason, "ordinal-domain");
});

test("guide anchor compatibility rejects policy switches instead of pixel interpolation", () => {
  const a = title();
  assert.equal(prepareGuideAnchor(a, parallel("title")).reason, "guide-policy");
  assert.equal(prepareGuideAnchor(a, title({ channel: "y", policy: { ...a.policy, side: "left" } })).reason, "guide-policy");
  assert.equal(prepareGuideAnchor(a, title({ policy: { ...a.policy, side: "top" } })).reason, "guide-layout");
  assert.equal(prepareGuideAnchor(a, title({ policy: { ...a.policy, align: "left" } })).reason, "guide-layout");
  assert.equal(prepareGuideAnchor(a, title({ anchor: { ...a.anchor, at: "end" } })).reason, "guide-layout");
  assert.equal(prepareGuideAnchor(a, title({ anchor: { kind: "value", mapping: linear, alongOffset: 0 } })).reason, "guide-layout");
  assert.equal(prepareGuideAnchor(parallel("line"), parallel("line", { field: "other" })).reason, "guide-policy");
  assert.equal(prepareGuideAnchor(parallel("line"), parallel("ticks")).reason, "guide-policy");
  assert.equal(prepareGuideAnchor(parallel("ticks"), parallel("ticks", { mapping: { ...linear, value: 6 } })).reason, "guide-policy");
  assert.equal(prepareGuideAnchor(parallel("ticks"), parallel("ticks", { mapping: { value: 5, scale: { type: "log", domain: [1, 10], range: [230, 30] } } })).reason, "scale-type");
  assert.throws(() => sampleGuideAnchor({ kind: "guide-anchor", from: a, to: parallel("title") }, .5), /Incompatible/);
});

test("closed guide anchors reject malformed shapes, hostile descriptors and nonfinite work before sampling", () => {
  const invalid = [null, { kind: "unknown" }, { ...title(), extra: true }, { ...title(), frame: { ...frame, width: -1 } },
    { ...title(), frame: { ...frame, x: Infinity } }, { ...title(), channel: "z" }, title({ policy: { ...title().policy, side: "left" } }),
    title({ policy: { ...title().policy, align: "start" } }), title({ policy: { ...title().policy, baseline: "invalid" } }),
    title({ policy: { ...title().policy, offset: Infinity } }), title({ anchor: { ...title().anchor, at: "middle" } }),
    title({ anchor: { ...title().anchor, range: [0] } }), title({ anchor: { ...title().anchor, alongOffset: NaN } }),
    title({ anchor: { kind: "value", mapping: { value: "1", scale }, alongOffset: 0 } }),
    title({ anchor: { kind: "value", mapping: { value: 20, scale: linear.scale }, alongOffset: 0 } }),
    boundary({ channel: "theta" }), boundary({ scale: { ...scale, type: "point" } }), boundary({ members: [] }),
    boundary({ members: [{ value: {}, edge: "start" }] }), boundary({ members: [{ value: 1, edge: "outside" }] }),
    boundary({ members: [{ value: 1 }] }), parallel("other"), parallel("line", { field: "" }), parallel("line", { slot: { index: 2, count: 2 } }),
    parallel("line", { mapping: linear }), parallel("line", { policy: { length: 1 } }), parallel("ticks", { policy: { length: -1 } })];
  for (const value of invalid) assert.throws(() => normalizeGuideAnchor(value));
  let reads = 0;
  const hostile = title(); Object.defineProperty(hostile.anchor, "kind", { get() { reads++; return "range"; }, enumerable: true });
  assert.throws(() => normalizeGuideAnchor(hostile), /accessors/); assert.equal(reads, 0);
  assert.throws(() => normalizeGuideAnchor(parallel("labels", { mapping: { value: 0, scale: { ...scale, domain: Array.from({ length: 10001 }, (_, i) => i) } } })), /exceed/);
  assert.throws(() => normalizeBandBoundaryMembers(Array.from({ length: 10001 }, () => ({ value: 1, edge: "start" }))), /exceed/);
  assert.throws(() => sampleGuideAnchor({ kind: "wrong", from: title(), to: title() }, .5), /Invalid/);
  assert.throws(() => sampleGuideAnchor(prepareGuideAnchor(title(), title()), NaN), /between/);
});

test("finite endpoint data cannot silently produce overflowing guide geometry", () => {
  const a = title(), b = title({ frame: { ...frame, y: Number.MAX_VALUE, height: Number.MAX_VALUE }, policy: { ...a.policy, offset: Number.MAX_VALUE } });
  assert.throws(() => resolveGuideAnchor(b), /finite coordinates/);
  assert.equal(middle(a, b).reason, "nonfinite-guide");
  assert.equal(sampleGuideAnchor(prepareGuideAnchor(a, b), 1).reason, "nonfinite-guide");
});

test("native floating edge separation remains an explicit layout fallback at intermediate time", () => {
  const source = [0.2857142857142857, 100.95238095238096], target = [1.5714285714285714, 105.23809523809524];
  const state = range => boundary({ scale: { ...scale, domain: ["a", "b", "c"], range },
    members: [{ value: "a", edge: "end" }, { value: "b", edge: "start" }] });
  const plan = prepareGuideAnchor(state(source), state(target));
  assert.equal(plan.kind, "guide-anchor");
  assert.equal(sampleGuideAnchor(plan, 0).kind, "guide-anchor");
  assert.equal(sampleGuideAnchor(plan, 1).kind, "guide-anchor");
  // The native owner deduplicates exact edges. At this range, two edges differ
  // by one ULP; do not invent a tolerance or silently choose either membership.
  assert.deepEqual(sampleGuideAnchor(plan, .37), { kind: "crossfade", reason: "guide-layout" });
});
