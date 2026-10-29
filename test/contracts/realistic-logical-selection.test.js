import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
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
   const where={version:2,registry:"standard@1",root:{type:"binary",op:"eq",left:{type:"field",name:"category"},right:{type:"parameter",id:"categoryChoice"}}};
   const ast=p.createParameter({id:"categoryChoice",value:min}).selectMarks({id:"expressionPicked",target:"mark",where})
    .highlightMarks({selection:"expressionPicked",color:"#ef4444",bringToFront:false});
   const astSaved=serializeProgram(ast);
   for(const value of [min,max]) {
    const revised=deserializeProgram(astSaved).editParameter({target:"categoryChoice",value});
    const expected=items.filter(item=>item.fields.category===value).map(item=>item.key);
    const actual=getMarkItems(revised,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
    assert.deepEqual(actual,expected);
    assertGraphicIntegrity(revised,`${dataset}/${recipe}/expression`);assertSvgIntegrity(renderToSVG(revised),`${dataset}/${recipe}/expression`);
   }
   const session=createInteractionSession({program:deserializeProgram(astSaved),bindings:[]}),phases=[];
   session.subscribe(event=>{if('phase' in event)phases.push(event.phase);});
   session.dispatch({type:"setParameter",target:"categoryChoice",payload:{value:max}});
   const expected=items.filter(item=>item.fields.category===max).map(item=>item.key);
   const selected=getMarkItems(session.getState().program,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
   assert.deepEqual(selected,expected);
   session.dispatch({type:"select",target:"mark",payload:{id:"expressionPicked",select:{items:[keys[0]]}}});
   assert.deepEqual(getMarkItems(session.getState().program,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key),[keys[0]]);
   session.dispatch({type:"clearSelection",target:"mark",payload:{id:"expressionPicked"}});
   assert.ok(getMarkItems(session.getState().program,{target:"mark"}).every(item=>item.geometry.every(g=>g.properties.fill!=="#ef4444"&&g.properties.stroke!=="#ef4444")));
   assert.deepEqual(phases,["commit","settled","commit","settled","commit","settled"]);
   assertGraphicIntegrity(session.getState().program,`${dataset}/${recipe}/session`);
   assertSvgIntegrity(renderToSVG(deserializeProgram(serializeProgram(session.getState().program))),`${dataset}/${recipe}/session`);
   const child=ast.editMarkSelection({selection:"expressionPicked",items:[]});
   const linkedProgram=hconcat({programs:[{id:"source",program:child},{id:"target",program:child}]});
   const linked=createInteractionSession({program:linkedProgram,bindings:[{type:"linkSelection",id:"categories",resolve:"global",target:{childPath:["target"],id:"mark"},selection:"expressionPicked",sources:[{target:{childPath:["source"],id:"mark"},selection:"expressionPicked",projection:{type:"fields",sourceFields:["category"],targetFields:["category"]}}]}]});
   linked.dispatch({type:"select",target:{childPath:["source"],id:"mark"},payload:{id:"expressionPicked",select:{field:"category",op:"eq",value:max}}});
   const targetChild=linked.getState().program.children.target;
   const linkedActual=getMarkItems(targetChild,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
   assert.deepEqual(linkedActual,items.filter(item=>item.fields.category===max).map(item=>item.key));
   assert.equal(linked.getState().revision,1);assert.equal(linked.getState().linkedSelections[0].sources.length,1);
   linked.dispatch({type:"clearSelection",target:{childPath:["source"],id:"mark"},payload:{id:"expressionPicked"}});
   assert.equal(linked.getState().linkedSelections[0].keys.length,0);
   assertGraphicIntegrity(linked.getState().program,`${dataset}/${recipe}/linked`);
   assertSvgIntegrity(renderToSVG(linked.getState().program),`${dataset}/${recipe}/linked`);linked.destroy();
   session.destroy();
   assert.equal(serializeProgram(ast),astSaved);
   witnessed.add(`${dataset}/${recipe}`);
  } finally {releaseTidyTuesdaySourceCache(dataset);}
 });
}
test("logical selection modes have five pinned datasets and three different grain recipes",()=>assert.equal(witnessed.size,15));
