import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";

const values = [{x:1,y:2,g:"A"},{x:1,y:2,g:"A"},{x:3,y:6,g:"B"}];
const base = () => chart().createCanvas({width:300,height:240,margin:40})
  .createData({id:"rows",values}).createScatterPlot({id:"points",x:"x",y:"y",guides:false});
const keys = p => getMarkItems(p,{target:"points"}).map(item => item.key);
const selected = p => resolveStoredSelection(p,"picked").keys;
const resource = p => p.semanticSpec.resources.find(r => r.kind === "persistent-selection" && r.id === "picked");

test("logical keys store one normalized resource and never reinterpret duplicate observations as indices", () => {
  const p = base(), before = serializeProgram(p), k = keys(p), input = [k[1],k[1]];
  const q = p.selectMarks({id:"picked",target:"points",items:input});
  input.push(k[0]);
  assert.deepEqual(selected(q), [k[1]]);
  assert.deepEqual(resource(q).options,{mode:"item-keys",itemKeys:[k[1]],empty:"none"});
  assert.equal(resource(q).algorithmVersion,"1");
  assert.deepEqual(resource(q).inputs,[]);
  assert.equal(q.graphicSpec,p.graphicSpec);
  assert.equal(serializeProgram(p),before);
  assert.deepEqual(selected(q.editCanvas({width:600})),[k[1]]);
  assert.deepEqual(selected(deserializeProgram(serializeProgram(q))),[k[1]]);
  assert.equal(typeof basicChart().selectMarks,"undefined");
});

test("all update modes preserve target and revision and compose with live legacy predicates", () => {
  const p = base(), k=keys(p);
  const initial=p.selectMarks({id:"picked",field:"g",op:"eq",value:"A"});
  for (const [mode, expected] of [["replace",[k[1],k[2]]],["add",k],["toggle",[k[0],k[2]]],["subtract",[k[0]]],["intersect",[k[1]]]]) {
    const q=initial.editMarkSelection({selection:"picked",mode,items:[k[1],k[2]]});
    assert.deepEqual(selected(q),expected);
    assert.equal(resource(q).revision,1);
    assert.equal(q.materializationConfigs.selections.picked.target,"points");
    assert.deepEqual(selected(initial),k.slice(0,2));
  }
  const live=initial.editMarkSelection({selection:"picked",field:"g",op:"eq",value:"B"});
  assert.equal(resource(live).options.mode,"predicate");
  assert.deepEqual(selected(live),[k[2]]);
  const rows=live.editMarkSelection({selection:"picked",mode:"add",rows:{data:"rows",indices:[1]}});
  assert.deepEqual(selected(rows),[k[1],k[2]]);
});

test("empty all means explicit empty state, while hidden keys survive filter and later reappear", () => {
  const p=base(),k=keys(p);
  const all=p.selectMarks({id:"picked",items:[],empty:"all"});
  assert.deepEqual(selected(all),k);
  const none=all.editMarkSelection({selection:"picked",items:[],empty:"none"});
  assert.deepEqual(selected(none),[]);
  const toggled=all.editMarkSelection({selection:"picked",mode:"toggle",items:k});
  assert.deepEqual(resource(toggled).options,{mode:"item-keys",itemKeys:[],empty:"all"});
  assert.deepEqual(selected(toggled),k);
  const chosen=p.selectMarks({id:"picked",items:[k[2]]});
  const hidden=chosen.filterMarks({target:"points",field:"g",op:"eq",value:"A"});
  assert.deepEqual(selected(hidden),[]);
  const added=hidden.editMarkSelection({selection:"picked",mode:"add",items:[k[0]]});
  assert.deepEqual(resource(added).options.itemKeys,[k[2],k[0]]);
  assert.deepEqual(selected(added),[k[0]]);
  const restored=deserializeProgram(serializeProgram(added)).removeMarkFilter({target:"points"});
  assert.deepEqual(selected(restored),[k[0],k[2]]);
});

