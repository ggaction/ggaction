import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat} from '../../src/index.js';
import {ChartProgram} from '../../src/ChartProgram.js';
import {chart as basic} from '../../src/basic.js';
import {getMarkItems} from '../../src/inspection.js';
import {createInteractionSession} from '../../src/interaction.js';
import {serializeProgram} from '../../src/persistence.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../src/animation.js';
import {registerGraphPresentationReader,readNativeGraphPresentation} from '../../src/materialization/graph/presentationReader.js';
import {animationFrameProvenance,registerNativeGraphPresentationFrame} from '../../src/animation/frameProvenance.js';

const options={durationMs:100,easing:'linear'};
function fixture(){
 const plain=chart().createCanvas({width:300,height:200,margin:0})
 .createData({id:'nodes',keyField:'id',values:[{id:'a'},{id:'b'}]})
 .createData({id:'edges',values:[{id:'one',from:'a',to:'b'},{id:'two',from:'a',to:'b'}]})
 .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'from',target:'to',directed:true})
 .layoutGraph({id:'layout',method:'fixed',options:{positions:[{key:'a',x:40,y:80},{key:'b',x:240,y:80}]}})
 .createGraphPlot({id:'plot',origin:[0,0],nodes:{radius:10},edges:{stroke:'black',strokeWidth:4,arrows:false,parallelGap:24}});
 const program=plain.bundleGraphEdges({id:'routes',method:'edge-path'}).editGraphPlot({routes:'routes'})
 .selectMarks({id:'picked',target:'plot',items:[],empty:'none'});
 return{plain,program,keys:getMarkItems(program,{target:'plot'}).filter(item=>item.fields.kind==='edge').map(item=>item.key)};
}
const binding=target=>({type:'keyboard',targets:[{target,activation:{type:'select',selection:'picked'}}]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('overlapping edge candidates cycle in actual hit order and only the chosen edge unbundles',()=>{
 const {plain,program,keys}=fixture(),before=serializeProgram(program),s=createInteractionSession({program,bindings:[binding('plot')]});
 const baseline=s.getState().scene;s.dispatch({type:'inspect',point:{x:140,y:80},slop:0});
 const order=s.getState().hit.candidates.map(item=>item.itemKey);assert.equal(order.length,2);assert.deepEqual(new Set(order),new Set(keys));
 s.dispatch({type:'focus',move:'nextCandidate'});assert.equal(s.getState().focus.itemKey,order[0]);
 s.dispatch({type:'focus',move:'previousCandidate'});assert.equal(s.getState().focus.itemKey,order[1]);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:order[1]});const preview=s.getState().previewFrame;
 assert.ok(preview);assert.equal(s.getState().animationFrame,null);assert.equal(s.getState().program,program);assert.equal(s.getState().history.undoCount,0);
 const native=readNativeGraphPresentation(plain),proof=animationFrameProvenance(preview);let changed=0;
 for(const [i,node] of preview.scene.nodes.entries()){
  if(proof.endpoint.identities[i]?.key===order[1]){changed++;assert.notDeepEqual(node.properties.commands,baseline.nodes[i].properties.commands);assert.deepEqual(node.properties.commands,native.scene.nodes[i].properties.commands);}
  else assert.deepEqual(node,baseline.nodes[i]);
 }
 assert.equal(changed,1);assert.equal(serializeProgram(program),before);
 const replanned=planTransition({from:preview,to:program,options});assert.equal(sampleTransition(replanned,0),preview);
 assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(replanned)).plan,50).scene,sampleTransition(replanned,50).scene);
 s.dispatch({type:'focus',move:'nextCandidate'});assert.equal(s.getState().previewFrame,null);assert.deepEqual(s.getState().scene,baseline);assert.equal(s.getState().focus.itemKey,order[0]);
 s.dispatch({type:'activate'});assert.equal(s.getState().history.undoCount,1);assert.deepEqual(s.getState().program.semanticSpec.resources.find(r=>r.id==='picked').options.itemKeys,[order[0]]);
 s.dispatch({type:'undo'});assert.equal(s.getState().program,program);s.destroy();
});

