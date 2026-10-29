import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { normalizeClickSelection } from "../../src/interaction/clickSelection.js";

const base = (factory=chart) => factory().createCanvas({width:300,height:200,margin:0})
  .createData({id:"rows",keyField:"id",values:[{id:"a",x:50,y:60},{id:"b",x:50,y:60},{id:"c",x:200,y:130}]})
  .createPointMark({id:"points"}).encodePointRadius({value:8})
  .encodeX({field:"x",scale:{domain:[0,300],range:[0,300]}})
  .encodeY({field:"y",scale:{domain:[0,200],range:[0,200]}});
const program = () => base().selectMarks({id:"picked",target:"points",items:[]});
const binding = extra => ({type:"select",target:"points",selection:"picked",...extra});
const selected = p => {const {items,keys}=resolveStoredSelection(p,"picked");return items.filter(item=>keys.includes(item.key)).map(item=>item.fields.id);};
function surface() {
  const listeners=new Map();return {getBoundingClientRect:()=>({left:10,top:20,width:300,height:200}),
    addEventListener(type,fn){const group=listeners.get(type)??new Set();group.add(fn);listeners.set(type,group);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    emit(x,y,extra={}){for(const fn of [...listeners.get("click")??[]])fn({clientX:x+10,clientY:y+20,...extra});},
    callbacks:()=>[...listeners.get("click")??[]],count:()=>[...listeners.values()].reduce((sum,group)=>sum+group.size,0)};
}

test("mounted replace binding uses the frontmost eligible item and suppresses exact snapshot no-ops",()=>{
  const p=program(),original=serializeProgram(p),session=createInteractionSession({program:p,bindings:[binding()]}),host=surface(),events=[];
  session.subscribe(e=>events.push(e));session.mount(host);events.length=0;assert.equal(host.count(),1);
  host.emit(50,60);assert.deepEqual(selected(session.getState().program),["b"]);
  assert.deepEqual(events.map(e=>[e.type,e.phase,e.origin]),[["select","commit","user"],["select","settled","user"]]);
  assert.equal(session.getState().hit,null);host.emit(50,60);assert.equal(events.length,2);assert.equal(session.getState().revision,1);
  host.emit(280,180);assert.deepEqual(selected(session.getState().program),[]);assert.equal(events[2].type,"clearSelection");
  host.emit(280,180);assert.equal(events.length,4);assert.equal(serializeProgram(p),original);
  assert.deepEqual(selected(deserializeProgram(serializeProgram(session.getState().program))),[]);session.destroy();assert.equal(host.count(),0);
});

test("toggle and explicit miss policies retain native set semantics without inferred modifiers",()=>{
  const session=createInteractionSession({program:program(),bindings:[binding({mode:"toggle",onMiss:"ignore",slop:0})]}),host=surface();session.mount(host);
  host.emit(50,60,{shiftKey:true});assert.deepEqual(selected(session.getState().program),["b"]);
  host.emit(280,180);assert.deepEqual(selected(session.getState().program),["b"]);
  host.emit(50,60,{ctrlKey:true});assert.deepEqual(selected(session.getState().program),[]);
  host.emit(200,130,{button:2});assert.deepEqual(selected(session.getState().program),[]);
  host.emit(200,130,{pointerType:"touch"});assert.deepEqual(selected(session.getState().program),["c"]);session.destroy();
});

test("inspection remains separate and remounting within commit retains one selection listener",()=>{
  const session=createInteractionSession({program:program(),bindings:[{type:"inspect",events:["click"]},binding({mode:"toggle"})]}),first=surface(),second=surface(),events=[];
  session.mount(first);session.subscribe(e=>{events.push([e.type,e.phase]);if(e.phase==="commit"&&session.getState().revision===1)session.mount(second);});
  first.emit(50,60);assert.deepEqual(events.slice(0,3),[["inspect",undefined],["select","commit"],["select","settled"]]);
  assert.equal(first.count(),0);assert.equal(second.count(),3);second.emit(50,60);assert.deepEqual(selected(session.getState().program),[]);
  assert.equal(session.getState().revision,2);session.destroy();assert.equal(second.count(),0);
});

test("clicks use current sampled geometry and one CSS transform before native materialization",()=>{
  const session=createInteractionSession({program:program(),bindings:[binding()]}),host=surface();session.mount(host,{rootTransform:[0,2,-2,0,400,0]});
  const state=session.getState(),scene=structuredClone(state.scene);for(const node of scene.nodes)if(node.type==="circle")node.properties.x+=20;
  session.dispatch({type:"frame",scene,generation:state.generation,version:state.frameVersion+1});
  host.emit(280,140);assert.deepEqual(selected(session.getState().program),["b"]);
  assert.equal(session.getState().generation,1);host.emit(280,100);assert.equal(session.getState().revision,1);
  session.destroy();
});

test("explicit owner filtering retains the inspection ordering among eligible overlapping marks",()=>{
  const p=program().createPointMark({id:"front",data:"rows"}).encodePointRadius({target:"front",value:12})
    .encodeX({target:"front",field:"x"}).encodeY({target:"front",field:"y"});
  const session=createInteractionSession({program:p,bindings:[{type:"inspect",events:["click"]},binding()]}),host=surface(),hits=[];
  session.subscribe(e=>{if(e.type==="inspect")hits.push(e.state.hit.target.ownerId);});session.mount(host);host.emit(50,60);
  assert.equal(hits[0],"front");assert.deepEqual(selected(session.getState().program),["b"]);session.destroy();
});

test("scoped click bindings store local keys and become dormant when the child disappears",()=>{
  const p=program(),joined=hconcat({programs:[{id:"left",program:p},{id:"right",program:p}]}),target={childPath:["left"],id:"points"};
  const session=createInteractionSession({program:joined,bindings:[binding({target})]}),host=surface();session.mount(host);
  const node=session.getState().scene.nodes.find(n=>n.type==="circle"),point=[node.properties.x+node.offset[0],node.properties.y+node.offset[1]];
  host.emit(...point);assert.deepEqual(selected(session.getState().program.children.left),["b"]);assert.deepEqual(selected(session.getState().program.children.right),[]);
  const accepted=session.getState().program;session.updateProgram(accepted.removeCompositionChild({target:"left"}));const revision=session.getState().revision;
  host.emit(...point);assert.equal(session.getState().revision,revision);session.updateProgram(accepted);host.emit(...point);assert.deepEqual(selected(session.getState().program.children.left),["b"]);session.destroy();
});

test("automatic selection participates in linked closure and cannot overwrite a linked writer",()=>{
  const p=program(),joined=hconcat({programs:[{id:"left",program:p},{id:"right",program:p}]}),left={childPath:["left"],id:"points"},right={childPath:["right"],id:"points"};
  const link={type:"linkSelection",id:"rows",target:right,selection:"picked",resolve:"global",sources:[{target:left,selection:"picked",projection:{type:"rows",sourceData:"rows",targetData:"rows"}}]};
  assert.throws(()=>createInteractionSession({program:joined,bindings:[link,binding({target:right})]}),/owned by its binding/);
  const session=createInteractionSession({program:joined,bindings:[link,binding({target:left})]}),host=surface(),events=[];session.mount(host);session.subscribe(e=>events.push(e));
  const node=session.getState().scene.nodes.find(n=>n.type==="circle");host.emit(node.properties.x+node.offset[0],node.properties.y+node.offset[1]);
  assert.deepEqual(selected(session.getState().program.children.right),["b"]);assert.deepEqual(events[0].affectedOwners,[left,right]);assert.equal(session.getState().revision,1);session.destroy();
});

test("initialization validates closed options and existing Full owners without retaining caller data",()=>{
  for(const extra of [{mode:"add"},{mode:null},{onMiss:"all"},{onMiss:null},{selection:"absent"},{events:["click"]},{slop:-1}])assert.throws(()=>createInteractionSession({program:program(),bindings:[binding(extra)]}));
  assert.throws(()=>createInteractionSession({program:program(),bindings:[binding(),binding()]}),/ambiguous priority/);
  assert.throws(()=>createInteractionSession({program:base(basic),bindings:[binding()]}),/Full selection owner/);
  assert.throws(()=>createInteractionSession({program:program().editCanvas({margin:40}).facet({field:"id"}),bindings:[binding({target:{childPath:[],id:"points",facetSource:true}})]}),/facet source/);
  assert.throws(()=>normalizeClickSelection(program(),{...binding(),type:"wrong"},[]),/select type/);
  const value=binding(),session=createInteractionSession({program:program(),bindings:[value]}),host=surface();value.mode="toggle";session.mount(host);host.emit(50,60);host.emit(50,60);assert.deepEqual(selected(session.getState().program),["b"]);session.destroy();
});

test("failed mounting and singular viewports preserve selections and dispose captured listeners",()=>{
  const session=createInteractionSession({program:program(),bindings:[binding()]}),first=surface();session.mount(first);first.emit(50,60);
  const before=session.getState(),broken=surface();broken.addEventListener=()=>{throw Error("mount failed");};assert.throws(()=>session.mount(broken),/mount failed/);assert.equal(session.getState(),before);
  const stale=first.callbacks()[0];const second=surface();session.mount(second,{rootTransform:[0,0,0,0,0,0]});second.emit(50,60);assert.deepEqual(selected(session.getState().program),["b"]);
  stale({clientX:210,clientY:150});assert.equal(session.getState().revision,1);const current=second.callbacks()[0];session.destroy();const state=session.getState();current({clientX:210,clientY:150});assert.equal(session.getState(),state);
});

test("replacement rejects a changed selection owner atomically and a removed selection stays dormant",()=>{
  const p=program(),session=createInteractionSession({program:p,bindings:[binding()]}),host=surface();session.mount(host);
  const other=p.removeMarkSelection({selection:"picked"}).createPointMark({id:"other",data:"rows"}).encodeX({target:"other",field:"x"}).encodeY({target:"other",field:"y"})
    .selectMarks({id:"picked",target:"other",items:[]});
  const before=session.getState();assert.throws(()=>session.updateProgram(other),/explicit owner/);assert.equal(session.getState(),before);
  assert.throws(()=>session.updateProgram(p.editCanvas({margin:40}).facet({field:"id"})),/facet source/);assert.equal(session.getState(),before);
  session.updateProgram(p.removeMarkSelection({selection:"picked"}));const revision=session.getState().revision;host.emit(50,60);assert.equal(session.getState().revision,revision);
  session.updateProgram(p);host.emit(50,60);assert.deepEqual(selected(session.getState().program),["b"]);session.destroy();
});

test("background clear removes hidden and live all intent, and subscriber failure preserves one committed click",()=>{
  const p=program().editMarkSelection({selection:"picked",items:[],empty:"all"});
  const session=createInteractionSession({program:p,bindings:[binding()]}),host=surface();session.mount(host);
  session.updateProgram(p.filterMarks({target:"points",field:"x",op:"gt",value:500}));host.emit(50,60);
  session.updateProgram(session.getState().program.removeMarkFilter({target:"points"}));assert.deepEqual(selected(session.getState().program),[]);
  const phases=[],stop=session.subscribe(event=>{if(event.phase){phases.push(event.phase);if(event.phase==="commit")throw Error("subscriber failed");}});
  assert.throws(()=>host.emit(50,60),/subscriber failed/);assert.deepEqual(phases,["commit"]);assert.deepEqual(selected(session.getState().program),["b"]);
  stop();session.destroy();
});
