import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'acorn';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('./source/',import.meta.url),sourceRoot=new URL('src/',root).href;
const scopeNames={
 'animation/sample.js':['sampleTransitionWithBudget','sampleNode'],
 'animation/concrete.js':['interpolateNodeFrame','blendAnimationNodes','fadeAnimationNode'],
 'animation/frameProvenance.js':['registerAnimationFrame'],
 'animation/frameEndpoint.js':['captureFrameMeaning'],
 'animation/endpoints.js':['projectSampledAnimationEndpoint'],
 'renderers/canvasScene.js':['canvasSceneProgram','compile','position','snapshotSignature'],
 'grammar/animation/positions.js':['samplePositionInterpolation'],
 'grammar/scales/continuous.js':['mapContinuousScaleValues','mapLinearValues'],
 'grammar/scales/validation.js':['validatePair'],
 'grammar/schemas/concreteGraphic.js':['validateConcreteGraphicProperties','validateConcreteGraphicValue'],
 'grammar/schemas/graphicIdentity.js':['validateGraphicIdentity'],
 'grammar/animation/matching.js':['indexIdentities','matchItemIdentities']
};
const helpers=`\nfunction __auditCount(kind){const s=globalThis.__frameAudit;if(!s)return;const key=s.stack.join(' > ')||'outside';const row=s.byScope[key]??=(Object.create(null));row[kind]=(row[kind]??0)+1;s.total[kind]=(s.total[kind]??0)+1;}\nfunction __auditEnter(label){const s=globalThis.__frameAudit;if(s){s.stack.push(label);__auditCount('calls');}}\nfunction __auditExit(){globalThis.__frameAudit?.stack.pop();}\nfunction __auditCall(label,call){__auditEnter(label);try{return call();}finally{__auditExit();}}\n`;
const originalLoaded={};
registerHooks({load(url,context,next){
 const result=next(url,context);if(!url.startsWith(sourceRoot)||!url.endsWith('.js'))return result;
 const file=url.slice(sourceRoot.length);let source=String(result.source);originalLoaded[file]=createHash('sha256').update(source).digest('hex');
 if(file==='animation/concrete.js'){
  source=source.replace('import { cloneAndFreeze }','import { cloneAndFreeze, isOwned }');
  source=source.replace('export function interpolateNodeFrame(from,to,progress) {',`export function interpolateNodeFrame(from,to,progress) {
  if(globalThis.__frameReuse){
   const ordinary=(a,b)=>a.map((value,i)=>interpolateNumber(value,b[i],progress));
   const shape=value=>isOwned(value)&&Object.getOwnPropertyNames(value).length===value.length+1;
   const vector=(a,b)=>Number.isFinite(progress)&&progress>=0&&progress<=1&&shape(a)&&shape(b)&&a.length===b.length&&Array.from({length:a.length},(_,i)=>i).every(i=>Object.hasOwn(a,i)&&Object.hasOwn(b,i)&&Number.isFinite(a[i])&&Object.is(a[i],b[i]))?b:ordinary(a,b);
   return{offset:vector(from.offset,to.offset),clip:vector(from.clip,to.clip),clips:from.clips.length===0&&to.clips.length===0&&shape(from.clips)&&shape(to.clips)?to.clips:from.clips.map((clip,i)=>Array.isArray(clip)?vector(clip,to.clips[i]):clip)};
  }`);
 }
 const replacements=[];
 if(scopeNames[file]){
  const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const visit=(node,parent)=>{
   if(!node||typeof node!=='object')return;
   if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)){
    const name=node.id?.name??(parent?.type==='VariableDeclarator'?parent.id.name:undefined);
    if(scopeNames[file].includes(name)&&node.body.type==='BlockStatement'){
     replacements.push([node.body.start+1,node.body.start+1,`__auditEnter(${JSON.stringify(name)});try{`],[node.body.end-1,node.body.end-1,'}finally{__auditExit();}']);
    }
   }
   if(node.type==='CallExpression'&&node.callee.type==='Identifier'&&node.callee.name==='cloneAndFreeze'){
    let tag;
    if(file==='animation/sample.js'){
     const value=node.arguments[0],names=value?.type==='ObjectExpression'?value.properties.map(p=>p.key?.name??p.key?.value):[];
     if(names.includes('version')&&names.includes('nodes'))tag='snapshot.scene';else if(names.includes('graphicSpec'))tag='snapshot.frame';else if(names.includes('properties'))tag='snapshot.node';
    }
    if(file==='animation/frameProvenance.js'&&node.arguments[0]?.type==='MemberExpression')tag='proof.'+node.arguments[0].property.name;
    if(file==='renderers/canvasScene.js')tag='snapshot.graphicProgram';
    if(tag)replacements.push([node.start,node.start,`__auditCall(${JSON.stringify(tag)},()=>`],[node.end,node.end,')']);
   }
   for(const[k,value]of Object.entries(node))if(!['start','end','loc'].includes(k)){if(Array.isArray(value))for(const child of value)visit(child,node);else if(value&&typeof value==='object')visit(value,node);}
  };visit(tree);
 }
 for(const[start,end,text]of replacements.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+text+source.slice(end);
 if(file==='core/immutable.js'){
  source=source.replace('export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {','export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {__auditCount("cloneCalls");');
  source=source.replace('const clone = array ? new Array(input.length) : {};','const clone = array ? new Array(input.length) : {};__auditCount("cloneAllocations");__auditCount(array?"arrayClones":"objectClones");');
  source=source.replace('ownedValues.add(value);','ownedValues.add(value);__auditCount("ownedAdds");');
  source=source.replace('export function isOwned(value) {','export function isOwned(value) {__auditCount("isOwnedCalls");');
 }
 if(file==='core/ownData.js')for(const name of['ownRecord','ownArray','ownDataProperties'])source=source.replace(new RegExp('(export function '+name+'\\([^)]*\\) \\{)'),'$1__auditCount("'+name+'Calls");');
 if(replacements.length||file==='core/immutable.js'||file==='core/ownData.js')source+=helpers;
 return {...result,source};
}});
const nativeFreeze=Object.freeze,nativeAdd=WeakSet.prototype.add,nativeHas=WeakSet.prototype.has;
const count=kind=>{const s=globalThis.__frameAudit;if(!s)return;const key=s.stack.join(' > ')||'outside',r=s.byScope[key]??=(Object.create(null));r[kind]=(r[kind]??0)+1;s.total[kind]=(s.total[kind]??0)+1;};
Object.freeze=function(value){count('objectFreeze');return nativeFreeze(value);};
WeakSet.prototype.add=function(value){count('weakSetAdds');return nativeAdd.call(this,value);};
WeakSet.prototype.has=function(value){count('weakSetHas');return nativeHas.call(this,value);};
const{prepareNativeWorkload}=await import(new URL('scripts/benchmarks/workloads.browser.js',root));
const{interpolateNodeFrame}=await import(new URL('src/animation/concrete.js',root));
const{cloneAndFreeze,isOwned}=await import(new URL('src/core/immutable.js',root));
const{sampleTransition,planTransition}=await import(new URL('src/animation.js',root));
const stage=prepareNativeWorkload('points',1000).stages.find(s=>s.name==='full-frame').prepare();
for(let i=0;i<5;i++)stage.validate(stage.run());
const results=[];
for(const phase of['baseline','reuse']){
 globalThis.__frameReuse=phase==='reuse';globalThis.__frameAudit={stack:[],total:{},byScope:{}};
 const result=stage.run(),counts=globalThis.__frameAudit;delete globalThis.__frameAudit;
 results.push({phase,counts,witness:stage.validate(result),frame:result.frame});
}
assert.deepEqual(results[0].frame,results[1].frame);
// Counterexamples compare exact values and structural absence, including -0.
const cases=[
 {offset:[-0,0],clip:[-0,0,100,100],clips:[]},
 {offset:[1,2],clip:[0,0,100,100],clips:[[0,0,100,100]]},
 {offset:[1,2],clip:[0,0,100,100],clips:[]},
 {offset:[,2],clip:[0,0,100,100],clips:[]}
];
let counterexamples=0;
for(const item of cases)for(const owned of[false,true])for(const t of[0,.37,1,NaN]){
 const input=owned?cloneAndFreeze(item):Object.freeze({...item});
 globalThis.__frameReuse=false;let a,b,ea,eb;try{a=interpolateNodeFrame(input,input,t);}catch(e){ea=e;}
 globalThis.__frameReuse=true;try{b=interpolateNodeFrame(input,input,t);}catch(e){eb=e;}
 if(ea||eb){assert.equal(eb?.constructor,ea?.constructor);assert.equal(eb?.message,ea?.message);}else assert.deepEqual(b,a);
 counterexamples++;
}
const mutable={offset:[0,0],clip:[0,0,100,100],clips:[]},frozen=Object.freeze(mutable);globalThis.__frameReuse=true;const sampled=interpolateNodeFrame(frozen,frozen,.5);assert.notEqual(sampled.offset,frozen.offset);assert.equal(isOwned(frozen),false);
assert.throws(()=>planTransition({from:Object.freeze({...results[0].frame}),to:results[0].frame,options:{durationMs:100}}));
assert.throws(()=>sampleTransition(Object.freeze({kind:'transition-plan',version:3}),50));
Object.freeze=nativeFreeze;WeakSet.prototype.add=nativeAdd;WeakSet.prototype.has=nativeHas;delete globalThis.__frameReuse;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={kind:'temporary loader exact operation attribution and conservative vector reuse prototype; no product source mutation, not timing/SLO',node:process.version,rows:1000,exactSamePlanFullFrame:true,frameSHA256:hash(results[0].frame),counterexamples,baseline:results[0].counts,reuse:results[1].counts,delta:Object.fromEntries(Object.keys(results[0].counts.total).map(key=>[key,(results[1].counts.total[key]??0)-results[0].counts.total[key]])),loadedSourceSHA256:originalLoaded};
await writeFile(new URL('./allocations.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({baseline:report.baseline.total,reuse:report.reuse.total,delta:report.delta,frameSHA256:report.frameSHA256,counterexamples}));
