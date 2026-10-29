import assert from "node:assert/strict";
import test from "node:test";
import { createInteractionSession } from "../../src/interaction.js";
import { chart, hconcat } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { reconcileSelections, normalizeSelectionPolicy } from "../../src/interaction/reconciliation.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const base = () => chart().createCanvas({width:300,height:200}).createData({id:"rows",keyField:"id",values:[{id:"a",x:1,y:2},{id:"b",x:2,y:3},{id:"c",x:3,y:4}]})
  .createScatterPlot({id:"points",x:"x",y:"y",guides:false});
const selected = program => resolveStoredSelection(program,"picked").keys;
const seed = program => reconcileSelections(program,[],"keep-hidden",{initialize:true});

test("keep-hidden snapshots preserve source key intent and report disappear/reappear once",()=>{
  const original=base(), keys=getMarkItems(original).map(item=>item.key), p=original.selectMarks({id:"picked",items:[keys[1]]});
  const before=seed(p), filtered=p.filterMarks({target:"points",field:"id",op:"eq",value:"a"});
  const hidden=reconcileSelections(filtered,before.records);
  assert.equal(hidden.program,filtered);assert.deepEqual(hidden.changes[0].hiddenKeys,[keys[1]]);assert.deepEqual(selected(filtered),[]);
  const unchanged=reconcileSelections(filtered,hidden.records);assert.deepEqual(unchanged.changes,[]);
  const restored=reconcileSelections(deserializeProgram(serializeProgram(filtered)).removeMarkFilter({target:"points"}),unchanged.records);
  assert.deepEqual(restored.changes[0].restoredKeys,[keys[1]]);assert.deepEqual(selected(restored.program),[keys[1]]);
  assert.deepEqual(selected(p),[keys[1]]);assert.deepEqual(before.records[0].hiddenKeys,[]);
});

test("explicit drop prunes prior membership through native actions and does not resurrect it",()=>{
  const original=base(), keys=getMarkItems(original).map(item=>item.key), p=original.selectMarks({id:"picked",items:[keys[0],keys[1]]});
  const before=seed(p), filtered=p.filterMarks({target:"points",field:"id",op:"eq",value:"a"});
  const result=reconcileSelections(filtered,before.records,"drop");
  assert.deepEqual(result.changes[0].droppedKeys,[keys[1]]);assert.deepEqual(selected(result.program),[keys[0]]);
  assert.equal(result.program.trace.children.at(-1).op,"editMarkSelection");assert.deepEqual(selected(result.program.removeMarkFilter({target:"points"})),[keys[0]]);
  assert.equal(filtered.materializationConfigs.selections.picked.resource.revision,0);
  assert.equal(result.program.materializationConfigs.selections.picked.resource.revision,1);
});

test("drop snapshots a disappearing live predicate but preserves explicitly replaced authoring intent",()=>{
  const p=base().selectMarks({id:"picked",field:"x",op:"gte",value:1}),keys=selected(p),before=seed(p);
  const filtered=p.filterMarks({target:"points",field:"id",op:"eq",value:"a"});
  const result=reconcileSelections(filtered,before.records,"drop");
  assert.deepEqual(result.changes[0].droppedKeys,keys.slice(1));
  assert.deepEqual(selected(result.program.removeMarkFilter({target:"points"})),[keys[0]]);
  const replaced=filtered.editMarkSelection({selection:"picked",field:"id",op:"eq",value:"a"});
  const explicit=reconcileSelections(replaced,before.records,"drop");
  assert.equal(explicit.program,replaced);assert.deepEqual(explicit.changes,[]);
});

test("removed child keeps a runtime tombstone or drops it without recreating semantic owners",()=>{
  const p=base().selectMarks({id:"picked",field:"id",op:"eq",value:"b"});
  const composite=hconcat({programs:[{id:"left",program:p},{id:"right",program:base()}]});
  const before=seed(composite),removed=composite.removeCompositionChild({target:"left"});
  const hidden=reconcileSelections(removed,before.records);
  assert.equal(hidden.program,removed);assert.equal(hidden.changes[0].ownerMissing,true);assert.equal(hidden.records[0].missing,true);
  assert.equal(Object.hasOwn(hidden.program.children,"left"),false);
  const restored=reconcileSelections(composite,hidden.records);
  assert.equal(restored.changes[0].ownerMissing,false);assert.equal(restored.changes[0].restoredKeys.length,1);
  const dropped=reconcileSelections(removed,before.records,"drop");
  assert.equal(dropped.records.length,0);assert.equal(dropped.changes[0].droppedKeys.length,1);
  assert.equal(reconcileSelections(composite,dropped.records,"drop").changes.length,0);
});

