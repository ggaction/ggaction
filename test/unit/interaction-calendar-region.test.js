import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../src/index.js';
import { createInteractionSession } from '../../src/interaction.js';
import { getMarkItems } from '../../src/inspection.js';
import { serializeProgram, deserializeProgram } from '../../src/persistence.js';
const rows=[{id:'a',day:'2024-02-28',value:2},{id:'b',day:'2024-02-29',value:3},{id:'c',day:'2024-02-29',value:4}];
const base=()=>chart().createCanvas({width:600,height:240,margin:20}).createData({id:'days',keyField:'id',values:rows})
 .createCalendarLayout({date:'day',value:'value',start:'2024-02-28',end:'2024-02-29',timeZone:'UTC',weekStartsOn:1,aggregate:'sum',missing:'omit'})
 .createCalendarPlot({color:false}).applyTheme({theme:'dark'})
 .selectMarks({id:'picked',target:'calendar',items:[]}).highlightMarks({selection:'picked',fill:'red',dimOthers:false,bringToFront:false});
function surface(){const listeners=new Map(),frames=new Map(),captured=new Set();let id=0;return{
 getBoundingClientRect:()=>({left:0,top:0,width:600,height:240}),addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),
 setPointerCapture:i=>captured.add(i),releasePointerCapture:i=>captured.delete(i),hasPointerCapture:i=>captured.has(i),
 requestAnimationFrame:f=>(frames.set(++id,f),id),cancelAnimationFrame:i=>frames.delete(i),
 fire:(t,p)=>listeners.get(t)({clientX:p.x,clientY:p.y,pointerId:1,pointerType:'mouse'}),
 flush(){const pending=[...frames.values()];frames.clear();pending.forEach(f=>f());},count:()=>listeners.size+frames.size+captured.size};}
const items=p=>getMarkItems(p,{target:'calendar'});
const selected=p=>items(p).filter(i=>i.properties.fill==='red');
function lasso(session,host,cell,dx=0){
 const {x,y,width,height}=cell.geometry[0].properties;
 const polygon=[{x:x+dx+.1,y:y+.1},{x:x+dx+width-.1,y:y+.1},{x:x+dx+width-.1,y:y+height-.1},{x:x+dx+.1,y:y+height-.1}];
 host.fire('pointerdown',polygon[0]);for(const point of polygon.slice(1))host.fire('pointermove',point);host.flush();
 const preview=session.getState().previewProgram;host.fire('pointerup',polygon[0]);return preview;
}
test('lasso selects one aggregate Calendar day and preserves rows, theme, restore and revision lifecycle',()=>{
 const p=base(),saved=serializeProgram(p),cell=items(p).at(-1),decorations=p.graphicSpec.objects.calendar.items.filter(i=>i.identity.role!=='body');
 const session=createInteractionSession({program:p,selectionPolicy:'drop',bindings:[{type:'lasso',target:'calendar',selection:'picked'}]}),host=surface();session.mount(host);
 const preview=lasso(session,host,cell),next=session.getState().program;
 for(const candidate of [preview,next,deserializeProgram(serializeProgram(next))]){
  const actual=selected(candidate);assert.equal(actual.length,1);assert.equal(actual[0].fields.date,'2024-02-29');assert.equal(actual[0].fields.value,7);assert.equal(actual[0].rows.length,2);
  assert.deepEqual(candidate.graphicSpec.objects.calendar.items.filter(i=>i.identity.role!=='body'),decorations);
 }
 const polygon=next.semanticSpec.resources.find(r=>r.id==='picked').options.screenPolygon;
 const revised=deserializeProgram(serializeProgram(next)).editCanvas({width:700}).reviseData({source:'days',id:'next',values:rows.map(r=>({...r,value:r.value+1}))});session.updateProgram(revised);
 assert.equal(selected(session.getState().program)[0].key,cell.key);assert.equal(selected(session.getState().program)[0].fields.value,9);
 assert.deepEqual(session.getState().program.semanticSpec.resources.find(r=>r.id==='picked').options.screenPolygon,polygon);
 const events=[];session.subscribe(e=>events.push(e));session.updateProgram(revised.reviseData({source:'next',id:'reduced',values:[rows[0]]}));
 assert.deepEqual(events.at(-1).selectionChanges[0].droppedKeys,[cell.key]);assert.deepEqual(selected(session.getState().program),[]);
 assert.equal(serializeProgram(p),saved);session.destroy();assert.equal(host.count(),0);
 assert.throws(()=>createInteractionSession({program:p,bindings:[{type:'brush',target:'calendar',selection:'picked'}]}),/explicit resolved position scale/);
});
test('scoped Calendar lasso retains sibling identity and exact composed day keys',()=>{
 const child=base(),p=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]}),host=surface();
 const session=createInteractionSession({program:p,bindings:[{type:'lasso',target:{childPath:['right'],id:'calendar'},selection:'picked'}]});session.mount(host);
 const cell=items(child).at(-1),scene=session.getState().scene;
 const body=scene.nodes.find(n=>n.type==='rect'&&n.properties.x===cell.geometry[0].properties.x&&n.properties.y===cell.geometry[0].properties.y&&n.offset[0]>0);
 assert.ok(body);const preview=lasso(session,host,cell,body.offset[0]);assert.equal(preview.children.left,child);
 const next=session.getState().program;assert.equal(next.children.left,child);assert.equal(selected(next.children.right)[0].key,cell.key);
 assert.equal(session.getState().revision,1);assert.equal(selected(deserializeProgram(serializeProgram(next)).children.right)[0].fields.date,'2024-02-29');session.destroy();assert.equal(host.count(),0);
});
