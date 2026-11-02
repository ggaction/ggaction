import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
if(process.argv[2]!=='child'){
 const results=[];
 for(const variant of ['baseline','compiler-finalize']){
  const result=spawnSync(process.execPath,['--expose-gc',new URL(import.meta.url).pathname,'child'],{env:{...process.env,FRAME_CANDIDATE:variant==='baseline'?'0':'1',FRAME_VARIANT:variant},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);results.push({variant,...JSON.parse(result.stdout)});
 }
 for(const result of results.slice(1))assert.deepEqual(result.boundary,results[0].boundary);
 await writeFile(new URL('./boundary-lifetime.json',import.meta.url),JSON.stringify({node:process.version,results},null,2)+'\n');
 console.log(JSON.stringify(results));
}else{
 await import('./loader.mjs');
 const {canvasSceneProgram}=await import('../../../../../src/renderers/canvasScene.js');
 const {cloneAndFreeze,isOwned}=await import('../../../../../src/core/immutable.js');
 const {chart}=await import('../../../../../src/index.js');
 const {planTransition,sampleTransition}=await import('../../../../../src/animation.js');
 const types=['circle','rect','line','path','text','image','weighted-blend'];
 const make=()=>({version:2,width:100,height:80,nodes:types.map((type,i)=>({key:'n'+i,type,offset:[0,0],clip:[0,0,100,80],properties:{x:i,y:5,width:20,height:10,fill:'black',commands:[{op:'M',x:0,y:0},{op:'L',x:1,y:1}]}}))});
 function ownedTree(value){if(value===null||typeof value!=='object')return;assert.ok(isOwned(value));assert.ok(Object.isFrozen(value));for(const child of Object.values(value))ownedTree(child);}
 const mutable=make(),snapshot=JSON.stringify(mutable),first=canvasSceneProgram(mutable);ownedTree(first);assert.equal(JSON.stringify(mutable),snapshot);assert.equal(isOwned(mutable),false);assert.equal(isOwned(mutable.nodes[0].properties),false);assert.equal(Object.isFrozen(mutable.nodes[0].properties),false);assert.equal(canvasSceneProgram(mutable),first);
 mutable.nodes[0].properties.x=77;const next=canvasSceneProgram(mutable);assert.notEqual(next,first);assert.notEqual(JSON.stringify(next),JSON.stringify(first));assert.equal(JSON.stringify(first).includes('77'),false);
 const exact=cloneAndFreeze(make()),exactProgram=canvasSceneProgram(exact);ownedTree(exactProgram);assert.equal(canvasSceneProgram(exact),exactProgram);
 for(const node of exact.nodes)assert.ok(Object.values(exactProgram.graphicSpec.objects).some(object=>object.properties===node.properties));
 const translated=make();for(const node of translated.nodes){node.offset=[10,20];node.clips=[[2,3,90,70],[5,7,80,60]];}const translatedOwned=cloneAndFreeze(translated),translatedProgram=canvasSceneProgram(translatedOwned);ownedTree(translatedProgram);
 for(const node of translatedOwned.nodes)assert.ok(!Object.values(translatedProgram.graphicSpec.objects).some(object=>object.properties===node.properties));
 const partial=make();partial.nodes[0].properties=cloneAndFreeze(partial.nodes[0].properties);const partialProgram=canvasSceneProgram(partial);ownedTree(partialProgram);assert.equal(isOwned(partial),false);assert.equal(isOwned(partial.nodes[1].properties),false);
 let reads=0;const getter=make();Object.defineProperty(getter.nodes[0].properties,'x',{enumerable:true,get(){reads++;return 1;}});
 const cases={getter,duplicate:make(),badClip:make(),badOffset:make(),functionThenBadNode:make(),functionOnly:make(),cycle:make(),badVersion:make(),shallowFrozenGetter:Object.freeze(getter)};
 cases.duplicate.nodes[1].key='n0';cases.badClip.nodes[0].clip=[0,0,-1,3];cases.badOffset.nodes[0].offset=[NaN,0];cases.functionThenBadNode.nodes[0].properties.extra=()=>1;cases.functionThenBadNode.nodes[1].type='invalid';cases.functionOnly.nodes[0].properties.extra=()=>1;cases.cycle.nodes[0].properties.self=cases.cycle.nodes[0].properties;cases.badVersion.version=1;
 const errors={};for(const[name,scene]of Object.entries(cases)){try{canvasSceneProgram(scene);assert.fail(name+' accepted');}catch(error){assert.notEqual(error.code,'ERR_ASSERTION');errors[name]={name:error.name,message:error.message};}}assert.equal(reads,0);
 const boundary={allSevenCompilerTypes:true,mutableUpdateInvalidates:true,callerUnownedUnfrozen:true,ownedExactPropertiesReuse:true,translatedPropertiesCopied:true,allOutputDescendantsOwned:true,getterReads:reads,errors,mutableJSON:JSON.stringify(first),ownedJSON:JSON.stringify(exactProgram),translatedJSON:JSON.stringify(translatedProgram),partialJSON:JSON.stringify(partialProgram)};
 const from=chart().createCanvas({width:300,height:200,margin:20}).createData({id:'rows',keyField:'id',values:Array.from({length:12},(_,i)=>({id:String(i),x:i,y:12-i}))}).createPointMark({id:'points'}).encodeX({field:'x',scale:{id:'x',domain:[0,12],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,12],nice:false}}),to=from.editScale({id:'x',domain:[0,24],nice:false}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}});
 let old=sampleTransition(plan,37),decision=old.decisions.find(d=>d.kernel==='cartesian-point'),node=old.scene.nodes[decision.targetIndex],wrapper=Object.values(old.graphicSpec.objects).find(o=>o.properties===node.properties);
 assert.ok(wrapper);for(const d of old.decisions){assert.ok(isOwned(d));assert.ok(Object.values(d).every(value=>value===null||typeof value!=='object'));}ownedTree(old.decisions);
 const refs={frame:new WeakRef(old),scene:new WeakRef(old.scene),graphicSpec:new WeakRef(old.graphicSpec),decisions:new WeakRef(old.decisions),decision:new WeakRef(decision),node:new WeakRef(node),properties:new WeakRef(node.properties),wrapper:new WeakRef(wrapper)};
 const current=sampleTransition(plan,63);old=null;decision=null;node=null;wrapper=null;
 for(let cycle=0;cycle<5;cycle++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
 const live=Object.fromEntries(Object.entries(refs).map(([key,ref])=>[key,ref.deref()!==undefined]));assert.ok(Object.values(live).every(value=>!value),JSON.stringify(live));assert.equal(sampleTransition(plan,63).progress,current.progress);ownedTree(current.decisions);
 console.log(JSON.stringify({boundary,lifetime:{cycles:5,retained:'plan and current frame',oldObjectsAlive:live,notHundredCycleQualification:true}}));
}
