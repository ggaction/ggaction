import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat, vconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { createTransitionScene } from '../../../../src/scene.js';
import { getPlotComposition, describeAction } from '../../../../src/inspection.js';
const rows=Array.from({length:36},(_,i)=>({group:['A','B','C'][i%3],value:3+i%11,other:i+1,series:i%2?'I':'II'}));
const base=()=>chart().createCanvas({plot:{width:360,height:300},margin:90}).createData({id:'data',values:rows});
const swarm=()=>base().createBeeswarmPlot({id:'points',x:'group',y:'value',point:{radius:2},color:{field:'group',fieldType:'nominal'}});
const layer={id:'box',source:'points',plot:{action:'createBoxPlot',options:{box:{opacity:.2},width:{band:.35},outliers:false}},placement:'back'};

test('compound marks remain one owner; data revisions, style and placement survive resize and persistence',()=>{
  const p=swarm(), before=serializeProgram(p), q=p.createLayerPlot(layer);
  const info=getPlotComposition(q,{target:'box'});
  assert.equal(info.channels.y.field,'value');assert.equal(info.data,'data');assert.equal(info.ownedMarks.length,5);
  assert.ok(Object.isFrozen(info));assert.equal(serializeProgram(p),before);
  const checkOrder=program=>{const siblings=program.graphicSpec.objects['plot-main'].children;assert.ok(siblings.indexOf('box')<siblings.indexOf('points'));};
  checkOrder(q);checkOrder(q.editCanvas({plot:{width:280,height:390}}));
  const changed=q.encodeOpacity({target:'box',value:.4});assert.equal(changed.markConfigs.box.opacity,.4);assert.equal(changed.markConfigs.points.opacity,q.markConfigs.points.opacity);
  const revised=q.reviseData({source:'data',id:'revised',values:rows.map(r=>({...r,value:r.value+30}))});
  assert.equal(revised.graphicSpec.objects.points.items.length,rows.length);
  assert.ok(revised.resolvedScales[info.channels.y.scale].domain.at(-1)>30);
  assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(revised)),{format:'canvas'}),createTransitionScene(revised,{format:'canvas'}));
});

test('different coordinate families, statistical units and conflicting scales fail atomically',()=>{
  const p=base().createBarPlot({id:'p',x:'group',y:{field:'value',aggregate:'sum'}}),before=serializeProgram(p);
  for(const plot of [{action:'createBoxPlot'},{action:'createPolarScatterPlot'},{action:'createScatterPlot'},{action:'createLinePlot',options:{y:{scale:{type:'log'}}}}]) {
    assert.throws(()=>p.createLayerPlot({source:'p',plot}));assert.equal(serializeProgram(p),before);
    const d=describeAction(p,{action:'createLayerPlot',options:{source:'p',plot}});assert.equal(d.applicability,'incompatible');
  }
  const density=base().createDensityPlot({id:'density',field:'value'});
  assert.throws(()=>density.createLayerPlot({plot:{action:'createHistogram'}}),/units/);
  assert.throws(()=>density.createLayerPlot({plot:{action:'createECDFPlot'}}),/units/);
});

test('facet layers and nested adjacent views preserve editable owners and source fields',()=>{
  const p=swarm().facet({field:'series',columns:2,guides:{legend:'shared'}})
    .editFacetSource({action:{method:'createLayerPlot',options:layer}}).createGuides();
  for(const child of Object.values(p.children)) assert.ok(child.markConfigs.box?.boxPlot);
  const q=hconcat({programs:[{id:'left',program:p},{id:'right',program:base().createDensityPlot({id:'density',field:'value'})}],share:{}});
  const r=q.createAdjacentPlot({id:'third',source:{childPath:['left'],id:'box'},position:'bottom',plot:{action:'createScatterPlot',options:{x:{field:'group',fieldType:'nominal'},y:'value'}},share:{}});
  assert.equal(r.children.third.semanticSpec.layers[0].data,'data');
  assert.ok(createTransitionScene(r,{format:'canvas'}).nodes.length>0);
  const nested=vconcat({programs:[{id:'top',program:q},{id:'bottom',program:swarm()}]})
    .createLayerPlot({...layer,target:{childPath:['bottom']}});
  assert.ok(nested.children.bottom.markConfigs.box.boxPlot);
});

test('auto concat inference uses source provenance and does not share different units',()=>{
  const p=base().createBoxPlot({id:'box',x:{field:'group',fieldType:'nominal'},y:{field:'value'}});
  const adjacent=p.createAdjacentPlot({id:'raw',source:'box',plot:{action:'createScatterPlot'}});
  assert.equal(adjacent.children.raw.semanticSpec.layers[0].encoding.y.field,'value');
  assert.equal(adjacent.compositionSpec.share.y,undefined);
  const q=base().createPolarScatterPlot({id:'polar',theta:'other',radius:'value'}).createAdjacentPlot({id:'next',plot:{action:'createLinePlot'}});
  assert.equal(q.children.next.semanticSpec.layers[0].encoding.x.field,'other');
  assert.deepEqual(q.compositionSpec.share,{});
});

