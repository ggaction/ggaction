import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { projectSelectionKeys, normalizeSelectionProjection, selectionProjectionBudget } from "../../src/grammar/selectionProjection.js";

const fieldProjection = { type: "fields", sourceFields: ["group"], targetFields: ["group"] };
const rowProjection = { type: "rows", sourceData: "rows", targetData: "rows" };
const base = () => chart().createCanvas({width:300,height:200})
  .createData({id:"rows",keyField:"id",values:[{id:"a",x:1,y:2,group:1},{id:"b",x:2,y:3,group:"1"},{id:"c",x:3,y:4,group:1}]})
  .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"})
  .selectMarks({id:"picked",items:[]}).createParameter({id:"threshold",value:2});
const target = id => ({childPath:[id],id:"points"});
const link = (id,sources,dest,resolve="union",projection=fieldProjection) => ({type:"linkSelection",id,resolve,
  target:target(dest),selection:"picked",sources:sources.map(id=>({target:target(id),selection:"picked",projection}))});
const command = (id,select) => ({type:"select",target:target(id),payload:{id:"picked",select}});
const ids = (program,id) => { const {items,keys}=resolveStoredSelection(id ? program.children[id] : program,"picked"); return items.filter(item=>keys.includes(item.key)).map(item=>item.fields.id); };
const composition = (program=base()) => hconcat({programs:["a","b","c","d"].map(id=>({id,program}))});

test("linked union preserves typed field tuples and source-specific projection sets atomically",()=>{
  const original=composition(), session=createInteractionSession({program:original,bindings:[link("join",["a","b"],"c")]});
  const events=[];session.subscribe(event=>events.push(event));
  assert.equal(session.getState().program,original);
  assert.deepEqual(session.getState().linkedSelections[0].sources.map(source=>source.keys),[[],[]]);
  session.dispatch(command("a",{field:"id",op:"eq",value:"a"}));
  assert.deepEqual(ids(session.getState().program,"c"),["a","c"]);
  session.dispatch(command("b",{field:"id",op:"eq",value:"b"}));
  assert.deepEqual(ids(session.getState().program,"c"),["a","b","c"]);
  assert.deepEqual(session.getState().linkedSelections[0].sources.map(source=>source.keys.length),[2,1]);
  assert.deepEqual(events.map(event=>event.phase),["commit","settled","commit","settled"]);
  assert.deepEqual(events[2].affectedOwners,[target("b"),target("c")]);
  assert.equal(session.getState().revision,2);assert.deepEqual(ids(original,"a"),[]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(session.getState().program)),"c"),["a","b","c"]);
  assert.ok(Object.isFrozen(session.getState().linkedSelections[0].sources[0].keys));session.destroy();
});

test("intersection operates on projected sets, and empty all differs from empty none",()=>{
  const session=createInteractionSession({program:composition(),bindings:[link("join",["a","b"],"c","intersection")]});
  session.dispatch(command("a",{items:[],empty:"all"}));assert.deepEqual(ids(session.getState().program,"c"),[]);
  session.dispatch(command("b",{field:"id",op:"eq",value:"c"}));assert.deepEqual(ids(session.getState().program,"c"),["a","c"]);
  session.dispatch({type:"clearSelection",target:target("a"),payload:{id:"picked"}});assert.deepEqual(ids(session.getState().program,"c"),[]);
  session.destroy();
});

test("original row lineage connects copies and restored programs without confusing independent data",()=>{
  const program=deserializeProgram(serializeProgram(composition())), binding=link("row",["a"],"b","global",rowProjection);
  const session=createInteractionSession({program,bindings:[binding]});
  session.dispatch(command("a",{field:"id",op:"eq",value:"a"}));assert.deepEqual(ids(session.getState().program,"b"),["a"]);
  const independent=hconcat({programs:[{id:"a",program:base()},{id:"b",program:base()}]});
  assert.throws(()=>createInteractionSession({program:independent,bindings:[binding]}),/original logical identity/);
  session.destroy();
});

