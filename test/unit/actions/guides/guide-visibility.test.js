import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

const rows = Array.from({length:12},(_,i)=>({x:i+1,y:i%5+2,z:i%3+3,g:i%2?'B':'A'}));
function fixture() {
  return chart().createCanvas({plot:{width:300,height:300},margin:{left:160,right:220,top:120,bottom:110}})
    .createData({id:'d',values:rows}).createScatterPlot({id:'plot',data:'d',x:{field:'x'},y:{field:'y'}})
    .encodeColor({target:'plot',field:'g',fieldType:'nominal'})
    .createGuides({legend:{target:'plot',channels:['color']}});
}
const invisible = (p,id) => (p.graphicSpec.objects[id].items ?? [p.graphicSpec.objects[id]]).every(item=>item.properties.opacity===0);

test('complete and partial axis visibility retains style, relative title anchors and replay',()=>{
  const original=fixture().editXAxis({labels:{fontSize:13},line:{lineWidth:3},title:{offset:{from:'labels',gap:8}}});
  let p=original.editXAxis({labels:{visible:false}});
  assert.ok(invisible(p,'xAxisLabels'));
  assert.ok(!invisible(p,'xAxisTitle'));
  p=p.editAxes({x:{visible:false},y:{visible:false}}).editCanvas({plot:{width:320,height:320}}).createGuides();
  assert.ok(invisible(p,'xAxisLine')); assert.ok(invisible(p,'yAxisLabels'));
  p=deserializeProgram(serializeProgram(p)).editXAxis({visible:true});
  assert.ok(!invisible(p,'xAxisLine')); assert.ok(invisible(p,'xAxisLabels'));
  p=p.editXAxis({labels:{visible:true}});
  assert.equal(p.guideConfigs.axis.x.labels.fontSize,13);
  assert.equal(p.guideConfigs.axis.x.line.lineWidth,3);
  assert.ok(!invisible(original,'xAxisLabels'));
  assert.ok(!invisible(p,'xAxisLabels'));
});

test('legend hides whole block or individual text and preserves styles through automatic guides',()=>{
  const original=fixture();
  let p=original.editLegend({target:'plot',visible:false,labels:{fontSize:15}}).createGuides()
    .editCanvas({plot:{width:320,height:320}});
  assert.ok(invisible(p,'colorLegendLabels')); assert.ok(invisible(p,'colorLegendTitle'));
  p=deserializeProgram(serializeProgram(p)).editLegend({target:'plot',visible:true,labels:{visible:false},titleStyle:{visible:false}});
  assert.ok(invisible(p,'colorLegendLabels')); assert.ok(invisible(p,'colorLegendTitle'));
  p=p.editLegend({target:'plot',labels:{visible:true},titleStyle:{visible:true}});
  assert.equal(p.guideConfigs.legend.color.labels.fontSize,15);
  assert.ok(!invisible(p,'colorLegendLabels')); assert.ok(!invisible(p,'colorLegendTitle'));
});

test('hidden grids preserve width and dash while rematerializing and restoring',()=>{
  let p=fixture().editGrid({horizontal:{lineWidth:2.5,strokeDash:[2,3],visible:false}});
  assert.ok(invisible(p,'horizontalGridLines'));
  p=p.rematerializeGrid().editCanvas({plot:{width:350,height:310}}).createGuides();
  assert.ok(invisible(p,'horizontalGridLines'));
  p=deserializeProgram(serializeProgram(p)).editGrid({horizontal:{visible:true}});
  assert.ok(!invisible(p,'horizontalGridLines'));
  assert.equal(p.guideConfigs.grid.horizontal.lineWidth,2.5);
  assert.deepEqual(p.guideConfigs.grid.horizontal.strokeDash,[2,3]);
});

test('invalid visibility is rejected immutably, including mixed edits',()=>{
  const p=fixture(), before=serializeProgram(p);
  for(const [method,args] of [['editXAxis',{visible:0}],['editXAxis',{labels:{visible:'no'}}],
    ['editAxes',{x:{visible:false},y:{visible:'yes'}}],['editLegend',{target:'plot',visible:null}],
    ['editLegend',{target:'plot',titleStyle:{visible:1}}],['editGrid',{horizontal:{visible:'false'}}]])
    assert.throws(()=>p[method](args),/visible.*boolean/);
  assert.equal(serializeProgram(p),before);
});

