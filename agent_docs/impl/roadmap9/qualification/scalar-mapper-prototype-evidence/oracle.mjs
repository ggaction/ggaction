import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import './loader.mjs';
const {mapContinuousScaleValues: vector, prepareContinuousScaleScalar: prepare, mapPreparedContinuousScaleValue: scalar} = await import('../../../../../src/grammar/scales/mapping.js');
const {cloneAndFreeze} = await import('../../../../../src/core/immutable.js');
let comparisons=0, literals=0, rejections=0, getterCalls=0;
const outcome = fn => { try {return {value:fn()};} catch(error) {return {error:{name:error.name,message:error.message}};} };
const values=[-Number.MAX_VALUE,-1e308,-1e100,-100,-10,-1,-Number.MIN_VALUE,-0,0,Number.MIN_VALUE,1,10,100,1e100,1e308,Number.MAX_VALUE,NaN,Infinity,-Infinity,null,undefined,'1',{},1n];
const domains=[[-10,10],[10,-10],[0,1],[1,0],[-0,0],[1,1],[-Number.MAX_VALUE,Number.MAX_VALUE],[-Number.MIN_VALUE,Number.MIN_VALUE],[Number.MIN_VALUE,1],[1,Number.MAX_VALUE],[-1,-100],[100,1],[1,1+Number.EPSILON]];
const ranges=[[-0,0],[0,-0],[0,100],[100,0],[-Number.MAX_VALUE,Number.MAX_VALUE],[Number.MIN_VALUE,1],[-1e308,-1e307]];
const params={linear:[{}],time:[{}],log:[{}, {base:2},{base:.5},{base:1+Number.EPSILON},{base:Number.MIN_VALUE},{base:1},{base:0}],pow:[{}, {exponent:.5},{exponent:2},{exponent:Number.MIN_VALUE},{exponent:Number.MAX_VALUE},{exponent:0}],sqrt:[{}],symlog:[{}, {constant:.1},{constant:Number.MIN_VALUE},{constant:Number.MAX_VALUE},{constant:0}]};
for(const type of Object.keys(params))for(const param of params[type])for(const domain of domains)for(const range of ranges)for(const clamp of [false,true]) {
 const scale={type,domain,range,clamp,...param};
 const prepared=outcome(()=>prepare(scale));
 for(const value of values){
  const expected=outcome(()=>vector([value],scale)[0]);
  const actual=prepared.error?prepared:outcome(()=>scalar(prepared.value,value));
  assert.deepEqual(actual,expected,JSON.stringify({type,param,domain,range,clamp,value:String(value),actual,expected})); comparisons++;
 }
}
// Separate literal expected coordinates, no vector owner or candidate math calls.
for(const [scale,entries] of [
 [{type:'linear',domain:[0,10],range:[0,100]},[[0,0],[5,50],[10,100],[-5,-50]]],
 [{type:'time',domain:[0,1000],range:[100,0]},[[0,100],[500,50],[1000,0]]],
 [{type:'log',domain:[1,100],range:[0,100],base:10},[[1,0],[10,50],[100,100]]],
 [{type:'pow',domain:[0,10],range:[0,100],exponent:2},[[0,0],[5,25],[10,100]]],
 [{type:'sqrt',domain:[0,100],range:[0,100]},[[0,0],[25,50],[100,100]]],
 [{type:'symlog',domain:[-3,3],range:[0,100],constant:1},[[-3,0],[0,50],[3,100]]]
]) {const token=prepare(scale);for(const [value,expected]of entries){assert.ok(Math.abs(scalar(token,value)-expected)<1e-12);literals++;}}
const valid={type:'linear',domain:[0,1],range:[0,100],clamp:false};
for(const forged of [{},Object.freeze({}),cloneAndFreeze({}),undefined,null,0,'token',Symbol('token')]){assert.throws(()=>scalar(forged,.5),TypeError);rejections++;}
for(const key of ['type','domain','range','clamp','unknown']){const scale={...valid};Object.defineProperty(scale,key,{enumerable:true,get(){getterCalls++;throw Error('getter');}});assert.throws(()=>prepare(scale),/accessors/);rejections++;}
for(const pairKey of ['domain','range'])for(const key of ['0','1']){const scale={...valid,[pairKey]:[0,1]};Object.defineProperty(scale[pairKey],key,{enumerable:true,get(){getterCalls++;throw Error('getter');}});assert.throws(()=>prepare(scale),/accessors/);rejections++;}
for(const scale of [{...valid,unknown:0},{...valid,radialMapping:{}},{...valid,base:10},{...valid,type:'radial'}, {...valid,clamp:undefined},{...valid,clamp:'yes'},{...valid,domain:[0,1,2]}, {...valid,domain:[,1]}, {...valid,range:Object.assign([0,1],{extra:2})}]){assert.throws(()=>prepare(scale));rejections++;}
const borrowed={...valid,domain:[0,1],range:[0,100]};const token=prepare(borrowed);borrowed.domain[1]=10;borrowed.range[1]=1000;assert.equal(scalar(token,.5),50);assert.equal(Object.keys(token).length,0);assert.ok(Object.isFrozen(token));
// Existing vector unknown/missing behavior stays on unchanged ordinary route.
for(const type of Object.keys(params))for(const unknown of [undefined,null,0,'missing'])for(const value of [undefined,null,NaN,Infinity]){const scale={type,domain:[1,100],range:[0,100],unknown};assert.deepEqual(vector([value],scale),[unknown]);comparisons++;}
assert.equal(getterCalls,0);
const report={kind:'Evidence-only extracted scalar callback versus unchanged vector owner and independent literal oracle',node:process.version,comparisons,literals,rejections,getterCalls,mutationIsolation:true,opaqueToken:true,productSourceModified:false,scope:'six types, finite extremes, signed zero, descending/collapsed domains, range reversal, clamp, transform parameters, missing/unknown and error class/message'};
await writeFile(new URL('./oracle.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
