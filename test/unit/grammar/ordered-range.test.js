import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOrderedRange, orderedRangeContains } from "../../../src/grammar/orderedRange.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../../src/grammar/markSelection.js";
import { normalizeFilterTransform, deriveFilteredRows } from "../../../src/grammar/filter.js";

test("ordered ranges independently include each endpoint with literal numeric and string results", () => {
  for (const [minInclusive, maxInclusive, expected] of [[true,true,[1,2,3]],[true,false,[1,2]],[false,true,[2,3]],[false,false,[2]]]) {
    const range=normalizeOrderedRange({min:1,max:3,minInclusive,maxInclusive});
    assert.deepEqual([0,1,2,3,4,null,NaN,Infinity,"2"].filter(value=>orderedRangeContains(value,range)),expected);
    const words=normalizeOrderedRange({min:"a",max:"c",minInclusive,maxInclusive});
    assert.deepEqual(["a","b","c"].filter(value=>orderedRangeContains(value,words)),expected.map(n=>["a","b","c"][n-1]));
  }
});

test("one-sided, equal and negative bounds retain typed ordering without sentinels", () => {
  assert.deepEqual(normalizeOrderedRange({min:-2}),{min:-2,minInclusive:true});
  assert.deepEqual(normalizeOrderedRange({max:0,inclusive:false}),{max:0,maxInclusive:false});
  assert.deepEqual([-3,-2,0,3].filter(v=>orderedRangeContains(v,normalizeOrderedRange({min:-2}))),[-2,0,3]);
  assert.deepEqual([-3,-2,0,3].filter(v=>orderedRangeContains(v,normalizeOrderedRange({max:0,inclusive:false}))),[-3,-2]);
  for (const inclusive of [true,false]) assert.equal(orderedRangeContains(2,normalizeOrderedRange({min:2,max:2,inclusive})),inclusive);
  assert.equal(orderedRangeContains(2,{min:2,max:2,inclusive:false}),false);
  assert.equal(orderedRangeContains(2,{min:2,inclusive:undefined}),true);
  assert.equal(orderedRangeContains(2,{min:2,max:2,minInclusive:undefined,maxInclusive:undefined}),true);
});

test("range normalization rejects malformed bounds and never calls own or inherited getters", () => {
  for (const range of [null,[],{}, {min:undefined},{min:null},{max:NaN},{min:Infinity},{min:1,max:"2"},{min:2,max:1},
    {min:0,inclusive:1},{min:0,minInclusive:1},{max:1,maxInclusive:1},{min:0,maxInclusive:false},
    {max:1,minInclusive:true},{min:0,inclusive:true,minInclusive:false},{min:0,extra:true}]) assert.throws(()=>normalizeOrderedRange(range));
  let reads=0;
  assert.throws(()=>normalizeOrderedRange({get min(){reads++;return 0;}}),/accessors/);
  Object.defineProperty(Object.prototype,"maxInclusive",{configurable:true,get(){reads++;throw new Error("inherited read");}});
  try { assert.deepEqual(normalizeOrderedRange({min:1}),{min:1,minInclusive:true}); }
  finally {delete Object.prototype.maxInclusive;}
  for (const key of ["max", "inclusive", "maxInclusive"]) Object.defineProperty(Object.prototype,key,{configurable:true,get(){reads++;throw new Error("inherited read");}});
  try { assert.equal(orderedRangeContains(2,normalizeOrderedRange({min:1})),true); }
  finally { for (const key of ["max", "inclusive", "maxInclusive"]) delete Object.prototype[key]; }
  assert.equal(reads,0);
  const input={min:1,max:3,minInclusive:false}; const r=normalizeOrderedRange(input); input.min=2;
  assert.equal(r.min,1);assert.equal(Object.isFrozen(r),true);
});

test("data filtering and final-item selection reuse identical endpoints and preserve legacy normalization", () => {
  const values=[{x:0},{x:1},{x:2},{x:3},{x:4},{x:"2"},{x:null},{}];
  const items=values.map((fields,i)=>({key:String(i),fields,channels:{},properties:{}}));
  for (const [range,indices] of [[{min:1,max:3,minInclusive:false,maxInclusive:true},[2,3]],[{min:3},[3,4]],[{max:1,maxInclusive:false},[0]],[{min:1,max:3,inclusive:false},[2]]]) {
    const transform=normalizeFilterTransform({field:"x",range});
    assert.deepEqual(deriveFilteredRows(values,transform),indices.map(i=>values[i]));
    assert.deepEqual(selectMarkItemKeys(items,{field:"x",op:"range",...range}),indices.map(String));
  }
  assert.deepEqual(normalizeMarkSelector({field:"x",op:"range",min:1,max:3}),{grain:"item",field:"x",op:"range",min:1,max:3,inclusive:true});
  assert.deepEqual(normalizeMarkSelector({field:"x",op:"range",min:1,max:3,inclusive:false}),{grain:"item",field:"x",op:"range",min:1,max:3,inclusive:false});
});