test('parallel dimension visibility is independent and survives edits',()=>{
  let p=chart().createCanvas({plot:{width:400,height:300},margin:{left:140,right:180,top:120,bottom:100}})
    .createData({id:'d',values:rows}).createParallelCoordinates({id:'plot',data:'d',dimensions:['x','y','z']});
  p=p.editParallelAxis({target:'plot',field:'x',visible:false});
  assert.deepEqual(p.graphicSpec.objects.parallelAxisLines.items.map(item=>item.properties.opacity),[0,1,1]);
  p=deserializeProgram(serializeProgram(p)).editCanvas({plot:{width:440,height:300}})
    .editParallelAxis({target:'plot',field:'x',visible:true,labels:{visible:false}});
  assert.deepEqual(p.graphicSpec.objects.parallelAxisLines.items.map(item=>item.properties.opacity),[1,1,1]);
  assert.ok(p.graphicSpec.objects.parallelAxisLabels.items.some(item=>item.properties.opacity===0));
});

test('polar axes and grids retain independent visibility through canvas changes',()=>{
  let p=chart().createCanvas({plot:{width:300,height:300},margin:{left:160,right:220,top:120,bottom:110}})
    .createData({id:'d',values:rows}).createPolarScatterPlot({id:'plot',theta:'x',radius:'y'});
  p=p.editThetaAxis({visible:false}).editRadialAxis({labels:{visible:false}})
    .editGrid({theta:{visible:false},radial:{visible:false}}).editCanvas({plot:{width:320,height:320}});
  assert.ok(invisible(p,'thetaAxisLabels')); assert.ok(invisible(p,'radialAxisLabels'));
  assert.ok(invisible(p,'thetaGridLines')); assert.ok(invisible(p,'radialGridCircles'));
  p=deserializeProgram(serializeProgram(p)).editThetaAxis({visible:true}).editRadialAxis({labels:{visible:true}})
    .editGrid({theta:{visible:true},radial:{visible:true}});
  assert.ok(!invisible(p,'thetaAxisLabels')); assert.ok(!invisible(p,'radialGridCircles'));
});

test('facet shared legend preserves hidden labels and can restore them',()=>{
  let p=fixture().facet({field:'g',data:'d',columns:2,guides:{legend:'shared'}});
  p=p.editLegend({target:'plot',labels:{visible:false},titleStyle:{visible:false}});
  assert.ok(invisible(p,'colorLegendLabels')); assert.ok(invisible(p,'colorLegendTitle'));
  p=deserializeProgram(serializeProgram(p)).editLegend({target:'plot',visible:true,labels:{visible:true},titleStyle:{visible:true}});
  assert.ok(!invisible(p,'colorLegendLabels'));
});


test('shared concat legend retains hiding through child replay and restoring',()=>{
  let p=hconcat({programs:[{id:'a',program:fixture()},{id:'b',program:fixture()}],share:{color:true},gap:8,align:'plot'});
  p=p.editLegend({target:[{childPath:['a'],id:'plot'},{childPath:['b'],id:'plot'}],visible:false});
  for(const child of Object.values(p.children)) assert.ok(invisible(child,'colorLegendLabels'));
  const labels=Object.entries(p.graphicSpec.objects).filter(([id])=>id.endsWith('colorLegendLabels'));
  assert.ok(labels.length); for(const [id] of labels) assert.ok(invisible(p,id));
  p=deserializeProgram(serializeProgram(p)).editLegend({target:[{childPath:['a'],id:'plot'},{childPath:['b'],id:'plot'}],visible:true});
  for(const child of Object.values(p.children)) assert.ok(!invisible(child,'colorLegendLabels'));
});


test('color legend family changes retain hidden state rather than resurrecting it',()=>{
  let p=fixture().editLegend({target:'plot',visible:false,labels:{visible:false}})
    .encodeColor({target:'plot',field:'x',fieldType:'quantitative'});
  assert.deepEqual(p.guideConfigs.legend.gradient.visibility,{all:false,labels:false});
  assert.ok(invisible(p,'colorGradientLabels'));
  p=p.editLegend({target:'plot',visible:true,labels:{visible:true}});
  assert.ok(!invisible(p,'colorGradientLabels'));
});
