import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
const rows=Array.from({length:8},(_,i)=>({x:i,y:i+1,group:i%2?"B":"A",panel:String(i%4),value:i+1}));
function seed(height=275){return chart().createCanvas({plot:{width:60,height},margin:{top:35,right:5,bottom:60,left:45}})
 .createData({values:rows}).createScatterPlot({x:"x",y:"y",color:"group",guides:false});}
function parent(program=seed(),clipHeight=30){return program.facet({field:"panel",columns:4,spacing:"plot",gap:2,
 guides:{legend:{channels:["color"],position:"top-left",title:false,symbol:{layers:[{type:"point",size:40}]},clipHeight}}});}
function windows(p){
 const objects=p.graphicSpec.objects;
 return Object.entries(objects).filter(([,object])=>object.type==='canvas'&&object.children?.length>0&&
  object.children.every(id=>objects[id]?.properties!==undefined&&objects[id].children===undefined));
}
test("clipped parent samples retain radius and source rows through focused edits, reflow and editable import",()=>{
 const base=seed(),original=serializeProgram(base),p=parent(base),before=serializeProgram(p);
 assert.equal(windows(p).length,2);
 for(const[,window]of windows(p)){
  assert.equal(window.properties.height,30);
  assert.equal(p.graphicSpec.objects[window.children[0]].properties.radius,40);
 }
 assert.equal(p.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight,30);
 for(const child of Object.values(p.children)){assert.equal(child.materializationConfigs.canvas.plot.width,60);assert.equal(child.guideConfigs.legend,undefined);}
 assert.deepEqual(deserializeProgram(before).graphicSpec,p.graphicSpec);
 const changed=p.editLegendSymbols({clipHeight:20}).editCompositionLayout({gap:8});
 assert.equal(changed.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight,20);
 assert.equal(resolveFacetProgramLayout(changed).plot.width,264);
 assert.ok(windows(changed).every(([,window])=>window.properties.height===20));
 assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec,changed.graphicSpec);
 const reset=p.editLegend({clipHeight:"auto"});assert.equal(windows(reset).length,0);
 assert.equal(reset.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight,undefined);
 assert.equal(serializeProgram(p),before);assert.equal(serializeProgram(base),original);
});
test("parent replay retains independent per-block clip choices and removes clipped descendants",()=>{
 const s=seed().encodeSize({field:"value",scale:{domain:[0,10],range:[100,1000]}});
 const p=s.facet({field:"panel",columns:4,spacing:"plot",gap:2,guides:{legend:{position:"top-left",symbol:{layers:[{type:"point",size:12}]},clipHeight:12}}})
  .editLegendBlock({target:"scatterPlot",channel:"size",clipHeight:18});
 assert.equal(p.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight,12);
 assert.equal(p.compositionSpec.facet.guides.legend.blocks.size.config.clipHeight,18);
 const replay=p.editCompositionLayout({gap:4});
 assert.deepEqual(replay.guideConfigs.legend,p.guideConfigs.legend);
 assert.equal(replay.guideConfigs.legend.color.clipHeight,12);assert.equal(replay.guideConfigs.legend.size.clipHeight,18);
 const removed=replay.removeLegend({channels:["color"]});
 assert.equal(removed.compositionSpec.facet.guides.legend.blocks.color,undefined);
 assert.equal(removed.guideConfigs.legend.size.clipHeight,18);
 assert.deepEqual(deserializeProgram(serializeProgram(removed)).graphicSpec,removed.graphicSpec);
 assert.equal(removed.removeLegend({channels:["size"]}).compositionSpec.facet.guides.legend,false);
});
test("a short parent union fits clipped symbols and refuses an unclipped reset atomically",()=>{
 const p=parent(seed(70),12),before=serializeProgram(p);
 assert.equal(resolveFacetProgramLayout(p).plot.height,70);
 assert.throws(()=>p.editLegendSymbols({clipHeight:"auto"}),/does not fit/);
 assert.throws(()=>p.editLegend({clipHeight:-1}),/clipHeight/);
 assert.equal(serializeProgram(p),before);
});

