import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const rows = [{ id:"a",x:1,y:3,group:1 },{ id:"b",x:2,y:2,group:"1" },{ id:"c",x:3,y:1,group:1 }];
const base = () => chart().createCanvas({width:300,height:240}).createData({id:"rows",keyField:"id",values:rows})
  .createPointMark({id:"points"}).encodeX({field:"x",scale:{zero:false,nice:false}}).encodeY({field:"y",scale:{zero:false,nice:false}})
  .selectMarks({id:"universe",items:[],empty:"all"}).selectMarks({id:"picked",field:"id",op:"eq",value:"b"});
const target = id => ({childPath:[id],id:"points"});
const composition = (child=base()) => hconcat({programs:["a","b","c"].map(id=>({id,program:child}))});
const projection = {type:"rows",sourceData:"rows",targetData:"rows"};
const link = (id,source,dest,options={}) => ({type:"linkFilter",id,target:target(dest),selection:"universe",resolve:"global",
  sources:[{target:target(source),selection:"universe",projection}],...options});
const select = (id,ids,selection="universe") => ({type:"select",target:target(id),payload:{id:selection,select:{field:"id",op:"oneOf",values:ids}}});
const visible = (program,id) => getMarkItems(program.children[id],{target:"points"}).map(i=>i.fields.id);
const selected = (program,id) => {const {items,keys}=resolveStoredSelection(program.children[id],"picked");return items.filter(i=>keys.includes(i.key)).map(i=>i.fields.id);};

test("linked filter chains narrow widen and empty native views in one source transaction",()=>{
  const p=composition(),before=serializeProgram(p),session=createInteractionSession({program:p,bindings:[link("last","b","c"),link("first","a","b")]}),events=[];
  let repeated;
  session.subscribe(e=>{if(e.phase)events.push(e);if(e.phase==="commit")session.dispatch(repeated)});assert.equal(session.getState().program,p);
  for(const ids of [["a"],["c"],["a","b","c"],[]]){
    const old=session.getState().program;
    repeated={...select("a",ids),transactionId:`rows-${events.length}`,origin:"user"};
    session.dispatch(repeated);
    const q=session.getState().program;
    for(const id of ["b","c"])assert.deepEqual(visible(q,id),ids);
    assert.deepEqual(events.at(-2).affectedOwners.map(o=>o.childPath[0]),["a","b","c"]);
    assert.equal(events.at(-2).previous,old);assert.equal(events.at(-2).current,q);
    assert.equal(events.at(-2).origin,"user");assert.equal(events.at(-2).transactionId,repeated.transactionId);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  }
  assert.deepEqual(events.map(e=>e.phase),Array.from({length:4},()=>["commit","settled"]).flat());
  assert.ok(session.getState().linkedSelections.every(link=>link.effect==="filter"));
  assert.equal(serializeProgram(p),before);session.destroy();
});

test("filter reconciliation preserves or drops hidden selection before downstream selection linking",()=>{
  for(const selectionPolicy of ["keep-hidden","drop"]){
    const p=composition(),session=createInteractionSession({program:p,selectionPolicy,bindings:[link("filter","a","b"),{
      type:"linkSelection",id:"selection",target:target("c"),selection:"picked",resolve:"global",sources:[{target:target("b"),selection:"picked",projection}]
    }]}),events=[];session.subscribe(e=>{if(e.phase)events.push(e)});
    session.dispatch(select("a",["a"]));assert.deepEqual(selected(session.getState().program,"b"),[]);assert.deepEqual(selected(session.getState().program,"c"),[]);
    assert.ok(events[0].selectionChanges.some(change=>change.target.childPath[0]==="b" && change[selectionPolicy==="drop"?"droppedKeys":"hiddenKeys"].length===1));
    session.dispatch(select("a",["a","b","c"]));
    assert.deepEqual(selected(session.getState().program,"b"),selectionPolicy==="drop"?[]:["b"]);
    assert.deepEqual(selected(session.getState().program,"c"),selectionPolicy==="drop"?[]:["b"]);
    assert.equal(session.getState().revision,2);session.destroy();
  }
});