test("a diamond runs each linked owner once in dependency order and clear reaches downstream owners",()=>{
  const bindings=[link("last",["b","c"],"d","intersection",rowProjection),link("left",["a"],"b","global",rowProjection),link("right",["a"],"c","global",rowProjection)];
  const session=createInteractionSession({program:composition(),bindings}),events=[];session.subscribe(e=>events.push(e));
  session.dispatch(command("a",{field:"id",op:"eq",value:"b"}));
  for(const child of ["a","b","c","d"]) assert.deepEqual(ids(session.getState().program,child),["b"]);
  assert.deepEqual(events[0].affectedOwners.map(owner=>owner.childPath[0]),["a","b","c","d"]);
  assert.deepEqual(session.getState().linkedSelections.map(link=>link.id),["left","right","last"]);
  for(const child of ["b","c","d"]) assert.equal(session.getState().program.children[child].semanticSpec.resources.find(r=>r.kind==="persistent-selection").revision,1);
  session.dispatch({type:"clearSelection",target:target("a"),payload:{id:"picked"}});
  for(const child of ["a","b","c","d"]) assert.deepEqual(ids(session.getState().program,child),[]);
  session.destroy();
});

test("parameter AST membership propagates through links and linked targets reject direct overwrites",()=>{
  const where={version:2,registry:"standard@1",root:{type:"binary",op:"gte",left:{type:"field",name:"x"},right:{type:"parameter",id:"threshold"}}};
  const child=base().editMarkSelection({selection:"picked",where}),program=composition(child);
  const session=createInteractionSession({program,bindings:[link("ast",["a"],"b","global",rowProjection)]}),events=[];
  session.subscribe(e=>events.push(e));
  session.dispatch({type:"setParameter",target:{childPath:["a"],id:"threshold"},payload:{value:3}});
  assert.deepEqual(ids(session.getState().program,"a"),["c"]);assert.deepEqual(ids(session.getState().program,"b"),["c"]);
  const state=session.getState();assert.throws(()=>session.dispatch(command("b",{items:[]})),/owned by its binding/);
  assert.equal(session.getState().program,state.program);assert.equal(session.getState().scene,state.scene);assert.equal(session.getState().linkedSelections,state.linkedSelections);
  assert.equal(events.at(-1).phase,"error");session.destroy();
});

test("binding initialization rejects cycles, duplicate writers, absent owners and invalid projections",()=>{
  const program=composition();
  for(const bindings of [
    [link("one",["a"],"b"),link("two",["b"],"a")],
    [link("one",["a"],"b"),link("two",["c"],"b")],
    [link("same",["a"],"b"),link("same",["a"],"c")],
    [link("self",["a"],"a")],
    [link("many",["a","b"],"c","global")],
    [link("empty",[],"b")],
    [link("duplicate",["a","a"],"b")],
    [link("absent",["missing"],"b")],
    [{...link("selection",["a"],"b"),selection:"absent"}],
    [link("missing-field",["a"],"b","union",{...fieldProjection,sourceFields:["absent"]})],
    [link("missing-data",["a"],"b","union",{...rowProjection,targetData:"absent"})],
    [link("resolve",["a"],"b","invalid")],
    [{...link("extra",["a"],"b"),extra:true}]
  ]) assert.throws(()=>createInteractionSession({program,bindings}));
  assert.throws(()=>createInteractionSession({program:basic().createCanvas(),bindings:[{...link("full",["a"],"b"),target:"other",sources:[{target:"points",selection:"picked",projection:fieldProjection}]}]}),/Full selection owner/);
  assert.deepEqual(ids(program,"a"),[]);
});

test("external replacement revalidates all links atomically without implicit authoring",()=>{
  const original=composition(),session=createInteractionSession({program:original,bindings:[link("row",["a"],"b","global",rowProjection)]});
  const next=original.editParameter({target:{childPath:["a"],id:"threshold"},value:3});
  session.updateProgram(next);assert.equal(session.getState().program,next);assert.deepEqual(ids(next,"b"),[]);
  const state=session.getState();assert.throws(()=>session.updateProgram({}),/immutable/);
  assert.equal(session.getState(),state);session.destroy();
});