test("live parameter membership and paint opacity are not final-item deletion",()=>{
  const where={version:2,registry:"standard@1",root:{type:"binary",op:"gte",left:{type:"field",name:"x"},right:{type:"parameter",id:"threshold"}}};
  const p=base().createParameter({id:"threshold",value:1}).selectMarks({id:"picked",where}),before=seed(p);
  const next=p.editParameter({target:"threshold",value:3}),result=reconcileSelections(next,before.records,"drop");
  assert.equal(result.program,next);assert.deepEqual(result.changes,[]);
  assert.deepEqual(reconcileSelections(next.encodeOpacity({target:"points",value:0}),result.records).changes,[]);
  assert.equal(normalizeSelectionPolicy(),"keep-hidden");assert.throws(()=>normalizeSelectionPolicy("invalid"),/Selection policy/);
});

test("tombstones and source-only property selections keep bounded explicit lifetimes",()=>{
  const p=base().encodeOpacity({target:"points",value:1}).selectMarks({id:"picked",property:"opacity",op:"eq",value:1}).facet({field:"id"});
  assert.equal(seed(p).program,p);
  assert.throws(()=>reconcileSelections(p,[],"drop"),/facet source/);
  assert.throws(()=>reconcileSelections(base(),Array(100_001)),/lifecycle records/);
});


test("public session replacement reports hidden and restored keys without mutating inputs",()=>{
  const original=base(),keys=getMarkItems(original).map(item=>item.key),p=original.selectMarks({id:"picked",items:[keys[1]]});
  const session=createInteractionSession({program:p,bindings:[]}),events=[];session.subscribe(event=>events.push(event));
  const filtered=p.filterMarks({target:"points",field:"id",op:"eq",value:"a"});
  session.updateProgram(filtered);assert.equal(session.getState().program,filtered);
  assert.deepEqual(events[0].selectionChanges,[{target:{childPath:[],id:"points"},selection:"picked",policy:"keep-hidden",ownerMissing:false,hiddenKeys:[keys[1]],restoredKeys:[],droppedKeys:[]}]);
  session.updateProgram(filtered.removeMarkFilter({target:"points"}));
  assert.deepEqual(events[1].selectionChanges[0].restoredKeys,[keys[1]]);assert.equal(session.getState().revision,2);session.destroy();
});

test("public drop commits pruned resources and frame together, with immutable error rollback",()=>{
  const original=base(),keys=getMarkItems(original).map(item=>item.key),p=original.selectMarks({id:"picked",items:[keys[0],keys[1]]});
  const session=createInteractionSession({program:p,selectionPolicy:"drop",bindings:[]}),events=[];session.subscribe(event=>events.push(event));
  const filtered=p.filterMarks({target:"points",field:"id",op:"eq",value:"a"});
  session.updateProgram(filtered);assert.deepEqual(selected(session.getState().program),[keys[0]]);
  assert.deepEqual(events[0].selectionChanges[0].droppedKeys,[keys[1]]);
  assert.equal(filtered.materializationConfigs.selections.picked.resource.revision,0);
  const before=session.getState();assert.throws(()=>session.updateProgram({}),/immutable/);assert.equal(session.getState(),before);
  session.dispatch({type:"select",target:"points",payload:{id:"picked",select:{items:[keys[2]]}}});
  assert.deepEqual(selected(session.getState().program),[]);assert.deepEqual(events.at(-2).selectionChanges[0].droppedKeys,[keys[2]]);
  assert.equal(events.at(-2).phase,"commit");assert.equal(events.at(-1).phase,"settled");
  assert.deepEqual(events.at(-1).selectionChanges,events.at(-2).selectionChanges);session.destroy();
});

const childTarget = id => ({childPath:[id],id:"points"});
const linkedProgram = () => {
  const p=base().selectMarks({id:"picked",items:[]});
  return hconcat({programs:["a","b","c","d"].map(id=>({id,program:p}))});
};
const linkedBinding = (resolve="union") => ({type:"linkSelection",id:"joined",resolve,target:childTarget("c"),selection:"picked",
  sources:["a","b"].map(id=>({target:childTarget(id),selection:"picked",projection:{type:"rows",sourceData:"rows",targetData:"rows"}}))});