test("existing target filters are adopted without initial writes and direct filter overwrites reject atomically",()=>{
  const p=composition().filterMarks({target:target("b"),field:"id",op:"eq",value:"a"});
  const session=createInteractionSession({program:p,bindings:[link("filter","a","b")]}),events=[];session.subscribe(e=>{if(e.phase)events.push(e)});
  assert.equal(session.getState().program,p);assert.deepEqual(visible(p,"b"),["a"]);
  session.dispatch(select("a",["c"]));assert.deepEqual(visible(session.getState().program,"b"),["c"]);
  const state=session.getState(),encoded=serializeProgram(state.program);
  assert.throws(()=>session.dispatch({type:"filter",target:target("b"),payload:{clear:true}}),/owned by its binding/);
  assert.equal(session.getState().program,state.program);assert.equal(session.getState().scene,state.scene);assert.equal(serializeProgram(state.program),encoded);
  assert.deepEqual(events.map(e=>e.phase),["commit","settled","error"]);session.destroy();
});

test("typed field projection and intersection use the unfiltered target universe",()=>{
  const fields={type:"fields",sourceFields:["group"],targetFields:["group"]};
  const binding=link("both","a","c",{resolve:"intersection",sources:[{target:target("a"),selection:"universe",projection:fields},{target:target("b"),selection:"universe",projection:fields}]});
  const session=createInteractionSession({program:composition(),bindings:[binding]});
  session.dispatch(select("a",["a"]));assert.deepEqual(visible(session.getState().program,"c"),["a","c"]);
  session.dispatch(select("b",["b"]));assert.deepEqual(visible(session.getState().program,"c"),[]);
  session.dispatch(select("a",["b"]));assert.deepEqual(visible(session.getState().program,"c"),["b"]);
  session.destroy();
});

test("external source selection replacement refreshes linked filters without recreating deleted owners",()=>{
  const session=createInteractionSession({program:composition(),bindings:[link("filter","a","b")]});
  session.updateProgram(session.getState().program.editMarkSelection({target:{childPath:["a"]},selection:"universe",field:"id",op:"eq",value:"c"}));
  assert.deepEqual(visible(session.getState().program,"b"),["c"]);
  const missing=session.getState().program.removeCompositionChild({target:"b"});
  session.updateProgram(missing);assert.equal(session.getState().program.children.b,undefined);
  assert.equal(session.getState().linkedSelections[0].targetAvailable,false);session.destroy();
});

test("mixed bindings reject cycles and duplicate target writers before any authoring",()=>{
  const p=composition();
  for(const bindings of [[link("one","a","b"),link("two","b","a")],
    [link("one","a","b"),{...link("two","c","b"),type:"linkSelection"}],
    [{...link("one","a","b"),extra:true}]])assert.throws(()=>createInteractionSession({program:p,bindings}));
  let reads=0;const binding={...link("one","a","b"),get resolve(){reads++;return "global";}};
  assert.throws(()=>createInteractionSession({program:p,bindings:[binding]}));assert.equal(reads,0);
});


test("a late native target rejection rolls back prior filter candidates and source selection",()=>{
  const child=base(), gradient=chart().createCanvas({width:300,height:240}).createData({id:"rows",values:rows})
    .createGradientPlot({id:"gradient",x:{field:"group",fieldType:"nominal"},y:{field:"y"},density:{bandwidth:1,steps:8},guides:false})
    .selectMarks({id:"universe",target:"gradient",items:[],empty:"all"});
  const p=hconcat({programs:[{id:"a",program:child},{id:"b",program:child},{id:"c",program:gradient}]}),before=serializeProgram(p);
  const session=createInteractionSession({program:p,bindings:[link("first","a","b"),{
    type:"linkFilter",id:"last",target:{childPath:["c"],id:"gradient"},selection:"universe",resolve:"global",
    sources:[{target:target("b"),selection:"universe",projection:{type:"fields",sourceFields:["group"],targetFields:["group"]}}]
  }]}),events=[];session.subscribe(e=>{if(e.phase)events.push(e)});
  const state=session.getState();assert.throws(()=>session.dispatch(select("a",["a"])),/does not support composite mark/);
  assert.equal(session.getState().program,p);assert.equal(session.getState().scene,state.scene);assert.equal(session.getState().linkedSelections,state.linkedSelections);
  assert.equal(session.getState().revision,0);assert.equal(serializeProgram(p),before);
  assert.deepEqual(events.map(e=>e.phase),["error"]);session.destroy();
});

