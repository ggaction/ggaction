import assert from 'node:assert/strict';
import test from 'node:test';
import {chart}from'../../src/index.js';
import {serializeProgram,deserializeProgram}from'../../src/persistence.js';
import {realisticRecordView}from'../support/scenarios/realistic-data.js';

for(const dataset of ['tt-tour-de-france-winners','tt-london-marathon-winners','tt-penguins']){
 test(`combined legend lifecycle calls preserve actual rows from ${dataset}`,()=>{
  const view=realisticRecordView(dataset,{rowLimit:24});
  const domain=[...new Set(view.rows.map(row=>row.category))];
  assert.ok(domain.length>1);
  for(let repetition=0;repetition<5;repetition++)for(const opacity of [0,.7,1]){
   const seed=chart().createCanvas({width:4400,height:3200,margin:1000})
    .createData({values:view.rows}).createPointMark({id:'points'})
    .encodeX({field:'orderNumeric'}).encodeY({field:'value'})
    .encodeShape({field:'category',scale:{domain}})
    .encodeSize({field:'category',fieldType:'ordinal',scale:{domain,range:domain.map((_,i)=>25+4*i)}});
   const combined=seed.createLegend({channels:['shape','size'],combine:'size-shape',clipHeight:8,symbol:{layers:[{type:'line',opacity},{type:'point',opacity},{type:'swatch',opacity}]}})
    .editLegend({channel:'size',labels:{color:'#334155'}})
    .editLegendSymbols({channel:'shape',clipHeight:6})
    .editLegendBlock({target:'points',channel:'size',clipHeight:'auto'})
    .editLegend({channel:'shape',clipHeight:8})
    .editLegendLayout({channel:'shape',position:repetition%2?'top-right':'right'});
   const split=combined.editLegendLayout({channel:'shape',position:'inherit'}).editLegend({combine:'separate'});
   assert.ok(split.guideConfigs.legend.size);
   const restored=split.editLegend({combine:'size-shape'});
   assert.deepEqual(restored.semanticSpec.datasets,seed.semanticSpec.datasets);
   assert.deepEqual(deserializeProgram(serializeProgram(restored)).graphicSpec,restored.graphicSpec);
   assert.equal(restored.removeLegend({channels:['shape']}).guideConfigs.legend?.series,undefined);
  }
 });
}

for(const dataset of ['tt-tour-de-france-winners','tt-london-marathon-winners','tt-penguins']){
 test(`quantitative combined legend lifecycle preserves actual rows from ${dataset}`,()=>{
  const view=realisticRecordView(dataset,{rowLimit:24}),values=view.rows.map(row=>row.value);
  const domain=[Math.min(...values),Math.max(...values)];assert.ok(domain[1]>domain[0]);
  const middle=(domain[0]+domain[1])/2;
  for(let repetition=0;repetition<5;repetition++){
   const seed=chart().createCanvas({width:1800,height:1400,margin:400}).createData({values:view.rows})
    .createPointMark({id:'points'}).encodeX({field:'orderNumeric'}).encodeY({field:'value'})
    .encodeColor({field:'value',fieldType:'quantitative',scale:{domain,range:['black','white']}})
    .encodeSize({field:'value',scale:{domain,range:[0,900]}});
   const p=seed.createLegend({combine:'color-size',channels:['size','color'],values:[domain[0],middle,domain[1]],clipHeight:8,
     symbol:{stroke:'navy',strokeWidth:2,opacity:.7},border:{strokeDash:[2,2]}})
    .editLegendLabels({channel:'size',fontSize:13})
    .editLegendSymbols({channel:'color',symbol:{opacity:1},clipHeight:6})
    .editLegendBlock({target:'points',channel:'size',labelMap:[{value:middle,label:'middle'}],clipHeight:'auto'})
    .editLegendLayout({channel:'color',position:'top-right'})
    .editLegend({channel:'size',values:'auto',count:3});
   const split=p.editLegendLayout({channel:'size',position:'inherit'}).editLegend({combine:'separate'});
   assert.deepEqual(split.guideConfigs.legend.size.sampling,{mode:'auto',count:3});
   const restored=split.editLegend({combine:'color-size'});
   assert.deepEqual(restored.semanticSpec.datasets,seed.semanticSpec.datasets);
   assert.deepEqual(deserializeProgram(serializeProgram(restored)).graphicSpec,restored.graphicSpec);
   assert.equal(restored.removeLegend({channels:['color']}).guideConfigs.legend?.colorSize,undefined);
  }
 });
}