const choose = (session,child,id) => session.dispatch({type:"select",target:childTarget(child),payload:{id:"picked",select:{field:"id",op:"eq",value:id}}});
const selectedIds = (session,child="c") => {
  const {items,keys}=resolveStoredSelection(session.getState().program.children[child],"picked");
  return items.filter(item=>keys.includes(item.key)).map(item=>item.fields.id);
};

test("missing linked sources preserve their last projection under keep-hidden and resume explicitly",()=>{
  const session=createInteractionSession({program:linkedProgram(),bindings:[linkedBinding()]});
  choose(session,"a","a");choose(session,"b","b");const original=session.getState().program;
  const removed=original.removeCompositionChild({target:"a"});session.updateProgram(removed);
  assert.deepEqual(selectedIds(session),["a","b"]);assert.equal(session.getState().program,removed);
  assert.equal(session.getState().linkedSelections[0].sources[0].available,false);
  choose(session,"b","c");assert.deepEqual(selectedIds(session),["a","c"]);
  const state=session.getState();session.updateProgram(state.program);
  assert.equal(session.getState().program,state.program);
  session.updateProgram(original);assert.equal(session.getState().linkedSelections[0].sources[0].available,true);
  assert.deepEqual(selectedIds(session),["a","b"]);session.destroy();
});

test("drop removes only a missing source contribution and retains union and intersection semantics",()=>{
  for(const resolve of ["union","intersection"]) {
    const session=createInteractionSession({program:linkedProgram(),selectionPolicy:"drop",bindings:[linkedBinding(resolve)]});
    choose(session,"a","a");choose(session,"b",resolve==="union"?"b":"a");const before=session.getState().program;
    const removed=before.removeCompositionChild({target:"a"});session.updateProgram(removed);
    assert.deepEqual(selectedIds(session),resolve==="union"?["b"]:[]);
    assert.equal(session.getState().program.children.c.materializationConfigs.selections.picked.resource.revision,before.children.c.materializationConfigs.selections.picked.resource.revision+1);
    assert.deepEqual(session.getState().linkedSelections[0].sources[0].keys,[]);
    const unchanged=session.getState().program;session.updateProgram(unchanged);assert.equal(session.getState().program,unchanged);
    session.destroy();
  }
});

test("missing linked targets remain dormant and are revalidated before any restored commit",()=>{
  const session=createInteractionSession({program:linkedProgram(),bindings:[linkedBinding()]}),events=[];session.subscribe(e=>events.push(e));
  choose(session,"a","a");const original=session.getState().program;
  session.updateProgram(original.removeCompositionChild({target:"c"}));
  assert.equal(session.getState().linkedSelections[0].targetAvailable,false);
  choose(session,"a","b");assert.equal(Object.hasOwn(session.getState().program.children,"c"),false);
  session.updateProgram(original);assert.equal(session.getState().linkedSelections[0].targetAvailable,true);assert.deepEqual(selectedIds(session),["a"]);
  session.updateProgram(original.removeCompositionChild({target:"a"}));const before=session.getState();
  const unrelated=base().selectMarks({id:"picked",items:[]});
  const invalid=hconcat({programs:[{id:"a",program:unrelated},{id:"b",program:original.children.b},{id:"c",program:original.children.c},{id:"d",program:original.children.d}]});
  assert.throws(()=>session.updateProgram(invalid),/original logical identity/);assert.equal(session.getState(),before);
  assert.throws(()=>createInteractionSession({program:before.program,bindings:[linkedBinding()]}),/Unknown target child/);
  assert.ok(events.some(e=>e.type==="program"&&e.selectionChanges.some(change=>change.ownerMissing)));session.destroy();
});

test("linked target pruning and projection execute one native editor and preserve scoped key intent",()=>{
  const session=createInteractionSession({program:linkedProgram(),selectionPolicy:"drop",bindings:[linkedBinding()]});
  choose(session,"a","a");choose(session,"b","b");const original=session.getState().program;
  const filtered=original.filterMarks({target:childTarget("c"),field:"id",op:"eq",value:"a"});
  const before=filtered.children.c.materializationConfigs.selections.picked.resource.revision;
  session.updateProgram(filtered);assert.deepEqual(selectedIds(session),["a"]);
  assert.equal(session.getState().program.children.c.materializationConfigs.selections.picked.resource.revision,before+1);
  assert.equal(filtered.children.c.materializationConfigs.selections.picked.resource.revision,before);
  session.destroy();
});