test('a single position reassignment cannot silently change another plot shared scale meaning',()=>{
  const p=swarm().createLayerPlot(layer), before=serializeProgram(p);
  assert.throws(()=>p.encodeY({target:'points',field:'other'}),/shared with plot/);
  assert.equal(serializeProgram(p),before);
  const q=p.removeYAxis().encodeY({target:'points',field:'other',scale:{id:'otherValue'}});
  assert.equal(q.semanticSpec.layers.find(l=>l.id==='box').encoding.y.scale,p.semanticSpec.layers.find(l=>l.id==='box').encoding.y.scale);
  assert.equal(q.semanticSpec.layers.find(l=>l.id==='points').encoding.y.scale,'otherValue');
  assert.throws(()=>p.createLayerPlot({id:'third',source:'boxMedian',plot:{action:'createBoxPlot'}}));
});
for(const action of ['createRosePlot','createRadialBarPlot','createPiePlot'])for(const aggregate of ['count','sum'])
test(`${action} ${aggregate}: same native partition layers and distinct radius mappings`,()=>{
  const p=base()[action]({id:'radial',category:'group',aggregate,...(aggregate==='sum'?{value:'value'}:{})});
  const q=p.createLayerPlot({id:'outline',source:'radial',plot:{action,options:{arc:{opacity:.25}}}});
  assert.equal(q.semanticSpec.layers.length,2);
  assert.equal(q.semanticSpec.layers[0].encoding.theta.scale,q.semanticSpec.layers[1].encoding.theta.scale);
  if(action!=='createPiePlot') {
    assert.equal(q.semanticSpec.layers[0].encoding.radius.scale,q.semanticSpec.layers[1].encoding.radius.scale);
    assert.throws(()=>p.createLayerPlot({id:'bad',plot:{action:action==='createRosePlot'?'createRadialBarPlot':'createRosePlot'}}),/radius mapping/);
  }
  assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(q)),{format:'canvas'}),createTransitionScene(q,{format:'canvas'}));
});

test('deferred heatmap layer guides use count meaning rather than a generated field name',()=>{
 const p=base().createScatterPlot({id:'p',x:'other',y:'value'}).createLayerPlot({id:'heat',source:'p',plot:{action:'createHeatmap'},placement:'back'}).createGuides();
 const check=q=>assert.ok(Object.values(q.graphicSpec.objects).some(g=>g.type==='text'&&g.properties?.text==='Count'));
 check(p);check(p.editLegend({target:'heat',channel:'color',title:'auto',representation:'symbols'}));
});

test('one field used as an ordinal slot and quantitative measure retains each positional role',()=>{
 const p=base().createBeeswarmPlot({id:'p',x:{field:'value',fieldType:'ordinal'},y:{field:'value',fieldType:'quantitative'},packing:{overflow:'overlap'}});
 const q=p.createLayerPlot({id:'interval',source:'p',plot:{action:'createIntervalPlot'}});
 assert.equal(getPlotComposition(q,{target:'interval'}).channels.x.fieldType,'ordinal');
 assert.equal(getPlotComposition(q,{target:'interval'}).channels.y.fieldType,'quantitative');
});

test('summary layers inherit color only at supported statistical grain',()=>{
 const p=base().createBeeswarmPlot({id:'p',x:'group',y:'value',color:'series',packing:{overflow:'overlap'}});
 for(const action of ['createBoxPlot','createViolinPlot','createGradientPlot','createIntervalPlot','createRaincloudPlot']){
  const q=p.createLayerPlot({id:'q',source:'p',plot:{action}}).createGuides();
  assert.equal(q.semanticSpec.layers.find(l=>l.id==='p').encoding.color.field,'series');
  const owner=getPlotComposition(q,{target:'q'});
  assert.equal(owner.channels.color?.field,action==='createIntervalPlot'?'series':undefined);
 }
 const split=p.createLayerPlot({id:'q',source:'p',plot:{action:'createViolinPlot',options:{split:{field:'series'}}}});
 assert.equal(getPlotComposition(split,{target:'q'}).channels.color.field,'series');
});

test('explicit extra endpoint shares the source scale and retains readable multi-measure axes',()=>{
 for(const horizontal of [false,true])for(const action of ['createBeeswarmPlot','createBoxPlot']){
  const category={field:'group',fieldType:'nominal'},measure={field:'value',fieldType:'quantitative'};
  const p=base()[action]({id:'p',x:horizontal?measure:category,y:horizontal?category:measure});
  const q=p.createLayerPlot({source:'p',plot:{action:'createDumbbellPlot',options:{start:'other'}}}).createGuides();
  const axis=horizontal?'x':'y';
  assert.equal(q.semanticSpec.guides.axis[axis].title,'value / other');
  assert.ok(createTransitionScene(q,{format:'canvas'}).nodes.length>0);
 }
});
