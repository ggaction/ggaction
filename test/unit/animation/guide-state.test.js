import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGuideAnimationState, normalizeGuideIdentity, guideAnimationKey, prepareGuideInterpolation, sampleGuideInterpolation, resolveGuideAnimationGeometry, guideAnimationMatchesNode, isGuideAnimationFallbackReason } from "../../../src/grammar/animation/guideState.js";
const identity = (component, value = 5, line = 0) => ({ namespaces: [], owner: "main", component, value, line });
const frame = { x: 20, y: 30, width: 200, height: 100 };
const scale = { type: "linear", domain: [0, 10], range: [20, 220] };
const tick = (extra = {}) => ({ identity: identity("ticks"), kind: "ticks", channel: "x", frame,
  mapping: { value: 5, scale }, policy: { side: "bottom", alongOffset: 2, length: 6 }, ...extra });
const sample = (a, b, t = .5) => sampleGuideInterpolation(prepareGuideInterpolation(a, b), t);

test("native Cartesian tick sampling preserves typed value and maps the intermediate scale", () => {
  const a = tick(), b = tick({ frame: { x: 40, y: 50, width: 400, height: 200 },
    mapping: { value: 5, scale: { type: "linear", domain: [0, 20], range: [40, 640] } } });
  const before = JSON.stringify([a, b]), result = sample(a, b);
  assert.deepEqual(result.properties, { x1: 165.33333333333331, y1: 190, x2: 165.33333333333331, y2: 196 });
  assert.equal(result.state.mapping.value, 5);
  assert.deepEqual(result.state.mapping.scale.domain, [0, 15]);
  assert.notEqual(result.properties.x1, (resolveGuideAnimationGeometry(a).properties.x1 + resolveGuideAnimationGeometry(b).properties.x1) / 2);
  assert.equal(JSON.stringify([a, b]), before);
  assert.ok(Object.isFrozen(result.state.mapping.scale.domain));
});

test("log guide mapping uses a geometric domain midpoint rather than a pixel tween", () => {
  const a = tick({ identity: identity("ticks", 10), mapping: { value: 10, scale: { type: "log", domain: [1, 100], range: [0, 200], base: 10 } } });
  const b = { ...a, mapping: { value: 10, scale: { ...a.mapping.scale, domain: [1, 10000] } } };
  const result = sample(a, b);
  assert.ok(Math.abs(result.state.mapping.scale.domain[1] - 1000) < 1e-12);
  assert.ok(Math.abs(result.properties.x1 - (200 / 3 + 2)) < 1e-12);
  assert.equal(sample(a, b, 0).properties.x1, 102);
  assert.equal(sample(a, b, 1).properties.x1, 52);
});

