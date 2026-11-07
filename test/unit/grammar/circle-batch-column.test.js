import assert from 'node:assert/strict';
import test from 'node:test';
import { createCircleBatchColumn, validateCircleBatchColumn, MAX_CIRCLE_BATCH_ROWS } from '../../../src/grammar/schemas/circleBatch.js';

function withInherited(target, key, descriptor, run) {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, ...descriptor });
  try { return run(); }
  finally {
    if (previous === undefined) delete target[key];
    else Object.defineProperty(target, key, previous);
  }
}

test('constructed columns are frozen dense own data with the callback values', () => {
  const indexes = [], column = createCircleBatchColumn(4, index => { indexes.push(index); return [-0, 1.5, 2, 3][index]; });
  assert.deepEqual(indexes, [0, 1, 2, 3]);
  assert.equal(Object.isFrozen(column), true);
  assert.equal(Object.getPrototypeOf(column), Array.prototype);
  assert.deepEqual(Object.keys(column), ['0', '1', '2', '3']);
  assert.equal(Object.is(column[0], -0), true);
  for (let i = 0; i < column.length; i++) assert.equal(Object.getOwnPropertyDescriptor(column, i).writable, false);
  validateCircleBatchColumn(column, 'x');
});

test('length is checked before any value is produced', () => {
  for (const length of [0, -1, 1.5, MAX_CIRCLE_BATCH_ROWS + 1, Number.NaN, '2']) {
    let calls = 0;
    assert.throws(() => createCircleBatchColumn(length, () => { calls++; return 0; }), RangeError);
    assert.equal(calls, 0);
  }
  assert.equal(createCircleBatchColumn(MAX_CIRCLE_BATCH_ROWS, () => 1).length, MAX_CIRCLE_BATCH_ROWS);
});

test('only numeric primitives are accepted and failures publish nothing', () => {
  for (const value of ['1', 1n, null, undefined, {}, new Number(1)]) {
    assert.throws(() => createCircleBatchColumn(2, index => index === 0 ? 1 : value), TypeError);
  }
  const failure = new Error('stop');
  assert.throws(() => createCircleBatchColumn(3, index => { if (index === 1) throw failure; return index; }), error => error === failure);
});

test('inherited numeric setters cannot intercept constructed rows', () => {
  let intercepted = 0;
  const column = withInherited(Array.prototype, '0', { set() { intercepted++; }, get() { return 99; } },
    () => createCircleBatchColumn(2, index => index + 4));
  assert.equal(intercepted, 0);
  assert.equal(Object.getOwnPropertyDescriptor(column, '0').value, 4);
  validateCircleBatchColumn(column, 'y');
});

test('an inherited iterator cannot change the requested length', () => {
  const column = withInherited(Object.prototype, Symbol.iterator, { value: function* () { yield 7; yield 8; }, writable: true },
    () => createCircleBatchColumn(1, () => 3));
  assert.deepEqual([...column], [3]);
});

test('construction proof does not skip finite or radius checks', () => {
  assert.throws(() => validateCircleBatchColumn(createCircleBatchColumn(2, index => index ? Number.NaN : 0), 'x'), /finite numbers/);
  assert.throws(() => validateCircleBatchColumn(createCircleBatchColumn(2, index => index ? Infinity : 0), 'y'), /finite numbers/);
  assert.throws(() => validateCircleBatchColumn(createCircleBatchColumn(2, index => -index), 'radius'), /must not be negative/);
});

test('caller, copied and frozen arrays keep the full own-data boundary', () => {
  const constructed = createCircleBatchColumn(2, index => index);
  const copied = Array.from(constructed);
  Object.defineProperty(copied, '1', { get() { return 1; }, enumerable: true });
  assert.throws(() => validateCircleBatchColumn(copied, 'x'));
  const frozen = Object.freeze(Object.defineProperty([0, 1], 'extra', { value: 1, enumerable: true }));
  assert.throws(() => validateCircleBatchColumn(frozen, 'x'));
  const sparse = Object.freeze([0, , 2]);
  assert.throws(() => validateCircleBatchColumn(sparse, 'x'));
  validateCircleBatchColumn(Object.freeze([0, 1]), 'x');
});