test('native reader never inherits authority or accepts a copied frame',()=>{
 const {program}=fixture();class Derived extends ChartProgram{}
 assert.throws(()=>readNativeGraphPresentation(new Derived()),/exact supported/);
 assert.throws(()=>readNativeGraphPresentation(basic()),/exact supported/);
 assert.throws(()=>readNativeGraphPresentation(null),/exact supported/);
 assert.throws(()=>registerGraphPresentationReader(null,()=>{}),/constructor/);
 assert.throws(()=>registerGraphPresentationReader(ChartProgram,()=>{}),/already registered/);
 const frame=readNativeGraphPresentation(program),proof=animationFrameProvenance(frame);
 assert.throws(()=>registerNativeGraphPresentationFrame(structuredClone(frame),program,proof.endpoint,proof.graphs),/exact owned/);
 assert.throws(()=>registerNativeGraphPresentationFrame(frame,program,proof.endpoint,proof.graphs),/exact owned/);
 assert.equal(proof.native.owners[0],program);assert.equal(Object.hasOwn(proof,'plan'),false);
});

test('current animated nested edge presentation preserves source scopes, baseline and topology',()=>{
 const {program}=fixture(),to=program.editLayout({options:{positions:[{key:'a',x:60,y:120},{key:'b',x:260,y:120}]}});
 const wrap=p=>hconcat({id:'pair',programs:[{id:'left',program:p},{id:'right',program}]}),native=wrap(program),target={childPath:['left'],id:'plot'};
 const frame=sampleTransition(planTransition({from:native,to:wrap(to),options}),50),key=getMarkItems(native,{target}).find(item=>item.fields.kind==='edge').key;
 const s=createInteractionSession({program:native,bindings:[binding(target)]});s.dispatch({type:'frame',frame,version:1,generation:0});
 s.dispatch({type:'unbundleEdge',target,itemKey:key});assert.equal(s.getState().animationFrame,frame);assert.equal(s.getState().program,native);
 const preview=s.getState().previewFrame,proof=animationFrameProvenance(preview);
 for(const[i,node]of preview.scene.nodes.entries())if(proof.endpoint.identities[i]?.key!==key)assert.equal(node,frame.scene.nodes[i]);
 s.dispatch({type:'unbundleEdge',target,itemKey:null});assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().animationFrame,frame);assert.deepEqual(s.getState().scene,frame.scene);
 s.dispatch({type:'unbundleEdge',target,itemKey:key});s.updateProgram(native);assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().animationFrame,null);s.destroy();
});

test('missing, clipped, transparent, unrelated or independently altered edge inputs reject atomically',()=>{
 const {program,keys}=fixture();
 for(const p of [program.editGraphPlot({edges:{opacity:0}}),program.editGraphics({target:'plot',property:'clip',value:{x:0,y:0,width:1,height:1}})]){
  const s=createInteractionSession({program:p}),state=s.getState();assert.throws(()=>s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]}),/painted/);assert.equal(s.getState(),state);s.destroy();
 }
 const s=createInteractionSession({program}),state=s.getState();
 for(const command of [{type:'unbundleEdge',target:'plot',itemKey:'unknown'},{type:'unbundleEdge',target:'plot',itemKey:''},{type:'unbundleEdge',target:'plot',itemKey:keys[0],payload:{}},{type:'unbundleEdge',target:'nodes',itemKey:keys[0]}])assert.throws(()=>s.dispatch(command));
 assert.equal(s.getState(),state);const scene=structuredClone(state.scene);scene.nodes.find(n=>n.type==='path').properties.strokeWidth=5;s.dispatch({type:'frame',scene,version:1,generation:0});
 assert.throws(()=>s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]}),/native or authentic/);s.destroy();
});

