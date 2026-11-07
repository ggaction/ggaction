import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const clean=process.argv.includes('--timing-clean');
const root=new URL('./source/',import.meta.url),src=new URL('src/',root).href;
globalThis.__scaleAudit={rawHits:0,rawMisses:0,normalizedHits:0,normalizedMisses:0,intermediateHits:0,intermediateMisses:0};
const count=key=>{if(globalThis.__operations)globalThis.__operations[key]=(globalThis.__operations[key]??0)+1;};globalThis.__count=count;
registerHooks({load(url,context,next){const result=next(url,context);if(!url.startsWith(src))return result;let source=String(result.source),file=url.slice(src.length);
 if(file==='animation/planner.js')source=source.replace('export function planTransition(input) {','export function planTransition(input) {globalThis.__lastScaleInput=input;');
 if(file==='animation/resources.js')source=source.replace(/(export function validateAnimationResourceWork\([^)]*\) \{)/,'$1if(globalThis.__workAudit){const row=globalThis.__workAudit[label]??=0;globalThis.__workAudit[label]=Math.max(row,value);}');
 if(file==='materialization/animation/point.js'){
  source=source.replace('import { cloneAndFreeze }','import { cloneAndFreeze, isOwned }');
  source=source.replace('function position(input) {','function position(input, scales) {');
  source=source.replace('  const keys = [',`  if(globalThis.__scaleReuse&&isOwned(scale)&&scales.has(scale)){globalThis.__scaleAudit.rawHits++;return cloneAndFreeze({value:input.value,scale:scales.get(scale)});}
  const keys = [`);
  source=source.replace('  return cloneAndFreeze({ value: input.value, scale: Object.fromEntries(keys.filter(key => Object.hasOwn(scale, key)).map(key => [key, scale[key]])) });',`  if(globalThis.__scaleReuse&&isOwned(scale)){const filtered=cloneAndFreeze(Object.fromEntries(keys.filter(key=>Object.hasOwn(scale,key)).map(key=>[key,scale[key]])));scales.set(scale,filtered);globalThis.__scaleAudit.rawMisses++;return cloneAndFreeze({value:input.value,scale:filtered});}
  return cloneAndFreeze({ value: input.value, scale: Object.fromEntries(keys.filter(key => Object.hasOwn(scale, key)).map(key => [key, scale[key]])) });`);
  source=source.replace('  const indices = new Map(', '  const scales=new WeakMap();\n  const indices = new Map(');
  source=source.replace('position(values.x[index]), y = position(values.y[index])','position(values.x[index],scales), y = position(values.y[index],scales)');
 }
 if(file==='grammar/animation/positions.js'){
  source=source.replace('cloneAndFreeze, freezeOwned','cloneAndFreeze, freezeOwned, isOwned');
  source=source.replace('const preparedPositions = new WeakSet();','const preparedPositions = new WeakSet();\nconst __normalized=new WeakMap(),__normalizedProof=new WeakSet(),__pairs=new WeakMap();');
  source=source.replace('  const scale = ownRecord(input.scale, "Animation position scale");',`  const cached=globalThis.__scaleReuse&&isOwned(input.scale)?__normalized.get(input.scale):undefined;
  if(cached!==undefined){globalThis.__scaleAudit.normalizedHits++;const position=mapContinuousScaleValues([input.value],cached)[0];if(!Number.isFinite(position))throw new RangeError("Animation position endpoint must map to a finite position.");return{value:input.value,scale:cached};}
  const scale = ownRecord(input.scale, "Animation position scale");`);
  source=source.replace('  const normalized = { type: scale.type','  let normalized = { type: scale.type');
  source=source.replace('  return { value: input.value, scale: normalized };',`  if(globalThis.__scaleReuse&&isOwned(scale)){normalized=cloneAndFreeze(normalized);__normalized.set(scale,normalized);__normalizedProof.add(normalized);globalThis.__scaleAudit.normalizedMisses++;}
  return { value: input.value, scale: normalized };`);
  source=source.replace('  const scale = { ...from.scale,',`  let byTo,previous;
  if(globalThis.__scaleReuse&&__normalizedProof.has(from.scale)&&__normalizedProof.has(to.scale)){byTo=__pairs.get(from.scale);if(byTo===undefined)__pairs.set(from.scale,byTo=new WeakMap());previous=byTo.get(to.scale);}
  let scale=previous!==undefined&&Object.is(previous.progress,progress)?previous.scale:undefined;
  if(scale!==undefined)globalThis.__scaleAudit.intermediateHits++;
  if(scale===undefined){
  scale = { ...from.scale,`);
  source=source.replace('  freezeOwned(scale.domain); freezeOwned(scale.range); freezeOwned(scale);',`  freezeOwned(scale.domain); freezeOwned(scale.range); freezeOwned(scale);
  if(byTo!==undefined){byTo.set(to.scale,{progress,scale});globalThis.__scaleAudit.intermediateMisses++;}
  }`);
 }
 if(file==='core/immutable.js'&&!clean){
  source=source.replace('export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {','export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {globalThis.__count("cloneCalls");');
  source=source.replace('const clone = array ? new Array(input.length) : {};','const clone = array ? new Array(input.length) : {};globalThis.__count("cloneAllocations");');
  source=source.replace('ownedValues.add(value);','ownedValues.add(value);globalThis.__count("ownedAdds");');
 }
 if(clean)source=source.replace(/globalThis.__scaleAudit\.\w+\+\+;/g,'void 0;');
 return{...result,source};}});
