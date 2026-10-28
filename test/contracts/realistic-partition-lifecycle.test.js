import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const witnesses = new Map(["createPartitionPlot", "editPartitionPlot"].map(name => [name, new Set()]));
const paints = ["#2563eb",{type:"pattern",style:"diagonal",pitch:12,strokeWidth:2,foreground:"#2563eb",coordinateSpace:"plot"},
 {type:"radial-gradient",center:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:"#dbeafe"},{offset:1,color:"#2563eb"}]}];
for (const dataset of datasets) for (const [index,recipe] of ["rectangular", "polar", "focused"].entries()) {
 test(`${dataset} ${recipe} partition preserves observed values, focus and exact resource revisions`, () => {
  try {
   const view=realisticRecordView(dataset,{rowLimit:24,groupLimit:4});
   const rows=view.rows.filter(row=>row.value>=0).map(row=>({id:row.key,category:row.category,value:row.value,sourceRowIndex:row.sourceRowIndex}));
   assert.ok(rows.length>=4);assert.ok(rows.every(row=>view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
   const base=chart().createCanvas({width:520,height:400,margin:30}).createData({id:"rows",values:rows,keyField:"id"})
    .createHierarchyData({id:"hierarchy",groupFields:["category","id"],value:"value"}).layoutHierarchy({id:"layout",method:"partition"})
    .createCoordinate({id:"cartesian",type:"cartesian"}).createCoordinate({id:"polar",type:"polar"});
   const path=[rows[0].category];
   const p=base.createPartitionPlot({id:"plot",layout:"layout",coordinate:recipe==="polar"?"polar":"cartesian",
    focus:recipe==="focused"?{path}:null,rootVisible:false,prunedSelection:"keep-hidden",orientation:index===0?"vertical":"horizontal",
    reverseU:index===1,reverseV:index===2,padding:[3,4],innerRadius:15,outerRadius:130,startAngle:45,sweep:270,
    direction:"counterclockwise",radiusPolicy:index===1?"equal-depth-area":"equal-depth",clip:true,
    cells:{fill:paints[index],opacity:.9,stroke:"white",strokeWidth:1,overrides:[{path,opacity:.75}]},
    labels:{content:"value",minWidth:8,minArcLength:12,fontSize:11,offset:[1,2],overrides:[{path,text:String(path[0])}]}});
   const before=serializeProgram(p),total=rows.reduce((sum,row)=>sum+row.value,0),layout=p.semanticSpec.resources.find(r=>r.kind==="layout");
   assert.ok(Math.abs(layout.result.totalValue-total)<=Math.max(1,total)*1e-12);
   const ids=getMarkItems(p).map(item=>item.key).sort();
   const edited=p.editPartitionPlot({target:"plot",coordinate:"polar",focus:null,rootVisible:true,prunedSelection:"drop",orientation:"horizontal",
    reverseU:false,reverseV:false,padding:2,innerRadius:10,outerRadius:"auto",startAngle:0,sweep:360,direction:"clockwise",radiusPolicy:"equal-depth",
    clip:false,cells:{fill:paints[(index+1)%3]},labels:{minWidth:0,minArcLength:0}}).editLayout({target:"layout",order:{by:"value",direction:"descending"}});
   assert.deepEqual(getMarkItems(edited).map(item=>item.key).sort(),ids);
   const revised=deserializeProgram(serializeProgram(edited)).reviseData({source:"rows",id:"next",values:rows.map(row=>({...row,value:row.value*2}))});
   assert.equal(inspectProgram(revised).views[0].partition.focusKey,revised.semanticSpec.resources.find(r=>r.kind==="hierarchy").result.rootKey);
   assert.equal(revised.semanticSpec.layers[0].partitionView.rootVisible,true);
   assertGraphicIntegrity(revised,`${dataset}/${recipe}`);assertSvgIntegrity(renderToSVG(revised),`${dataset}/${recipe}`);
   assert.equal(renderToSVG(deserializeProgram(serializeProgram(revised))),renderToSVG(revised));
   assert.equal(serializeProgram(p),before);
   for(const entry of revised.trace.children) if(witnesses.has(entry.op)) witnesses.get(entry.op).add(`${dataset}/${recipe}`);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
 });
}
test("partition creation and editing each have five datasets and three direct recipe witnesses",()=>{
 for(const [action,cases]of witnesses) assert.equal(cases.size,15,action);
});
