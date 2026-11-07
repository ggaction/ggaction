import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getProjectionView } from "../../src/inspection.js";
import { serializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

function map() { return chart().createCanvas({width:400,height:300,margin:0})
  .createGeometryData({id:"places",format:"geojson",coordinateKind:"planar",featureKey:"id",values:{type:"Feature",id:"a",properties:{},geometry:{type:"Point",coordinates:[80,90]}}})
  .createProjection({id:"map",type:"identity"}).createCoordinate({type:"geo"}).createGeoPointMark({id:"places"})
  .createAnnotation({id:"note",space:"screen",x:80,y:90,text:"Move",align:"center",baseline:"middle",fontSize:20}); }
const navigation = p => ({type:"navigate",target:"map",mode:"pan",initial:getProjectionView(p,{target:"map"}).parameters,scaleExtent:[.5,8]});
const points = () => chart().createCanvas({width:300,height:200,margin:0})
  .createData({id:"rows",keyField:"id",values:[{id:"a",x:50,y:60},{id:"b",x:200,y:130}]})
  .createPointMark({id:"points"}).encodePointRadius({value:8})
  .encodeX({field:"x",scale:{domain:[0,300],range:[0,300]}}).encodeY({field:"y",scale:{domain:[0,200],range:[0,200]}})
  .selectMarks({id:"picked",target:"points",items:[]});
const selected = p => {const r=resolveStoredSelection(p,"picked");return r.items.filter(item=>r.keys.includes(item.key)).map(item=>item.fields.id);};
function surface() {const listeners=new Map(),frames=new Map(),captures=new Set();let sequence=0;
  return {listeners,frames,captures,getBoundingClientRect:()=>({left:10,top:20,width:900,height:300}),
    addEventListener(type,fn){const list=listeners.get(type)??new Set();list.add(fn);listeners.set(type,list);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id),
    requestAnimationFrame:fn=>(frames.set(++sequence,fn),sequence),cancelAnimationFrame:id=>frames.delete(id),
    flush(){const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());},
    fire(type,x=0,y=0,extra={}){let prevented=0;for(const fn of [...listeners.get(type)??[]])fn({pointerId:1,pointerType:"mouse",button:0,clientX:x+10,clientY:y+20,preventDefault(){prevented++;},...extra});return prevented;},
    count(){return [...listeners.values()].reduce((n,set)=>n+set.size,0);}};
}
function mounted(p,bindings,options={}) {const session=createInteractionSession({program:p,bindings,...options}),host=surface(),events=[];session.subscribe(e=>{if(e.phase)events.push(e);});session.mount(host);return {session,host,events};}
const drag=(h,x,y,dx,dy,flags={})=>{h.fire("pointerdown",x,y,flags);h.fire("pointermove",x+dx,y+dy,flags);h.flush();h.fire("pointerup",x+dx,y+dy,flags);};

test("applicable annotation wins over navigation while background drags use the lower priority owner",()=>{
  const p=map(),before=serializeProgram(p),bindings=[navigation(p),{type:"annotate",target:"note"}];
  for(const note of [true,false]){const {session,host,events}=mounted(p,bindings);assert.equal(host.listeners.get("pointerdown").size,1);
    drag(host,note?80:180,note?90:190,20,10);
    const expected=note?p.editAnnotation({target:"note",dx:20,dy:10}):p.navigateProjection({target:"map",operation:{type:"pan",deltaPx:[20,10]}});
    assert.deepEqual(session.getState().program.graphicSpec,expected.graphicSpec);assert.equal(session.getState().history.undoCount,1);
    assert.equal(events.filter(e=>e.phase==="commit").length,1);assert.equal(events.filter(e=>e.phase==="settled").length,1);
    assert.ok(events.every(e=>e.type===(note?"annotate":"setViewport")));assert.equal(host.captures.size,0);session.destroy();assert.equal(host.count(),0);
  }assert.equal(serializeProgram(p),before);
});

