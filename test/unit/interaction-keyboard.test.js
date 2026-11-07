import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../src/index.js';
import { chart as basic } from '../../src/basic.js';
import { createInteractionSession } from '../../src/interaction.js';
import { getMarkItems } from '../../src/inspection.js';
import { serializeProgram, deserializeProgram } from '../../src/persistence.js';
const points=(factory=chart)=>factory().createCanvas({width:300,height:200}).createData({id:'d',keyField:'id',values:[{id:'a',x:1,y:2},{id:'b',x:2,y:3}]}).createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'});
const binding=(target='points',activation)=>({type:'keyboard',targets:[{target,...(activation?{activation}:{})}]});
const session=(program,activation)=>createInteractionSession({program,bindings:[binding('points',activation)]});
function surface() {
 const listeners=new Map(); const element={listeners,getBoundingClientRect:()=>({left:20,top:30,width:300,height:200}),
 addEventListener(type,fn){const list=listeners.get(type)??new Set();list.add(fn);listeners.set(type,list);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
 key(key,patch={}){const event={key,target:element,preventDefault(){this.defaultPrevented=true;},...patch}; for(const fn of [...listeners.get('keydown')??[]])fn(event);return event;},count(){return [...listeners.values()].reduce((sum,list)=>sum+list.size,0);}};return element;
}
test('keyboard focus is transient, Basic compatible and uses exact current-frame anchors',()=>{
 for(const factory of [chart,basic]) {
  const p=points(factory),before=serializeProgram(p),s=session(p),keys=getMarkItems(p).map(item=>item.key),events=[];s.subscribe(event=>events.push(event.type));
  assert.equal(s.getState().focus,null);s.dispatch({type:'focus',move:'next'});assert.equal(s.getState().focus.itemKey,keys[0]);
  const anchor=s.getState().focus.screenPoint;s.dispatch({type:'inspect',point:anchor,slop:0});assert.equal(s.getState().hit.candidates.some(item=>item.itemKey===keys[0]),true);
  s.dispatch({type:'focus',move:'next'});assert.equal(s.getState().focus.itemKey,keys[1]);
  assert.equal(s.dispatch({type:'focus',move:'next'}).status,'unchanged');s.dispatch({type:'focus',move:'previous'});
  const scene=structuredClone(s.getState().scene);scene.nodes.find(node=>node.type==='circle').properties.x+=20;
  s.dispatch({type:'frame',scene,version:20,generation:0});assert.equal(s.getState().focus.screenPoint.x,anchor.x+20);assert.equal(s.getState().focus.itemKey,keys[0]);
  assert.equal(s.getState().program,p);assert.equal(s.getState().revision,0);assert.equal(s.getState().history.undoCount,0);assert.equal(serializeProgram(p),before);assert.ok(Object.isFrozen(s.getState().focus));s.destroy();assert.equal(s.getState().focus,null);
 }
});
test('painted eligibility excludes opacity, clipping and removed current nodes with owner fallback',()=>{
 const p=points(),keys=getMarkItems(p).map(item=>item.key),s=session(p);s.dispatch({type:'focus',target:'points',itemKey:keys[0]});
 const zero=structuredClone(s.getState().scene);zero.nodes.find(node=>node.type==='circle').properties.opacity=0;
 s.dispatch({type:'frame',scene:zero,version:1,generation:0});assert.equal(s.getState().focus.itemKey,null);assert.deepEqual(s.getState().focus.target,{childPath:[],id:'points'});
 const state=s.getState();assert.throws(()=>s.dispatch({type:'focus',target:'points',itemKey:keys[0]}),/not painted/);assert.equal(s.getState(),state);
 s.dispatch({type:'focus',move:'next'});assert.equal(s.getState().focus.itemKey,keys[1]);
 const hidden=structuredClone(s.getState().scene);hidden.nodes=hidden.nodes.filter(node=>node.type!=='circle');s.dispatch({type:'frame',scene:hidden,version:2,generation:0});assert.equal(s.getState().focus.itemKey,null);
 s.updateProgram(p);s.dispatch({type:'focus',target:'points',itemKey:keys[0]});
 s.updateProgram(p.filterMarks({target:'points',field:'id',op:'eq',value:'b'}));assert.equal(s.getState().focus.itemKey,null);
 s.updateProgram(p);assert.equal(s.getState().focus.itemKey,null,'restored view retains the explicit owner container');
 s.dispatch({type:'focus',move:'last'});assert.equal(s.getState().focus.itemKey,keys[1]);s.destroy();
});
test('keyboard native activation has one selection transaction and history; scoped identity survives codec',()=>{
 const p=points().selectMarks({id:'picked',target:'points',items:[],empty:'none'}),combined=hconcat({id:'pair',programs:[{id:'left',program:p},{id:'right',program:p}]}),target={childPath:['right'],id:'points'};
 const s=createInteractionSession({program:combined,bindings:[binding(target,{type:'select',selection:'picked',mode:'toggle'})]}),events=[];s.subscribe(event=>events.push([event.type,event.phase]));
 const key=getMarkItems(combined,{target}).at(0).key;s.dispatch({type:'focus',target,itemKey:key});s.dispatch({type:'activate'});
 assert.equal(s.getState().focus.itemKey,key);assert.equal(s.getState().history.undoCount,1);assert.deepEqual(events.slice(-2),[['select','commit'],['select','settled']]);
 assert.equal(s.getState().program.children.left,combined.children.left);assert.equal(s.getState().program.children.right.materializationConfigs.selections.picked.target,'points');
 s.dispatch({type:'undo'});assert.equal(s.getState().focus.itemKey,key);assert.equal(s.getState().history.redoCount,1);
 const restored=deserializeProgram(serializeProgram(s.getState().program));s.updateProgram(restored);assert.equal(s.getState().focus.itemKey,key);s.destroy();
});
test('mounted keys use host focus, avoid nested controls/modifiers and detach exactly',()=>{
 const p=points().selectMarks({id:'picked',items:[],empty:'none'}),s=session(p,{type:'select',selection:'picked'}),element=surface(),keys=getMarkItems(p).map(item=>item.key),off=s.mount(element,{rootTransform:[0,2,-2,0,400,0]});
 assert.equal(element.count(),1);assert.equal(element.key('ArrowDown').defaultPrevented,true);assert.equal(s.getState().focus.itemKey,keys[0]);
 const old=s.getState();element.key('ArrowDown',{shiftKey:true});element.key('ArrowDown',{target:{tagName:'INPUT'}});element.key('Tab');assert.equal(s.getState(),old);
 element.key('End');assert.equal(s.getState().focus.itemKey,keys[1]);element.key('Enter');assert.equal(s.getState().history.undoCount,1);
 const point=s.getState().focus.screenPoint;s.dispatch({type:'inspect',point,slop:0});assert.equal(s.getState().hit.target.itemKey,keys[1]);
 assert.equal(off(),true);assert.equal(element.count(),0);const state=s.getState();element.key('Home');assert.equal(s.getState(),state);s.destroy();
});
test('partition arrows use native topology and Enter/Escape reuse native focus',()=>{
 const p=chart().createCanvas({width:600,height:400,margin:20}).createData({id:'d',values:[{id:'r',parent:null},{id:'a',parent:'r'},{id:'a1',parent:'a',value:2},{id:'a2',parent:'a',value:4},{id:'b',parent:'r',value:4}]}).createHierarchyData({id:'h',key:'id',parent:'parent',value:'value'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition'});
 const s=createInteractionSession({program:p,bindings:[binding('partition',{type:'focusHierarchy'})]}),e=surface();s.mount(e);
 const keys=new Map(getMarkItems(p,{target:'partition'}).map(item=>[item.fields.id,item.key]));
 e.key('Home');assert.equal(s.getState().focus.itemKey,keys.get('r'));e.key('ArrowRight');assert.equal(s.getState().focus.itemKey,keys.get('a'));e.key('ArrowDown');assert.equal(s.getState().focus.itemKey,keys.get('b'));e.key('ArrowUp');
 e.key('Enter');assert.deepEqual(s.getState().program.graphicSpec,p.editPartitionPlot({target:'partition',focus:{key:'a'}}).graphicSpec);assert.equal(s.getState().focus.itemKey,keys.get('a'));
 e.key('Escape');assert.deepEqual(s.getState().program.graphicSpec,p.editPartitionPlot({target:'partition',focus:{key:'r'}}).graphicSpec);assert.equal(s.getState().history.undoCount,2);s.destroy();
});
test('keyboard declarations and commands fail closed before mutation or callbacks',()=>{
 const p=points();let reads=0;
 const invalid=[{type:'keyboard',targets:[]},{type:'keyboard',targets:[{target:'missing'}]},binding('points',{type:'focusHierarchy'}),binding('points',{type:'select',selection:'missing'}),{type:'keyboard',targets:[{target:'points'},{target:'points'}]}];
 for(const b of invalid)assert.throws(()=>createInteractionSession({program:p,bindings:[b]}));
 assert.throws(()=>createInteractionSession({program:p,bindings:[binding(),binding()]}),/one keyboard/);
 assert.throws(()=>createInteractionSession({program:p,bindings:[{type:'keyboard',get targets(){reads++;return [];}}]}),/own|accessor/i);assert.equal(reads,0);
 const s=session(p),state=s.getState();for(const c of [{type:'focus',move:'wrap'},{type:'focus',move:'first',target:'points'},{type:'focus',target:'points',itemKey:''},{type:'focus',target:'other',itemKey:null},{type:'activate',payload:{}}])assert.throws(()=>s.dispatch(c));assert.equal(s.getState(),state);
 assert.equal(s.dispatch({type:'activate'}).status,'unchanged');s.dispatch({type:'focus',target:'points',itemKey:null});assert.equal(s.getState().focus.itemKey,null);s.destroy();
 const plain=createInteractionSession({program:p});assert.throws(()=>plain.dispatch({type:'focus',move:'first'}),/keyboard binding/);assert.throws(()=>plain.dispatch({type:'activate'}),/keyboard binding/);plain.destroy();
});
test('Geo logical focus survives one exact representation and falls back on ambiguous expansion',()=>{
 const features=ids=>({type:'FeatureCollection',features:ids.map((id,index)=>({type:'Feature',id,properties:{},geometry:{type:'Point',coordinates:[40+60*index,60]}}))});
 const p=chart().createCanvas({width:240,height:180,margin:0})
  .createGeometryData({id:'states',format:'geojson',coordinateKind:'planar',featureKey:'id',values:features(['state'])})
  .createGeometryData({id:'counties',format:'geojson',coordinateKind:'planar',featureKey:'id',values:features([1,'1'])})
  .createGeoLODData({id:'regions',levels:[{id:'state',geometry:'states'},{id:'county',geometry:'counties',parents:[{key:1,parent:'state'},{key:'1',parent:'state'}],enterZoom:4.2,exitZoom:3.8}],zoom:5})
  .createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'points',geometry:'regions',radiusPx:9});
 const s=session(p),[a,b]=getMarkItems(p);assert.notEqual(a.key,b.key);s.dispatch({type:'focus',target:'points',itemKey:a.key});
 const coarse=p.editGeoLODData({target:'regions',zoom:3}),[state]=getMarkItems(coarse);s.updateProgram(coarse);
 assert.equal(s.getState().focus.itemKey,a.key);assert.equal(s.getState().focus.currentItemKey,state.key);s.updateProgram(deserializeProgram(serializeProgram(coarse)).editGeoLODData({target:'regions',zoom:5}));
 assert.equal(s.getState().focus.itemKey,a.key);assert.equal(s.getState().focus.currentItemKey,a.key);
 s.updateProgram(coarse);s.dispatch({type:'focus',target:'points',itemKey:state.key});s.updateProgram(p);assert.equal(s.getState().focus.itemKey,null);s.destroy();
});
test('current-frame clip and missing owner never manufacture a focus candidate',()=>{
 const p=points(),s=session(p),[a]=getMarkItems(p);s.dispatch({type:'focus',move:'first'});
 const clipped=structuredClone(s.getState().scene);for(const node of clipped.nodes)if(node.type==='circle')node.clip=[0,0,1,1];
 s.dispatch({type:'frame',scene:clipped,version:1,generation:0});assert.equal(s.getState().focus.itemKey,null);assert.equal(s.dispatch({type:'focus',move:'first'}).status,'unchanged');
 s.updateProgram(p);s.dispatch({type:'focus',target:'points',itemKey:a.key});s.updateProgram(p.removeMark({target:'points'}));assert.equal(s.getState().focus.itemKey,null);s.dispatch({type:'activate'});s.destroy();
});
test('focus is reconciled only with accepted async assets and late leases cannot restore stale focus',async()=>{
 const p=points().selectMarks({id:'picked',items:[],empty:'none'}),calls=[],disposed=[],events=[];
 const s=createInteractionSession({program:p,bindings:[binding('points',{type:'select',selection:'picked'})],assetResolver:request=>new Promise((resolve,reject)=>calls.push({request,resolve,reject}))});s.subscribe(event=>events.push(event));
 const tick=()=>new Promise(resolve=>setImmediate(resolve)),lease=id=>({dispose(){disposed.push(id);}});
 await tick();calls[0].resolve(lease('initial'));await s.whenSettled();s.dispatch({type:'focus',move:'first'});const focused=s.getState().focus;
 s.dispatch({type:'activate'});const first=s.whenSettled();await tick();assert.equal(s.getState().program,p);assert.equal(s.getState().focus,focused);assert.equal(s.getState().history.undoCount,0);
 calls[1].reject(new Error('offline'));assert.equal((await first).status,'error');assert.equal(s.getState().focus,focused);
 s.dispatch({type:'activate'});const waiting=s.whenSettled();await tick();calls[2].resolve(lease('selected'));await waiting;assert.equal(s.getState().focus.itemKey,focused.itemKey);assert.equal(s.getState().history.undoCount,1);
 const next=s.getState().program.filterMarks({target:'points',field:'id',op:'eq',value:'b'});s.updateProgram(()=>Promise.resolve(next));const late=s.whenSettled();await tick();s.destroy();assert.equal((await late).status,'cancelled');const count=events.length;calls[3].resolve(lease('late'));await tick();assert.equal(events.length,count);assert.equal(s.getState().focus,null);assert.deepEqual(disposed,['initial','selected','late']);
});
test('focus subscribers queue native activation once and a disposed mount cannot dispatch',()=>{
 const p=points().selectMarks({id:'picked',items:[],empty:'none'}),s=session(p,{type:'select',selection:'picked'}),events=[];
 s.subscribe(event=>{events.push(event.type);if(event.type==='focus')assert.equal(s.dispatch({type:'activate'}).status,'queued');});
 s.dispatch({type:'focus',move:'first'});assert.deepEqual(events,['focus','select','select']);assert.equal(s.getState().history.undoCount,1);
 const e=surface();s.mount(e);const listener=[...e.listeners.get('keydown')][0];s.destroy();assert.equal(e.count(),0);assert.doesNotThrow(()=>listener({key:'ArrowRight',preventDefault(){throw new Error('dead callback');}}));
});
test('hierarchy grouped focus forwards original paths and missing neighbors stay unchanged',()=>{
 const p=chart().createCanvas().createData({values:[{region:'A',city:'a',v:2},{region:'A',city:'b',v:3},{region:'B',city:'c',v:4}]}).createHierarchyData({id:'hierarchy',groupFields:['region','city'],value:'v'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition'});
 const s=createInteractionSession({program:p,bindings:[binding('partition',{type:'focusHierarchy'})]}),e=surface();s.mount(e);e.key('Home');
 const before=s.getState().focus;assert.equal(s.dispatch({type:'focus',move:'previousSibling'}).status,'unchanged');assert.equal(s.getState().focus,before);
 e.key('Enter');assert.deepEqual(s.getState().program.graphicSpec,p.editPartitionPlot({target:'partition',focus:{path:['A']}}).graphicSpec);s.destroy();
 const plain=session(points());plain.dispatch({type:'focus',move:'previous'});const focus=plain.getState().focus;for(const move of ['parent','root','firstChild'])assert.equal(plain.dispatch({type:'focus',move}).status,'unchanged');assert.equal(plain.getState().focus,focus);plain.destroy();
});

test('native item readers are exact-constructor builtins with immutable registration', async()=>{
 const {registerMarkItemResolver,resolveRegisteredMarkItems,resolveRegisteredMarkSourceItems}=await import('../../src/materialization/selection/itemResolver.js');
 for(const args of [[{},()=>[]],[()=>{},()=>[]],[class {},null]]) assert.throws(()=>registerMarkItemResolver(...args),/constructor and resolver/);
 class Native{};class Other extends Native{};const result=Object.freeze([{key:'exact'}]);let calls=0;
 registerMarkItemResolver(Native,(program,target,grain,options)=>{calls++;assert.ok(program instanceof Native);assert.equal(target,'mark');assert.equal(grain,'item');assert.deepEqual(options,{channels:[]});return result;});
 assert.throws(()=>registerMarkItemResolver(Native,()=>[]),/already registered/);
 assert.equal(resolveRegisteredMarkItems(new Native(),'mark','item',{channels:[]}),result);assert.equal(calls,1);
 assert.throws(()=>resolveRegisteredMarkItems(new Other(),'mark'),/does not provide/);assert.equal(calls,1);
 assert.throws(()=>resolveRegisteredMarkSourceItems(new Native(),'mark'),/does not provide native source/);
 class Source{};class Inherited extends Source{};let sourceCalls=0;
 assert.throws(()=>registerMarkItemResolver(Source,()=>[],{}),/source item resolution requires a resolver/);
 registerMarkItemResolver(Source,()=>[],(program,target,grain,options)=>{sourceCalls++;assert.ok(program instanceof Source);assert.equal(target,'mark');assert.equal(grain,'item');assert.deepEqual(options,{channels:[]});return result;});
 assert.equal(resolveRegisteredMarkSourceItems(new Source(),'mark','item',{channels:[]}),result);assert.equal(sourceCalls,1);
 assert.throws(()=>resolveRegisteredMarkSourceItems(new Inherited(),'mark'),/does not provide/);
 assert.throws(()=>registerMarkItemResolver(Source,()=>[],()=>[]),/already registered/);assert.equal(sourceCalls,1);
});
