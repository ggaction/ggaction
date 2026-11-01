import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceForceRoutes, forceRouteSchedule } from '../../../../../src/grammar/graph/routes/forceDirected.js';
import { scalarRouteForceStep } from '../../../../oracles/edge-routes.js';

const point = (x, y) => ({ x, y });
function neighbors(count, reversed) {
  const values = Array.from({ length: count }, () => []);
  for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
    const compatibility = (a + b) % 3 === 0 ? 0.3 : 0.9, reverse = reversed && (a + b) % 2 === 1;
    values[a].push({ edge: b, compatibility, reverse }); values[b].push({ edge: a, compatibility, reverse });
  }
  return values;
}

test('paired forces preserve scalar binary64 accumulation through every fixed cycle and reverse correspondence', () => {
  for (const reverse of [false, true]) for (const { internalSamples, iterations, step } of forceRouteSchedule()) {
    let routes = Array.from({ length: 5 }, (_, edge) => Array.from({ length: internalSamples + 2 }, (_, index) => {
      const t = index / (internalSamples + 1);
      return point(reverse && edge % 2 ? 1 - t : t, edge * 0.075 + (index % 3) * 0.0125);
    }));
    const lengths = [1, 1.1, 0.9, 1.25, 0.875], links = neighbors(routes.length, reverse);
    const before = structuredClone({ routes, lengths, links });
    let expected = routes;
    for (let iteration = 0; iteration < iterations; iteration++) {
      const oracle = scalarRouteForceStep(expected, lengths, links, step);
      const actual = advanceForceRoutes(routes, lengths, links, step, true);
      assert.deepEqual(actual, oracle, `${reverse}/${internalSamples}/${iteration}`);
      routes = actual.routes; expected = oracle.routes;
    }
    assert.deepEqual(lengths, before.lengths); assert.deepEqual(links, before.links);
    assert.deepEqual(routes.map(line => [line[0], line.at(-1)]), before.routes.map(line => [line[0], line.at(-1)]));
  }
});

test('coincident samples, signed zero, spring-only routes and clipped force magnitudes remain exact and immutable', () => {
  const routes = [[point(-0, -0), point(0, 0), point(1, 0)], [point(1, 0.1), point(-0, 0.1), point(-0, -0)],
    [point(0, 0), point(0, 0), point(0, 0)]];
  const links = neighbors(3, true), lengths = [1, 1, 0], before = structuredClone(routes);
  for (const step of [0, 0.001, 0.1, 10]) {
    const expected = scalarRouteForceStep(routes, lengths, links, step);
    assert.deepEqual(advanceForceRoutes(routes, lengths, links, step, true), expected);
    assert.deepEqual(routes, before);
  }
  assert.ok(Object.is(advanceForceRoutes(routes, lengths, links, 0.1, true).routes[0][0].x, -0));
  assert.throws(() => advanceForceRoutes(routes, lengths, links, Infinity, true), /finite/);
  assert.deepEqual(advanceForceRoutes([routes[0]], [1], [[]], 0.1, true), scalarRouteForceStep([routes[0]], [1], [[]], 0.1));
});

test('private scalar callers retain asymmetric and unsorted neighbor behavior', () => {
  const routes = [0, 0.1, 0.3].map(y => [point(0, y), point(0.5, y), point(1, y)]);
  const links = [[{ edge: 2, compatibility: 0.8 }, { edge: 1, compatibility: 0.2 }], [], [{ edge: 1, compatibility: 0.4 }]];
  assert.deepEqual(advanceForceRoutes(routes, [1, 1, 1], links, 0.01), scalarRouteForceStep(routes, [1, 1, 1], links, 0.01));
});

test('pair reuse removes only the duplicate distance evaluations while preserving all force contributions', () => {
  const routes = [0, 0.1, 0.2].map(y => [point(0, y), point(0.25, y), point(0.75, y), point(1, y)]);
  const links = neighbors(3, false), lengths = [1, 1, 1], original = Math.hypot;
  let calls = 0;
  try {
    Math.hypot = (...values) => { calls++; return original(...values); };
    const paired = advanceForceRoutes(routes, lengths, links, 0.01, true);
    assert.equal(calls, 12); // Six unique pair samples plus six displacements.
    calls = 0;
    const scalar = scalarRouteForceStep(routes, lengths, links, 0.01);
    assert.equal(calls, 18); // Twelve directed pair samples plus six displacements.
    assert.deepEqual(paired, scalar);
  } finally { Math.hypot = original; }
});
