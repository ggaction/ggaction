import assert from "node:assert/strict";
import test from "node:test";
import { animationNumericVectorFootprint, packAnimationNumericVector, inspectAnimationNumericVector } from "../../../src/animation/numericColumns.js";
import { prepareAnimationColumns, restoreAnimationColumns, prepareAnimationColumnsV2, restoreAnimationColumnsV2, validateAnimationColumnsV2 } from "../../../src/animation/columnCodec.js";
import { createOfflineResourceScope } from "../../../src/animation/resources.js";
import { inspectAnimationEnvelopeValue, encodeAnimationEnvelope, decodeAnimationEnvelope } from "../../../src/animation/envelopeCodec.js";
const scope = () => createOfflineResourceScope({maxOutputNodes:10000});
const packet = (root, vectors=[]) => ({kind:"animation-columns",version:2,root,vectors});
const rows = (length, column, keys=["x"]) => ({records:{length,shapes:[{keys}],shape:{constant:0},columns:[[0,keys.map(key=>[key,column])]]}});
const binary = values => {const bytes=Buffer.alloc(values.length*8);values.forEach((value,index)=>bytes.writeDoubleLE(value,index*8));return {kind:"float64-le",length:values.length,base64:bytes.toString("base64")};};

test("finite Float64 vectors preserve literal little-endian bits and signed extremes", () => {
  assert.deepEqual(packAnimationNumericVector([1]),{kind:"float64-le",length:1,base64:"AAAAAAAA8D8="});
  assert.deepEqual(packAnimationNumericVector([-0]),{kind:"float64-le",length:1,base64:"AAAAAAAAAIA="});
  const values=[0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,1,1+Number.EPSILON,1-Number.EPSILON/2,Math.PI];
  const packed=packAnimationNumericVector(values);assert.deepEqual(packed,binary(values));
  const proof=inspectAnimationNumericVector(packed);proof.validateFinite();
  values.forEach((value,index)=>assert.ok(Object.is(proof.at(index),value)));
  for(const index of[-1,values.length,NaN,.5])assert.throws(()=>proof.at(index),/index/);
  assert.equal(animationNumericVectorFootprint(values.length).bytes,inspectAnimationEnvelopeValue(packed,false,true).estimatedEncodedBytes);
  const empty=inspectAnimationNumericVector(packAnimationNumericVector([]));empty.validateFinite();assert.equal(empty.length,0);
});

test("closed numeric headers and canonical base64 reject corruption before expansion", () => {
  const valid=binary([1]);
  for(const mutate of [p=>p.extra=0,p=>delete p.kind,p=>p.kind="float64-be",p=>p.length=undefined,p=>p.length=null,p=>p.length=-1,p=>p.length=.5,p=>p.length=Number.MAX_SAFE_INTEGER,p=>p.length=2,p=>p.base64=null,p=>p.base64=p.base64.slice(1),p=>p.base64=p.base64.replace("A","!"),p=>p.base64=p.base64.replace("A","Ā"),p=>p.base64=p.base64.replace("=","A"),p=>p.base64=p.base64.slice(0,-2)+"9="]){const value=structuredClone(valid);mutate(value);assert.throws(()=>inspectAnimationNumericVector(value));}
  const two=binary([1,2]);two.base64=two.base64.slice(0,-3)+"B==";assert.throws(()=>inspectAnimationNumericVector(two),/padding bits/);
  for(const value of[NaN,Infinity,-Infinity]){
    const proof=inspectAnimationNumericVector(binary([value]));assert.throws(()=>proof.validateFinite(),/nonfinite/);
    assert.throws(()=>packAnimationNumericVector([value]),/finite/);
  }
  for(const values of[["1"],Array(1),[undefined]])assert.throws(()=>packAnimationNumericVector(values));
  assert.throws(()=>animationNumericVectorFootprint(8_000_000),/bytes/);
  let reads=0;const value={...valid};Object.defineProperty(value,"length",{enumerable:true,get(){reads++;return 1;}});assert.throws(()=>inspectAnimationNumericVector(value),/accessor/);assert.equal(reads,0);
});

test("numeric interpretation is fixed LE while semantic proof and digest own different guarantees", () => {
  const swapped=Buffer.alloc(8);swapped.writeDoubleBE(1);
  const proof=inspectAnimationNumericVector({kind:"float64-le",length:1,base64:swapped.toString("base64")});proof.validateFinite();
  assert.equal(proof.at(0),swapped.readDoubleLE());assert.notEqual(proof.at(0),1);
  const wire=encodeAnimationEnvelope(packet(rows(1,{vector:0}),[binary([1])])),changed=JSON.parse(wire);changed.digest="0".repeat(64);assert.throws(()=>decodeAnimationEnvelope(JSON.stringify(changed)),/digest/);
});