test('exact preview asset preparation is atomic, cancels stale leases and never records a program transaction',async()=>{
 const{program,keys}=fixture(),calls=[],released=[],s=createInteractionSession({program,assetResolver:request=>new Promise((resolve,reject)=>calls.push({request,resolve,reject}))});
 const lease=id=>({dispose(){released.push(id);}});await tick();calls[0].resolve(lease('native'));await s.whenSettled();
 const baseline=s.getState().scene;s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});const first=s.whenSettled();await tick();
 assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().scene,baseline);assert.ok(calls[1].request.frame);assert.equal(calls[1].request.program,program);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});const second=s.whenSettled();await tick();assert.equal(calls[1].request.signal.aborted,true);
 calls[1].resolve(lease('stale'));calls[2].resolve(lease('preview'));await first;await second;await tick();assert.ok(s.getState().previewFrame);assert.deepEqual(released,['stale']);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:null});assert.equal(s.getState().previewFrame,null);assert.deepEqual(s.getState().scene,baseline);assert.deepEqual(released,['stale','preview']);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});await tick();const pending=s.whenSettled();s.destroy();calls[3].resolve(lease('after-dispose'));await pending;await tick();
 assert.equal(s.getState().history.undoCount,0);assert.deepEqual(released,['stale','preview','native','after-dispose']);
});

test('mounted Page keys cycle overlapping candidates and Escape restores the canonical picture',()=>{
 const{program,keys}=fixture(),listeners=new Map(),element={getBoundingClientRect:()=>({left:0,top:0,width:300,height:200}),addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const s=createInteractionSession({program,bindings:[binding('plot')]});const off=s.mount(element,{rootTransform:[-1,0,0,1,300,0]});
 const key=(key,extra={})=>{const event={key,target:element,preventDefault(){this.prevented=true;},...extra};listeners.get('keydown')?.(event);return event;};
 assert.equal(s.dispatch({type:'focus',move:'nextCandidate'}).status,'unchanged');s.dispatch({type:'inspect',point:{x:160,y:80},slop:0});
 const order=s.getState().hit.candidates.map(x=>x.itemKey);assert.equal(order.length,2);assert.equal(key('PageUp').prevented,true);assert.equal(s.getState().focus.itemKey,order[1]);
 key('PageDown');assert.equal(s.getState().focus.itemKey,order[0]);const before=s.getState();key('PageDown',{shiftKey:true});key('PageDown',{target:{}});key('Tab');assert.equal(s.getState(),before);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});key('Escape');assert.equal(s.getState().previewFrame,null);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});off();assert.equal(s.getState().previewFrame,null);assert.equal(listeners.size,0);s.destroy();
});

test('new source, history reset, frame and leave clear presentation without reviving stale inspection',()=>{
 const{program,keys}=fixture(),s=createInteractionSession({program,bindings:[binding('plot')]});
 s.dispatch({type:'inspect',point:{x:140,y:80}});s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});s.dispatch({type:'leave'});
 s.dispatch({type:'focus',move:'nextCandidate'});assert.equal(s.getState().focus,null);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});s.dispatch({type:'reset'});assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().history.undoCount,0);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});const native=readNativeGraphPresentation(program);s.dispatch({type:'frame',frame:native,version:s.getState().frameVersion+1,generation:0});assert.equal(s.getState().previewFrame,null);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});s.updateProgram(program.removeMark({target:'plot'}));assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().hit,null);s.destroy();
});

test('failed preparation preserves the prior preview and reentrant teardown cannot publish a late one',async()=>{
 const{program,keys}=fixture(),calls=[],released=[],s=createInteractionSession({program,assetResolver:request=>new Promise((resolve,reject)=>calls.push({request,resolve,reject}))});
 const lease=id=>({dispose(){released.push(id);}});await tick();calls[0].resolve(lease('base'));await s.whenSettled();
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});await tick();calls[1].resolve(lease('first'));await s.whenSettled();const picture=s.getState().previewFrame;
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});await tick();calls[2].reject(Error('decode failed'));assert.equal((await s.whenSettled()).status,'error');assert.equal(s.getState().previewFrame,picture);assert.deepEqual(released,[]);
 s.subscribe(event=>{if(event.type==='unbundleEdge'&&event.itemKey!==null)s.destroy();});
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});await tick();calls[3].resolve(lease('last'));await s.whenSettled();assert.equal(s.getState().destroyed,true);assert.equal(s.getState().previewFrame,null);assert.deepEqual(new Set(released),new Set(['first','last','base']));
});