test("logical selection updates rematerialize existing highlights, named labels, and filtered item data", () => {
  const p=base(),k=keys(p);
  const q=p.selectMarks({id:"picked",items:[k[1]]})
    .highlightMarks({selection:"picked",color:"red",bringToFront:false})
    .createMarkLabels({id:"labels",source:"points",field:"g",selection:"picked"});
  const r=q.editMarkSelection({selection:"picked",mode:"toggle",items:[k[1],k[2]]});
  assert.deepEqual(getMarkItems(r,{target:"points"}).filter(i=>i.properties.fill==="red").map(i=>i.fields.g),["B"]);
  assert.deepEqual(getMarkItems(r,{target:"labels"}).map(i=>i.fields.g),["B"]);
  const filtered=p.filterMarks({target:"points",items:[k[1]]});
  assert.deepEqual(getMarkItems(filtered,{target:"points"}).map(i=>i.rows.filter(r=>r.data==="rows").map(r=>r.index)),[[1]]);
  assert.deepEqual(keys(filtered),[k[1]]);
  assert.deepEqual(keys(deserializeProgram(serializeProgram(filtered))),[k[1]]);
  assert.deepEqual(keys(filtered.removeMarkFilter({target:"points"})),k);
});

test("logical selection malformed requests and snapshot options reject atomically", () => {
  const p=base().selectMarks({id:"picked",items:[]}), before=serializeProgram(p);
  for (const args of [{mode:"compose",items:[]},{mode:null,items:[]},{items:null},{items:[],empty:"invalid"},{items:[],field:"x"},{items:[1]}]) {
    assert.throws(()=>p.editMarkSelection({selection:"picked",...args}));
    assert.equal(serializeProgram(p),before);
  }
  for (const mutate of [
    o=>{o.itemKeys=["a","a"];},o=>{o.itemKeys=[1];},o=>{delete o.empty;},o=>{o.empty="invalid";},
    o=>{o.extra=true;},o=>{o.mode="predicate";o.predicate={items:[],empty:"none"};delete o.itemKeys;delete o.empty;}
  ]) {
    const envelope=JSON.parse(before), state=decodeValue(envelope.payload);
    mutate(state.semanticSpec.resources.find(r=>r.id==="picked").options);
    envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
  }
});

test("logical selection membership refreshes conditional branches with exact selection revisions", () => {
  const p=base(),k=keys(p);
  const q=p.selectMarks({id:"picked",items:[k[1]]}).encodeOpacity({target:"points",
    conditions:[{when:{selection:"picked"},value:{value:0.25}}],otherwise:{value:1}});
  assert.deepEqual(getMarkItems(q,{target:"points"}).map(i=>i.properties.opacity),[1,0.25,1]);
  const r=q.editMarkSelection({selection:"picked",mode:"toggle",items:[k[1],k[2]]});
  assert.deepEqual(getMarkItems(r,{target:"points"}).map(i=>i.properties.opacity),[1,1,0.25]);
  assert.equal(r.semanticSpec.layers[0].conditionals.opacity.selectionInputs[0].revision,1);
  assert.deepEqual(getMarkItems(deserializeProgram(serializeProgram(r)),{target:"points"}),getMarkItems(r,{target:"points"}));
});

test("source revisions preserve surviving explicit keys and keep removed keys hidden", () => {
  const p=chart().createCanvas({margin:40}).createData({id:"rows",keyField:"id",values:[{id:"a",x:1,y:2},{id:"b",x:2,y:4}]})
    .createScatterPlot({id:"points",x:"x",y:"y",guides:false});
  const k=keys(p), q=p.selectMarks({id:"picked",items:k}).highlightMarks({selection:"picked",color:"red"});
  const revised=q.reviseData({source:"rows",id:"next",values:[{id:"b",x:4,y:9},{id:"c",x:3,y:6}]});
  assert.deepEqual(selected(revised),[k[1]]);
  assert.deepEqual(resource(revised).options.itemKeys,k);
  const again=revised.reviseData({source:"next",id:"third",values:[{id:"a",x:7,y:8},{id:"b",x:4,y:9}]});
  assert.deepEqual(selected(again),k);
});

