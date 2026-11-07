import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneAndFreeze, freezeOwned, isOwned } from '../../../src/core/immutable.js';

test('ownership is exact-object, frozen and invisible to enumeration and serialization', () => {
  const value = freezeOwned({ a: 1, nested: { b: 2 } });
  assert.equal(isOwned(value), true);
  assert.equal(Object.isFrozen(value), true);
  // A parent never vouches for a descendant it did not own.
  assert.equal(isOwned(value.nested), false);
  assert.deepEqual(Reflect.ownKeys(value), ['a', 'nested']);
  assert.deepEqual(Object.getOwnPropertySymbols(value), []);
  assert.equal(JSON.stringify(value), '{"a":1,"nested":{"b":2}}');
  assert.equal(freezeOwned(value), value);
});

test('copies, clones and caller-frozen objects are never owned', () => {
  const owned = cloneAndFreeze({ a: [1, 2], b: { c: 3 } });
  assert.equal(isOwned(owned), true);
  assert.equal(isOwned(owned.a), true);
  assert.equal(isOwned(owned.b), true);
  for (const copy of [{ ...owned }, structuredClone(owned), JSON.parse(JSON.stringify(owned)), Object.freeze({ ...owned }), Object.create(owned), [...owned.a]]) {
    assert.equal(isOwned(copy), false);
  }
  const callerFrozen = Object.freeze({ x: 1 });
  assert.equal(isOwned(callerFrozen), false);
  const clone = cloneAndFreeze(callerFrozen);
  assert.notEqual(clone, callerFrozen);
  assert.equal(isOwned(callerFrozen), false);
  assert.equal(isOwned(clone), true);
});

test('an already frozen value can still be owned exactly', () => {
  const frozen = Object.freeze([1, 2]);
  assert.equal(freezeOwned(frozen), frozen);
  assert.equal(isOwned(frozen), true);
});

test('proxies are owned only as the exact proxy object', () => {
  const target = {}, proxy = new Proxy(target, {});
  freezeOwned(proxy);
  assert.equal(isOwned(proxy), true);
  assert.equal(isOwned(target), false);
  const plainTarget = {}, otherProxy = new Proxy(plainTarget, {});
  freezeOwned(plainTarget);
  assert.equal(isOwned(otherProxy), false);
});

test('a failing freeze never establishes ownership', () => {
  const refusing = new Proxy({}, { preventExtensions() { return false; } });
  assert.throws(() => freezeOwned(refusing), TypeError);
  assert.equal(isOwned(refusing), false);
});

test('primitives and null are never owned', () => {
  for (const value of [null, undefined, 0, 'x', true, 1n, Symbol('s')]) {
    assert.equal(isOwned(value), false);
    assert.equal(freezeOwned(value), value);
  }
});
