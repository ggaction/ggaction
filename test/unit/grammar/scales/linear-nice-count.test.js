import assert from "node:assert/strict";
import test from "node:test";
import {
  niceLinearCountDomain, normalizeScaleNice, resolveContinuousDomain
} from "../../../../src/grammar/scales/continuous.js";

const cases = [
  [[0, 133], 10, [0, 140]], [[0, 108], 10, [0, 110]],
  [[0, 171], 10, [0, 180]], [[0, 107], 10, [0, 110]],
  [[0, 139], 10, [0, 140]], [[0, 116], 10, [0, 120]],
  [[-108, 0], 10, [-110, 0]], [[-7, 31], 10, [-10, 35]],
  [[3, 97], 10, [0, 100]], [[0.7, 0.9], 10, [0.7, 0.9]],
  [[0.71, 0.89], 10, [0.7, 0.9]], [[1, 9], 4, [0, 10]],
  [[1, 9], 10, [1, 9]], [[0, 108], 2, [0, 200]],
  [[108, 0], 10, [110, 0]], [[4, 4], 10, [4, 4]],
  [[0, Math.sqrt(2) * 10], 10, [0, 16]],
  [[0, Math.sqrt(10) * 10], 10, [0, 35]],
  [[0, Math.sqrt(50) * 10], 10, [0, 80]]
];
test("count density matches literal integer, reciprocal-decimal and threshold targets", () => {
  for (const [domain, count, expected] of cases) {
    const input = [...domain], actual = niceLinearCountDomain(input, count);
    assert.deepEqual(actual, expected, JSON.stringify({domain,count}));
    assert.deepEqual(input, domain);assert(Object.isFrozen(actual));
    assert.deepEqual(niceLinearCountDomain(actual, count), actual);
  }
});
test("boolean and omitted domain rounding preserve the established policy", () => {
  const maxima = [133,108,171,107,139,116], legacy = [150,120,200,120,150,120];
  for (const [i,maximum] of maxima.entries()) {
    const options = {domain:"auto",values:[0,maximum],type:"linear",zero:true};
    assert.deepEqual(resolveContinuousDomain({...options,nice:true}),[0,legacy[i]]);
    assert.deepEqual(resolveContinuousDomain({...options,nice:false}),[0,maximum]);
    assert.deepEqual(resolveContinuousDomain(options),[0,maximum]);
  }
});
test("zero precedes count rounding while explicit and constant domains keep precedence", () => {
  const options={values:[3,97],type:"linear",nice:{count:10}};
  assert.deepEqual(resolveContinuousDomain({...options,domain:[97,3],zero:true}),[97,3]);
  assert.deepEqual(resolveContinuousDomain({...options,domain:"auto",zero:true}),[0,100]);
  assert.deepEqual(resolveContinuousDomain({...options,domain:"auto",values:[4,4]}),[4,4]);
  assert.deepEqual(resolveContinuousDomain({...options,domain:"auto",values:[4,4],zero:true}),[0,4]);
});
test("finite extremes and safe count limits retain every observed endpoint without overflow", () => {
  const domains=[[-Number.MAX_VALUE,Number.MAX_VALUE],[0,Number.MAX_VALUE],[-Number.MAX_VALUE,0],
    [0,Number.MIN_VALUE],[Number.MIN_VALUE,2*Number.MIN_VALUE],[-2*Number.MIN_VALUE,-Number.MIN_VALUE],
    [1,1+Number.EPSILON],[1e-300,2e-300],[-1e-300,1e-300],[1e300,1.7e300]];
  for(const domain of domains)for(const count of[1,2,10,100,Number.MAX_SAFE_INTEGER]){
    const result=niceLinearCountDomain(domain,count);
    assert(result.every(Number.isFinite));assert(result[0]<=domain[0]);assert(result[1]>=domain[1]);
    assert.deepEqual(niceLinearCountDomain(result,count),result);
  }
});
test("deterministic domains remain finite, outward and idempotent over decimal magnitudes", () => {
  for(let exponent=-300;exponent<=300;exponent+=20)for(const count of[1,3,7,10,64]){
    const magnitude=10**exponent,domain=[-.37*magnitude,1.73*magnitude],result=niceLinearCountDomain(domain,count);
    assert(result.every(Number.isFinite));assert(result[0]<=domain[0]&&result[1]>=domain[1]);
    assert.deepEqual(niceLinearCountDomain(result,count),result);
  }
});
test("count policy is copied and frozen without changing caller-owned inputs",()=>{
  const input={count:10},normalized=normalizeScaleNice("linear",input);
  assert.notEqual(normalized,input);assert(Object.isFrozen(normalized));assert(!Object.isFrozen(input));
  input.count=20;assert.deepEqual(normalized,{count:10});
  assert.equal(normalizeScaleNice("linear",true),true);assert.equal(normalizeScaleNice("linear",false),false);
});
for(const value of[null,[],{},"auto",10,{count:0},{count:-1},{count:.5},{count:Infinity},
  {count:NaN},{count:Number.MAX_SAFE_INTEGER+1},{count:"10"},{count:10,extra:true},{count:10,[Symbol("extra")]:1}]){
  test("rejects malformed count policy "+String(value),()=>assert.throws(()=>normalizeScaleNice("linear",value)));
}
test("count objects never silently apply to temporal, transformed or appearance scale types",()=>{
  for(const type of["time","sqrt","pow","log","symlog","band","point","ordinal","sequential","threshold"])
    assert.throws(()=>normalizeScaleNice(type,{count:10}),/linear position/);
});
