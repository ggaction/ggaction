import assert from 'node:assert/strict';
import test from 'node:test';
import {chart}from'../../../../src/index.js';
import {serializeProgram,deserializeProgram}from'../../../../src/persistence.js';
const seed=()=>chart().createCanvas({width:1000,height:800,margin:250}).createData({values:[{g:'A',x:1},{g:'B',x:2}]}).createPointMark({id:'p'}).encodeShape({field:'g',scale:{range:['circle','square']}});
test('explicit recipe opacity owns only its layer and reset restores omitted graphics',()=>{
 const omitted=seed().createLegend({channels:['shape']}),before=JSON.stringify(omitted);
 for(const opacity of [0,.7,1]){
  const p=seed().createLegend({channels:['shape'],symbol:{layers:[{type:'line',opacity},{type:'point',opacity}]}});
  for(const item of p.graphicSpec.objects.seriesLegendSymbolPoints.items){assert.equal(item.properties.opacity,opacity);assert.equal(item.properties.blend,'normal');}
  for(const item of p.graphicSpec.objects.seriesLegendSymbolLines.items){assert.equal(item.properties.opacity,opacity);assert.equal(item.properties.blend,undefined);}
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  assert.deepEqual(p.editLegendSymbols({symbol:'auto'}).graphicSpec,omitted.graphicSpec);
  assert.deepEqual(p.editCanvas({width:1100}).editCanvas({width:1000}).graphicSpec,p.graphicSpec);
 }
 for(const opacity of [-.01,1.01,NaN,Infinity,'0.7',null])assert.throws(()=>omitted.editLegendSymbols({symbol:{layers:[{type:'point',opacity}]}}),/opacity/);
 assert.equal(JSON.stringify(omitted),before);
 const cfg=structuredClone(omitted.materializationConfigs);cfg.guides.legend.series.symbol.layers[0].opacity=2;
 assert.throws(()=>serializeProgram(omitted._clone({materializationConfigs:cfg})),/opacity/);
});
test('swatch opacity is explicit and never transfers to labels, title or frame',()=>{
 const p=chart().createCanvas({width:900,height:700,margin:230}).createData({values:[{x:1,y:2,g:'A'}]})
  .createScatterPlot({x:'x',y:'y',color:'g',guides:false}).createLegend({channels:['color'],symbol:{layers:[{type:'swatch',opacity:.7}]},border:{background:'white'}});
 assert.equal(p.graphicSpec.objects.colorLegendSymbols.items[0].properties.blend,'normal');
 assert.equal(p.graphicSpec.objects.colorLegendSymbols.items[0].properties.opacity,.7);
 for(const id of ['colorLegendLabels','colorLegendTitle','colorLegendBackground']){
  const o=p.graphicSpec.objects[id];for(const item of o.items??[o])assert.equal(item.properties.opacity,undefined);
 }
});

test('legacy block opacity does not opt into the new recipe paint path',()=>{
 const p=seed().createLegend({channels:['shape']}).editLegendBlock({target:'p',channel:'shape',symbol:{opacity:.7}});
 for(const item of p.graphicSpec.objects.seriesLegendSymbolPoints.items){assert.equal(item.properties.opacity,.7);assert.equal(item.properties.blend,undefined);}
});

test('authored opacity retains independent caller input and paired physical areas',()=>{
 const symbol={layers:[{type:'point',opacity:.7}]},base=seed().encodeSize({field:'g',fieldType:'ordinal',scale:{domain:['A','B'],range:[25,100]}});
 const p=base.createLegend({combine:'size-shape',symbol});symbol.layers[0].opacity=.2;
 assert.equal(p.guideConfigs.legend.series.symbol.layers[0].opacity,.7);
 assert.equal(base.guideConfigs.legend,undefined);
 const [circle,square]=p.graphicSpec.objects.seriesLegendSymbolPoints.items;
 assert.equal(circle.properties.radius,Math.sqrt(25/Math.PI));assert.equal(square.properties.width,10);
 assert.equal(square.properties.blend,'normal');
 const q=p.editScale({id:'size',range:[36,225]});
 assert.equal(q.graphicSpec.objects.seriesLegendSymbolPoints.items[0].properties.radius,Math.sqrt(36/Math.PI));
 assert.equal(q.graphicSpec.objects.seriesLegendSymbolPoints.items[1].properties.width,15);
 assert.equal(q.graphicSpec.objects.seriesLegendSymbolPoints.items[1].properties.opacity,.7);
});
