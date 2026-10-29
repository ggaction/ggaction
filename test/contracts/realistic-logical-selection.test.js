import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets=["tt-penguins","tt-london-marathon-winners","tt-astronauts","tt-us-births","tt-chocolate-ratings"];
const witnessed=new Set();
for (const dataset of datasets) for (const recipe of ["observations","categories","series"]) {
 test(`${dataset} ${recipe} logical selection preserves item grain through toggles and restore`,()=>{
  try {
   const view=realisticRecordView(dataset,{rowLimit:24,groupLimit:4});
   const rows=view.rows.map((row,index)=>({...row,order:index}));
   assert.ok(rows.length>=4);assert.ok(rows.every(row=>view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
   let p=chart().createCanvas({width:500,height:360,margin:45}).createData({id:"rows",values:rows,keyField:"key"});
   if(recipe==="observations") p=p.createScatterPlot({id:"mark",x:"order",y:"value",guides:false});
   else if(recipe==="categories") p=p.createBarPlot({id:"mark",x:"category",y:{field:"value",aggregate:"mean"},guides:false});
   else p=p.createLineMark({id:"mark"}).encodeX({field:"order"}).encodeY({field:"value"}).encodeGroup({field:"category",fieldType:"nominal"});
   const items=getMarkItems(p,{target:"mark"}),keys=items.map(item=>item.key);
   assert.ok(keys.length>=2);
   const q=p.selectMarks({id:"picked",target:"mark",items:[keys[0]]}).highlightMarks({selection:"picked",color:"#ef4444",bringToFront:false});
   const saved=serializeProgram(q);
   for(const [mode,requested,expected]of[["replace",[keys[1]],[keys[1]]],["add",[keys[1]],[keys[0],keys[1]]],["toggle",[keys[0],keys[1]],[keys[1]]],["subtract",[keys[0]],[]],["intersect",[keys[0],keys[1]],[keys[0]]]]) {
    const revised=deserializeProgram(saved).editMarkSelection({selection:"picked",mode,items:requested});
    const actual=getMarkItems(revised,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
    assert.deepEqual(actual,expected);
    assert.equal(revised.semanticSpec.resources.find(r=>r.id==="picked").revision,1);
    assertGraphicIntegrity(revised,`${dataset}/${recipe}/${mode}`);assertSvgIntegrity(renderToSVG(revised),`${dataset}/${recipe}/${mode}`);
   }
   const all=q.editMarkSelection({selection:"picked",items:[],empty:"all"});
   assert.ok(getMarkItems(all,{target:"mark"}).every(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")));
   assert.equal(serializeProgram(q),saved);
   assert.deepEqual(getMarkItems(q.editCanvas({width:600}),{target:"mark"}).map(item=>item.key),keys);
   const domain=[...new Set(items.map(item=>item.fields.category))].sort();
   assert.ok(domain.length>=2);
   const min=domain[0],max=domain.at(-1);
   for(const [range,predicate] of [
    [{min,max,minInclusive:false,maxInclusive:true},value=>value>min&&value<=max],
    [{min,max,minInclusive:true,maxInclusive:false},value=>value>=min&&value<max],
    [{min,minInclusive:false},value=>value>min],
    [{max,maxInclusive:false},value=>value<max]
   ]) {
    const ranged=p.highlightMarks({id:"rangePicked",target:"mark",select:{field:"category",op:"range",...range},color:"#ef4444",bringToFront:false});
    const expected=items.filter(item=>predicate(item.fields.category)).map(item=>item.key);
    const actual=getMarkItems(deserializeProgram(serializeProgram(ranged)),{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
    assert.deepEqual(actual,expected);
    const edited=ranged.editMarkSelection({selection:"rangePicked",field:"category",op:"range",...range});
    assert.equal(edited.semanticSpec.resources.find(r=>r.id==="rangePicked").revision,1);
   }
   witnessed.add(`${dataset}/${recipe}`);
  } finally {releaseTidyTuesdaySourceCache(dataset);}
 });
}
test("logical selection modes have five pinned datasets and three different grain recipes",()=>assert.equal(witnessed.size,15));
