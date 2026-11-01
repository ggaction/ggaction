import test from 'node:test';
import assert from 'node:assert/strict';
import { animationOwnerKey as key, validateAnimationOwnerKey as validate, graphicAnimationOwnerKey, guideAnimationOwnerKey } from '../../../src/grammar/animation/ownerKey.js';

test('native mark and guide owner keys preserve exact namespaces independently of item grain and role', () => {
  const namespaces = ['comparison-left', 'panel-child'], owner = key(namespaces, 'points');
  const identity = { key: JSON.stringify([namespaces, 'points', 'item', ['rows', 'a']]), topology: 'circle', role: 'body', lineage: { data: 'rows', logicalDataId: 'rows', revision: 0, rowKeys: ['a'] } };
  assert.equal(graphicAnimationOwnerKey(identity), owner);
  assert.equal(graphicAnimationOwnerKey({ ...identity, role: 'label' }), owner);
  assert.equal(guideAnimationOwnerKey({ namespaces, owner: 'points', component: 'line', value: null, line: 0 }), owner);
  assert.equal(validate(owner), owner); assert.equal(key([], '__proto__'), '[[],"__proto__"]');
  assert.equal(graphicAnimationOwnerKey({ ...identity, lineage: { kind: 'resource', resource: { kind: 'geometry', id: 'world', revision: 0 } } }), owner);
  namespaces[0] = 'other'; assert.notEqual(key(namespaces, 'points'), owner);
});

test('owner selector validation rejects malformed or noncanonical keys and never picks a candidate', () => {
  for (const input of [null, {}, 1, '', '[', '{}', '[]', '[[],"a",1]', '[[""],"a"]', '[[1],"a"]', '[[],""]', '[[],1]', ' [[],"a"]']) assert.throws(() => validate(input));
  for (const [scope, owner] of [[null, 'a'], [{}, 'a'], [Array(1025).fill('a'), 'a'], [[], null], [[], '']]) assert.throws(() => key(scope, owner));
  assert.throws(() => key([], 'a'.repeat(10000001)), /work/);
  assert.throws(() => key([], '\0'.repeat(2000000)), /work/);
  assert.throws(() => validate('a'.repeat(10000001)), /work/);
  assert.throws(() => graphicAnimationOwnerKey({}), /identity/);
  assert.throws(() => guideAnimationOwnerKey({}), /field/);
});

test('owner preparation rejects host accessors and sparse arrays without executing them', () => {
  let reads = 0;
  const namespaces = []; Object.defineProperty(namespaces, 0, { enumerable: true, get() { reads++; return 'child'; } });
  assert.throws(() => key(namespaces, 'a'), /accessor/);
  assert.throws(() => key(new Array(1), 'a'), /dense/);
  const identity = { get key() { reads++; return '[]'; }, lineage: {} };
  assert.throws(() => graphicAnimationOwnerKey(identity), /accessor/);
  const lineage = { get rowKeys() { reads++; return []; } };
  assert.throws(() => graphicAnimationOwnerKey({ lineage }), /accessor/);
  assert.equal(reads, 0);
});
