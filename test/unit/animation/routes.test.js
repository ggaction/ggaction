import assert from "node:assert/strict";
import test from "node:test";
import { ANIMATION_ROUTE_VERSION, prepareRouteInterpolation, sampleRouteInterpolation } from "../../../src/grammar/animation/routes.js";

const route = points => ({ edgeKey: "edge", sourceKey: "a", targetKey: "b", points });
const point = (x, y) => ({ x, y });
const from = route([point(0, 0), point(10, 0)]);
const to = route([point(0, 10), point(5, 10), point(10, 10)]);

test("route planning uses the shared normalized arc-length grid rather than command positions", () => {
  const plan = prepareRouteInterpolation(from, to, { samples: 5 });
  assert.equal(plan.version, ANIMATION_ROUTE_VERSION);
  assert.deepEqual(plan.source, [point(0, 0), point(2.5, 0), point(5, 0), point(7.5, 0), point(10, 0)]);
  assert.deepEqual(plan.target, [point(0, 10), point(2.5, 10), point(5, 10), point(7.5, 10), point(10, 10)]);
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(0, 5), target: point(10, 5) }).points,
    [point(0, 5), point(2.5, 5), point(5, 5), point(7.5, 5), point(10, 5)]);
});

test("route endpoints retain exact original topology and literal coordinates", () => {
  const plan = prepareRouteInterpolation(from, to);
  assert.deepEqual(sampleRouteInterpolation(plan, 0, { source: from.points[0], target: from.points.at(-1) }).points, from.points);
  assert.deepEqual(sampleRouteInterpolation(plan, 1, { source: to.points[0], target: to.points.at(-1) }).points, to.points);
  assert.throws(() => sampleRouteInterpolation(plan, 0, { source: point(1, 0), target: point(10, 0) }), /endpoint anchors/);
});

test("each intermediate route attaches to the supplied current node anchors with a smooth correction", () => {
  const plan = prepareRouteInterpolation(from, to, { samples: 3 });
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(1, 6), target: point(13, 4) }).points,
    [point(1, 6), point(7, 5), point(13, 4)]);
  for (const u of [.1, .25, .5, .75, .9]) {
    const source = point(u, 10 * u), target = point(10 + u, 10 * u);
    const sampled = sampleRouteInterpolation(plan, u, { source, target });
    assert.equal(sampled.kind, "route");
    assert.deepEqual(sampled.points[0], source); assert.deepEqual(sampled.points.at(-1), target);
  }
});

test("repeated samples retain arc-length correspondence without introducing artificial path commands", () => {
  const plan = prepareRouteInterpolation(route([point(0, 0), point(0, 0), point(2, 0), point(10, 0)]), to, { samples: 3 });
  assert.deepEqual(plan.source, [point(0, 0), point(5, 0), point(10, 0)]);
});

test("edge identity, collapsed geometry and excessive stretch select an explicit safe fade", () => {
  for (const key of ["edgeKey", "sourceKey", "targetKey"]) {
    assert.deepEqual(prepareRouteInterpolation(from, { ...to, [key]: "other" }), { kind: "crossfade", reason: "edge-identity" });
  }
  assert.deepEqual(prepareRouteInterpolation(route([point(1, 1), point(1, 1)]), to), { kind: "crossfade", reason: "collapsed-route" });
  assert.deepEqual(prepareRouteInterpolation(from, route([point(1, 1), point(1, 1)])), { kind: "crossfade", reason: "collapsed-route" });
  const plan = prepareRouteInterpolation(from, to, { samples: 3 });
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(0, 0), target: point(0, 0) }), { kind: "crossfade", reason: "collapsed-route" });
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(-100, 5), target: point(100, 5) }), { kind: "crossfade", reason: "route-stretch" });
});

test("prepared route values and sampled points are isolated immutable snapshots", () => {
  const a = structuredClone(from), b = structuredClone(to), plan = prepareRouteInterpolation(a, b);
  a.points[0].x = 99; b.points[1].y = 99;
  assert.deepEqual(plan.from, from.points); assert.deepEqual(plan.to, to.points);
  const result = sampleRouteInterpolation(plan, .5, { source: point(0, 5), target: point(10, 5) });
  for (const value of [plan, plan.source, plan.source[0], plan.from, result, result.points, result.points[0]]) assert.ok(Object.isFrozen(value));
  assert.deepEqual(structuredClone(plan), plan);
  assert.deepEqual(sampleRouteInterpolation(structuredClone(plan), .5, { source: point(0, 5), target: point(10, 5) }), result);
});

