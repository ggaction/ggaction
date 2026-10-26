import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { getMarkItems } from '../../../../src/inspection.js';
import { resolveMarkSelection } from '../../../../src/materialization/selection/state.js';

const base=()=>chart().createCanvas({margin:120}).createData({id:'data',values:[{x:1,y:2,g:'A'},{x:1,y:2,g:'A'},{x:3,y:5,g:'B'}]});
test('row identity distinguishes duplicate observations and follows filtered source rows',()=>{
  for(const filter of [false,true]){
    let p=base();if(filter)p=p.filterData({id:'filtered',source:'data',field:'g',oneOf:['A']});
    p=p.createScatterPlot({id:'plot',data:filter?'filtered':'data',x:'x',y:'y'});
    const selector={rows:{data:'data',indices:[1]}};
    assert.equal(resolveMarkSelection(p,'plot',selector).keys.length,1);
    const h=p.highlightMarks({target:'plot',select:selector,color:'red',bringToFront:false});
    assert.equal(h.graphicSpec.objects.plot.items.filter(i=>i.properties.fill==='red').length,1);
    assert.equal(p.graphicSpec.objects.plot.items.filter(i=>i.properties.fill==='red').length,0);
  }
});
test('explicit highlight ID atomically replaces predicate and appearance',()=>{
  const p=base().createScatterPlot({id:'plot',x:'x',y:'y'});
  const h=p.highlightMarks({id:'h',target:'plot',select:{rows:{data:'data',indices:[0]}},color:'red'});
  const next=h.highlightMarks({id:'h',target:'plot',select:{rows:{data:'data',indices:[2]}},color:'blue'});
  assert.equal(Object.keys(next.materializationConfigs.highlights).length,1);
  assert.equal(next.graphicSpec.objects.plot.items.filter(i=>i.properties.fill==='blue').length,1);
  assert.ok(!next.graphicSpec.objects.plot.items.some(i=>i.properties.fill==='red'));
  assert.throws(()=>h.highlightMarks({id:'h',target:'plot',select:{rows:{data:'data',indices:[100]}},color:'blue'}),/index/);
  assert.equal(h.graphicSpec.objects.plot.items.filter(i=>i.properties.fill==='red').length,1);
});
test('box selection includes whiskers, caps and median through provenance',()=>{
  const p=base().createBoxPlot({id:'plot',x:{field:'g',fieldType:'nominal'},y:{field:'y'}});
  const h=p.highlightMarks({id:'h',target:'plot',select:{field:'g',op:'eq',value:'A'},color:'red'});
  assert.equal(Object.keys(h.materializationConfigs.highlights).length,5);
  for(const id of ['plot','plotWhisker','plotMedian'])assert.ok(h.graphicSpec.objects[id].items.some(i=>i.properties.fill==='red'||i.properties.stroke==='red'),id);
  assert.ok(getMarkItems(p,{target:'plot'}).every(item=>item.rows.some(r=>r.data==='data')));
});
test('text highlights survive canvas rematerialization and removal',()=>{
  const p=base().createTextPlot({id:'plot',x:'x',y:'y',text:{field:'g'}});
  const h=p.highlightMarks({id:'h',target:'plot',select:{rows:{data:'data',indices:[1]}},color:'red',fontSize:24,offset:{x:5,y:2}});
  const resized=h.editCanvas({plot:{width:450,height:320}});
  assert.equal(resized.graphicSpec.objects.plot.items.filter(i=>i.properties.fill==='red'&&i.properties.fontSize===24).length,1);
  assert.ok(!resized.removeMarkHighlight({selection:'h'}).graphicSpec.objects.plot.items.some(i=>i.properties.fill==='red'));
});

test('compound highlights retain creation semantics unless an explicit ID is supplied',()=>{
  const p=base().createBoxPlot({id:'plot',x:{field:'g',fieldType:'nominal'},y:{field:'y'}});
  const h=p.highlightMarks({target:'plot',select:{field:'g',op:'eq',value:'A'},color:'red'});
  assert.throws(()=>h.highlightMarks({target:'plot',select:{field:'g',op:'eq',value:'B'}}),/already exists/);
});

test('text inspection follows emitted labels rather than raw dataset cardinality',()=>{
  const p=base().createScatterPlot({id:'plot',x:'x',y:'y'})
    .createMarkLabels({id:'labels',source:'plot',field:'g',select:{field:'g',op:'eq',value:'B'}});
  const items=getMarkItems(p,{target:'labels'});
  assert.equal(items.length,1);assert.deepEqual(items[0].rows,[{data:'data',index:2}]);
  const h=p.highlightMarks({target:'labels',select:{rows:{data:'data',indices:[2]}},color:'red',fontSize:25});
  assert.equal(h.graphicSpec.objects.labels.items[0].properties.fontSize,25);
});

test('ranked compound highlights reevaluate dependent members after role changes',()=>{
  const p=chart().createCanvas({margin:120}).createData({id:'data',values:[
    {g:'A',y:1,z:10},{g:'A',y:2,z:20},{g:'B',y:10,z:1},{g:'B',y:20,z:2}
  ]}).createBoxPlot({id:'plot',x:{field:'g',fieldType:'nominal'},y:{field:'y'}});
  const h=p.highlightMarks({id:'h',target:'plot',select:{channel:'y2',op:'max'},color:'red'});
  const next=h.editBoxPlot({target:'plot',y:{field:'z'}});
  for(const target of ['plot','plotMedian','plotWhisker']){
    const selected=getMarkItems(next,{target}).filter(i=>i.target===target&&i.geometry.some(g=>g.properties.fill==='red'||g.properties.stroke==='red'));
    assert.equal(selected.length,1,target);assert.equal(selected[0].fields.g,'A',target);
  }
});

test('stack-grain picking retains category membership after bringing one stack to front',()=>{
  const p=chart().createCanvas({margin:100}).createData({id:'d',values:[{g:'A',s:'x',y:2},{g:'A',s:'y',y:3},{g:'B',s:'x',y:4},{g:'B',s:'y',y:5}]})
    .createBarPlot({id:'p',x:{field:'g',fieldType:'nominal'},y:{field:'y',aggregate:'sum'},color:{field:'s',layout:'stack'}});
  for(const grain of ['item','stack']){
    const h=p.highlightMarks({id:'h',target:'p',select:{grain,field:'g',op:'eq',value:'A'},color:'red'});
    for(const item of getMarkItems(h,{target:'p',grain:'stack'}))assert.equal(item.geometry.every(g=>g.properties.fill==='red'),item.fields.g==='A');
  }
});