test("parent replay keeps a gradient strip unclipped beside a clipped size block",()=>{
 const source=seed(400).editCanvas({plot:{width:240,height:400}}).encodeColor({field:"value",fieldType:"quantitative"})
  .encodeSize({field:"value",scale:{domain:[0,10],range:[100,1000]}});
 const p=source.createLegend({channels:["color"],position:"top-left"}).createLegend({channels:["size"]})
  .facet({field:"panel",columns:4,spacing:"plot",gap:2,guides:{legend:"shared"}})
  .editLegendBlock({target:"scatterPlot",channel:"size",clipHeight:16});
 const before=serializeProgram(p);
 for(const q of [p.editCompositionLayout({gap:6}),deserializeProgram(before).editCompositionLayout({gap:6})]){
  assert.deepEqual(q.guideConfigs.legend,p.guideConfigs.legend);
  assert.equal(q.guideConfigs.legend.gradient.clipHeight,undefined);
  assert.equal(q.guideConfigs.legend.size.clipHeight,16);
  assert.ok(q.graphicSpec.objects.colorGradientStrips.items.length>0);
  assert.equal(windows(q).length,q.graphicSpec.objects.sizeLegendSymbols.children.length);
  assert.ok(windows(q).every(([,window])=>window.properties.height===16));
 }
 assert.equal(serializeProgram(p),before);
});
test("clipped children compose with valid private identities and preserve item selection",()=>{
 const source=seed().editCanvas({plot:{width:200,height:275},margin:100})
  .createLegend({channels:["color"],symbol:{layers:[{type:"point",size:20}]},clipHeight:12});
 const before=serializeProgram(source);
 const facet=source.facet({field:"panel",columns:2,guides:{legend:false}});
 const combined=hconcat({programs:[source,source],gap:8});
 for(const p of [facet,combined]){
  assert.ok(windows(p).length>0);
  for(const [id]of Object.entries(p.graphicSpec.objects))assert.match(id,/^[A-Za-z0-9_-]+$/);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  const replay=p.editCompositionLayout({gap:10});
  assert.equal(windows(replay).length,windows(p).length);
 }
 const selected=source.highlightMarks({target:"scatterPlot",select:{field:"group",op:"eq",value:"B"},color:"red"});
 assert.deepEqual(selected.graphicSpec.objects.scatterPlot.items.map(item=>item.id).sort(),source.graphicSpec.objects.scatterPlot.items.map(item=>item.id).sort());
 assert.equal(windows(selected).length,2);
 assert.deepEqual(selected.rematerializeLegend().graphicSpec,selected.graphicSpec);
 assert.equal(serializeProgram(source),before);
});
test("stored clipped parent intent accepts only the closed per-block window state",()=>{
 const p=parent(),before=serializeProgram(p),envelope=JSON.parse(before);
 for(const mutate of [
  state=>{state.compositionSpec.facet.guides.legend.blocks.color.config.clipExtra=30;},
  state=>{state.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight=0;},
  state=>{state.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight="auto";},
  state=>{state.compositionSpec.facet.guides.legend.blocks.color.config.clipHeight=20;}
 ]){
  const state=structuredClone(decodeValue(envelope.payload));mutate(state);
  assert.throws(()=>deserializeProgram(JSON.stringify({...envelope,payload:encodeValue(state)})));
 }
 assert.equal(serializeProgram(p),before);
});

test("clipped size-shape parent retains mapped areas and native local block placement",()=>{
 const source=seed().editCanvas({plot:{width:400,height:300}})
  .reviseData({source:"data",id:"typed",values:rows.map((row,i)=>({...row,group:i%2?1:"1"}))})
  .encodeShape({field:"group"})
  .encodeSize({field:"group",fieldType:"nominal",scale:{type:"ordinal",range:[5000,10000]}});
 const p=source.facet({field:"panel",columns:2,guides:{legend:{channels:["shape","size"],combine:"size-shape",position:"top-left",clipHeight:20}}})
  .editLegendLayout({channel:"size",position:"bottom-right"});
 const before=serializeProgram(p);
 const q=p.editCompositionLayout({gap:12});
 assert.deepEqual(q.guideConfigs.legend.series.sizeAreas,[5000,10000]);
 assert.deepEqual(q.guideConfigs.legend.series.domain,["1",1]);
 assert.equal(q.guideConfigs.legend.series.combine,"size-shape");
 assert.equal(q.guideConfigs.legend.series.clipHeight,20);
 assert.deepEqual(q.guideConfigs.legend.series.blockOverrides,p.guideConfigs.legend.series.blockOverrides);
 assert.equal(q.guideConfigs.legend.series.inferredTitle,p.guideConfigs.legend.series.inferredTitle);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 assert.equal(windows(q).length,2);
 assert.equal(serializeProgram(p),before);
});