const item=(key,fields)=>({key,fields,rows:[]});
test("typed tuple projection has independent literal expectations and rejects undefined aggregate fields",()=>{
  const sourceItems=[item("s1",{a:1,b:"x"}),item("s2",{a:"1",b:"x"}),item("s3",{a:1,b:"x|y"})];
  const targetItems=[item("t1",{x:1,y:"x"}),item("t2",{x:"1",y:"x"}),item("t3",{x:1,y:"x|y"}),item("t4",{x:1,y:"x"})];
  const projection={type:"fields",sourceFields:["a","b"],targetFields:["x","y"]};
  assert.deepEqual(projectSelectionKeys({sourceItems,sourceKeys:["s1"],targetItems,projection}),["t1","t4"]);
  assert.deepEqual(projectSelectionKeys({sourceItems,sourceKeys:["s2","s3"],targetItems,projection}),["t2","t3"]);
  for(const invalid of [null,undefined,NaN,Infinity,{},[]]) assert.throws(()=>projectSelectionKeys({sourceItems:[item("s",{a:invalid,b:"x"})],sourceKeys:[],targetItems,projection}));
  assert.throws(()=>projectSelectionKeys({sourceItems:[item("s",{a:1})],sourceKeys:[],targetItems,projection}),/not uniquely defined/);
  assert.deepEqual(projectSelectionKeys({sourceItems:[],sourceKeys:[],targetItems:[],projection}),[]);
});

test("projection options, own-data and cumulative work are bounded before committing state",()=>{
  for(const value of [null,{}, {type:"rows",sourceData:"",targetData:"r"}, {type:"fields",sourceFields:[],targetFields:[]},
    {type:"fields",sourceFields:["a","a"],targetFields:["b","c"]}, {type:"fields",sourceFields:["a"],targetFields:["b","c"]}]) assert.throws(()=>normalizeSelectionProjection(value));
  let reads=0;const fields={};Object.defineProperty(fields,"group",{enumerable:true,get(){reads++;return 1;}});
  assert.throws(()=>projectSelectionKeys({sourceItems:[item("s",fields)],sourceKeys:[],targetItems:[],projection:fieldProjection}));assert.equal(reads,0);
  const spend=selectionProjectionBudget();spend(9_999_999);assert.throws(()=>projectSelectionKeys({sourceItems:[item("s",{group:1})],sourceKeys:[],targetItems:[],projection:fieldProjection},spend),/work/);
  const before=JSON.stringify(fieldProjection);projectSelectionKeys({sourceItems:[item("s",{group:1})],sourceKeys:["s"],targetItems:[item("t",{group:1})],projection:fieldProjection});assert.equal(JSON.stringify(fieldProjection),before);
});

test("lineage projections retain aggregate membership and require original rather than derived identity",()=>{
  const source=chart().createCanvas({width:300,height:200}).createData({id:"rows",keyField:"id",values:[{id:"a",group:"A",x:1,y:2},{id:"b",group:"A",x:2,y:3},{id:"c",group:"B",x:3,y:4}]});
  const points=source.createScatterPlot({id:"points",x:"x",y:"y",guides:false}).selectMarks({id:"picked",items:[]});
  const bars=source.createBarPlot({id:"bars",x:"group",y:{field:"y",aggregate:"mean"},guides:false}).selectMarks({id:"picked",items:[]});
  const program=hconcat({programs:[{id:"a",program:points},{id:"b",program:bars}]}),binding={...link("aggregate",["a"],"b","global",rowProjection),target:{childPath:["b"],id:"bars"}};
  const session=createInteractionSession({program,bindings:[binding]});
  session.dispatch(command("a",{field:"id",op:"eq",value:"b"}));
  const resolved=resolveStoredSelection(session.getState().program.children.b,"picked");
  assert.deepEqual(resolved.items.filter(item=>resolved.keys.includes(item.key)).map(item=>item.fields.group),["A"]);
  assert.equal(resolved.keys.length,1);session.destroy();
});

