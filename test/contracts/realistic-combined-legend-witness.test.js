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
   const combined=seed.createLegend({channels:['shape','size'],combine:'size-shape',symbol:{layers:[{type:'line',opacity},{type:'point',opacity},{type:'swatch',opacity}]}})
    .editLegend({channel:'size',labels:{color:'#334155'}})
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
