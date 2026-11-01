import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInferenceExecution, inferenceWorkValidator, validateInferenceBytes } from '../../../../src/grammar/graph/inferenceBudget.js';
import { encodeValue } from '../../../../src/core/valueEncoding.js';
import { canonicalJSON } from '../../../../src/core/contentDigest.js';

const policy = {policy:'bounded-inference@1',maxWork:100_000_000,maxBytes:128*1024*1024};
const encodedBytes = value => Buffer.byteLength(canonicalJSON(encodeValue(value)));

test('inference execution is explicit, owned, closed and separate from the unchanged global work limit', () => {
  assert.equal(normalizeInferenceExecution(undefined),undefined);
  assert.equal(validateInferenceBytes(()=>{},undefined),undefined);
  assert.equal(inferenceWorkValidator()(10_000_000,'old work'),10_000_000);
  assert.throws(()=>inferenceWorkValidator()(10_000_001,'old work'),/10000000/);
  const normalized=normalizeInferenceExecution(policy);
  assert.deepEqual(normalized,policy);assert.notEqual(normalized,policy);assert.ok(Object.isFrozen(normalized));
  assert.equal(inferenceWorkValidator(normalized)(100_000_000,'bounded work'),100_000_000);
  assert.throws(()=>inferenceWorkValidator(normalized)(100_000_001,'bounded work'),/100000000/);
  for(const value of [NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>inferenceWorkValidator(policy)(value,'work'),/safe integer/);
  for(const input of [null,{},[],{...policy,policy:'other'},{policy:policy.policy,maxWork:1},{...policy,extra:1},
    ...[0,-1,Infinity,NaN,1.5,100_000_001].map(maxWork=>({...policy,maxWork})),
    ...[0,undefined,Infinity,134_217_729].map(maxBytes=>({...policy,maxBytes}))])assert.throws(()=>normalizeInferenceExecution(input));
  let calls=0;
  const accessor=Object.defineProperty({...policy},'maxWork',{enumerable:true,get(){calls++;return 1;}});
  assert.throws(()=>normalizeInferenceExecution(accessor),/accessors/);assert.equal(calls,0);
  Object.defineProperty(Object.prototype,'maxWork',{configurable:true,get(){calls++;return 1;}});
  try {assert.throws(()=>normalizeInferenceExecution({policy:policy.policy,maxBytes:policy.maxBytes}),/explicit/);} finally {delete Object.prototype.maxWork;}
  assert.equal(calls,0);
});

test('inference byte preflight matches the existing value codec including Unicode, tagged values and sparse arrays', () => {
  const shared={nested:['🙂','\ud800','\n\t"\\',2n,-0,NaN,Infinity,-Infinity,undefined]},sparse=[];sparse[3]='x';
  const values=[null,true,false,0,1e200,'é',[1,2],{},[],sparse,shared,{b:shared,a:shared},Object.assign(Object.create(null),{x:'y'})];
  for(const value of values){
    const exact=encodedBytes(value);
    assert.equal(validateInferenceBytes(value,policy),exact);
    assert.equal(validateInferenceBytes(value,{...policy,maxBytes:exact}),exact);
    if(exact>1)assert.throws(()=>validateInferenceBytes(value,{...policy,maxBytes:exact-1}),/encoded bytes/);
  }
  let seed=19;
  for(let i=0;i<80;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value={['k'+i]:[seed,seed%2===0,seed/17,'x'.repeat(seed%33),i%3?null:undefined]};
    assert.equal(validateInferenceBytes(value,policy),encodedBytes(value));
  }
});

test('inference byte preflight rejects hostile, cyclic, deep and oversized input before serialization', () => {
  let calls=0;const accessor=Object.defineProperty({},'x',{enumerable:true,get(){calls++;throw Error('read');}});
  assert.throws(()=>validateInferenceBytes(accessor,policy),/accessors/);assert.equal(calls,0);
  const cycle={};cycle.self=cycle;
  let deep={};for(let i=0;i<66;i++)deep={child:deep};
  const named=[];named.extra=1;
  for(const value of [cycle,deep,new Date(),Symbol('x'),()=>0,named])assert.throws(()=>validateInferenceBytes(value,policy));
  assert.throws(()=>validateInferenceBytes('x'.repeat(1000),{...policy,maxBytes:100}),/encoded bytes/);
  assert.throws(()=>validateInferenceBytes(new Array(1000),{...policy,maxBytes:100}),/encoded bytes/);
  const attributes={a:[{x:1}],b:'source'},before=structuredClone(attributes);
  validateInferenceBytes(attributes,policy);assert.deepEqual(attributes,before);assert.ok(!Object.isFrozen(attributes));
});
