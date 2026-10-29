import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { getProjectionView } from "../../src/inspection.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function program(globe=false) { return chart().createCanvas({width:400,height:300,margin:0})
 .createGeometryData({id:'places',format:'geojson',coordinateKind:globe?'geographic':'planar',featureKey:'id',values:{type:'Feature',id:'a',properties:{name:'A'},geometry:{type:'Point',coordinates:globe?[0,0]:[80,90]}}})
 .createProjection({id:'map',type:globe?'equirectangular':'identity',...(globe?{scalePx:180/Math.PI,translatePx:[200,150]}:{})})
 .createCoordinate({type:'geo'}).createGeoPointMark({id:'places'}); }
const binding=(p,overrides={})=>({type:'navigate',target:'map',mode:'pan',scaleExtent:[0.5,8],initial:getProjectionView(p,{target:'map'}).parameters,...overrides});
const xy=s=>{const c=s.getState().scene.nodes.find(n=>n.type==='circle');return [c.properties.x,c.properties.y];};
function host(){const listeners=new Map(),frames=new Map(),captures=new Set();let sequence=0;
 const element={listeners,frames,captures,addEventListener(type,fn){const set=listeners.get(type)??new Set();set.add(fn);listeners.set(type,set);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
 getBoundingClientRect:()=>({left:10,top:20,width:400,height:300}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id),
 requestAnimationFrame:fn=>(frames.set(++sequence,fn),sequence),cancelAnimationFrame:id=>frames.delete(id),flush(){const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn();},
 fire(type,x=80,y=90,extra={}){let prevented=0;const event={clientX:x+10,clientY:y+20,pointerId:1,pointerType:'touch',button:0,preventDefault(){prevented++;},...extra};for(const fn of [...(listeners.get(type)??[])])fn(event);return prevented;}};return element; }
function setup(p=program(),overrides={},options={}){const s=createInteractionSession({program:p,bindings:[binding(p,overrides)],...options}),h=host(),events=[];s.subscribe(e=>events.push(e));const off=s.mount(h);return {s,h,p,events,off};}

test('navigation drag previews coalesce and one final commit preserves native trace, history and restored identity',()=>{
 const {s,h,p,events}=setup(),bytes=serializeProgram(p);
 h.fire('pointerdown');h.fire('pointermove',100,110);h.fire('pointermove',110,120);assert.equal(h.frames.size,1);h.flush();
 assert.equal(s.getState().program,p);assert.deepEqual(xy(s),[110,120]);assert.equal(s.getState().history.undoCount,0);
 h.fire('pointerup',120,130);assert.deepEqual(xy(s),[120,130]);assert.equal(s.getState().history.undoCount,1);assert.equal(h.captures.size,0);
 assert.deepEqual(s.getState().program.graphicSpec,p.navigateProjection({target:'map',operation:{type:'pan',deltaPx:[40,40]}}).graphicSpec);
 assert.deepEqual(events.filter(e=>e.phase).map(e=>e.phase),['preview','preview','commit','settled']);
 assert.deepEqual(deserializeProgram(serializeProgram(s.getState().program)).graphicSpec,s.getState().program.graphicSpec);
 s.dispatch({type:'undo'});assert.equal(s.getState().program,p);assert.deepEqual(xy(s),[80,90]);assert.equal(serializeProgram(p),bytes);s.destroy();
});

test('pan to pinch retains its visible phase baseline and commits one gesture history entry',()=>{
 const {s,h,p,events}=setup();h.fire('pointerdown',80,90);h.fire('pointermove',100,90);h.flush();assert.deepEqual(xy(s),[100,90]);
 h.fire('pointerdown',140,90,{pointerId:2});h.flush();assert.deepEqual(xy(s),[100,90]);assert.equal(h.captures.size,2);
 h.fire('pointermove',160,90,{pointerId:2});h.flush();assert.deepEqual(xy(s),[100,90]);
 h.fire('pointerup',100,90,{pointerId:1});assert.equal(h.captures.size,0);assert.equal(s.getState().history.undoCount,1);
 const expected=p.navigateProjection({target:'map',operation:{type:'pan',deltaPx:[20,0]}}).navigateProjection({target:'map',operation:{type:'pinch',fromPx:[[100,90],[140,90]],toPx:[[100,90],[160,90]],scaleExtent:[0.5,8]}});
 assert.deepEqual(s.getState().program.graphicSpec,expected.graphicSpec);const final=s.getState().program;
 h.fire('pointerup',160,90,{pointerId:2});assert.equal(s.getState().program,final);
 assert.equal(events.filter(e=>e.phase==='commit').length,1);s.destroy();
});

test('rotation navigation uses its explicit degree step and rebases pinch without resetting rotation',()=>{
 const p=program(true),{s,h}=setup(p,{mode:'rotate',rotationStepDeg:0.5,scaleExtent:[1,1000]});
 h.fire('pointerdown',200,150);h.fire('pointermove',220,150);h.flush();assert.ok(Math.abs(xy(s)[0]-210)<1e-10);
 h.fire('pointerdown',260,150,{pointerId:2});h.fire('pointermove',280,150,{pointerId:2});h.fire('pointerup',220,150);
 const actual=getProjectionView(s.getState().program,{target:'map'}).parameters;
 assert.deepEqual(actual.rotateDeg,[10,0,0]);assert.ok(Math.abs(actual.scalePx-1.5*180/Math.PI)<1e-10);assert.equal(s.getState().history.undoCount,1);s.destroy();
});

test('all capture cancellation paths restore committed program and displayed frame and release every pointer',()=>{
 for(const reason of ['Escape','pointercancel','lostpointercapture','blur','unmount','remount','destroy']){
  const {s,h,p,events,off}=setup();h.fire('pointerdown');h.fire('pointermove',100,90);h.flush();h.fire('pointerdown',140,90,{pointerId:2});h.flush();
  if(reason==='Escape')h.fire('keydown',0,0,{key:'Escape'});else if(reason==='unmount')off();else if(reason==='remount')s.mount(host());else if(reason==='destroy')s.destroy();else h.fire(reason);
  assert.equal(s.getState().program,p);if(reason!=='destroy')assert.deepEqual(xy(s),[80,90],reason);assert.equal(s.getState().history.undoCount,0);
  assert.equal(h.captures.size,0);assert.equal(h.frames.size,0);const count=events.length;h.fire('pointerup',120,90);h.flush();assert.equal(events.length,count);s.destroy();
 }
});

test('wheel modes normalize CSS deltas and keyboard native operations share history without shortcuts',()=>{
 for(const [deltaMode,deltaY]of[[0,-300],[1,-18.75],[2,-1]]){
  const {s,h}=setup();assert.equal(h.fire('wheel',80,90,{deltaMode,deltaY}),1);assert.deepEqual(xy(s),[80,90]);
  assert.equal(getProjectionView(s.getState().program,{target:'map'}).parameters.scalePx,2);assert.equal(s.getState().history.undoCount,1);
  assert.equal(h.fire('wheel',80,90,{deltaMode,deltaY:0}),0);assert.equal(s.getState().history.undoCount,1);s.destroy();
 }
 const {s,h,p}=setup();assert.equal(h.fire('keydown',0,0,{key:'ArrowRight'}),1);assert.deepEqual(xy(s),[90,90]);
 assert.equal(h.fire('keydown',0,0,{key:'ArrowRight',ctrlKey:true}),0);assert.equal(h.fire('keydown',0,0,{key:'Tab'}),0);
 h.fire('keydown',0,0,{key:'+'});assert.equal(getProjectionView(s.getState().program,{target:'map'}).parameters.scalePx,2);
 h.fire('keydown',0,0,{key:'Home'});assert.deepEqual(s.getState().program.graphicSpec,p.graphicSpec);assert.equal(s.getState().history.undoCount,3);s.destroy();
});

test('native preparation waits on the committed frame after drag and cancellation rejects a late lease',async()=>{
 const pending=[],released=[],p=program(),{s,h}=setup(p,{}, {assetResolver:request=>new Promise(resolve=>pending.push({request,resolve}))});
 await tick();pending[0].resolve({dispose(){released.push('initial')}});await s.whenSettled();
 h.fire('pointerdown');h.fire('pointermove',120,90);h.flush();assert.deepEqual(xy(s),[80,90]);await tick();pending[1].resolve({dispose(){released.push('preview')}});await s.whenSettled();assert.deepEqual(xy(s),[120,90]);h.fire('pointerup',120,90);const wait=s.whenSettled();await tick();
 assert.equal(s.getState().program,p);assert.deepEqual(xy(s),[80,90]);assert.equal(s.getState().previewProgram,null);
 s.dispatch({type:'undo'});assert.equal((await wait).status,'cancelled');assert.equal(pending[2].request.signal.aborted,true);
 pending[2].resolve({dispose(){released.push('late')}});await tick();assert.equal(s.getState().program,p);assert.deepEqual(xy(s),[80,90]);assert.deepEqual(released,['preview','late']);s.destroy();
});

test('nested CSS transforms map camera deltas and keep sibling graphics unchanged',()=>{
 const child=program(),p=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]}),h=host();
 const s=createInteractionSession({program:p,bindings:[binding(child,{target:{childPath:['left'],id:'map'}})]});s.mount(h,{rootTransform:[2,0,0,2,20,30]});
 h.fire('pointerdown',180,210);h.fire('pointermove',220,230);h.fire('pointerup',220,230);
 assert.equal(s.getState().program.children.right,child);
 assert.deepEqual(s.getState().program.children.left.graphicSpec,child.navigateProjection({target:'map',operation:{type:'pan',deltaPx:[20,10]}}).graphicSpec);
 s.destroy();
});