test("hidden and removed high priority owners do not block a visible lower priority candidate",()=>{
  const original=map(),bindings=[{type:"annotate",target:"note",priority:999},navigation(original)];
  for(const p of [original.editAnnotation({target:"note",opacity:0}),original.removeMark({target:"note"})]){
    const {session,host,events}=mounted(original,bindings);session.updateProgram(p);events.length=0;drag(host,80,90,20,10);
    assert.deepEqual(session.getState().program.graphicSpec,p.navigateProjection({target:"map",operation:{type:"pan",deltaPx:[20,10]}}).graphicSpec);
    assert.equal(events.filter(e=>e.phase==="commit").length,1);assert.ok(events.every(e=>e.type==="setViewport"));session.destroy();
  }
});

test("explicit priority and modifiers select once and remain fixed after pointerdown",()=>{
  const p=map(),bindings=[{type:"annotate",target:"note",modifiers:{shift:true}}, {...navigation(p),priority:80,modifiers:{shift:false}}];
  for(const shiftKey of [true,false]){const {session,host,events}=mounted(p,bindings);
    host.fire("pointerdown",80,90,{shiftKey});host.fire("pointermove",100,100,{shiftKey:!shiftKey});host.flush();host.fire("pointerup",100,100,{shiftKey:!shiftKey});
    assert.ok(events.every(e=>e.type===(shiftKey?"annotate":"setViewport")));assert.equal(new Set(events.map(e=>e.transactionId)).size,1);session.destroy();
  }
  const {session,host}=mounted(p,[{type:"annotate",target:"note",modifiers:{ctrl:true}}]);drag(host,80,90,20,10);assert.equal(session.getState().program,p);assert.equal(host.captures.size,0);session.destroy();
});

test("brush and click candidates share one capture and explicit modifier-disjoint bindings",()=>{
  const p=points(),bindings=[{type:"brush",target:"points",selection:"picked",modifiers:{shift:true}},
    {type:"select",target:"points",selection:"picked",mode:"toggle",modifiers:{shift:false}}];
  const {session,host,events}=mounted(p,bindings);
  host.fire("pointerdown",50,60);host.fire("pointerup",50,60);host.fire("click",50,60,{detail:1});assert.deepEqual(selected(session.getState().program),["a"]);
  drag(host,150,100,100,70,{shiftKey:true});assert.deepEqual(selected(session.getState().program),["b"]);assert.equal(session.getState().history.undoCount,2);
  assert.equal(events.filter(e=>e.phase==="commit").length,2);assert.equal(host.listeners.get("pointerdown").size,1);
  session.dispatch({type:"undo"});assert.deepEqual(selected(session.getState().program),["a"]);session.destroy();
});

test("nested higher priority viewport misses fall through without changing the sibling",()=>{
  const child=map(),p=hconcat({programs:[{id:"left",program:child},{id:"right",program:child}]});
  const bindings=[{...navigation(child),target:{childPath:["right"],id:"map"},priority:100}, {...navigation(child),target:{childPath:["left"],id:"map"}}];
  const {session,host}=mounted(p,bindings);drag(host,80,90,20,10);
  assert.equal(session.getState().program.children.right,child);
  assert.deepEqual(session.getState().program.children.left.graphicSpec,child.navigateProjection({target:"map",operation:{type:"pan",deltaPx:[20,10]}}).graphicSpec);
  host.fire("pointerdown",100,100,{pointerType:"touch"});host.fire("pointermove",120,100);host.flush();
  host.fire("pointerdown",700,100,{pointerId:2,pointerType:"touch"});assert.equal(host.captures.size,1);
  host.fire("pointerdown",160,100,{pointerId:2,pointerType:"touch"});assert.equal(host.captures.size,2);
  host.fire("keydown",0,0,{key:"Escape"});assert.equal(host.captures.size,0);session.destroy();
});

