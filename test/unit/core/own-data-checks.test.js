import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneAndFreeze, freezeOwned } from '../../../src/core/immutable.js';
import { ownArray, ownRecord } from '../../../src/core/ownData.js';

test('a passed check is reused only for the exact owned value', () => {
  const owned = cloneAndFreeze({ a: [1, 2] });
  for (let i = 0; i < 3; i++) { assert.equal(ownRecord(owned, 'Owned'), owned); assert.equal(ownArray(owned.a, 'Owned'), owned.a); }
  // Unowned values, including caller-frozen ones, are checked on every call.
  const caller = Object.freeze({ a: 1 });
  ownRecord(caller, 'Caller');
  const mutable = { a: 1 };
  ownRecord(mutable, 'Mutable');
  Object.defineProperty(mutable, 'b', { get: () => 1, enumerable: true });
  assert.throws(() => ownRecord(mutable, 'Mutable'), /accessors are not supported/);
  const array = [1, 2];
  ownArray(array, 'Array');
  array.extra = true;
  assert.throws(() => ownArray(array, 'Array'), /extra properties/);
});

test('a sparse owned array passing a sparse check never skips the dense check', () => {
  const sparse = freezeOwned([1, , 3]);
  assert.equal(ownArray(sparse, 'Sparse', false), sparse);
  assert.equal(ownArray(sparse, 'Sparse', false), sparse);
  assert.throws(() => ownArray(sparse, 'Sparse'), /must be dense/);
  const dense = freezeOwned([1, 2]);
  ownArray(dense, 'Dense');
  assert.equal(ownArray(dense, 'Dense', false), dense);
});

test('owned values that failed a check keep failing', () => {
  const accessor = freezeOwned(Object.defineProperty({}, 'x', { get: () => 1, enumerable: true }));
  for (let i = 0; i < 2; i++) assert.throws(() => ownRecord(accessor, 'Accessor'), /accessors are not supported/);
  const subclassed = freezeOwned(Object.setPrototypeOf([1], Object.create(Array.prototype)));
  for (let i = 0; i < 2; i++) assert.throws(() => ownArray(subclassed, 'Subclassed'), /ordinary array/);
  const record = cloneAndFreeze({ a: 1 });
  ownRecord(record, 'Record');
  assert.throws(() => ownArray(record, 'Record'), /ordinary array/);
});