const{prepareNativeWorkload,nativeWorkloadInput}=await import(new URL('scripts/benchmarks/workloads.browser.js',root));
const{planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await import(new URL('src/animation.js',root));
const{preparePositionInterpolation,samplePositionInterpolation}=await import(new URL('src/grammar/animation/positions.js',root));
const{cloneAndFreeze}=await import(new URL('src/core/immutable.js',root));
const rows=nativeWorkloadInput('points',1000),stage=prepareNativeWorkload('points',1000,rows).stages.find(s=>s.name==='full-frame').prepare(),input=globalThis.__lastScaleInput;
const plans={},prepare={};
for(const phase of['baseline','reuse']){globalThis.__scaleReuse=phase==='reuse';globalThis.__operations={};globalThis.__workAudit={};const start=performance.now();plans[phase]=planTransition(input);prepare[phase]={ms:performance.now()-start,operations:globalThis.__operations,work:globalThis.__workAudit};delete globalThis.__operations;delete globalThis.__workAudit;}
assert.deepEqual(plans.baseline,plans.reuse);assert.equal(serializeAnimation(plans.baseline),serializeAnimation(plans.reuse));
const operations={},samples={baseline:[],reuse:[]};let expected;
for(const phase of['baseline','reuse']){globalThis.__scaleReuse=phase==='reuse';globalThis.__operations={};const f=sampleTransition(plans[phase],50);operations[phase]=globalThis.__operations;delete globalThis.__operations;expected??=f;assert.deepEqual(f,expected);stage.validate({frame:f});}
for(let i=0;i<(clean?20:5);i++)for(const phase of['baseline','reuse']){globalThis.__scaleReuse=phase==='reuse';const f=sampleTransition(plans[phase],50);assert.deepEqual(f,expected);stage.validate({frame:f});}
for(let i=0;i<15;i++)for(const phase of['baseline','reuse','reuse','baseline']){globalThis.__scaleReuse=phase==='reuse';const start=performance.now(),frame=sampleTransition(plans[phase],50);samples[phase].push(performance.now()-start);assert.deepEqual(frame,expected);stage.validate({frame});}
const wire={};for(const version of[3,4]){
 const ps=[];for(const phase of['baseline','reuse']){globalThis.__scaleReuse=phase==='reuse';ps.push(planTransition({...input,options:{...input.options,...(version===4?{maxEndpointNodes:3000,maxOutputNodes:2000}:{})}}));}
 const texts=ps.map(p=>serializeAnimation(p));if(version===3)assert.equal(texts[0],texts[1]);const restored=texts.map(text=>deserializeAnimation(text).plan);assert.deepEqual(restored[0],restored[1]);assert.deepEqual(sampleTransition(restored[0],50),sampleTransition(restored[1],50));wire[version]={bytes:texts.map(text=>Buffer.byteLength(text)),sha256:texts.map(text=>createHash('sha256').update(text).digest('hex')),exactBytes:texts[0]===texts[1],decodedPlanDeepEqual:true,offlineFrameDeepEqual:true};
}
let kernelCases=0;const cases=[['linear',{}],['time',{}],['log',{base:10}],['pow',{exponent:2}],['sqrt',{}],['symlog',{constant:2}]];
const capture=fn=>{try{return{value:fn()};}catch(error){return{error:[error.constructor.name,error.message]};}};
for(const[type,parameters]of cases)for(const domain of[[1,10],[10,1],[-10,-1]])for(const progress of[0,.25,.5,1,-0,NaN]){
 const from=cloneAndFreeze({value:domain[0],scale:{type,domain,range:[-0,100],...parameters}}),to=cloneAndFreeze({value:domain[1],scale:{type,domain,range:[20,120],...parameters}});
 const result=phase=>{globalThis.__scaleReuse=phase==='reuse';return capture(()=>samplePositionInterpolation(preparePositionInterpolation(from,to),progress));};assert.deepEqual(result('reuse'),result('baseline'));kernelCases++;
}
// Caller freezing and mutable clones do not enter the normalized proof cache.
globalThis.__scaleReuse=true;const scale=Object.freeze({type:'linear',domain:Object.freeze([0,1]),range:Object.freeze([0,100])}),startHits=globalThis.__scaleAudit.normalizedHits;for(let i=0;i<2;i++)preparePositionInterpolation({value:.2,scale},{value:.8,scale});assert.equal(globalThis.__scaleAudit.normalizedHits,startHits);
let getterReads=0;const bad={type:'linear',domain:[0,1],get range(){getterReads++;return[0,100];}};assert.throws(()=>preparePositionInterpolation({value:0,scale:bad},{value:1,scale:bad}));assert.equal(getterReads,0);
const stats=v=>{const s=[...v].sort((a,b)=>a-b);return{n:s.length,median:s[Math.floor(s.length/2)],p95:s[Math.ceil(s.length*.95)-1],min:s[0],max:s.at(-1),mean:s.reduce((a,b)=>a+b,0)/s.length};};
const report={kind:'temporary source loader scale sharing prototype; no product mutation, timings diagnostic only',node:process.version,sourceAggregate:JSON.parse(await readFile(new URL('./source-inputs.json',import.meta.url))).aggregateSha256,inputSHA256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),rows:1000,prepare,operations,counts:globalThis.__scaleAudit,samples,statistics:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,stats(v)])),wire,kernelCases,callerFrozenNotCached:true,accessorGetterReads:getterReads,fullFrameEverySample:true,allCoordinatesEverySample:true};
await writeFile(new URL(clean?'./scale-timing-clean.json':'./scale-prototype.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({prepare,operations,statistics:report.statistics,counts:report.counts,wire,kernelCases}));
