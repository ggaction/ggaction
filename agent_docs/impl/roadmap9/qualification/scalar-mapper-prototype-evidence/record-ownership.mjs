import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import './loader.mjs';
const {isOwned} = await import('../../../../../src/core/immutable.js');
const {createPositionPreparationContext:context,preparePositionInterpolation:prepare,samplePositionInterpolation:sample} = await import('../../../../../src/grammar/animation/positions.js');
const endpoint=(value,type='linear')=>({value,scale:{type,domain:[1,10],range:[0,100],clamp:false}});
let samples=0;
for(const type of ['linear','time','log','pow','sqrt','symlog']) {
 const plan=prepare(endpoint(2,type),endpoint(8,type),context());
 const copy=structuredClone(plan), shallow=Object.freeze({...plan,to:structuredClone(plan.to)});
 for(const input of [plan,copy,shallow])for(const progress of [0,.25,.5,.75,1]) {
  const result=sample(input,progress);assert.ok(isOwned(result));assert.ok(Object.isFrozen(result));
  assert.ok(isOwned(result.scale));assert.ok(isOwned(result.scale.domain));assert.ok(isOwned(result.scale.range));
  assert.deepEqual(Reflect.ownKeys(result),['kind','value','scale','position']);
  assert.deepEqual(result,sample(plan,progress));samples++;
 }
 assert.equal(isOwned(copy),false);assert.equal(isOwned(copy.from.scale),false);assert.equal(Object.isFrozen(copy.from.scale),false);
 copy.from.scale.domain[0]=NaN;assert.throws(()=>sample(copy,.5));
 assert.equal(isOwned(shallow.to.scale),false);shallow.to.scale.domain[0]=NaN;assert.throws(()=>sample(shallow,.5));
}
const report={node:process.version,samples,outputOwned:true,childrenOwned:true,callerInputsNeverStamped:true,mutatedCopiesRevalidated:true,recordVariant:process.env.POSITION_RECORD_FREEZE==='1'};
await writeFile(new URL('./record-ownership.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
