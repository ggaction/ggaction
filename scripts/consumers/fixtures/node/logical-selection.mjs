import assert from "node:assert/strict";
import { chart, hconcat } from "ggaction";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { createInteractionSession } from "ggaction/interaction";
import { renderToSVG } from "ggaction/svg";
const base=()=>chart().createCanvas({width:300,height:240,margin:40}).createData({id:"rows",values:[{id:"a",x:1,y:2},{id:"b",x:2,y:4}],keyField:"id"})
 .createScatterPlot({id:"points",x:"x",y:"y",guides:false});
export const cases=[
 {id:"selection/logical-item-update",run(){
  const p=base(),items=getMarkItems(p,{target:"points"});
  const session=createInteractionSession({program:p,bindings:[]});
  session.dispatch({type:"inspect",point:{x:items[0].properties.x,y:items[0].properties.y}});
  const hit=session.getState().hit.target;
  assert.equal(hit.itemKey,items[0].key);
  const q=p.selectMarks({id:"picked",target:hit.ownerId,items:[hit.itemKey]}).highlightMarks({selection:"picked",color:"red",bringToFront:false});
  const r=deserializeProgram(serializeProgram(q)).editMarkSelection({selection:"picked",mode:"toggle",items:items.map(item=>item.key)});
  assert.deepEqual(getMarkItems(r,{target:"points"}).filter(item=>item.properties.fill==="red").map(item=>item.fields.id),["b"]);
  const ranged=r.editMarkSelection({selection:"picked",field:"x",op:"range",min:1,max:2,minInclusive:false,maxInclusive:true});
  assert.deepEqual(getMarkItems(ranged,{target:"points"}).filter(item=>item.properties.fill==="red").map(item=>item.fields.id),["b"]);
  const open=ranged.editMarkSelection({selection:"picked",field:"x",op:"range",max:2,maxInclusive:false});
  assert.deepEqual(getMarkItems(deserializeProgram(serializeProgram(open)),{target:"points"}).filter(item=>item.properties.fill==="red").map(item=>item.fields.id),["a"]);
  const where={version:2,registry:"standard@1",root:{type:"binary",op:"gte",left:{type:"field",name:"x"},right:{type:"parameter",id:"threshold"}}};
  const expressed=base().createParameter({id:"threshold",value:1}).selectMarks({id:"picked",where})
   .highlightMarks({selection:"picked",color:"red",bringToFront:false})
   .createMarkLabels({id:"labels",source:"points",field:"id",selection:"picked"});
  const expressionEdit=deserializeProgram(serializeProgram(expressed)).editParameter({target:"threshold",value:2});
  assert.deepEqual(getMarkItems(expressionEdit,{target:"points"}).filter(i=>i.properties.fill==="red").map(i=>i.fields.id),["b"]);
  assert.deepEqual(getMarkItems(expressionEdit,{target:"labels"}).map(i=>i.fields.id),["b"]);
  assert.equal(expressionEdit.semanticSpec.resources.find(r=>r.id==="picked").revision,1);
  const exp=root=>({version:2,registry:"standard@1",root});
  const derived=chart().createCanvas().createData({id:"raw",values:[{x:1,y:2}]})
   .createComputedData({id:"scores",as:"score",expression:exp({type:"field",name:"x"})})
   .createScatterPlot({id:"points",x:"x",y:"y",guides:false})
   .selectMarks({id:"picked",where:exp({type:"binary",op:"gt",left:{type:"field",name:"score"},right:{type:"literal",value:0}})});
  const old=serializeProgram(derived);
  assert.throws(()=>derived.editComputedData({target:"scores",expression:exp({type:"literal",value:"word"}),dependents:"recompute"}),/matching scalar types/);
  assert.equal(serializeProgram(derived),old);
  session.updateProgram(r);session.destroy();
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(r))),renderToSVG(r));
  assert.equal(q.semanticSpec.resources[0].revision,0);assert.equal(r.semanticSpec.resources[0].revision,1);
 }},
 {id:"selection/logical-scoped-update",run(){
  const child=base(),p=hconcat({programs:[{id:"left",program:child},{id:"right",program:child}]});
  const target={childPath:["left"],id:"points"},items=getMarkItems(p,{target});
  const q=p.highlightMarks({id:"picked",target,select:{items:[items[1].key]},color:"red"});
  const r=deserializeProgram(serializeProgram(q)).editMarkSelection({target:{childPath:["left"]},selection:"picked",mode:"subtract",items:[items[1].key]});
  assert.equal(getMarkItems(r,{target}).filter(item=>item.properties.fill==="red").length,0);
  assert.equal(getMarkItems(q,{target}).filter(item=>item.properties.fill==="red").length,1);
  assert.equal(renderToSVG(r.children.right),renderToSVG(child));
 }}
];
