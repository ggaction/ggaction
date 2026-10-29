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
import { assertRegionInteraction } from "../support/scenarios/region-interaction.js";
const datasets=["tt-penguins","tt-london-marathon-winners","tt-astronauts","tt-us-births","tt-chocolate-ratings"];
const witnessed=new Set();
for (const dataset of datasets) for (const recipe of ["observations","categories","series"]) {
 test(`${dataset} ${recipe} logical selection preserves item grain through toggles and restore`,async()=>{
  try {
   const view=realisticRecordView(dataset,{rowLimit:24,groupLimit:4});
   const categories=[...new Set(view.rows.map(row=>row.category))];
   const rows=view.rows.map((row,index)=>({...row,order:index,categoryIndex:categories.indexOf(row.category)}));
   assert.ok(rows.length>=4);assert.ok(rows.every(row=>view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
   let p=chart().createCanvas({width:500,height:360,margin:45}).createData({id:"rows",values:rows,keyField:"key"});
   if(recipe==="observations") p=p.createScatterPlot({id:"mark",x:"order",y:"value",guides:false});
   else if(recipe==="categories") p=p.createBarPlot({id:"mark",x:"category",y:{field:"value",aggregate:"mean"},guides:false});
   else p=p.createLineMark({id:"mark"}).encodeX({field:"order"}).encodeY({field:"value"}).encodeGroup({field:"category",fieldType:"nominal"});
   const items=getMarkItems(p,{target:"mark"}),keys=items.map(item=>item.key);
   assert.ok(keys.length>=2);
   assertRegionInteraction(p, recipe, rows);
   const q=p.selectMarks({id:"picked",target:"mark",items:[keys[0]]}).highlightMarks({selection:"picked",color:"#ef4444",bringToFront:false});
   const saved=serializeProgram(q);
   const shape=items[0].geometry[0], properties=shape.properties;
   const probe=shape.type==='path'?properties.commands.find(command=>command.op==='M'):
    {x:properties.x+(shape.type==='rect'?properties.width/2:0),y:properties.y+(shape.type==='rect'?properties.height/2:0)};
   for(const mode of ['replace','toggle'])for(const onMiss of ['clear','ignore']) {
    const selectedProgram=p.selectMarks({id:'automatic',target:'mark',items:[]}).highlightMarks({selection:'automatic',color:'#ef4444',bringToFront:false,dimOthers:false});
    const automatic=createInteractionSession({program:selectedProgram,bindings:[{type:'select',target:'mark',selection:'automatic',mode,onMiss,slop:0}]}),listeners=new Map();
    const captures=new Set(),host={getBoundingClientRect:()=>({left:0,top:0,width:500,height:360}),addEventListener:(type,listener)=>listeners.set(type,listener),removeEventListener:type=>listeners.delete(type),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id)};
    automatic.mount(host);automatic.dispatch({type:'inspect',point:{x:probe.x,y:probe.y},slop:0});
    const expected=automatic.getState().hit.candidates.find(candidate=>candidate.ownerId==='mark').itemKey;
    const pointer={clientX:probe.x,clientY:probe.y,pointerId:1,pointerType:'mouse',button:0};
    const click=(x=probe.x,y=probe.y)=>{const event={...pointer,clientX:x,clientY:y};listeners.get('pointerdown')(event);listeners.get('pointerup')(event);listeners.get('click')({...event,detail:1});};
    const beforeCapture=automatic.getState().program;listeners.get('pointerdown')(pointer);listeners.get('pointermove')({...pointer,clientX:probe.x+10});listeners.get('pointerup')(pointer);listeners.get('click')({...pointer,detail:1});assert.equal(automatic.getState().program,beforeCapture);assert.equal(captures.size,0);
    const active=()=>getMarkItems(automatic.getState().program,{target:'mark'}).filter(item=>item.geometry.some(g=>g.properties.fill==='#ef4444'||g.properties.stroke==='#ef4444')).map(item=>item.key);
    click();assert.deepEqual(active(),[expected]);click();assert.deepEqual(active(),mode==='toggle'?[]:[expected]);
    if(mode==='toggle')click();click(5000,5000);assert.deepEqual(active(),onMiss==='clear'?[]:[expected]);
    automatic.destroy();assert.equal(listeners.size,0);assert.equal(captures.size,0);
   }
   for(const selectionPolicy of ['keep-hidden','drop']) {
    const lifecycle=createInteractionSession({program:q,selectionPolicy,bindings:[]}),events=[];lifecycle.subscribe(event=>events.push(event));
    lifecycle.updateProgram(q.filterMarks({target:'mark',field:'category',op:'neq',value:items[0].fields.category}));
    assert.deepEqual(events[0].selectionChanges[0][selectionPolicy==='drop'?'droppedKeys':'hiddenKeys'],[keys[0]]);
    lifecycle.updateProgram(deserializeProgram(serializeProgram(lifecycle.getState().program)).removeMarkFilter({target:'mark'}));
    const actual=getMarkItems(lifecycle.getState().program,{target:'mark'}).filter(item=>item.geometry.some(g=>g.properties.fill==='#ef4444'||g.properties.stroke==='#ef4444')).map(item=>item.key);
    assert.deepEqual(actual,selectionPolicy==='drop'?[]:[keys[0]]);lifecycle.destroy();
   }
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
   const preparedSource=deserializeProgram(astSaved),assetCalls=[],assetReleased=[];
   const preparedSession=createInteractionSession({program:preparedSource,bindings:[],async assetResolver(request){
    assetCalls.push(request);return{dispose(){assetReleased.push(request.transactionId)}};
   }});
   await preparedSession.whenSettled();
   preparedSession.dispatch({type:"setParameter",target:"categoryChoice",payload:{value:max},transactionId:"prepared-choice"});
   assert.equal(preparedSession.getState().program,preparedSource);assert.equal(preparedSession.getState().history.undoCount,0);
   assert.equal((await preparedSession.whenSettled()).status,"settled");
   const preparedActual=getMarkItems(preparedSession.getState().program,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
   assert.deepEqual(preparedActual,items.filter(item=>item.fields.category===max).map(item=>item.key));
   assert.ok(assetCalls[1].resourceRevisionVector.some(ref=>ref.kind==='data'&&ref.logicalId===preparedSource.semanticSpec.datasets[0].logicalId));
   assert.ok(assetCalls[1].resourceRevisionVector.some(ref=>ref.kind==='parameter'&&ref.id==='categoryChoice'&&ref.revision===1));
   preparedSession.dispatch({type:"undo"});await preparedSession.whenSettled();assert.equal(preparedSession.getState().program,preparedSource);
   preparedSession.updateProgram(async({program,signal,resourceRevisionVector})=>{
    assert.equal(signal.aborted,false);assert.ok(resourceRevisionVector.some(ref=>ref.kind==='parameter'&&ref.id==='categoryChoice'&&ref.revision===0));
    return program.editParameter({target:"categoryChoice",value:max});
   },{history:"record",transactionId:"prepared-native-update"});
   assert.equal(preparedSession.getState().program,preparedSource);await preparedSession.whenSettled();
   assert.deepEqual(getMarkItems(preparedSession.getState().program,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key),items.filter(item=>item.fields.category===max).map(item=>item.key));
   preparedSession.dispatch({type:"undo"});await preparedSession.whenSettled();assert.equal(preparedSession.getState().program,preparedSource);
   let observer,disconnects=0;
   const host={ownerDocument:{defaultView:{ResizeObserver:class{constructor(callback){this.callback=callback;observer=this}observe(element){this.element=element}disconnect(){disconnects++}}}},
    addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:600,height:400}}};
   const unsubscribeResize=preparedSession.subscribe(event=>{if(event.type==='resize'&&event.size.width>0)preparedSession.updateProgram(({program})=>program.editCanvas({width:event.size.width}),{history:'record'});});
   const unmountResize=preparedSession.mount(host,{observeResize:true});observer.callback([{target:host,contentRect:{width:600,height:400}}]);await preparedSession.whenSettled();
   assert.deepEqual(getMarkItems(preparedSession.getState().program,{target:"mark"}).map(item=>item.key),items.map(item=>item.key));
   assert.equal(preparedSession.getState().program.graphicSpec.objects.canvas.properties.width,600);
   preparedSession.dispatch({type:'undo'});await preparedSession.whenSettled();assert.equal(preparedSession.getState().program,preparedSource);
   unmountResize();unsubscribeResize();assert.equal(disconnects,1);observer.callback([{target:host,contentRect:{width:700,height:400}}]);
   preparedSession.destroy();assert.equal(assetReleased.length,7);assert.ok(assetCalls.every(request=>request.signal.aborted));
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
   const nearestField=recipe==="observations"?"order":"categoryIndex";
   const nearestValue=items[0].fields[nearestField]+0.25;
   const nearestExpected=[...items].sort((a,b)=>Math.abs(a.fields[nearestField]-nearestValue)-Math.abs(b.fields[nearestField]-nearestValue)||(a.key<b.key?-1:a.key>b.key?1:0))[0].key;
   for(const metric of ["euclidean","manhattan"]) {
    session.dispatch({type:"select",target:"mark",payload:{id:"expressionPicked",nearest:{space:"data",fields:[nearestField],values:[nearestValue],metric,maxDistance:1}}});
    const actual=getMarkItems(session.getState().program,{target:"mark"}).filter(item=>item.geometry.some(g=>g.properties.fill==="#ef4444"||g.properties.stroke==="#ef4444")).map(item=>item.key);
    assert.deepEqual(actual,[nearestExpected]);
   }
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