test("root-owner links, nested child keys and facet source links retain exact scopes",()=>{
  const root=base().createPointMark({id:"other",data:"rows"}).encodeX({target:"other",field:"x"}).encodeY({target:"other",field:"y"}).selectMarks({id:"otherPicked",target:"other",items:[]});
  const rootBinding={type:"linkSelection",id:"root",resolve:"global",target:"other",selection:"otherPicked",sources:[{target:"points",selection:"picked",projection:rowProjection}]};
  const rootSession=createInteractionSession({program:root,bindings:[rootBinding]});
  rootSession.dispatch({type:"select",target:"points",payload:{id:"picked",select:{field:"id",op:"eq",value:"b"}}});
  assert.equal(resolveStoredSelection(rootSession.getState().program,"otherPicked").keys.length,1);rootSession.destroy();
  const nested=hconcat({programs:[{id:"outer",program:composition()},{id:"other",program:base()}]});
  const nestedBinding=link("nested",["a"],"b","global",rowProjection);
  nestedBinding.target={childPath:["outer","b"],id:"points"};nestedBinding.sources[0].target={childPath:["outer","a"],id:"points"};
  const session=createInteractionSession({program:nested,bindings:[nestedBinding]});
  session.dispatch({...command("a",{field:"id",op:"eq",value:"a"}),target:nestedBinding.sources[0].target});
  const publicKeys=getMarkItems(session.getState().program,{target:nestedBinding.target}).filter(item=>item.fields.id==="a").map(item=>item.key);
  assert.deepEqual(session.getState().linkedSelections[0].keys,publicKeys);session.destroy();
  const faceted=root.facet({field:"group"});
  const facetBinding={...rootBinding,target:{childPath:[],id:"other",facetSource:true},sources:[{...rootBinding.sources[0],target:{childPath:[],id:"points",facetSource:true}}]};
  const facetSession=createInteractionSession({program:faceted,bindings:[facetBinding]});
  facetSession.dispatch({type:"select",target:facetBinding.sources[0].target,payload:{id:"picked",select:{field:"id",op:"eq",value:"a"}}});
  assert.equal(resolveStoredSelection(facetSession.getState().program,"otherPicked",{sourceOnly:true}).keys.length,1);facetSession.destroy();
});

test("row projection rejects malformed, unavailable and derived lineage before returning keys",()=>{
  const sourceData={id:"rows",logicalId:"shared"},targetData={...sourceData};
  const projection=rowProjection, valid={key:"s",fields:{},rows:[{data:"rows",logicalDataId:"shared",rowKey:"a"}]};
  const input={sourceItems:[valid],sourceKeys:["s"],targetItems:[{...valid,key:"t"}],projection,sourceData,targetData};
  assert.deepEqual(projectSelectionKeys(input),["t"]);
  for(const ref of [{data:"rows",logicalDataId:"different",rowKey:"a"},{data:"rows",logicalDataId:"shared"},{data:"rows",logicalDataId:"shared",rowKey:""},{data:"other",logicalDataId:"shared",rowKey:"a"},{}])
    assert.throws(()=>projectSelectionKeys({...input,sourceItems:[{...valid,rows:[ref]}]}));
  for(const dataset of [{...sourceData,source:"earlier"},{...sourceData,lineage:{}},{id:"rows"},{...sourceData,logicalId:2}])
    assert.throws(()=>projectSelectionKeys({...input,sourceData:dataset}),/original datasets/);
  assert.throws(()=>projectSelectionKeys({...input,sourceItems:[{...valid,key:""}]}),/logical item keys/);
  assert.throws(()=>projectSelectionKeys({...input,sourceKeys:[false]}),/selected keys/);
});

