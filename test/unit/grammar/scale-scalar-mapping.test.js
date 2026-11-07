import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneAndFreeze, isOwned } from '../../../src/core/immutable.js';
import { mapContinuousScaleValue, mapContinuousScaleValues } from '../../../src/grammar/scales/mapping.js';
import { mapTransformedScalar, mapTransformedValues, normalizeTransformParameters, transformParameterValues, validateTransformedDomain } from '../../../src/grammar/scales/transformed.js';
import { readFinitePair, validatePair } from '../../../src/grammar/scales/validation.js';

function outcome(run) {
  try { return { value: run() }; }
  catch (error) { return { error: [error.constructor.name, error.message] }; }
}
const same = (scalar, array) => assert.deepEqual(outcome(scalar), outcome(() => array()[0]));

const scales = [
  { type: 'linear', domain: [0, 10], range: [0, 100] },
  { type: 'linear', domain: [0, 10], range: [100, 0], clamp: true },
  { type: 'linear', domain: [5, 5], range: [0, 100] },
  { type: 'linear', domain: [0, 10], range: [0, 100], unknown: -1 },
  { type: 'linear', domain: [5, 5], range: [0, 100], unknown: -1 },
  { type: 'time', domain: [0, 86400000], range: [20, 380] },
  { type: 'log', domain: [1, 1000], range: [0, 300], base: 10 },
  { type: 'log', domain: [-1000, -1], range: [0, 300], base: 2, clamp: true },
  { type: 'pow', domain: [0, 4], range: [0, 1], exponent: 2 },
  { type: 'sqrt', domain: [0, 4], range: [0, 1] },
  { type: 'symlog', domain: [-10, 10], range: [0, 1], constant: 1 },
  { type: 'symlog', domain: [-10, 10], range: [0, 1], constant: 1, unknown: 'u' },
  { type: 'linear', domain: [0, 10], range: [2, 20], radialMapping: 'area' },
  { type: 'linear', domain: [0, 10], range: [0, 20], radialMapping: 'radius-length', clamp: true }
];
const values = [-20, -1, -0, 0, 0.5, 1, 3, 10, 999, 1e300, Number.NaN, Infinity, -Infinity];

test('single-value mapping equals the one-element array mapping for every value and scale', () => {
  for (const scale of scales) for (const value of values) {
    same(() => mapContinuousScaleValue(value, scale), () => mapContinuousScaleValues([value], scale));
  }
});

test('invalid scales fail with the same error class and message', () => {
  const invalid = [
    undefined,
    { type: 'linear', domain: [0], range: [0, 1] },
    { type: 'linear', domain: [0, 1], range: [0, Number.NaN] },
    { type: 'linear', domain: [0, 1], range: [0, 1], clamp: 'yes' },
    { type: 'log', domain: [0, 10], range: [0, 1], base: 10 },
    { type: 'log', domain: [-1, 10], range: [0, 1], base: 10 },
    { type: 'log', domain: [1, 10], range: [0, 1], base: 1 },
    { type: 'pow', domain: [2, 2], range: [0, 1], exponent: 2 },
    { type: 'pow', domain: [0, 2], range: [0, 1], exponent: -1 },
    { type: 'symlog', domain: [0, 2], range: [0, 1], constant: 0 },
    { type: 'sqrt', domain: [0, 2], range: [0, 1], clamp: 1 }
  ];
  for (const scale of invalid) for (const value of [1, Number.NaN]) {
    same(() => mapContinuousScaleValue(value, scale), () => mapContinuousScaleValues([value], scale));
  }
});

test('transformed scalar mapping matches reversed and parameterized array mapping', () => {
  for (const options of [{ type: 'log', base: 2 }, { type: 'pow', exponent: 3, reverse: true }, { type: 'linear', reverse: true }, { type: 'linear', reverse: 'no' }, { type: 'symlog', constant: 2, clamp: true }]) {
    for (const value of [0.5, 2, 8, -3]) {
      same(() => mapTransformedScalar(value, [1, 16], [0, 100], options), () => mapTransformedValues([value], [1, 16], [0, 100], options));
    }
  }
});

test('plain parameters equal the owned normalized parameters without registering them', () => {
  for (const [type, options] of [['linear', {}], ['log', {}], ['log', { base: 2 }], ['pow', { exponent: 3 }], ['sqrt', {}], ['symlog', { constant: 4 }]]) {
    const plain = transformParameterValues(type, options), owned = normalizeTransformParameters(type, options);
    assert.deepEqual(plain, owned);
    assert.equal(isOwned(plain), false);
    assert.equal(isOwned(owned), true);
  }
  for (const [type, options] of [['ordinal', {}], ['log', { exponent: 2 }], ['pow', []]]) {
    assert.deepEqual(outcome(() => transformParameterValues(type, options)), outcome(() => normalizeTransformParameters(type, options)));
  }
});

test('owned pairs keep their identity and plain reads stay detached', () => {
  const owned = cloneAndFreeze([1, 2]);
  assert.equal(validatePair(owned, 'Pair'), owned);
  assert.equal(validateTransformedDomain('log', owned), owned);
  const caller = [3, 4], read = readFinitePair(caller, 'Pair');
  assert.deepEqual(read, [3, 4]);
  assert.notEqual(read, caller);
  assert.equal(isOwned(read), false);
  assert.throws(() => readFinitePair([1], 'Pair'), /Pair must be "auto" or two finite numbers/);
});