test("only the captured navigation winner promotes to pinch and modifier wheel commands remain explicit",()=>{
  const p=map(),bindings=[{type:"annotate",target:"note"},{...navigation(p),modifiers:{alt:true}}];
  const {session,host,events}=mounted(p,bindings);
  host.fire("pointerdown",80,90,{altKey:true});host.fire("pointerdown",160,90,{pointerId:2,altKey:true});assert.equal(host.captures.size,1);
  host.fire("keydown",0,0,{key:"Escape"});assert.equal(events.filter(e=>e.phase==="cancel").length,1);
  host.fire("pointerdown",180,190,{altKey:true});host.fire("pointerdown",240,190,{pointerId:2,altKey:true});assert.equal(host.captures.size,2);
  host.fire("keydown",0,0,{key:"Escape"});assert.equal(host.captures.size,0);
  assert.equal(host.fire("wheel",180,190,{deltaY:-300,deltaMode:0}),0);
  assert.equal(host.fire("wheel",180,190,{deltaY:-300,deltaMode:0,altKey:true}),1);
  assert.equal(session.getState().history.undoCount,1);session.destroy();
});

test("source replacement and teardown cancel only the winning transaction and remove shared listeners",()=>{
  const p=map(),bindings=[navigation(p),{type:"annotate",target:"note"}];
  for(const reason of ["update","unmount","destroy","blur"]){const {session,host,events}=mounted(p,bindings);
    host.fire("pointerdown",80,90);host.fire("pointermove",100,100);host.flush();
    if(reason==="update")session.updateProgram(p);else if(reason==="unmount")session.mount(surface());else if(reason==="destroy")session.destroy();else host.fire("blur");
    const count=events.length;host.fire("pointerup",100,100);host.flush();assert.equal(events.length,count);
    assert.equal(session.getState().program,p);assert.equal(session.getState().previewProgram,null);assert.equal(events.filter(e=>e.phase==="cancel").length,1);
    assert.equal(host.captures.size,0);assert.equal(host.frames.size,0);session.destroy();assert.equal(host.count(),0);
  }
});

test("ambiguous modifiers, invalid priorities and inherited accessors fail before any capture",()=>{
  const p=map(),base={type:"annotate",target:"note"};
  assert.throws(()=>createInteractionSession({program:p,bindings:[base,base]}),/ambiguous priority/);
  for(const priority of [NaN,Infinity,1.1,1000001])assert.throws(()=>createInteractionSession({program:p,bindings:[{...base,priority}]}),/priority/);
  for(const modifiers of [{shift:1},{unknown:true},null])assert.throws(()=>createInteractionSession({program:p,bindings:[{...base,modifiers}]}));
  const hostile=Object.create({get shift(){throw Error("getter executed");}});assert.throws(()=>createInteractionSession({program:p,bindings:[{...base,modifiers:hostile}]}),/plain|prototype/);
  const input={...base,modifiers:{shift:true}}, {session,host}=mounted(p,[input]);input.modifiers.shift=false;drag(host,80,90,20,10);assert.equal(session.getState().program,p);session.destroy();
});

test("competing commands cancel the winner's pending preview and reject its late assets without another commit",async()=>{
  const p=map(),pending=[],released=[],tick=()=>new Promise(resolve=>setImmediate(resolve));
  const {session,host,events}=mounted(p,[navigation(p),{type:"annotate",target:"note"}],{assetResolver:request=>new Promise(resolve=>pending.push({request,resolve}))});
  await tick();pending[0].resolve({dispose(){released.push("initial");}});await session.whenSettled();
  host.fire("pointerdown",80,90);host.fire("pointermove",100,100);host.flush();await tick();const preview=session.whenSettled();
  host.fire("wheel",180,190,{deltaMode:0,deltaY:-300});await tick();assert.equal((await preview).status,"cancelled");
  assert.equal(pending[1].request.signal.aborted,true);pending[1].resolve({dispose(){released.push("late");}});await tick();
  assert.equal(session.getState().program,p);assert.equal(events.filter(e=>e.phase==="cancel"&&e.type==="annotate").length,1);
  pending[2].resolve({dispose(){released.push("camera");}});await session.whenSettled();
  assert.equal(session.getState().history.undoCount,1);assert.deepEqual(events.filter(e=>e.phase==="commit").map(e=>e.type),["setViewport"]);
  assert.deepEqual(released,["late","initial"]);session.destroy();assert.deepEqual(released,["late","initial","camera"]);assert.equal(host.count(),0);
});