test("resource graph filtering reconciles surviving node and edge identity without orphan resurrection",()=>{
  const p=chart().createCanvas({width:400,height:200,margin:0})
    .createData({id:"nodes",keyField:"id",values:[{id:"a",score:3},{id:"b",score:2},{id:"c",score:1}]})
    .createData({id:"edges",values:[{from:"a",to:"b"},{from:"b",to:"c"}]})
    .createGraphData({id:"graph",nodes:"nodes",edges:"edges",nodeKey:"id",source:"from",target:"to",attributes:["score"]})
    .layoutGraph({id:"layout",method:"fixed",options:{positions:[{key:"a",x:20,y:40},{key:"b",x:100,y:40},{key:"c",x:180,y:100}]}}).createGraphPlot({id:"plot"});
  const keys=getMarkItems(p).map(item=>item.key),original=p.selectMarks({id:"picked",items:keys});
  for(const selectionPolicy of ["keep-hidden","drop"]) {
    const session=createInteractionSession({program:original,selectionPolicy,bindings:[]}),events=[];session.subscribe(e=>events.push(e));
    const filtered=original.filterMarks({field:"attribute:score",op:"gte",value:2}),visible=new Set(getMarkItems(filtered).map(item=>item.key));
    const removed=keys.filter(key=>!visible.has(key));assert.equal(removed.length,2);
    session.updateProgram(filtered);assert.deepEqual(events[0].selectionChanges[0][selectionPolicy==="drop"?"droppedKeys":"hiddenKeys"],removed);
    session.updateProgram(session.getState().program.removeMarkFilter());
    assert.deepEqual(selected(session.getState().program),selectionPolicy==="drop"?keys.filter(key=>visible.has(key)):keys);session.destroy();
  }
});

test("partition focus is explicit hidden membership while opacity and frame sampling remain paint state",()=>{
  const p=chart().createCanvas({width:400,height:200}).createData({id:"rows",keyField:"id",values:[{id:"r",parent:null},{id:"a",parent:"r",v:2},{id:"b",parent:"r",v:3}]})
    .createHierarchyData({id:"h",key:"id",parent:"parent",value:"v"}).layoutHierarchy({id:"layout",method:"partition"}).createPartitionPlot({id:"partition"})
    .selectMarks({id:"picked",field:"id",op:"eq",value:"b"});
  const key=selected(p)[0];
  for(const selectionPolicy of ["keep-hidden","drop"]) {
    const session=createInteractionSession({program:p,selectionPolicy,bindings:[]}),events=[];session.subscribe(e=>events.push(e));
    session.updateProgram(p.editPartitionPlot({focus:{key:"a"}}));
    assert.deepEqual(events[0].selectionChanges[0][selectionPolicy==="drop"?"droppedKeys":"hiddenKeys"],[key]);
    session.updateProgram(session.getState().program.editPartitionPlot({focus:null}));
    assert.deepEqual(selected(session.getState().program),selectionPolicy==="drop"?[]:[key]);
    if(selectionPolicy==="keep-hidden")assert.deepEqual(events[1].selectionChanges[0].restoredKeys,[key]);session.destroy();
  }
});

test("original data revisions preserve explicit key identity and queued replacement events remain atomic",()=>{
  const p=base().selectMarks({id:"picked",field:"id",op:"eq",value:"b"}),keys=selected(p),session=createInteractionSession({program:p,bindings:[]}),events=[];
  const revised=p.reviseData({source:"rows",id:"revision",values:[{id:"a",x:1,y:2},{id:"c",x:3,y:4}]});
  session.subscribe(event=>{events.push(event);if(event.type==="program"&&events.length===1)assert.equal(session.updateProgram(p).status,"queued");});
  session.updateProgram(revised);assert.deepEqual(events.map(e=>e.selectionChanges[0].hiddenKeys.length),[1,0]);
  assert.deepEqual(events[1].selectionChanges[0].restoredKeys,keys);assert.equal(session.getState().program,p);session.destroy();
});
