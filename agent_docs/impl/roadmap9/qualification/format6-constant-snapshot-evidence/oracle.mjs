import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cloneAndFreeze,isOwned,freezeOwned} from '../../../../../src/core/immutable.js';
import {prepareAnimationColumnsV2WithConstants,validateAnimationColumnsV2,validateAnimationColumnsV2WithOwnedConstants} from '../../../../../src/animation/columnCodec.js';
import {createOfflineResourceScope} from '../../../../../src/animation/resources.js';
const scoped=()=>createOfflineResourceScope({maxEndpointNodes:200002,maxOutputNodes:100001});
const shared=cloneAndFreeze({negative:-0,missing:undefined,sparse:[,1],ordered:{z:1,a:2},big:1n});
const compact=structuredClone(prepareAnimationColumnsV2WithConstants(Array.from({length:1000},(_,id)=>({id,shared})),scoped()).compact);
const legacy=validateAnimationColumnsV2(compact,scoped()),prepared=validateAnimationColumnsV2WithOwnedConstants(compact,scoped());
assert.deepEqual(Object.fromEntries(Object.entries(prepared).filter(([key])=>key!=='restore')),Object.fromEntries(Object.entries(legacy).filter(([key])=>key!=='restore')));
const expected=legacy.restore(),actual=prepared.restore();assert.deepEqual(actual,expected);
assert.equal(actual[0].shared,actual[999].shared);assert.notEqual(actual[0].shared,expected[0].shared);
function owned(v){if(v&&typeof v==='object'){assert.ok(isOwned(v));assert.ok(Object.isFrozen(v));for(const x of Object.values(v))owned(x);}}owned(actual[0].shared);
function freezeCount(value){const original=Object.freeze;let count=0;Object.freeze=v=>{count++;return original(v);};let result;try{result=cloneAndFreeze(value);}finally{Object.freeze=original;}return{count,result};}
const oldSnapshot=freezeCount(expected),newSnapshot=freezeCount(actual);assert.deepEqual(oldSnapshot.result,newSnapshot.result);assert.ok(newSnapshot.count<oldSnapshot.count);
const constant=compact.root.records.columns[0][1].find(([key])=>key==='shared')[1].constant;
constant.negative=4;constant.ordered.z=8;assert.ok(Object.is(prepared.restore()[0].shared.negative,-0));assert.equal(prepared.restore()[0].shared.ordered.z,1);
const shallow=structuredClone(compact);const holder=shallow.root.records.columns[0][1].find(([key])=>key==='shared')[1];holder.constant=freezeOwned({child:{value:3}});
const frozen=validateAnimationColumnsV2WithOwnedConstants(shallow,scoped()).restore();holder.constant.child.value=9;assert.equal(frozen[0].shared.child.value,3);owned(frozen[0].shared);
const errors=[]; const failedFreezeCounts=[];
function failure(fn,c){const scope=scoped(),oldFreeze=Object.freeze;let count=0,error;Object.freeze=value=>{count++;return oldFreeze(value);};try{fn(c,scope);assert.fail('accepted');}catch(e){error=[e.name,e.message];}finally{Object.freeze=oldFreeze;}return {error,count};}
for(const mutate of[
 c=>{c.root.records.length=1000000;},
 c=>{c.root.records.columns[0][1].find(([key])=>key==='shared')[1].constant.loop=c;},
 c=>{c.root.records.columns[0][1].find(([key])=>key==='shared')[1].constant.bad=()=>1;},
 c=>{c.root.records.columns[0][1].find(([key])=>key==='shared')[1].constant.extra=Symbol('x');},
 c=>{c.root.records.columns[0][1][0][1]={vector:999};},
 c=>{c.root.records.columns.pop();},
 c=>{c.root.records.columns[0][1].shift();}
]){
 const c=structuredClone(compact);mutate(c);
 const old=failure(validateAnimationColumnsV2,c),current=failure(validateAnimationColumnsV2WithOwnedConstants,c);
 assert.deepEqual(current,old);errors.push(old.error);failedFreezeCounts.push(current.count);
}
const oversized=structuredClone(prepareAnimationColumnsV2WithConstants([{shared},{shared}],scoped()).compact);oversized.root.records.length=1000000;oversized.root.records.columns[0][1][0][1].constant.extra=Array(20).fill(0);
const oversizedOld=failure(validateAnimationColumnsV2,oversized),oversizedNew=failure(validateAnimationColumnsV2WithOwnedConstants,oversized);assert.deepEqual(oversizedNew,oversizedOld);assert.match(oversizedNew.error[1],/expandedValues/);assert.equal(oversizedNew.count,oversizedOld.count);
let reads=0;const getter=structuredClone(compact);Object.defineProperty(getter.root.records.columns[0][1].find(([key])=>key==='shared')[1].constant,'getter',{enumerable:true,get(){reads++;return 1;}});
assert.throws(()=>validateAnimationColumnsV2WithOwnedConstants(getter,scoped()),/accessor/);assert.equal(reads,0);
const report={node:process.version,rows:1000,metrics: Object.fromEntries(Object.entries(prepared).filter(([key])=>key!=='restore')),exactValues:true,sharedOwnedSnapshot:true,callerMutationIsolated:true,shallowOwnershipNotTrusted:true,snapshotFreezeCounts:{legacy:oldSnapshot.count,candidate:newSnapshot.count},oversized:oversizedNew,errorsEqual:errors,failedFreezeCounts,getterReads:reads};
await writeFile(new URL('./oracle.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
