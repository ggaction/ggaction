import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat,vconcat} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {unionConcreteGraphicBounds as bounds} from '../../../../src/grammar/schemas/graphicBounds.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const rows=Array.from({length:12},(_,i)=>({x:i+1,y:i*2+3,g:i%2?'A':'B'}));
function unit(channel='color',numeric=false){
 return chart().createCanvas({plot:{width:314,height:314},margin:200})
 .createData({id:'d',values:rows}).createScatterPlot({id:'p',x:'x',y:'y'})
 [`encode${channel[0].toUpperCase()+channel.slice(1)}`]({target:'p',field:numeric?'x':'g',fieldType:numeric?'quantitative':'nominal'})
 .createLegend({target:'p',channels:[channel]});
}
const measure=(p,suffix)=>bounds(p.graphicSpec,Object.keys(p.graphicSpec.objects).filter(id=>id.endsWith(suffix)));
function shifted(a,b,dx,dy){close(b.left-a.left,dx);close(b.top-a.top,dy);close(b.right-a.right,dx);close(b.bottom-a.bottom,dy);}
for(const [channel,numeric,prefix] of [['color',false,'colorLegend'],['color',true,'colorGradient'],['size',true,'sizeLegend'],['opacity',true,'opacityLegend']])
for(const position of ['right','left','top','bottom']) test(`${prefix}/${position}: item-only movement, partial updates, reset and rematerialization`,()=>{
 const p=unit(channel,numeric).editLegend({channel,position});
 const q=p.editLegend({channel,itemsOffset:{x:12,y:-7}});
 shifted(measure(p,prefix+'Title'),measure(q,prefix+'Title'),0,0);
 shifted(measure(p,prefix+'Labels'),measure(q,prefix+'Labels'),12,-7);
 const r=q.editLegend({channel,itemsOffset:{x:17}}).rematerializeLegend().rematerializeLegend();
 shifted(measure(p,prefix+'Labels'),measure(r,prefix+'Labels'),17,-7);
 assert.deepEqual(r.editLegend({channel,itemsOffset:'auto'}).graphicSpec,p.graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec,r.graphicSpec);
 const large=r.editCanvas({plot:{width:350,height:330}}).editLegend({channel,labels:{fontSize:14}});
 const normal=large.editLegend({channel,itemsOffset:'auto'});
 shifted(measure(normal,prefix+'Title'),measure(large,prefix+'Title'),0,0);
 shifted(measure(normal,prefix+'Labels'),measure(large,prefix+'Labels'),17,-7);
});
for(const position of ['right','top'])
for(const delta of [12,-32])
for(const type of ['shared facet','local facet','local concat','shared concat','nested concat']) test(`${type}/${position}/${delta}: preserve body movement across composed layout and serialization`,()=>{
 const base=unit().editLegend({position});
 const facet=type.includes('facet');
 const shared=type.includes('shared');
 let p=facet?base.facet({field:'g',columns:2,guides:{legend:shared?'shared':false}})
 :hconcat({programs:[{id:'a',program:base},{id:'b',program:base}],...(shared?{share:{color:true}}:{})});
 if(type==='nested concat')p=vconcat({programs:[{id:'nested',program:p},{id:'last',program:base}],share:{color:true}});
 const options={channel:'color',itemsOffset:{x:delta,y:6}};
 const edit=p=>facet&&!shared?p.editFacetSource({action:{method:'editLegend',options}})
 :p.editLegend({...options,...(facet?{}:{target:type==='nested concat'?[{childPath:['nested','a'],id:'p'},{childPath:['nested','b'],id:'p'},{childPath:['last'],id:'p'}]:[{childPath:['a'],id:'p'},{childPath:['b'],id:'p'}]})});
 const q=edit(p);
 shifted(measure(p,'colorLegendTitle'),measure(q,'colorLegendTitle'),0,0);
 shifted(measure(p,'colorLegendLabels'),measure(q,'colorLegendLabels'),delta,6);
 assert.deepEqual(edit(q).graphicSpec,q.graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
test('invalid edits leave input and retained body state unchanged',()=>{
 const p=unit(),saved=serializeProgram(p);
 for(const itemsOffset of [{},{z:3},{x:NaN},{y:Infinity},{x:'3'},{x:undefined},null,false,[],'bad'])
 assert.throws(()=>p.editLegend({channel:'color',itemsOffset,labels:{fontSize:18}}),/itemsOffset/);
 assert.equal(serializeProgram(p),saved);
 assert.throws(()=>p.editLegend({channel:'color',channels:['color'],itemsOffset:{x:2}}));
});
test('all-block and combined selections retain styles, offsets and hidden titles through scale and data edits',()=>{
 let p=unit().encodeSize({target:'p',field:'x'}).removeLegend({target:'p'}).createLegend({target:'p',channels:['color','size']});
 const original=serializeProgram(p);
 let q=p.editLegend({channel:'all',itemsOffset:{x:7,y:4}});
 for(const prefix of ['colorLegend','sizeLegend']){
   shifted(measure(p,prefix+'Title'),measure(q,prefix+'Title'),0,0);
   shifted(measure(p,prefix+'Labels'),measure(q,prefix+'Labels'),7,4);
 }
 q=q.editLegend({channel:'color',titleStyle:{visible:false}}).editColorScale({target:'p',palette:'set1'})
   .filterMarks({target:'p',field:'g',op:'oneOf',values:['A']}).createGuides();
 assert.deepEqual(q.guideConfigs.legend.color.itemsOffset,{x:7,y:4});
 q=deserializeProgram(serializeProgram(q)).editLegend({channel:'color',titleStyle:{visible:true}});
 const normal=q.editLegend({channel:'all',itemsOffset:'auto'});
 shifted(measure(normal,'colorLegendTitle'),measure(q,'colorLegendTitle'),0,0);
 shifted(measure(normal,'colorLegendLabels'),measure(q,'colorLegendLabels'),7,4);
 assert.equal(serializeProgram(p),original);
});
test('clipped symbols and their window move with labels, while borders enclose the shifted body and title',()=>{
 const p=unit('size',true).editLegend({channel:'size',clipHeight:10,border:{padding:6,color:'#777'}});
 const q=p.editLegend({channel:'size',itemsOffset:{x:-15,y:10}});
 shifted(measure(p,'sizeLegendSymbols'),measure(q,'sizeLegendSymbols'),-15,10);
 shifted(measure(p,'sizeLegendLabels'),measure(q,'sizeLegendLabels'),-15,10);
 shifted(measure(p,'sizeLegendTitle'),measure(q,'sizeLegendTitle'),0,0);
 const border=measure(q,'sizeLegendBackground'),body=bounds(q.graphicSpec,['sizeLegendSymbols','sizeLegendLabels','sizeLegendTitle']);
 assert.ok(border.left<=body.left&&border.right>=body.right&&border.top<=body.top&&border.bottom>=body.bottom);
 assert.deepEqual(q.rematerializeLegend().graphicSpec,q.graphicSpec);
 assert.deepEqual(q.editLegend({channel:'size',itemsOffset:'auto'}).graphicSpec,p.graphicSpec);
});
test('combined color-shape block and omitted title keep body identity on whole-legend movement',()=>{
 let p=unit().encodeShape({target:'p',field:'g',fieldType:'nominal'}).removeLegend({target:'p'}).createLegend({target:'p',channels:['color','shape']})
 .editLegend({channel:'shape',itemsOffset:{x:8,y:5},title:false});
 const moved=p.editLegend({channel:'color',alongOffset:10});
 shifted(measure(p,'seriesLegendLabels'),measure(moved,'seriesLegendLabels'),0,10);
 assert.deepEqual(moved.guideConfigs.legend.series.itemsOffset,{x:8,y:5});
 const restored=moved.editLegend({channel:'shape',title:'auto'});
 const normal=restored.editLegend({channel:'color',itemsOffset:'auto'});
 shifted(measure(normal,'seriesLegendTitle'),measure(restored,'seriesLegendTitle'),0,0);
 shifted(measure(normal,'seriesLegendLabels'),measure(restored,'seriesLegendLabels'),8,5);
});
test('faceting an already shifted legend and collecting facet legends applies the offset exactly once',()=>{
 const p=unit(), shiftedUnit=p.editLegend({channel:'color',itemsOffset:{x:10,y:6}});
 const facet=p=>p.facet({field:'g',columns:2,guides:{legend:'shared'}});
 const a=facet(p),b=facet(shiftedUnit);
 shifted(measure(a,'colorLegendTitle'),measure(b,'colorLegendTitle'),0,0);
 shifted(measure(a,'colorLegendLabels'),measure(b,'colorLegendLabels'),10,6);
 const joined=p=>hconcat({programs:[{id:'a',program:p},{id:'b',program:p}],share:{color:true}});
 const c=joined(a),d=joined(b);
 shifted(measure(c,'colorLegendTitle'),measure(d,'colorLegendTitle'),0,0);
 shifted(measure(c,'colorLegendLabels'),measure(d,'colorLegendLabels'),10,6);
 assert.deepEqual(deserializeProgram(serializeProgram(d)).graphicSpec,d.graphicSpec);
});
test('fitCanvas measures shifted body and restores its anchor after repeated nonlegend edits',()=>{
 const p=unit().editLegend({channel:'color',itemsOffset:{x:90,y:60}});
 const q=p.fitCanvas({padding:10,align:'center'}).createTitle({text:'Title'})
  .editXAxisTitle({text:'Horizontal'}).editColorScale({target:'p',palette:'set1'});
 const normal=q.editLegend({channel:'color',itemsOffset:'auto'});
 shifted(measure(normal,'colorLegendTitle'),measure(q,'colorLegendTitle'),0,0);
 shifted(measure(normal,'colorLegendLabels'),measure(q,'colorLegendLabels'),90,60);
 const canvas=q.graphicSpec.objects.canvas.properties,body=measure(q,'colorLegendLabels');
 assert.ok(body.right<=canvas.width&&body.bottom<=canvas.height);
});
