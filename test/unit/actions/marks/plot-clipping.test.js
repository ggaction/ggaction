import assert from 'node:assert/strict';
import test from 'node:test';
import {chart,hconcat} from '../../../../src/index.js';
import {chart as basicChart} from '../../../../src/basic.js';
import {serializeProgram,deserializeProgram,serializeGraphic,deserializeGraphic} from '../../../../src/persistence.js';
import {resolveMarkItems} from '../../../../src/materialization/selection/policies/index.js';
import {resolveConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
import {translateGraphic} from '../../../../src/materialization/graphicTranslation.js';
import {clippingControl,clippingFrame,clippingCenters} from '../../../support/plot-clipping.js';

function points(factory=chart){return clippingControl(factory);}

test('point clipping preserves all rows, item identities, semantic coordinates and unrelated guides',()=>{
  const a=points(),b=a.editPointMark({target:'scatterPlot',clip:true});
  assert.deepEqual(b.semanticSpec,a.semanticSpec);assert.deepEqual(b.resolvedScales,a.resolvedScales);
  assert.deepEqual(b.graphicSpec.objects.scatterPlot.items,a.graphicSpec.objects.scatterPlot.items);
  assert.deepEqual(b.graphicSpec.objects.scatterPlot.clip,clippingFrame);
  assert.equal(b.markConfigs.scatterPlot.clip,true);assert.equal(a.markConfigs.scatterPlot.clip,undefined);
  assert.deepEqual(b.graphicSpec.objects.scatterPlot.items.map(i=>[i.properties.x,i.properties.y]),clippingCenters);
  for(const [id,o]of Object.entries(a.graphicSpec.objects))if(id!=='scatterPlot')assert.deepEqual(b.graphicSpec.objects[id],o);
  assert.deepEqual(b.editPointMark({target:'scatterPlot',clip:false}).graphicSpec,a.graphicSpec);
  assert.deepEqual(b.editPointMark({target:'scatterPlot',opacity:.5}).graphicSpec.objects.scatterPlot.clip,clippingFrame);
});

test('incomplete Full and Basic marks keep clipping intent through either position order',()=>{
  for(const factory of [chart,basicChart])for(const order of [['X','Y'],['Y','X']]){
    let p=factory().createCanvas({width:320,height:240,margin:{left:40,top:30,right:120,bottom:82}})
      .createData({values:[{x:1,y:2}]}).createPointMark({clip:true});
    assert.equal(p.markConfigs.point.clip,true);
    for(const axis of order)p=p['encode'+axis]({field:axis.toLowerCase()});
    assert.deepEqual(p.graphicSpec.objects.point.clip,clippingFrame);
  }
});

test('clipping is rematerialized for every supported Cartesian mark family',()=>{
  const base=()=>chart().createCanvas({width:300,height:220,margin:40})
    .createData({id:'raw',values:[{x:0,x2:1,y:1,y2:3,cat:'A'},{x:2,x2:3,y:2,y2:4,cat:'B'}]});
  const cases={
    Point:p=>p.createPointMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'}),
    Line:p=>p.createLineMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'}),
    Area:p=>p.createAreaMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeYRange({lower:'y',upper:'y2'}),
    Bar:p=>p.createBarMark({clip:true}).encodeX({field:'cat',fieldType:'nominal'}).encodeY({field:'y',aggregate:'sum'}),
    Rect:p=>p.createRectMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeX2({field:'x2',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'}).encodeY2({field:'y2',fieldType:'quantitative'}),
    Rule:p=>p.createRuleMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeX2({field:'x2',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'}).encodeY2({field:'y2',fieldType:'quantitative'}),
    Text:p=>p.createTextMark({data:'raw',clip:true,text:'Hello'}).encodeX({field:'x',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'}),
    Tick:p=>p.createTickMark({clip:true}).encodeX({field:'x',fieldType:'quantitative'}).encodeY({field:'y',fieldType:'quantitative'})
  };
  for(const [name,build]of Object.entries(cases)){
    const p=build(base()),id=name.toLowerCase(),o=p.graphicSpec.objects[id];
    assert.deepEqual(o.clip,{x:40,y:40,width:220,height:140},name);
    const off=p['edit'+name+'Mark']({target:id,clip:false});assert.equal(off.graphicSpec.objects[id].clip,undefined,name);
    const resized=p.editCanvas({width:340});assert.deepEqual(resized.graphicSpec.objects[id].clip,{x:40,y:40,width:260,height:140},name);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec,name);
  }
});

test('clip validation rejects invalid requests immutably and never enables Polar clipping',()=>{
  const p=points(),before=serializeProgram(p);
  for(const value of [undefined,null,0,1,'true',{},[]]){
    assert.throws(()=>p.editPointMark({target:'scatterPlot',clip:value}),/boolean/);
    assert.throws(()=>p.createPointMark({id:'other',clip:value}),/boolean/);
  }
  const polar=chart().createCanvas({width:300,height:300,margin:40}).createData({values:[{a:0,r:2},{a:1,r:3}]})
    .createPolarScatterPlot({theta:'a',radius:'r',guides:false});
  assert.throws(()=>polar.editPointMark({clip:true}),/Cartesian/);
  assert.equal(serializeProgram(p),before);
});

test('shape replacement, source revision, selection, highlights and removal retain clipping ownership',()=>{
  const p=points().editPointMark({target:'scatterPlot',clip:true});
  for(const shape of ['square','star','circle']){
    const q=p.editPointMark({target:'scatterPlot',shape});assert.deepEqual(q.graphicSpec.objects.scatterPlot.clip,clippingFrame);
  }
  const selected=p.selectMarks({id:'picked',target:'scatterPlot',property:'x',op:'eq',value:36})
    .highlightMarks({selection:'picked',color:'red'});
  assert.deepEqual(selected.graphicSpec.objects.scatterPlot.clip,clippingFrame);
  assert.equal(selected.graphicSpec.objects.scatterPlot.items.find(item=>item.properties.fill==='red').properties.x,36);
  const revised=p.reviseData({source:'raw',id:'revision',values:[{x:12,y:10,series:'Series A'}]});
  assert.deepEqual(revised.graphicSpec.objects.scatterPlot.clip,clippingFrame);assert.equal(revised.graphicSpec.objects.scatterPlot.items.length,1);
  const removed=p.removeMark({target:'scatterPlot'});assert.equal(removed.graphicSpec.objects.scatterPlot,undefined);assert.equal(removed.markConfigs.scatterPlot,undefined);
});

test('concrete bounds intersect self and ancestor clip while selected property geometry stays raw',()=>{
  const p=points().editPointMark({target:'scatterPlot',clip:true});
  assert.deepEqual(resolveConcreteGraphicBounds(p.graphicSpec,'scatterPlot'),{left:40,right:200,top:30,bottom:158});
  assert.equal(resolveConcreteGraphicBounds(p.graphicSpec,'scatterPlot:5'),undefined);
  assert.deepEqual(resolveConcreteGraphicBounds(p.graphicSpec,'scatterPlot:0'),{left:40,right:44,top:86,bottom:102});
  const moved=translateGraphic(p,'scatterPlot',3,7);assert.deepEqual(moved.graphicSpec.objects.scatterPlot.clip,{x:43,y:37,width:160,height:128});
  assert.equal(moved.graphicSpec.objects.scatterPlot.items[0].properties.x,39);
});

test('composition and editable/graphic snapshots preserve each child clipping rectangle',()=>{
  const child=points().editPointMark({target:'scatterPlot',clip:true}),parent=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]});
  assert.equal(Object.values(parent.graphicSpec.objects).filter(o=>o.clip!==undefined).length,2);
  for(const p of [deserializeProgram(serializeProgram(parent)),deserializeGraphic(serializeGraphic(parent))])
    assert.deepEqual(p.graphicSpec,parent.graphicSpec);
});

test('pending clipping rejects incompatible coordinate assignment before child effects',()=>{
  const base=chart().createCanvas({width:300,height:220,margin:40}).createData({values:[{x:1,y:2},{x:2,y:3}]});
  const point=base.createPointMark({clip:true}),before=serializeProgram(point);
  assert.throws(()=>point.encodeTheta({field:'x'}),/Cartesian/);
  assert.throws(()=>point.createCoordinate({id:'polar',type:'polar',layers:['point']}),/Cartesian/);
  assert.equal(serializeProgram(point),before);
  const line=base.createLineMark({clip:true});
  assert.throws(()=>line.encodeParallelCoordinates({dimensions:['x','y']}),/Cartesian/);
});

test('Cartesian facade style objects forward clipping to the existing mark owner',()=>{
  const base=()=>chart().createCanvas({width:300,height:220,margin:40}).createData({values:[{x:1,y:2,cat:'A'},{x:2,y:3,cat:'B'}]});
  const cases=[
    ['scatterPlot',p=>p.createScatterPlot({x:'x',y:'y',point:{clip:true},guides:false})],
    ['linePlot',p=>p.createLinePlot({x:'x',y:'y',line:{clip:true},guides:false})],
    ['barPlot',p=>p.createBarPlot({x:'cat',y:'y',bar:{clip:true},guides:false})],
    ['histogram',p=>p.createHistogram({field:'x',bar:{clip:true},guides:false})],
    ['densityPlot',p=>p.createDensityPlot({field:'x',steps:10,area:{clip:true},guides:false})],
    ['textPlot',p=>p.createTextPlot({x:'x',y:'y',text:'cat',style:{clip:true},guides:false})],
    ['heatmap',p=>p.createHeatmap({x:'cat',y:'cat',rect:{clip:true},guides:false})],
    ['ecdfPlot',p=>p.createECDFPlot({field:'x',line:{clip:true},guides:false})],
  ];
  for(const [id,build]of cases){const p=build(base());assert.equal(p.markConfigs[id].clip,true,id);assert.deepEqual(p.graphicSpec.objects[id].clip,{x:40,y:40,width:220,height:140},id);}
});

test('source-owned text clips only when requested and follows the current source frame',()=>{
  const p=points().editPointMark({target:'scatterPlot',clip:true}).createTextMark({source:'scatterPlot',text:'Label'});
  assert.equal(p.graphicSpec.objects.text.clip,undefined);
  const q=p.editTextMark({clip:true});assert.deepEqual(q.graphicSpec.objects.text.clip,clippingFrame);
  assert.deepEqual(q.editCanvas({width:340}).graphicSpec.objects.text.clip,{...clippingFrame,width:180});
});

test('clipping does not change selection properties of complete stacks or invisible points',()=>{
  const p=chart().createCanvas({width:300,height:220,margin:40})
    .createData({values:[{c:'A',v:3,g:'a'},{c:'A',v:4,g:'b'},{c:'B',v:1,g:'a'},{c:'B',v:1,g:'b'}]})
    .createBarPlot({x:'c',y:{field:'v',aggregate:'sum',scale:{domain:[0,5],nice:false}},color:{field:'g',layout:'stack'},guides:false});
  const clipped=p.editBarMark({clip:true});
  assert.deepEqual(resolveMarkItems(clipped,'barPlot','stack'),resolveMarkItems(p,'barPlot','stack'));
  const point=points(),q=point.editPointMark({target:'scatterPlot',clip:true});
  assert.deepEqual(resolveMarkItems(q,'scatterPlot'),resolveMarkItems(point,'scatterPlot'));
});
