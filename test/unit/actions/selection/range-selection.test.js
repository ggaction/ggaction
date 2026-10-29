import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../../src/index.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";

const rows=[{id:"a",x:1,y:1},{id:"b",x:2,y:2},{id:"c",x:3,y:3}];
const base=()=>chart().createCanvas({margin:40}).createData({id:"rows",values:rows,keyField:"id"})
  .createScatterPlot({id:"points",x:"x",y:"y",guides:false});
const ids=p=>resolveStoredSelection(p,"picked").items.filter(item=>resolveStoredSelection(p,"picked").keys.includes(item.key)).map(item=>item.fields.id);

test("endpoint selections remain live across revision, labels, conditionals and codec", () => {
  const p=base(),before=serializeProgram(p);
  const q=p.selectMarks({id:"picked",field:"x",op:"range",min:1,max:3,minInclusive:false,maxInclusive:true})
    .highlightMarks({selection:"picked",color:"red",bringToFront:false})
    .createMarkLabels({id:"labels",source:"points",field:"id",selection:"picked"})
    .encodeOpacity({target:"points",conditions:[{when:{selection:"picked"},value:{value:0.4}}],otherwise:{value:1}});
  assert.deepEqual(ids(q),["b","c"]);
  assert.deepEqual(getMarkItems(q,{target:"labels"}).map(i=>i.fields.id),["b","c"]);
  const edited=q.editMarkSelection({selection:"picked",field:"x",op:"range",max:2,maxInclusive:false});
  assert.deepEqual(ids(edited),["a"]);
  assert.deepEqual(getMarkItems(edited,{target:"points"}).map(i=>i.properties.opacity),[0.4,1,1]);
  assert.deepEqual(getMarkItems(edited,{target:"labels"}).map(i=>i.fields.id),["a"]);
  const revised=edited.reviseData({source:"rows",id:"next",values:rows.map(r=>({...r,x:4-r.x}))});
  assert.deepEqual(ids(revised),["c"]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(revised)).editCanvas({width:700})),["c"]);
  assert.equal(serializeProgram(p),before);
});

test("one-sided selectors compose through filter, set updates, and explicit child scope", () => {
  const p=base();
  const q=p.selectMarks({id:"picked",items:[]}).editMarkSelection({selection:"picked",mode:"add",field:"x",op:"range",min:2,minInclusive:false});
  assert.deepEqual(ids(q),["c"]);
  assert.equal(q.semanticSpec.resources.find(r=>r.id==="picked").options.mode,"item-keys");
  const filtered=p.filterMarks({field:"x",op:"range",max:2,maxInclusive:false});
  assert.deepEqual(getMarkItems(filtered,{target:"points"}).map(i=>i.fields.id),["a"]);
  assert.deepEqual(getMarkItems(deserializeProgram(serializeProgram(filtered)),{target:"points"}).map(i=>i.fields.id),["a"]);
  const composite=hconcat({programs:[{id:"left",program:p},{id:"right",program:p}]});
  const scoped=composite.selectMarks({target:{childPath:["left"],id:"points"},id:"picked",field:"x",op:"range",min:2});
  assert.deepEqual(ids(scoped.children.left),["b","c"]);assert.equal(scoped.children.right,p);
});

test("inconsistent endpoint requests fail before any immutable state or trace change", () => {
  const p=base().selectMarks({id:"picked",field:"x",op:"range",min:1,max:3}),before=serializeProgram(p);
  for(const range of [{min:1,inclusive:true,minInclusive:false},{min:1,maxInclusive:false},{min:1,max:"3"},{}]) {
    assert.throws(()=>p.editMarkSelection({selection:"picked",field:"x",op:"range",...range}));
    assert.throws(()=>p.filterMarks({field:"x",op:"range",...range}));
    assert.equal(serializeProgram(p),before);
  }
});