test("version2 descends singleton and identical compound rows without losing numeric paths or aliases", () => {
  const shared={items:[{commands:Array.from({length:40},(_,index)=>[index?"L":"M",index-.5,index%3])}]};
  const value={from:shared,to:shared,empty:[],hole:[,],mixed:[7,{p:3},,undefined],special:[{x:NaN},{x:-0},{x:undefined},{x:2n}]};
  const before=structuredClone(value),prepared=prepareAnimationColumnsV2(value,scope());
  assert.ok(prepared.compact.vectors.some(vector=>!Array.isArray(vector)&&vector.kind==="float64-le"));
  assert.ok(prepared.compact.vectors.some(Array.isArray));
  const restored=restoreAnimationColumnsV2(decodeAnimationEnvelope(encodeAnimationEnvelope(prepared.compact)),scope());
  assert.deepEqual(restored,before);assert.equal(prepared.metrics.logicalValues,prepared.metrics.validatedLogicalValues);
  shared.items[0].commands[0][1]=999;assert.deepEqual(restoreAnimationColumnsV2(prepared.compact,scope()),before);
  assert.ok(Object.isFrozen(prepared.compact));assert.ok(Object.isFrozen(prepared.compact.vectors));
  assert.throws(()=>restoreAnimationColumns(prepared.compact),/version/);
  assert.throws(()=>restoreAnimationColumnsV2(prepareAnimationColumns([1]).compact),/version/);
});

test("compound descent preserves own undefined holes prototypes and field order",()=>{
 const values=[{b:{x:1},a:undefined},null,undefined,,{a:{x:1},b:{x:2}},[,5],[],{}];
 Object.defineProperty(values[0],"__proto__",{value:{safe:true},enumerable:true});
 const prepared=prepareAnimationColumnsV2(values),restored=restoreAnimationColumnsV2(prepared.compact);
 assert.deepEqual(restored,values);assert.deepEqual(Object.keys(restored[0]),["b","a","__proto__"]);assert.ok(!Object.hasOwn(restored,3));assert.ok(!Object.hasOwn(restored[5],0));
 assert.equal(Object.getPrototypeOf(restored[0]),Object.prototype);
});

test("version2 exact pools count unused storage and all repeated references before restored rows", () => {
  const vector=binary([1,2,3]);
  const value=packet({object:[["a",rows(3,{vector:0})],["b",rows(3,{vector:0})]]},[vector,binary([4,5])]);
  const proof=validateAnimationColumnsV2(value,scope());
  assert.equal(proof.storageCells,5);assert.equal(proof.cellVisits,12);assert.equal(proof.descriptorVisits,8);assert.equal(proof.logicalValues,15);
  assert.deepEqual(proof.restore(),{a:[{x:1},{x:2},{x:3}],b:[{x:1},{x:2},{x:3}]});
  const shared=rows(3,{vector:0}),aliases=packet({object:[["a",shared],["b",shared]]},[vector,binary([4,5])]);
  const aliasProof=validateAnimationColumnsV2(aliases,scope());
  assert.equal(aliasProof.cellVisits,proof.cellVisits);assert.equal(aliasProof.descriptorVisits,proof.descriptorVisits);assert.equal(aliasProof.logicalValues,proof.logicalValues);
  const unused=packet({literal:0},[binary([NaN])]);assert.throws(()=>validateAnimationColumnsV2(unused),/nonfinite/);
  assert.throws(()=>restoreAnimationColumnsV2(packet(rows(4,{vector:0}),[vector])),/length/);
  assert.throws(()=>restoreAnimationColumnsV2(packet(rows(3,{vector:1}),[vector])),/reference/);
});

test("pool storage is charged even when the root never references a shared stored vector", () => {
  const vector=binary(Array(1000).fill(0));
  // The same physical object occurs 16001 times; strings alone also retain the
  // original 64MiB guard, which must reject rather than treating sharing as free.
  assert.throws(()=>validateAnimationColumnsV2(packet({literal:0},Array(16001).fill(vector)),scope()),/bytes|cells/);
  assert.throws(()=>validateAnimationColumnsV2(packet(rows(100000,{constant:Array(121).fill(1)})),scope()),/expandedValues/);
  const exact=packet(rows(100000,{constant:Array(101).fill(1)}));
  assert.equal(validateAnimationColumnsV2(exact,scope()).logicalValues,10300001);
  assert.throws(()=>validateAnimationColumnsV2(exact),/expandedValues/);
});

test("mixed scalar vectors and runs remain lossless while finite repeated columns intern exactly", () => {
  const values=Array.from({length:120},(_,i)=>({x:i%11,y:i%11,z:i===0?-0:i%11,n:i===0?NaN:i,big:i<60?3n:4n}));
  const prepared=prepareAnimationColumnsV2(values),restored=restoreAnimationColumnsV2(prepared.compact);
  assert.deepEqual(restored,values);assert.equal(prepared.compact.vectors.length,3);
  assert.ok(prepared.metrics.storageCells>0);assert.ok(prepared.metrics.cellVisits>prepared.metrics.storageCells);
  assert.match(JSON.stringify(prepared.compact,(_,value)=>typeof value==='bigint'?String(value):value),/runs/);
  let reads=0;const prior=Object.getOwnPropertyDescriptor(Object.prototype,"validateFinite");
  try{Object.defineProperty(Object.prototype,"validateFinite",{configurable:true,get(){reads++;throw Error('getter');}});assert.deepEqual(restoreAnimationColumnsV2(prepared.compact),values);}
  finally{if(prior)Object.defineProperty(Object.prototype,"validateFinite",prior);else delete Object.prototype.validateFinite;}
  assert.equal(reads,0);
});