test("unchanged projected membership does not create a second target revision",()=>{
  const session=createInteractionSession({program:composition(),bindings:[link("group",["a"],"b")]});
  session.dispatch(command("a",{field:"id",op:"eq",value:"a"}));
  const before=session.getState().program.children.b;
  session.dispatch(command("a",{field:"id",op:"eq",value:"c"}));
  assert.equal(session.getState().program.children.b,before);
  assert.deepEqual(session.getState().linkedSelections[0].sources[0].keys,session.getState().linkedSelections[0].keys);
  session.destroy();
});

test("a parameter-produced invalid projection rejects the complete candidate and preserves the runtime cache",()=>{
  const p=chart().createCanvas({width:300,height:200}).createData({id:"rows",values:[{x:1,y:2},{x:2,y:3}]})
    .createParameter({id:"join",value:1,nullable:true})
    .createComputedData({id:"computed",as:"group",expression:{version:2,registry:"standard@1",root:{type:"parameter",id:"join"}}})
    .createScatterPlot({id:"points",x:"x",y:"y",guides:false}).selectMarks({id:"picked",items:[],empty:"all"});
  const session=createInteractionSession({program:composition(p),bindings:[link("computed",["a"],"b")]}),events=[];
  session.subscribe(e=>events.push(e));const before=session.getState(),serialized=serializeProgram(before.program);
  assert.throws(()=>session.dispatch({type:"setParameter",target:{childPath:["a"],id:"join"},payload:{value:null}}),/Row keys/);
  const after=session.getState();assert.equal(after.program,before.program);assert.equal(after.scene,before.scene);assert.equal(after.linkedSelections,before.linkedSelections);
  assert.equal(serializeProgram(after.program),serialized);assert.equal(after.revision,0);assert.deepEqual(events.map(e=>e.phase),["error"]);session.destroy();
});

test("conditional appearance feedback cannot commit an implicitly cyclic linked selection",()=>{
  const program=chart().createCanvas().createData({id:"rows",values:[{x:1,y:2}]})
    .createScatterPlot({id:"a",x:"x",y:"y",guides:false}).createPointMark({id:"b",data:"rows"}).encodeX({target:"b",field:"x"}).encodeY({target:"b",field:"y"})
    .selectMarks({id:"bSel",target:"b",items:[]})
    .encodeOpacity({target:"a",conditions:[{when:{selection:"bSel"},value:{value:.5}}],otherwise:{value:1}})
    .selectMarks({id:"aSel",target:"a",property:"opacity",op:"eq",value:1});
  const session=createInteractionSession({program,bindings:[{type:"linkSelection",id:"feedback",target:"b",selection:"bSel",resolve:"global",sources:[{target:"a",selection:"aSel",projection:rowProjection}]}]}),events=[];
  const before=session.getState();session.subscribe(e=>events.push(e));
  assert.throws(()=>session.dispatch({type:"select",target:"a",payload:{id:"aSel",select:{property:"opacity",op:"eq",value:1}}}),/cyclic materialization dependency/);
  assert.equal(session.getState().program,program);assert.equal(session.getState().linkedSelections,before.linkedSelections);
  assert.equal(session.getState().scene,before.scene);assert.equal(session.getState().revision,0);assert.deepEqual(events.map(e=>e.phase),["error"]);session.destroy();
});

test("facet source links reject geometry predicates without silently rematerializing a source chart",()=>{
  const child=base().encodeOpacity({target:"points",value:1}).editMarkSelection({selection:"picked",property:"opacity",op:"eq",value:1}).facet({field:"group"});
  const program=hconcat({programs:[{id:"a",program:child},{id:"b",program:base()}]});
  const binding=link("geometry",["a"],"b","global",fieldProjection);
  binding.sources[0].target={childPath:["a"],id:"points",facetSource:true};
  assert.throws(()=>createInteractionSession({program,bindings:[binding]}),/concrete-property selection/);
});
