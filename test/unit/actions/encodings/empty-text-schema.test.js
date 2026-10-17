import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {renderToSVG} from "../../../../src/renderers/svg.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";

function positioned(p,data="empty") {
  return p.createTextMark({id:"label",data})
    .encodeX({field:"x",fieldType:"quantitative",scale:{domain:[0,2]}})
    .encodeY({field:"y",fieldType:"quantitative",scale:{domain:[0,2]}});
}
const rows=[{x:1,y:1,label:"regular",tool:"Ruff"}];
function filtered(){return chart().createCanvas().createData({id:"raw",values:rows})
 .filterData({id:"empty",field:"tool",predicate:{op:"eq",value:"ruff"}});}

test("empty filtered text binds retained schema without placeholder graphics",()=>{
 const p=positioned(filtered()),before=serializeProgram(p),q=p.encodeText({field:"label"});
 assert.equal(serializeProgram(p),before);assert.equal(q.semanticSpec.layers[0].encoding.text.field,"label");
 assert.deepEqual(q.graphicSpec.objects.label.items,[]);assert.match(renderToSVG(q),/<svg/);
 const refreshed=q.editCanvas({width:700,height:500}).editTextMark({fontWeight:700});
 assert.deepEqual(refreshed.graphicSpec.objects.label.items,[]);
 assert.deepEqual(deserializeProgram(serializeProgram(refreshed)).graphicSpec,refreshed.graphicSpec);
});
test("declared empty text schema supports text-first and position-first authoring",()=>{
 const p=chart().createCanvas().createData({id:"empty",values:[],schema:{fields:[{name:"x",storageType:"number"},{name:"y",storageType:"number"},{name:"label",storageType:"string"}]}});
 const a=positioned(p).encodeText({field:"label"});
 const b=p.createTextMark({id:"label",data:"empty"}).encodeText({field:"label"})
 .encodeX({field:"x",scale:{domain:[0,2]}}).encodeY({field:"y",scale:{domain:[0,2]}});
 assert.deepEqual(a.graphicSpec,b.graphicSpec);assert.deepEqual(a.graphicSpec.objects.label.items,[]);
});
test("empty text still rejects unknown fields and malformed format atomically",()=>{
 const p=positioned(filtered()),before=serializeProgram(p);
 assert.throws(()=>p.encodeText({field:"typo"}),/Unknown text field/);
 assert.throws(()=>p.encodeText({field:"label",format:"invalid"}),/format/);
 assert.equal(serializeProgram(p),before);
 const unknown=chart().createCanvas().createData({id:"empty",values:[]}).createTextMark({id:"label",data:"empty"});
 assert.throws(()=>unknown.encodeText({field:"label"}),/Unknown text field/);
});
test("nonempty text retains per-value formatting validation",()=>{
 const p=chart().createCanvas().createData({id:"raw",values:rows}).createTextMark({id:"label",data:"raw"});
 const before=serializeProgram(p);assert.throws(()=>p.encodeText({field:"label",format:".1f"}),/finite|numeric/);
 assert.equal(serializeProgram(p),before);
});
test("empty derived text rematerializes when source revision adds matching rows",()=>{
 const p=positioned(filtered()).encodeText({field:"label"}),before=serializeProgram(p);
 const q=p.reviseData({source:"raw",id:"rawMatched",values:[{...rows[0],tool:"ruff"}]});
 assert.deepEqual(q.graphicSpec.objects.label.items.map(i=>i.properties.text),["regular"]);
 assert.equal(serializeProgram(p),before);assert.match(renderToSVG(q),/>regular</);
});
test("empty grouped summary rejects fields removed from its retained schema",()=>{
 const p=filtered().createSummaryData({id:"summary",groupBy:["tool"],aggregates:[{op:"count",as:"n"}]})
 .createTextMark({id:"label",data:"summary"});
 assert.throws(()=>p.encodeText({field:"label"}),/Unknown text field/);
 const q=p.encodeText({field:"tool"});assert.equal(q.semanticSpec.layers[0].encoding.text.field,"tool");
});