test('navigation validates explicit inputs and leaves no listeners after host capture failures',()=>{
 const p=program();let reads=0;
 for(const edit of [{scaleExtent:[0,2]},{scaleExtent:[3,2]},{initial:{type:'mercator'}},{mode:'rotate',rotationStepDeg:1},{rotationStepDeg:1},{mode:'unknown'},{target:'missing'}]){
  assert.throws(()=>createInteractionSession({program:p,bindings:[{...binding(p),...edit}]}));
 }
 const bad=binding(p);Object.defineProperty(bad,'initial',{get(){reads++;return{};}});assert.throws(()=>createInteractionSession({program:p,bindings:[bad]}));assert.equal(reads,0);
 assert.throws(()=>createInteractionSession({program:basic().createCanvas(),bindings:[binding(p)]}),/Full/);
 const {s,h}=setup();h.setPointerCapture=id=>{h.captures.add(id);if(id===2)throw new Error('capture failed')};h.fire('pointerdown');
 assert.throws(()=>h.fire('pointerdown',140,90,{pointerId:2}),/capture failed/);assert.equal(h.captures.size,0);s.destroy();assert.ok([...h.listeners.values()].every(set=>set.size===0));
});

test('click, unchanged pinch and a drag returning to origin do not append history',()=>{
 for(const kind of ['click','pinch','return']){
  const {s,h,p}=setup();h.fire('pointerdown');
  if(kind==='pinch'){h.fire('pointerdown',120,90,{pointerId:2});h.flush();}
  if(kind==='return'){h.fire('pointermove',100,90);h.flush();h.fire('pointermove',80,90);h.flush();assert.deepEqual(xy(s),[80,90]);}
  h.fire('pointerup');assert.equal(s.getState().program,p);assert.equal(s.getState().history.undoCount,0);assert.equal(h.frames.size,0);s.destroy();
 }
});