test("filter binding owns only filtering and permits native click selection on the target",()=>{
  const session=createInteractionSession({program:composition(),bindings:[link("filter","a","b"),{type:"select",target:target("b"),selection:"picked"}]});
  session.dispatch(select("b",["a"],"picked"));assert.deepEqual(selected(session.getState().program,"b"),["a"]);
  session.destroy();
});

test("empty native filters retain final-item semantics across aggregate and path marks and codec", () => {
  const source = chart().createCanvas({ width: 300, height: 240 }).createData({ id: "rows", values: rows, keyField: "id" });
  const marks = [
    source.createBarPlot({ id: "mark", x: "group", y: { field: "y", aggregate: "sum" }, guides: false }),
    source.createLineMark({ id: "mark" }).encodeX({ field: "x" }).encodeY({ field: "y" }),
    source.createAreaMark({ id: "mark" }).encodeX({ field: "x" }).encodeY({ datum: 0 }).encodeY2({ field: "y" }),
    source.createArcMark({ id: "mark" }).encodeTheta({ field: "y" })
  ];
  for (const mark of marks) {
    const p = mark.selectMarks({ id: "picked", target: "mark", items: [], empty: "all" });
    const baseline = getMarkItems(p, { target: "mark" }).map(item => item.key), before = serializeProgram(p);
    const session = createInteractionSession({ program: p, bindings: [] });
    session.dispatch({ type: "filter", target: "mark", payload: { select: { items: [] } } });
    const empty = deserializeProgram(serializeProgram(session.getState().program));
    assert.deepEqual(getMarkItems(empty, { target: "mark" }), []);
    assert.deepEqual(resolveStoredSelection(empty, "picked").keys, []);
    assert.deepEqual(resolveStoredSelection(empty, "picked", { sourceOnly: true }).keys, []);
    if (empty.semanticSpec.layers[0].mark.type === "bar") {
      assert.throws(() => empty.selectMarks({id:"invalidStack",target:"mark",items:[],grain:"stack"}), /stacked items/);
    }
    assert.throws(() => getMarkItems(empty, { target: "mark", grain: "unknown" }), /grain/);
    session.updateProgram(empty); session.dispatch({ type: "filter", target: "mark", payload: { clear: true } });
    assert.deepEqual(getMarkItems(session.getState().program, { target: "mark" }).map(item => item.key), baseline);
    assert.equal(serializeProgram(p), before); session.destroy();
  }
});

test("linked graph filters restore native topology and avoid unchanged induced-view writes", () => {
  const source = base(), graph = chart().createCanvas({width:300,height:240})
    .createData({id:"nodes",values:rows,keyField:"id"}).createData({id:"edges",values:[{id:"ab",from:"a",to:"b"},{id:"bc",from:"b",to:"c"}],keyField:"id"})
    .createGraphData({id:"graph",nodes:"nodes",edges:"edges",nodeKey:"id",source:"from",target:"to",edgeKey:"id",directed:false})
    .layoutGraph({id:"layout",method:"circular",options:{radius:50}}).createGraphPlot({id:"graph"})
    .selectMarks({id:"universe",items:[],empty:"all"});
  const program=hconcat({programs:[{id:"a",program:source},{id:"b",program:graph}]}), targetGraph={childPath:["b"],id:"graph"};
  const session=createInteractionSession({program,bindings:[{type:"linkFilter",id:"graphFilter",target:targetGraph,selection:"universe",resolve:"global",
    sources:[{target:target("a"),selection:"universe",projection:{type:"fields",sourceFields:["id"],targetFields:["key"]}}]}]});
  for (const [ids,edges] of [[["a","b"],1],[["c"],0],[["a","b","c"],2]]) {
    session.dispatch(select("a",ids)); const child=session.getState().program.children.b;
    assert.deepEqual(getMarkItems(child,{target:"graph"}).filter(item=>item.fields.kind==="node").map(item=>item.fields.key),ids);
    assert.equal(getMarkItems(child,{target:"graph"}).filter(item=>item.fields.kind==="edge").length,edges);
    session.dispatch(select("a",ids)); assert.equal(session.getState().program.children.b,child);
    assert.deepEqual(deserializeProgram(serializeProgram(session.getState().program)).graphicSpec,session.getState().program.graphicSpec);
  }
  session.destroy();
});