test("extreme finite coordinates select a safe fade before arithmetic overflow can reach a graphic", () => {
  assert.throws(() => prepareRouteInterpolation(from, to, { maxStretch: Number.MAX_VALUE }), /stretch bound/);
  const negative = route([point(-1e308, 0), point(-1e308 + 1e293, 0)]);
  assert.deepEqual(sampleRouteInterpolation(prepareRouteInterpolation(negative, negative), .5,
    { source: point(1e308, 0), target: point(1e308, 0) }), { kind: "crossfade", reason: "nonfinite-route" });
  const bowed = route([point(0, 0), point(1e307, 0), point(0, 0)]);
  const plan = prepareRouteInterpolation(bowed, bowed, { samples: 3 });
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(1.75e308, 0), target: point(1.75e308, 0) }),
    { kind: "crossfade", reason: "nonfinite-route" });
  assert.deepEqual(sampleRouteInterpolation(plan, .5, { source: point(-1.7e308, 0), target: point(1.7e308, 0) }),
    { kind: "crossfade", reason: "nonfinite-route" });
});

test("route admission rejects malformed keys, points, options, sample limits and anchor accessors", () => {
  for (const invalid of [null, {}, { ...from, edgeKey: "" }, { ...from, sourceKey: 1 }, { ...from, extra: true }, { ...from, points: [point(0, 0)] }, { ...from, points: [point(0, 0), point(NaN, 1)] }]) {
    assert.throws(() => prepareRouteInterpolation(invalid, to)); assert.throws(() => prepareRouteInterpolation(from, invalid));
  }
  for (const options of [null, { extra: true }, { samples: 1 }, { samples: 1.5 }, { samples: 1000000000 }, { maxStretch: .9 }, { maxStretch: Infinity }]) assert.throws(() => prepareRouteInterpolation(from, to, options));
  const plan = prepareRouteInterpolation(from, to);
  for (const u of [-1, 2, NaN]) assert.throws(() => sampleRouteInterpolation(plan, u, { source: point(0, 0), target: point(10, 0) }));
  for (const invalid of [null, {}, { ...plan, version: "unknown" }, { kind: "crossfade" }]) assert.throws(() => sampleRouteInterpolation(invalid, .5, {}));
  for (const changes of [{ edgeKey: "" }, { maximumLength: Infinity }, { maximumLength: 0 }, { source: [] },
    { source: [point(0, 0), point(10, 0)] }, { source: [point(1, 0), point(5, 0), point(10, 0)] },
    { source: [point(0, 0), point(5, 0), point(11, 0)] },
    { target: [point(1, 10), point(5, 10), point(10, 10)] },
    { target: [point(0, 10), point(5, 10), point(11, 10)] }, { extra: true }]) {
    assert.throws(() => sampleRouteInterpolation({ ...plan, ...changes }, .5, { source: point(0, 5), target: point(10, 5) }));
  }
  for (const anchors of [null, {}, { source: point(0, 0), target: point(10, 0), extra: true }, { source: point(NaN, 0), target: point(10, 0) }]) assert.throws(() => sampleRouteInterpolation(plan, .5, anchors));
  let calls = 0; const source = Object.defineProperty({ y: 0 }, "x", { enumerable: true, get() { calls++; return 0; } });
  assert.throws(() => sampleRouteInterpolation(plan, .5, { source, target: point(10, 0) }), /accessors/); assert.equal(calls, 0);
});


test("stationary nonuniform routes preserve every native corner between exact anchors",()=>{
 const endpoint={edgeKey:"edge",sourceKey:"a",targetKey:"b",points:[{x:0,y:0},{x:1,y:0},{x:1,y:100}]};
 const plan=prepareRouteInterpolation(endpoint,endpoint);
 const sample=sampleRouteInterpolation(plan,.5,{source:{x:0,y:0},target:{x:1,y:100}});
 assert.deepEqual(sample.points,endpoint.points);
 assert.notDeepEqual(plan.source,endpoint.points);
 const shifted=sampleRouteInterpolation(plan,.5,{source:{x:1,y:1},target:{x:2,y:101}});
 assert.deepEqual(shifted.points[0],{x:1,y:1});assert.deepEqual(shifted.points.at(-1),{x:2,y:101});
});
