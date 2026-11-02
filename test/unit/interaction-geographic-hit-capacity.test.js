import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../src/index.js';
import {createInteractionSession} from '../../src/interaction.js';
import {planTransition,sampleTransition,deserializeAnimation,serializeAnimation} from '../../src/animation.js';
import {prepareProgramHitFrame,prepareAnimationHitFrame,rebindProgramHitFrame} from '../../src/interaction/hitProgram.js';
import {hitFrameSource} from '../../src/interaction/hitFrameSource.js';
import {hitShapePreparationWork,hitShapeWork} from '../../src/grammar/hitShapes.js';
const pathGeometry={maxParts:400000,maxWork:2000000,maxIndexWork:16000000},hitPreparation={maxWork:128000000,pathGeometry};
const program=(count=1000)=>chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:count},(_,i)=>[-30+60*i/(count-1),(i%2?1:-1)*5])}}]}}).createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
const host={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};
test('native geographic CSS hits preserve identity while visiting bounded painted parts',()=>{
 const p=program(),before=JSON.stringify(p),plain=createInteractionSession({program:p,bindings:[]}),indexed=createInteractionSession({program:p,bindings:[],hitPreparation});
 plain.mount(host,{rootTransform:[1.5,0,0,1.5,7,11]});indexed.mount(host,{rootTransform:[1.5,0,0,1.5,7,11]});
 for(const i of[0,499,998]){const x=200+100*(-30+60*(i+.5)/999)*Math.PI/180,point={x:x*1.5+7,y:311};for(const session of[plain,indexed])session.dispatch({type:'inspect',point,slop:0});const a=plain.getState().hit,b=indexed.getState().hit;assert.deepEqual(b.candidates,a.candidates);assert.equal(b.target.ownerId,'coast');assert.ok(b.statistics.work<a.statistics.work);}
 assert.equal(JSON.stringify(p),before);assert.ok(!Object.hasOwn(indexed.getState(),'pathGeometry'));plain.destroy();indexed.destroy();
});
test('path build costs remain charged and lower policy failures preserve current frames',()=>{
 const p=program(100),frame=prepareProgramHitFrame(p,0,undefined,hitPreparation),cost=hitFrameSource(frame).work;
 assert.ok(frame.entries.every(e=>hitShapePreparationWork(e.shape)>hitShapeWork(e.shape)));
 assert.throws(()=>prepareProgramHitFrame(p,0,undefined,{...hitPreparation,maxWork:cost-1}),/preparation work budget/);
 assert.deepEqual(prepareProgramHitFrame(p,0,undefined,{...hitPreparation,maxWork:cost}),frame);
 assert.throws(()=>rebindProgramHitFrame(frame,frame.scene,1,undefined,{...hitPreparation,pathGeometry:{...pathGeometry,maxParts:1}}),/stroke parts/);
 const session=createInteractionSession({program:p,bindings:[],hitPreparation:{...hitPreparation,pathGeometry:{...pathGeometry,maxParts:500}}}),state=session.getState();
 assert.throws(()=>session.updateProgram(program(1000)),/stroke parts/);assert.equal(session.getState().program,state.program);assert.equal(session.getState().scene,state.scene);session.destroy();
});
test('authentic sampled and rebase geographic frames keep indexed hit policy without offline authority',()=>{
 const from=program(80),to=from.editProjection({scalePx:200}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear',formatVersion:5}}),current=sampleTransition(plan,50);
 const frame=prepareAnimationHitFrame(current,1,undefined,hitPreparation);assert.ok(frame.entries.length>0);assert.throws(()=>prepareAnimationHitFrame(current,1,undefined,{...hitPreparation,pathGeometry:{...pathGeometry,maxIndexWork:1}}),/index.*work budget/);
 const rebase=planTransition({from:current,to,options:{durationMs:100,formatVersion:5}}),next=sampleTransition(rebase,50);prepareAnimationHitFrame(next,2,undefined,hitPreparation);
 const session=createInteractionSession({program:from,bindings:[],hitPreparation});session.mount(host);session.dispatch({type:'frame',frame:current,version:session.getState().frameVersion+1,generation:session.getState().generation});assert.equal(session.getState().animationFrame,current);
 const snapshot=session.getState();assert.throws(()=>session.dispatch({type:'frame',frame:structuredClone(current),version:snapshot.frameVersion+1,generation:snapshot.generation}),/authentic/);assert.equal(session.getState().animationFrame,current);
 const offline=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);assert.throws(()=>prepareAnimationHitFrame(offline,2,undefined,hitPreparation),/native/);session.destroy();
});
