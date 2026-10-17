import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {resolveConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
const seed=()=>chart().createCanvas({width:1000,height:800,margin:250}).createData({values:[{x:1,y:2,v:0,g:'A'},{x:2,y:3,v:10,g:'B'}]}).createScatterPlot({x:'x',y:'y',guides:false});
const size=()=>seed().encodeSize({field:'v',scale:{domain:[0,10],range:[5000,6000]}}).createLegend({channels:['size'],values:[0,10]});
function windows(p){
 const objects=p.graphicSpec.objects;
 return Object.entries(objects).filter(([,object])=>object.type==='canvas'&&object.children?.length>0&&
  object.children.every(id=>objects[id]?.properties!==undefined&&objects[id].children===undefined));
}
test('size sample window preserves physical area, typed sample identity and reset',()=>{
 const base=size(), before=JSON.stringify(base), clipped=base.editLegendSymbols({clipHeight:30});
 assert.equal(windows(clipped).length,2);
 for(const [index,[id,window]] of windows(clipped).entries()){
  assert.equal(window.type,'canvas');assert.equal(window.properties.height,30);
  const point=clipped.graphicSpec.objects[window.children[0]], radius=Math.sqrt([5000,6000][index]/Math.PI);
  assert.equal(point.properties.radius,radius);assert.equal(point.properties.y,15);
  const b=resolveConcreteGraphicBounds(clipped.graphicSpec,id);assert.equal(b.bottom-b.top,30);
  assert.ok(Math.abs(window.properties.width-radius*2)<1e-10);
 }
 assert.deepEqual(clipped.semanticSpec,base.semanticSpec);
 assert.deepEqual(clipped.editLegendSymbols({clipHeight:'auto'}).graphicSpec,base.graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(clipped)).graphicSpec,clipped.graphicSpec);
 assert.equal(JSON.stringify(base),before);
 assert.deepEqual(clipped.editCanvas({width:1100}).editCanvas({width:1000}).graphicSpec,clipped.graphicSpec);
 assert.deepEqual(clipped.rematerializeLegend().graphicSpec,clipped.graphicSpec);
 for(const [id]of windows(clipped))assert.equal(clipped.removeLegend().graphicSpec.objects[id],undefined);
});
test('point-bearing composite clips every layer once and retains zero opacity geometry',()=>{
 const base=seed().encodeShape({field:'g'}).createLegend({channels:['shape'],symbol:{layers:[{type:'line',length:70,lineWidth:6},{type:'point',size:40,opacity:0}]}});
 const p=base.editLegendBlock({target:base.guideConfigs.legend.series.target,channel:'shape',clipHeight:24});
 assert.equal(windows(p).length,2);
 for(const [id,w]of windows(p)){
  assert.equal(w.children.length,2);assert.equal(w.properties.height,24);
  assert.equal(p.graphicSpec.objects[w.children[1]].properties.opacity,0);
  assert.equal(p.graphicSpec.objects[w.children[1]].properties.blend,'normal');
  const b=resolveConcreteGraphicBounds(p.graphicSpec,id);assert.equal(b.bottom-b.top,24);
 }
 assert.deepEqual(p.editLegendBlock({target:base.guideConfigs.legend.series.target,channel:'shape',clipHeight:'auto'}).graphicSpec,base.graphicSpec);
 assert.deepEqual(p.rematerializeLegendSymbols().graphicSpec,p.graphicSpec);
});
test('sampled color, opacity and small glyphs retain unclipped dimensions',()=>{
 for(const family of ['color','opacity']){
  const seedProgram=family==='color'?seed().encodeColor({field:'v',fieldType:'quantitative'}):seed().encodeOpacity({field:'v'});
  const p=seedProgram.createLegend({channels:[family],...(family==='color'?{representation:'symbols'}:{}),values:[0,10],symbol:{radius:20,stroke:'black',strokeWidth:4},clipHeight:10});
  for(const [id,w]of windows(p)){const b=resolveConcreteGraphicBounds(p.graphicSpec,id);assert.equal(b.bottom-b.top,10);assert.equal(b.right-b.left,44);}
 }
 const p=seed().encodeShape({field:'g'}).createLegend({clipHeight:100});
 for(const [id,w]of windows(p)){const glyph=p.graphicSpec.objects[w.children[0]];const b=resolveConcreteGraphicBounds(p.graphicSpec,id);assert.ok(b.bottom-b.top<100);assert.ok((glyph.properties.radius??glyph.properties.width/2)<50);}
});
test('clipHeight rejects invalid values and ineligible recipes atomically',()=>{
 const base=size(),before=JSON.stringify(base);
 for(const clipHeight of [0,-1,NaN,Infinity,null,'30'])assert.throws(()=>base.editLegendSymbols({clipHeight}),/clipHeight/);
 for(const clipHeight of ['auto',0])assert.throws(()=>seed().encodeShape({field:'g'}).createLegend({clipHeight}),/clipHeight/);
 assert.throws(()=>seed().encodeColor({field:'v',fieldType:'quantitative'}).createLegend({clipHeight:10}),/point-bearing/);
 assert.throws(()=>seed().encodeShape({field:'g'}).createLegend({symbol:{layers:[{type:'line'}]},clipHeight:10}),/point-bearing/);
 const config=structuredClone(base.materializationConfigs);config.guides.legend.size.clipHeight=-1;
 assert.throws(()=>serializeProgram(base._clone({materializationConfigs:config})),/clipHeight/);
 assert.equal(JSON.stringify(base),before);
});
test('asymmetric paths clip around the glyph anchor rather than their bounding box center',()=>{
 const base=seed().encodeShape({field:'g',scale:{domain:['A','B'],range:['triangle-up','triangle-down']}}).createLegend({channels:['shape'],symbol:{layers:[{type:'point',size:30}]}});
 const p=base.editLegendSymbols({clipHeight:20});
 const radius=Math.sqrt(Math.PI*900/(3*Math.sqrt(3)/4));
 for(const [index,[,w]]of windows(p).entries()){
  const old=base.graphicSpec.objects.seriesLegendSymbolPoints.items[index].properties.commands;

  const now=p.graphicSpec.objects[w.children[0]].properties.commands;
  assert.equal(now.length,old.length);
  assert.ok(Math.abs(now[0].y-(10+(index===0?-radius:radius)))<1e-10);
  for(let i=0;i<old.length;i++)if(old[i].op!=='Z')assert.ok(Math.abs((now[i].y-now[0].y)-(old[i].y-old[0].y))<1e-10);
 }
});
test('clipped samples survive scale, data, highlight and independent local-block replay',()=>{
 const base=seed().encodeShape({field:'g'}).encodeSize({field:'v',scale:{domain:[0,10],range:[100,5000]}})
  .createLegend({channels:['shape'],clipHeight:10}).createLegend({channels:['size'],values:[0,10],clipHeight:12});
 const p=base.editLegendBlock({target:'scatterPlot',channel:'shape',position:'top-left'})
  .editScale({id:'size',range:[400,10000]});
 assert.equal(p.guideConfigs.legend.series.clipHeight,10);assert.equal(p.guideConfigs.legend.size.clipHeight,12);
 const sizeWindow=p.graphicSpec.objects[p.graphicSpec.objects.sizeLegendSymbols.children[1]];
 assert.equal(p.graphicSpec.objects[sizeWindow.children[0]].properties.radius,Math.sqrt(10000/Math.PI));
 const revised=p.reviseData({source:'data',id:'revised',values:[{x:1,y:2,v:1,g:'A'},{x:3,y:4,v:9,g:'B'}]});
 assert.equal(windows(revised).length,4);assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec,revised.graphicSpec);
 const highlighted=revised.highlightMarks({target:'scatterPlot',select:{field:'g',op:'eq',value:'B'},color:'red'});
 assert.equal(windows(highlighted).length,4);assert.deepEqual(highlighted.rematerializeLegend().graphicSpec,highlighted.graphicSpec);
 assert.equal(highlighted.removeLegend({channels:['shape']}).guideConfigs.legend.size.clipHeight,12);
});
test('a reset and recipe or representation replacement validate the final state together',()=>{
 const base=seed().encodeShape({field:'g'}).createLegend({channels:['shape'],clipHeight:10});
 const lines=base.editLegend({clipHeight:'auto',symbol:{layers:[{type:'line'}]}});
 assert.equal(lines.guideConfigs.legend.series.clipHeight,undefined);assert.equal(windows(lines).length,0);
 const color=seed().encodeColor({field:'v',fieldType:'quantitative'}).createLegend({channels:['color'],representation:'symbols',clipHeight:10});
 const ramp=color.editLegend({representation:'gradient',clipHeight:'auto'});
 assert.equal(ramp.guideConfigs.legend.gradient.clipHeight,undefined);
 assert.equal(ramp.guideConfigs.legend.gradient.representation,undefined);
});