test('source replacement cancels active navigation and a removed target is inactive without choosing another resource',()=>{
 const {s,h,p,events}=setup();h.fire('pointerdown');h.fire('pointermove',100,90);h.flush();
 const revised=p.editGeometryData({target:'places',values:{type:'Feature',id:'b',properties:{name:'B'},geometry:{type:'Point',coordinates:[50,60]}}});
 s.updateProgram(revised,{history:'record'});assert.equal(s.getState().program,revised);assert.deepEqual(xy(s),[50,60]);assert.equal(h.captures.size,0);
 assert.equal(events.filter(e=>e.phase==='cancel').length,1);
 const removed=chart().createCanvas({width:400,height:300}).createProjection({id:'other',type:'identity'});
 s.updateProgram(removed);h.fire('pointerdown');h.fire('pointerup');assert.equal(h.fire('wheel',80,90,{deltaY:-300,deltaMode:0}),0);
 assert.equal(h.fire('keydown',0,0,{key:'Home'}),0);assert.equal(s.getState().program,removed);s.destroy();
});

test('wheel validation, clipping and scale bounds reject or clamp before any committed change',()=>{
 const {s,h,p}=setup();for(const event of [{deltaY:NaN,deltaMode:0},{deltaY:1,deltaMode:3},{deltaY:Number.MAX_VALUE,deltaMode:1}]){
  assert.throws(()=>h.fire('wheel',80,90,event));assert.equal(s.getState().program,p);assert.deepEqual(xy(s),[80,90]);
 }
 assert.equal(h.fire('wheel',450,90,{deltaY:-300,deltaMode:0}),0);assert.equal(s.getState().program,p);
 h.fire('wheel',80,90,{deltaY:-1e6,deltaMode:0});assert.equal(getProjectionView(s.getState().program,{target:'map'}).parameters.scalePx,8);
 h.fire('wheel',80,90,{deltaY:1e6,deltaMode:0});assert.equal(getProjectionView(s.getState().program,{target:'map'}).parameters.scalePx,0.5);s.destroy();
 const globe=program(true);for(const value of [0,NaN,Infinity])assert.throws(()=>createInteractionSession({program:globe,bindings:[binding(globe,{mode:'rotate',rotationStepDeg:value})]}));
 const {s:g,h:gh}=setup(globe,{mode:'rotate',rotationStepDeg:0.5,scaleExtent:[1,1000]});
 gh.fire('keydown',0,0,{key:'ArrowUp'});gh.fire('keydown',0,0,{key:'ArrowLeft'});
 assert.deepEqual(getProjectionView(g.getState().program,{target:'map'}).parameters.rotateDeg,[-5,5,0]);
 gh.fire('keydown',0,0,{key:'-'});gh.fire('keydown',0,0,{key:'='});gh.fire('keydown',0,0,{key:'_'});g.destroy();
});

