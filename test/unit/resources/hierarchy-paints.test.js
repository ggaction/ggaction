import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { getMarkItems } from "../../../src/inspection.js";
const rows = [{id:"r",p:null,v:4},{id:"a",p:"r",v:1},{id:"b",p:"r",v:3}];
const base = () => chart().createCanvas({width:300,height:240,margin:20}).createData({id:"d",values:rows,keyField:"id"}).createHierarchyData({id:"h",key:"id",parent:"p",value:"v"});
const pattern = {type:"pattern",style:"cross",pitch:12,strokeWidth:2,phase:[-1,2],foreground:"#f00",background:"#00f8",coordinateSpace:"object"};
const radial = {type:"radial-gradient",center:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:"red"},{offset:1,color:"blue"}]};
const recipes = [
 ["tree","createTreePlot","editTreePlot","nodes",{nodeSize:[12,12],siblingGap:50,depthGap:60,orientation:"vertical"}],
 ["treemap","createTreemapPlot","editTreemapPlot","cells",{size:[200,160],padding:8,method:"squarify"}],
 ["partition","createPartitionPlot","editPartitionPlot","cells",{}]
];
test("hierarchy and partition body, labels and overrides share structured paint normalization",()=>{
 for(const [method,create,edit,body,options] of recipes) for(const fill of [pattern,radial]) {
  const p=base().layoutHierarchy({id:"l",method,options})[create]({id:"plot",[body]:{fill},labels:{fill,overrides:[{key:"a",fill:radial,text:"Node A"}]}});
  const before=serializeProgram(p), children=p.graphicSpec.objects.plot.items.filter(item=>item.identity.role!=="link");
  assert.ok(children.length>0);
  for(const item of children) {
   assert.equal(typeof item.properties.fill,"object");
   if(item.properties.fill.type==="pattern") assert.ok(item.properties.fill.origin);
   if(item.type==="text") assert.ok(item.properties.fillBounds);
   if(item.properties.fill.type==="radial-gradient") assert.deepEqual(item.properties.fill.focal,{x:.5,y:.5});
  }
  assert.match(renderToSVG(p),/<(?:pattern|radialGradient)/);
  const edited=p[edit]({[body]:{fill:radial,overrides:[{key:"a",fill:pattern}]},labels:{fill:pattern}}).editCanvas({width:340});
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(edited))),renderToSVG(edited));
  assert.equal(serializeProgram(p),before);
 }
});
test("pattern hierarchy fill recomputes object origins after layout, coordinate and source revision",()=>{
 const p=base().layoutHierarchy({id:"l",method:"partition"}).createPartitionPlot({cells:{fill:pattern},labels:{fill:radial}});
 const first=p.graphicSpec.objects.partitionPlot.items.find(item=>item.identity.role==="body");
 const focused=p.editPartitionPlot({focus:{key:"a"}});
 assert.ok(focused.graphicSpec.objects.partitionPlot.items.every(item=>item.properties.fill.type));
 const polar=p.createCoordinate({id:"polar",type:"polar"}).editPartitionPlot({coordinate:"polar",outerRadius:80});
 assert.notDeepEqual(polar.graphicSpec.objects.partitionPlot.items[0].properties.fill.origin,first.properties.fill.origin);
 const revised=polar.reviseData({source:"d",id:"next",values:rows.map(row=>({...row,v:row.v*2}))});
 assert.equal(getMarkItems(revised).length,3);
 assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))),renderToSVG(revised));
 const highlighted=p.selectMarks({id:"a",field:"id",op:"eq",value:"a"}).highlightMarks({color:"green",dimOthers:false});
 assert.deepEqual(highlighted.removeMarkHighlight({selection:"a"}).graphicSpec,p.graphicSpec);
});
test("invalid structured hierarchy paint and accessors reject before any mutation",()=>{
 const p=base().layoutHierarchy({id:"l",method:"partition"}).createPartitionPlot(),before=serializeProgram(p);let reads=0;
 for(const fill of [{...pattern,pitch:0},{...radial,focal:{x:2,y:2}},{get type(){reads++;return "pattern";}}]) assert.throws(()=>p.editPartitionPlot({cells:{fill}}));
 assert.equal(reads,0);assert.equal(serializeProgram(p),before);
});