test("composite highlight projects selected root item membership into its owned components", () => {
  const p=chart().createCanvas({margin:120}).createData({id:"rows",values})
    .createBoxPlot({id:"box",x:{field:"g",fieldType:"nominal"},y:{field:"y"}});
  const item=getMarkItems(p,{target:"box"}).find(item=>item.target==="box" && item.fields.g==="A");
  assert.ok(item);
  const q=p.highlightMarks({id:"picked",target:"box",select:{items:[item.key]},color:"red"});
  const red=getMarkItems(q,{target:"box"}).filter(item=>item.geometry.some(g=>g.properties.fill==="red" || g.properties.stroke==="red"));
  assert.equal(red.length,5);
  assert.ok(red.every(item=>item.fields.g==="A"));
  assert.doesNotThrow(()=>deserializeProgram(serializeProgram(q)));
});

test("scoped inspected keys update exactly one nested composition child", async () => {
  const {hconcat}=await import("../../../../src/index.js");
  const p=base(), nested=hconcat({id:"outer",programs:[{id:"left",program:hconcat({id:"inner",programs:[{id:"a",program:p},{id:"b",program:p}]})},{id:"right",program:p}]});
  const target={childPath:["left","b"],id:"points"};
  const k=getMarkItems(nested,{target}).map(i=>i.key);
  const q=nested.selectMarks({target,id:"picked",items:[k[1]]});
  assert.deepEqual(selected(q.children.left.children.b),[keys(p)[1]]);
  assert.equal(q.children.left.children.a,p);
  assert.equal(q.children.right,p);
  const r=q.editMarkSelection({target:{childPath:["left","b"]},selection:"picked",mode:"toggle",items:[k[1],k[2]]});
  assert.deepEqual(selected(r.children.left.children.b),[keys(p)[2]]);
  const h=nested.highlightMarks({target,id:"picked",select:{items:[k[1]]},color:"red"});
  assert.deepEqual(getMarkItems(h,{target}).filter(i=>i.properties.fill==="red").map(i=>i.key),[k[1]]);
  const f=nested.filterMarks({target,items:[k[1]]});
  assert.deepEqual(getMarkItems(f,{target}).map(i=>i.key),[k[1]]);
  assert.doesNotThrow(()=>deserializeProgram(serializeProgram(r)));
  assert.throws(()=>nested.selectMarks({target,id:"bad",items:[keys(p)[1]]}),/child scope/);
  assert.throws(()=>nested.selectMarks({target,id:"bad",items:["unparseable"]}));
});

test("scoped inline selectors reject own getters before reading them", async()=>{
 const {hconcat}=await import("../../../../src/index.js");
 const p=hconcat({programs:[{id:"left",program:base()},{id:"right",program:base()}]});
 let calls=0;
 assert.throws(()=>p.highlightMarks({target:{childPath:["left"],id:"points"},select:{get items(){calls++;return[];}}}),/own data/);
 assert.equal(calls,0);
 const other=getMarkItems(p,{target:{childPath:["right"],id:"points"}})[0].key;
 assert.throws(()=>p.selectMarks({target:{childPath:["left"],id:"points"},items:[other]}),/child scope/);
});

test("set updates reject a change of final item grain before writing resource or graphics", async()=>{
 const {createCarsHistogram}=await import("../../../../examples/cars-histogram/program.js");
 const {loadCars}=await import("../../../support/data.js");
 const p=createCarsHistogram(loadCars()),stack=getMarkItems(p,{target:"bars",grain:"stack"})[0];
 const q=p.selectMarks({id:"picked",target:"bars",grain:"stack",items:[stack.key]}),before=serializeProgram(q);
 assert.throws(()=>q.editMarkSelection({selection:"picked",mode:"add",items:[]}),/existing grain/);
 assert.equal(serializeProgram(q),before);
 assert.deepEqual(resolveStoredSelection(q.editMarkSelection({selection:"picked",mode:"subtract",grain:"stack",items:[stack.key]}),"picked").keys,[]);
});

test("scoped label selection edits consume inspected source keys", async()=>{
 const {hconcat}=await import("../../../../src/index.js");
 const p=hconcat({programs:[{id:"left",program:base().createMarkLabels({id:"labels",source:"points",field:"g"})},{id:"right",program:base()}]});
 const target={childPath:["left"],id:"points"},key=getMarkItems(p,{target})[2].key;
 const q=p.editMarkLabelSelection({target:{childPath:["left"],id:"labels"},select:{items:[key]}});
 assert.deepEqual(getMarkItems(q,{target:{childPath:["left"],id:"labels"}}).map(i=>i.fields.g),["B"]);
});
