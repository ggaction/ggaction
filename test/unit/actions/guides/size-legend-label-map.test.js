import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';

function base(position='right'){
 return chart().createCanvas({width:900,height:700,margin:200})
  .createData({id:'rows',values:[{x:0,y:0,v:0,g:'A'},{x:1,y:1,v:10,g:'B'}]})
  .createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'})
  .encodeSize({field:'v',scale:{domain:[0,10],range:[0,100*Math.PI]}})
  .createLegend({channels:['size'],position,values:[0,5,10],title:false});
}
const labels=p=>p.graphicSpec.objects.sizeLegendLabels.items.map(i=>i.properties.text);
const radii=p=>p.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.properties.radius);

test('numeric maps change text only and retain every sample slot on each edge',()=>{
 for(const position of ['right','left','top','bottom']){
  const before=base(position),snapshot=JSON.stringify(before),
   map=Object.freeze([Object.freeze({value:0,label:'zero'}),Object.freeze({value:5,label:''}),Object.freeze({value:7,label:'inactive'})]);
  const p=before.editLegendBlock({target:'points',channel:'size',labelMap:map});
  assert.deepEqual(labels(p),['zero','10']);assert.deepEqual(radii(p),radii(before));
  assert.deepEqual(p.graphicSpec.objects.points,before.graphicSpec.objects.points);
  assert.deepEqual(p.semanticSpec,before.semanticSpec);assert.deepEqual(p.resolvedScales,before.resolvedScales);
  assert.deepEqual(p.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.id),before.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.id));
  assert.equal(JSON.stringify(before),snapshot);assert.deepEqual(map[1],{value:5,label:''});
  assert.equal(p.graphicSpec.objects.sizeLegendLabels.items[1].properties.y-p.graphicSpec.objects.sizeLegendSymbols.items[2].properties.y,
    before.graphicSpec.objects.sizeLegendLabels.items[2].properties.y-before.graphicSpec.objects.sizeLegendSymbols.items[2].properties.y);
 }
});

test('maps persist across sampling/style/Canvas replay and reset without replacing raw values',()=>{
 const before=base(),p=before.editLegendBlock({target:'points',channel:'size',labelMap:[{value:5,label:'middle'}]});
 const restored=deserializeProgram(serializeProgram(p));assert.deepEqual(restored.graphicSpec,p.graphicSpec);
 assert.deepEqual(labels(restored.editCanvas({width:940})),['0','middle','10']);
 const changed=p.editLegend({channel:'size',values:[0,2,10]}).editLegendLabels({channel:'size',fontSize:10});
 assert.deepEqual(labels(changed),['0','2','10']);assert.deepEqual(labels(changed.editLegend({channel:'size',values:[0,5,10]})),['0','middle','10']);
 const empty=p.editLegendBlock({target:'points',channel:'size',labelMap:[]});
 assert.deepEqual(labels(empty),labels(before));assert.deepEqual(empty.graphicSpec,before.graphicSpec);assert.deepEqual(empty.guideConfigs.legend.size.blockOverrides['["size"]'].labelMap,[]);
 assert.equal(p.editLegendBlock({target:'points',channel:'size',labelMap:'auto'}).guideConfigs.legend.size.blockOverrides,undefined);
 const all=before.editLegendBlock({target:'points',channel:'size',labelMap:[{value:0,label:''},{value:5,label:''},{value:10,label:''}]});
 assert.equal(all.graphicSpec.objects.sizeLegendLabels.items.length,0);assert.deepEqual(radii(all),radii(before));
 assert.deepEqual(deserializeProgram(serializeProgram(all)).graphicSpec,all.graphicSpec);
});

test('maps reject invalid numeric keys, duplicates, payload and unsupported families atomically',()=>{
 const p=base(),snapshot=JSON.stringify(p);
 for(const labelMap of [[{value:'5',label:'x'}],[{value:null,label:'x'}],[{value:Infinity,label:'x'}],
  [{value:NaN,label:'x'}],[{value:0,label:'a'},{value:-0,label:'b'}],[{value:5,label:1}],[{value:5,label:'x',extra:1}]]){
  assert.throws(()=>p.editLegendBlock({target:'points',channel:'size',labelMap}));assert.equal(JSON.stringify(p),snapshot);
 }
 const opacity=p.removeLegend().encodeOpacity({field:'v'}).createLegend({channels:['opacity']});
 assert.throws(()=>opacity.editLegendBlock({target:'points',channel:'opacity',labelMap:[]}),/categorical or continuous size/);
 const discrete=p.removeLegend().encodeSize({field:'v',fieldType:'ordinal',scale:{id:'ordinalSize',type:'ordinal',domain:[0,10],range:[10,20]}}).createLegend({channels:['size']});
 assert.deepEqual(labels(discrete.editLegendBlock({target:'points',channel:'size',labelMap:[{value:0,label:'zero category'}]})), ['zero category','10']);
 const invalid=structuredClone(p.materializationConfigs);invalid.guides.legend.size.blockOverrides={'["size"]':{labelMap:[{value:'5',label:'bad'}]}};
 assert.throws(()=>serializeProgram(p._clone({materializationConfigs:invalid})),/finite numbers/);
});


test('numeric maps survive theme and shared facet legend replay',()=>{
 const p=base().editLegendBlock({target:'points',channel:'size',labelMap:[{value:5,label:'middle'}]});
 assert.deepEqual(labels(p.applyTheme({theme:'dark'})),['0','middle','10']);
 const facets=p.facet({field:'g',guides:{legend:'shared'}});
 const restored=deserializeProgram(serializeProgram(facets));
 assert.deepEqual(restored.graphicSpec,facets.graphicSpec);
 assert.ok(JSON.stringify(facets.graphicSpec).includes('middle'));
});