test("guide keys distinguish typed values, scopes, component and multiline roles", () => {
  const keys = [identity("ticks", 1), identity("ticks", "1"), identity("ticks", -0), identity("ticks", 0),
    identity("labels", 1), identity("labels", 1, 1), { ...identity("ticks", 1), namespaces: ["panels-child"] }].map(guideAnimationKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.throws(() => normalizeGuideIdentity({ ...identity("line"), value: 5 }), /identity/);
  assert.throws(() => normalizeGuideIdentity({ ...identity("ticks"), line: 1 }), /identity/);
  assert.throws(() => normalizeGuideIdentity({ ...identity("ticks"), value: Infinity }), /identity/);
});

test("native Cartesian grid, baseline, and multiline label use shared geometry", () => {
  const grid = tick({ kind: "grid", identity: identity("grid"), channel: "y", policy: { alongOffset: -3 } });
  assert.deepEqual(resolveGuideAnimationGeometry(grid).properties, { x1: 20, y1: 117, x2: 220, y2: 117 });
  const baseline = { identity: identity("line", null), kind: "line", channel: "y", frame, range: [30, 130], policy: { side: "right" } };
  assert.deepEqual(resolveGuideAnimationGeometry(baseline).properties, { x1: 220, y1: 30, x2: 220, y2: 130 });
  const label = tick({ kind: "labels", identity: identity("labels", 5, 1), policy: { side: "bottom", alongOffset: 2, offset: 18, lineCount: 3, lineHeight: 12, align: null } });
  assert.deepEqual(resolveGuideAnimationGeometry(label).properties, { x: 122, y: 160, textAlign: "center", textBaseline: "top" });
  const left = { ...label, channel: "y", policy: { ...label.policy, side: "left", align: "right" } };
  assert.deepEqual(resolveGuideAnimationGeometry(left).properties, { x: 2, y: 122, textAlign: "right", textBaseline: "middle" });
  assert.equal(prepareGuideInterpolation(label, { ...label, policy: { ...label.policy, lineCount: 4 } }).reason, "guide-layout");
});

const polar = (kind, channel, value, range, policy) => ({ identity: identity(kind, kind === "line" ? null : value), kind, channel,
  frame: { centerX: 100, centerY: 100, availableRadius: 80 }, ...(kind === "line" ? { range } : { mapping: { value, scale: { type: "linear", domain: [0, 10], range } } }), policy });
test("polar guides retain native spoke, radial circle, tick and label geometry", () => {
  const spoke = polar("grid", "theta", 2.5, [0, 360], {});
  const radial = polar("grid", "radius", 5, [0, 80], {});
  assert.deepEqual(resolveGuideAnimationGeometry(spoke).properties, { x1: 100, y1: 100, x2: 180, y2: 100 });
  const commands = resolveGuideAnimationGeometry(radial).properties.commands;
  assert.equal(commands[0].op, "M");
  assert.equal(commands.filter(command => command.op === "C").length, 4);
  assert.equal(commands.at(-1).op, "Z");
  const thetaTick = polar("ticks", "theta", 2.5, [0, 360], { length: 6 });
  assert.deepEqual(resolveGuideAnimationGeometry(thetaTick).properties, { x1: 180, y1: 100, x2: 186, y2: 100 });
  const radialTick = polar("ticks", "radius", 5, [0, 80], { angle: 90, length: 6 });
  assert.deepEqual(resolveGuideAnimationGeometry(radialTick).properties, { x1: 140, y1: 97, x2: 140, y2: 103 });
  const label = polar("labels", "theta", 2.5, [0, 360], { offset: 10, align: null });
  assert.deepEqual(resolveGuideAnimationGeometry(label).properties, { x: 190, y: 100, textAlign: "left", textBaseline: "middle" });
  const rlabel = polar("labels", "radius", 5, [0, 80], { angle: 90, offset: 10, align: "left" });
  assert.deepEqual(resolveGuideAnimationGeometry(rlabel).properties, { x: 140, y: 90, textAlign: "left", textBaseline: "bottom" });
  const zero = polar("grid", "radius", 0, [0, 80], {});
  assert.throws(() => resolveGuideAnimationGeometry(zero), /positive/);
});

test("radial axis angle follows shortest seam and preserves exact endpoint meaning", () => {
  const a = polar("line", "radius", null, [20, 80], { angle: 350 });
  const b = { ...a, frame: { centerX: 120, centerY: 140, availableRadius: 100 }, range: [30, 100], policy: { angle: 10 } };
  const middle = sample(a, b);
  assert.equal(middle.state.policy.angle, 360);
  for (const [key, value] of Object.entries({ x1: 110, y1: 95, x2: 110, y2: 30 })) assert.ok(Math.abs(middle.properties[key] - value) < 1e-12);
  assert.deepEqual(sample(a, b, 0).state, normalizeGuideAnimationState(a));
  assert.deepEqual(sample(a, b, 1).state, normalizeGuideAnimationState(b));
  assert.equal(resolveGuideAnimationGeometry(polar("line", "theta", null, [], {})).type, "path");
});

test("discrete guide values use native band centers and reject domain order changes", () => {
  const a = tick({ identity: identity("ticks", "b"), mapping: { value: "b", scale: { type: "band", domain: ["a", "b"], range: [0, 200], paddingInner: 0, paddingOuter: 0, align: .5 } } });
  const b = { ...a, mapping: { ...a.mapping, scale: { ...a.mapping.scale, range: [0, 400] } } };
  assert.equal(sample(a, b).properties.x1, 227);
  assert.equal(prepareGuideInterpolation(a, { ...b, mapping: { ...b.mapping, scale: { ...b.mapping.scale, domain: ["b", "a"] } } }).reason, "ordinal-domain");
  assert.equal(prepareGuideInterpolation(tick(), { ...tick(), channel: "y", policy: { ...tick().policy, side: "left" } }).reason, "guide-policy");
});

test("guide transport rejects accessors, extras, inconsistent typed identity and corrupt geometry", () => {
  let reads = 0;
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), get policy() { reads++; return tick().policy; } }), /own data/);
  assert.equal(reads, 0);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), extra: 1 }), /Unknown/);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), identity: identity("ticks", 6) }), /differs/);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), frame: { ...frame, width: -1 } }), /nonnegative/);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), policy: { ...tick().policy, side: "left" } }), /side/);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), policy: { ...tick().policy, length: NaN } }), /finite/);
  const plan = prepareGuideInterpolation(tick(), tick());
  assert.throws(() => sampleGuideInterpolation({ ...plan, version: "unknown" }, .5), /kernel/);
  assert.throws(() => sampleGuideInterpolation(plan, 1.1), /between/);
  const node = resolveGuideAnimationGeometry(tick());
  assert.ok(guideAnimationMatchesNode(tick(), node));
  assert.equal(guideAnimationMatchesNode(tick(), { ...node, properties: { ...node.properties, x1: 99 } }), false);
  assert.ok(isGuideAnimationFallbackReason("guide-policy"));
  assert.equal(isGuideAnimationFallbackReason("unknown"), false);
});

test("guide geometry rejects overflow and closed-schema corruption before exposing partial numbers", () => {
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), channel: "unknown" }), /channel/);
  assert.throws(() => normalizeGuideAnimationState({ ...tick(), policy: { side: "bottom", length: 6 } }), /every field/);
  assert.throws(() => normalizeGuideAnimationState({ identity: identity("ticks"), reason: "unknown" }), /reason/);
  assert.throws(() => resolveGuideAnimationGeometry({ identity: identity("ticks"), reason: "guide-unavailable" }), /Unavailable/);
  assert.throws(() => normalizeGuideAnimationState(polar("line", "radius", null, [0, 90], { angle: 0 })), /outside/);
  assert.throws(() => normalizeGuideAnimationState(polar("line", "theta", null, [0], {})), /exact range/);
  const huge = tick({ frame: { ...frame, y: Number.MAX_VALUE, height: Number.MAX_VALUE } });
  assert.throws(() => resolveGuideAnimationGeometry(huge), /finite coordinates/);
  assert.equal(sample(huge, huge).reason, "nonfinite-guide");
  const a = tick(), b = { ...a, policy: { ...a.policy, side: "top" } };
  assert.throws(() => sampleGuideInterpolation({ kind: "guide", version: prepareGuideInterpolation(a, a).version, from: a, to: b }, .5), /Incompatible/);
});