test('temporary edge presentation is cleared before native drag and cannot capture an uncommitted editing preview',()=>{
 const{program,keys}=fixture(),listeners=new Map(),pending=new Map(),captures=new Set();let seq=0;
 const host={getBoundingClientRect:()=>({left:0,top:0,width:300,height:200}),
  addEventListener:(key,fn)=>{const set=listeners.get(key)??new Set();set.add(fn);listeners.set(key,set);},removeEventListener:(key,fn)=>listeners.get(key)?.delete(fn),
  setPointerCapture:key=>captures.add(key),releasePointerCapture:key=>captures.delete(key),hasPointerCapture:key=>captures.has(key),requestAnimationFrame:fn=>(pending.set(++seq,fn),seq),cancelAnimationFrame:key=>pending.delete(key)};
 const fire=(type,x,y,extra={})=>{for(const fn of listeners.get(type)??[])fn({pointerId:1,pointerType:'mouse',clientX:x,clientY:y,preventDefault(){},...extra});};
 const s=createInteractionSession({program,bindings:[{type:'moveNode',target:'plot'}]});s.mount(host);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});fire('pointerdown',40,80);assert.equal(s.getState().previewFrame,null);
 fire('pointermove',70,100);for(const fn of pending.values())fn();pending.clear();const state=s.getState();assert.ok(state.previewProgram);
 assert.throws(()=>s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]}),/editing preview/);assert.equal(s.getState(),state);
 fire('keydown',0,0,{key:'Escape'});assert.equal(s.getState().previewProgram,null);assert.equal(s.getState().program,program);assert.equal(s.getState().history.undoCount,0);
 s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[1]});s.destroy();assert.equal(captures.size,0);
});

test('invalid native edits and stale sampled frames preserve a temporary edge view',()=>{
 const{program,keys}=fixture(),s=createInteractionSession({program});s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});const picture=s.getState().previewFrame;
 assert.equal(s.dispatch({type:'frame',version:0,generation:0,frame:Object.defineProperty({},'scene',{get(){throw Error('stale read');}})}).status,'stale');
 assert.throws(()=>s.dispatch({type:'moveNode',target:'layout',payload:{key:'absent',x:10,y:10}}));assert.equal(s.getState().previewFrame,picture);assert.equal(s.getState().program,program);assert.equal(s.getState().history.undoCount,0);
 assert.equal(s.dispatch({type:'unbundleEdge',target:'plot',itemKey:null}).status,'applied');assert.equal(s.dispatch({type:'unbundleEdge',target:'plot',itemKey:null}).status,'unchanged');s.destroy();
});

test('restoring a presentation publishes even when candidate focus or native history stays unchanged',()=>{
 const source=fixture(),program=source.program.createParameter({id:'threshold',value:3}),keys=source.keys;
 for(const command of [{type:'focus',move:'nextCandidate'},{type:'undo'},{type:'reset'},{type:'setParameter',target:'threshold',payload:{value:3}}]){
  const s=createInteractionSession({program,bindings:[binding('plot')]}),events=[];s.subscribe(event=>events.push(event));
  s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});events.length=0;
  assert.equal(s.dispatch(command).status,'applied');assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().program,program);assert.equal(s.getState().history.undoCount,0);
  assert.equal(events.length,1);assert.equal(events[0].type,'unbundleEdge');assert.equal(events[0].itemKey,null);assert.equal(events[0].state.scene,s.getState().scene);s.destroy();
 }
});