test('clipped inverse and independently sampled camera frames cannot silently become navigation baselines',()=>{
 const p=program(true).editProjection({target:'map',type:'orthographic',scalePx:100,translatePx:[200,150]}),{s,h}=setup(p,{mode:'rotate',rotationStepDeg:0.5,scaleExtent:[1,1000]});
 assert.throws(()=>h.fire('wheel',390,290,{deltaY:-300,deltaMode:0}),/visible invertible/);assert.equal(s.getState().program,p);
 const before=s.getState(),scene=structuredClone(before.scene);scene.nodes.find(n=>n.type==='circle').properties.x+=10;
 s.dispatch({type:'frame',scene,version:before.frameVersion+1,generation:before.generation});
 assert.throws(()=>h.fire('pointerdown',200,150),/committed concrete frame/);assert.equal(h.captures.size,0);assert.equal(s.getState().program,p);s.destroy();
});

test('navigation snapshots caller options and rejects competing pointer owners',()=>{
 const p=program(),initial=structuredClone(getProjectionView(p,{target:'map'}).parameters),extent=[0.5,8];
 const {s,h}=setup(p,{initial,scaleExtent:extent});initial.translatePx[0]=999;extent[1]=1;
 h.fire('wheel',80,90,{deltaY:-300,deltaMode:0});assert.equal(getProjectionView(s.getState().program,{target:'map'}).parameters.scalePx,2);
 h.fire('keydown',0,0,{key:'Home'});assert.deepEqual(s.getState().program.graphicSpec,p.graphicSpec);s.destroy();
 assert.throws(()=>createInteractionSession({program:p,bindings:[binding(p),binding(p)]}),/one editing pointer/);
});
