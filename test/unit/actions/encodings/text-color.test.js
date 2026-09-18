import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
const rows = [{x:1,y:2,t:"one",g:"A",v:1},{x:2,y:3,t:"two",g:"B",v:2}];
function base(){return chart().createCanvas({width:500,height:400,margin:100}).createData({values:rows});}
function text(){return base().createTextMark().encodeChannels({target:"text",channels:{x:{field:"x"},y:{field:"y"},text:{field:"t"}}});}
function fills(p,id="text"){return p.graphicSpec.objects[id].items.map(i=>i.properties.fill);}
test("row text maps categorical and quantitative color and rematerializes scales and legends",()=>{
 for(const color of [{field:"g",scale:{id:"c",range:["#ff0000","#0000ff"]}},{field:"v",fieldType:"quantitative",scale:{id:"c",range:["#ff0000","#0000ff"]}}]){
  const p=text().encodeColor(color).createLegend({target:"text",channels:["color"]});
  assert.deepEqual(fills(p),["#ff0000","#0000ff"]);
  const q=p.editColorScale({id:"c",range:["#00ff00","#ffffff"]});
  assert.deepEqual(fills(q),["#00ff00","#ffffff"]);
  assert.deepEqual(fills(p),["#ff0000","#0000ff"]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 }
});
test("attached labels explicitly inherit point stroke and follow source scale edits",()=>{
 const p=base().createScatterPlot({id:"p",x:"x",y:"y",point:{fill:"none"},guides:false})
  .encodeStroke({field:"g",scale:{id:"s",range:["red","blue"]}})
  .createMarkLabels({id:"labels",field:"t",inheritColor:"stroke"});
 assert.deepEqual(fills(p,"labels"),["red","blue"]);
 const q=p.editScale({id:"s",range:["green","orange"]});
 assert.deepEqual(fills(q,"labels"),["green","orange"]);
 assert.deepEqual(fills(q.editTextMark({target:"labels",fill:"black"}),"labels"),["black","black"]);
 assert.equal(q.semanticSpec.guides.legend,undefined);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
test("text color conflicts and unsupported inheritance fail explicitly",()=>{
 assert.throws(()=>text().editTextMark({inheritColor:"fill"}),/source-owned/);
 assert.throws(()=>text().editTextMark({inheritColor:"invalid"}),/source-owned|inheritColor/);
 assert.throws(()=>text().editTextMark({fill:"black"}).encodeColor({field:"g"}),/constant appearance/);
 assert.throws(()=>text().encodeColor({field:"g"}).editTextMark({fill:"black"}),/conflicts/);
 assert.throws(()=>text().encodeColor({field:"g",layout:"stack"}),/not supported/);
});
test("inherited fill follows aggregate source items and selected labels",()=>{
 const p=base().createBarPlot({id:"bars",x:"g",y:{field:"v",aggregate:"sum"},color:"g",guides:false})
  .createMarkLabels({id:"labels",source:"bars",field:"v",inheritColor:"fill"});
 assert.deepEqual(fills(p,"labels"),fills(p,"bars"));
 const q=p.editTextMark({target:"labels",inheritColor:false});
 assert.deepEqual(fills(q,"labels"),["#334155","#334155"]);
 const faceted=p.facet({field:"g"});
 for(const child of Object.values(faceted.children))assert.deepEqual(fills(child,"labels"),fills(child,"bars"));
});
test("row text categorical color follows facet filters and source revisions",()=>{
 const p=text().encodeColor({field:"g",scale:{id:"c",range:["red","blue"]}});
 const q=p.facet({field:"g"});
 assert.deepEqual(Object.values(q.children).map(c=>fills(c)),[["red"],["blue"]]);
});
test("source label color is resolved after selection and survives placement edits",()=>{
 const source=base().createScatterPlot({id:"p",x:"x",y:"y",color:{field:"g",scale:{range:["red","blue"]}},guides:false});
 const p=source.createMarkLabels({id:"labels",field:"t",inheritColor:"fill",select:{field:"g",op:"eq",value:"B"}});
 assert.deepEqual(fills(p,"labels"),["blue"]);
 const q=p.editMarkLabelSelection({target:"labels",all:true});
 assert.deepEqual(fills(q,"labels"),["red","blue"]);
 assert.deepEqual(fills(q.editTextMark({target:"labels",dx:4,dy:5}),"labels"),["red","blue"]);
});
