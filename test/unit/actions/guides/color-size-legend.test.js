import {planFacadeLegend}from'../../../../src/actions/guides/facadeLegend.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
function source(){return chart().createCanvas({width:1000,height:800,margin:250})
 .createData({values:[{x:0,y:0,v:0,w:0},{x:1,y:1,v:10,w:10}]})
 .createPointMark({id:'p'}).encodeX({field:'x'}).encodeY({field:'y'})
 .encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['black','white']}})
 .encodeSize({field:'v',scale:{domain:[0,10],range:[Math.PI,9*Math.PI]}});}
const samples=p=>p.graphicSpec.objects.colorSizeLegendSymbols.items;
test('color-size has one typed sample list mapped through both exact public scales',()=>{
 const seed=source(),p=seed.createLegend({combine:'color-size',values:[0,5,10]}),items=samples(p);
 assert.deepEqual(Object.keys(p.guideConfigs.legend),['colorSize']);
 assert.deepEqual(p.semanticSpec.datasets,seed.semanticSpec.datasets);
 assert.deepEqual(items.map(i=>i.properties.radius),[1,Math.sqrt(5),3]);
 assert.deepEqual(items.map(i=>i.properties.fill),['#000000','#808080','#ffffff']);
 assert.deepEqual(p.graphicSpec.objects.colorSizeLegendLabels.items.map(i=>i.properties.text),['0','5','10']);
 assert.deepEqual(p.rematerializeLegend().graphicSpec,p.graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 assert.deepEqual(p.editCanvas({width:1100}).editCanvas({width:1000}).graphicSpec,p.graphicSpec);
 const revised=p.editSizeScale({range:[0,100]});assert.equal(samples(revised)[0].properties.radius,0);assert.equal(samples(revised)[2].properties.radius,Math.sqrt(100/Math.PI));
 assert.equal(samples(p)[0].properties.radius,1);
});
test('whole, focused and block aliases preserve one owner and immutable styles',()=>{
 const p=source().createLegend({combine:'color-size',values:[0,5,10],title:'Both'});
 const a=p.editLegendLabels({channel:'size',color:'red'}),b=p.editLegendLabels({channel:'color',color:'red'});assert.deepEqual(a.graphicSpec,b.graphicSpec);
 const c=a.editLegend({title:false,border:{strokeDash:[2,2]},symbol:{stroke:'blue',strokeWidth:2,opacity:.7}});
 assert.equal(c.graphicSpec.objects.colorSizeLegendTitle,undefined);assert.equal(samples(c)[1].properties.opacity,.7);
 const d=c.editLegend({title:'auto'});assert.equal(d.graphicSpec.objects.colorSizeLegendTitle.properties.text,'v');
 const mapped=d.editLegendBlock({target:'p',channel:'color',labelMap:[{value:5,label:''}],values:[0,5,10]});
 assert.equal(mapped.graphicSpec.objects.colorSizeLegendLabels.items.length,2);assert.equal(samples(mapped).length,3);
 assert.deepEqual(deserializeProgram(serializeProgram(mapped)).graphicSpec,mapped.graphicSpec);
 assert.equal(p.guideConfigs.legend.colorSize.labels.color,'#334155');
 assert.equal(p.removeLegend({channels:['size']}).guideConfigs.legend?.colorSize,undefined);
 assert.equal(p.removeLegend({channels:['color']}).semanticSpec.guides.legend?.colorSize,undefined);
});
test('split and recombine use compatible shared styles and fresh combined defaults',()=>{
 const p=source().createLegend({combine:'color-size',values:[0,5,10],labels:{fontSize:17},title:'Both'});
 const split=p.editLegend({combine:'separate'});
 assert.deepEqual(Object.keys(split.guideConfigs.legend).sort(),['gradient','size']);
 for(const kind of ['gradient','size']){assert.equal(split.guideConfigs.legend[kind].title,'Both');assert.equal(split.guideConfigs.legend[kind].labels.fontSize,17);}
 assert.deepEqual(split.guideConfigs.legend.size.sampling.values,[0,5,10]);
 const symbols=source().createLegend({channels:['color'],representation:'symbols'}).createLegend({channels:['size']});
 assert.equal(symbols.editLegend({combine:'color-size'}).guideConfigs.legend.colorSize.combine,'color-size');
 const combined=split.editLegend({combine:'color-size'});assert.equal(combined.guideConfigs.legend.colorSize.labels.fontSize,12);
 assert.equal(combined.guideConfigs.legend.colorSize.sampling.mode,'auto');
 assert.throws(()=>p.editLegend({channels:['color']}),/explicitly choose separate/);
 const selected=p.editLegend({channels:['color','size'],labels:{color:'blue'}});assert.equal(selected.guideConfigs.legend.colorSize.labels.color,'blue');
});
test('invalid mappings, sample policies, mapped style overrides and snapshots reject atomically',()=>{
 const seed=source(),p=seed.createLegend({combine:'color-size'}),before=JSON.stringify(p);
 for(const args of [{channels:['color']},{channels:['color','size','opacity']},{symbol:{fill:'red'}},{symbol:{radius:5}},{values:[0,0]},{values:[-1,10]},{count:1},{values:[0,10],count:3}])assert.throws(()=>seed.createLegend({combine:'color-size',...args}));
 assert.throws(()=>p.editLegendBlock({target:'p',channel:'size',symbol:{size:3}}),/mapped/);
 assert.throws(()=>p.editLegendBlock({target:'p',channel:'color',symbol:{fill:'red'}}),/mapped/);
 assert.throws(()=>p.editColorScale({domain:[0,20]}),/identical/);
 assert.throws(()=>p.editPointMark({shape:'square'}),/circle point/);
 assert.throws(()=>seed.encodeSize({field:'w'}).createLegend({combine:'color-size'}),/same quantitative/);
 assert.equal(JSON.stringify(p),before);
 for(const patch of [{colorScale:'size'},{domain:[0,20]},{combine:'size-shape'},{symbol:{type:'point',radius:4,strokeWidth:0,opacity:1}},{sampling:{mode:'values',count:5,values:[0,11]}}]){
  const cfg=structuredClone(p.materializationConfigs);Object.assign(cfg.guides.legend.colorSize,patch);assert.throws(()=>serializeProgram(p._clone({materializationConfigs:cfg})));
 }
});
test('combined clip, local anchors, numeric maps and merged conflicts retain distinct ownership',()=>{
 const p=source().createLegend({combine:'color-size',values:[0,5,10],clipHeight:2})
  .editLegendBlock({target:'p',channel:'color',position:'top-right',labelMap:[{value:5,label:'middle'}]});
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 assert.equal(p.editLegend({clipHeight:'auto'}).guideConfigs.legend.colorSize.clipHeight,undefined);
 const separate=source().createLegend({channels:['color']}).createLegend({channels:['size']})
  .editLegendBlock({target:'p',channel:'color',position:'top-left'}).editLegendBlock({target:'p',channel:'size',position:'bottom-right'});
 assert.throws(()=>separate.editLegend({combine:'color-size'}),/conflicts on position/);
 assert.equal(separate.editLegend({combine:'color-size',position:'right'}).guideConfigs.legend.colorSize.blockOverrides,undefined);
});

test('explicit target, transformed mappings, sample reset and independent siblings stay bound',()=>{
 const seed=source().editSizeScale({type:'pow',exponent:Math.log(3/8)/Math.log(.5)});
 const p=seed.createLegend({combine:'color-size',values:[0,5,10]});assert.deepEqual(samples(p).map(i=>i.properties.radius),[1,2,3]);
 const auto=p.editLegendBlock({target:'p',channel:'size',values:'auto',count:3});assert.deepEqual(auto.guideConfigs.legend.colorSize.sampling,{mode:'auto',count:3});
 assert.throws(()=>p.editLegend({count:3}),/set values to/);
 const sibling=p.encodeOpacity({target:'p',field:'w'}).createLegend({target:'p',channels:['opacity']});
 const before=structuredClone(sibling.guideConfigs.legend.opacity);
 assert.throws(()=>sibling.editLegend({values:[0,10]}),/channel block selector/);
 const edited=sibling.editLegendLabels({target:'p',channel:'size',fontSize:19});assert.deepEqual(edited.guideConfigs.legend.opacity,before);
 assert.equal(edited.guideConfigs.legend.colorSize.labels.fontSize,19);
 const split=p.editLegend({combine:'separate',values:[0,10]});assert.deepEqual(split.guideConfigs.legend.size.sampling.values,[0,10]);
 assert.equal(split.guideConfigs.legend.size.blockOverrides['["size"]'].symbol.opacity,1);
 const removed=p.removeEncoding({target:'p',channel:'size'});assert.equal(removed.guideConfigs.legend?.colorSize,undefined);
});

test('symbol reset, inference, zero-area windows and facade creation preserve exact mapping',()=>{
 const p=source().createLegend({combine:'color-size',symbol:{opacity:.3,stroke:'red',strokeWidth:3}});
 const reset=p.editLegendSymbols({symbol:'auto'});assert.deepEqual(reset.guideConfigs.legend.colorSize.symbol,{type:'point',strokeWidth:0,opacity:1});
 const auto=source().createLegend({combine:'color-size',title:false}).editLegend({title:'auto'});assert.equal(auto.guideConfigs.legend.colorSize.inferredTitle,true);
 const extra=source().createPointMark({id:'other'}).encodeColor({field:'w',fieldType:'quantitative',scale:{id:'otherColor'}}).encodeSize({field:'v',scale:{id:'otherSize'}});
 assert.equal(extra.createLegend({combine:'color-size'}).guideConfigs.legend.colorSize.target,'p');
 assert.throws(()=>extra.createLegend({target:'other',combine:'color-size'}),/same quantitative/);
 const base=source().editSizeScale({range:[0,100]});const zero=base.createLegend({combine:'color-size',values:[0],clipHeight:2});
 assert.deepEqual(deserializeProgram(serializeProgram(zero)).graphicSpec,zero.graphicSpec);
 assert.throws(()=>source().encodeShape({field:'w'}).createLegend({combine:'color-size'}),/circle point/);
 assert.throws(()=>source().createLegend({combine:'color-size',values:'auto'}),/omission/);
});
test('guide facade reuse is idempotent while direct duplicate creation rejects',()=>{
 const p=source().createLegend({combine:'color-size',values:[0,5,10]});
 const plan=planFacadeLegend(p,p.semanticSpec.layers[0],{target:'p',combine:'color-size',values:[0,5,10]});
 assert.deepEqual(plan.steps,[]);
 assert.throws(()=>planFacadeLegend(p,p.semanticSpec.layers[0],{target:'p',combine:'color-size',values:[0,10]}),/different exact samples/);
 assert.throws(()=>p.createLegend({combine:'color-size'}),/already has a legend/);
});
