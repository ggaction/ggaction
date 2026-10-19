import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';

const values=[{x:0,x2:1,y:1,y2:3,cat:'A'},{x:2,x2:3,y:2,y2:4,cat:'B'}];
function base(){return chart().createCanvas({width:400,height:300,margin:80}).createData({id:'raw',values});}
const x={field:'x',fieldType:'quantitative'},y={field:'y',fieldType:'quantitative'};
const families={
  Point:p=>p.createPointMark({clip:true}).encodeX(x).encodeY(y),
  Line:p=>p.createLineMark({clip:true}).encodeX(x).encodeY(y),
  Area:p=>p.createAreaMark({clip:true}).encodeX(x).encodeYRange({lower:'y',upper:'y2'}),
  Bar:p=>p.createBarMark({clip:true}).encodeX({field:'cat',fieldType:'nominal'}).encodeY({field:'y',aggregate:'sum'}),
  Rect:p=>p.createRectMark({clip:true}).encodeX(x).encodeX2({field:'x2',fieldType:'quantitative'}).encodeY(y).encodeY2({field:'y2',fieldType:'quantitative'}),
  Rule:p=>p.createRuleMark({clip:true}).encodeX(x).encodeX2({field:'x2',fieldType:'quantitative'}).encodeY(y).encodeY2({field:'y2',fieldType:'quantitative'}),
  Text:p=>p.createTextMark({data:'raw',text:'Hello',clip:true}).encodeX(x).encodeY(y),
  Tick:p=>p.createTickMark({clip:true}).encodeX(x).encodeY(y)
};

for(const [family,build] of Object.entries(families))test(`${family} underlay keeps raw rows, primitive content, clips and independent positions intact`,()=>{
  const original=build(base()).createXAxis({ticksAndLabels:false,title:false}),before=serializeProgram(original);
  const p=original.editXAxis({underlay:true}),id=family.toLowerCase(),children=p.graphicSpec.objects['plot-main'].children;
  assert.ok(children.indexOf('xAxisLine')<children.indexOf(id));
  assert.deepEqual(p.semanticSpec,original.semanticSpec);assert.deepEqual(p.resolvedScales,original.resolvedScales);
  for(const [key,object]of Object.entries(original.graphicSpec.objects))if(key!=='plot-main')assert.deepEqual(p.graphicSpec.objects[key],object,key);
  assert.deepEqual(p.semanticSpec.datasets[0].values,values);
  assert.deepEqual(p.graphicSpec.objects[id].clip,{x:80,y:80,width:240,height:140});
  assert.deepEqual(p.editXAxis({underlay:false}).graphicSpec,original.graphicSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  assert.equal(serializeProgram(original),before);
});

test('regression band, source points and fitted line retain their meaningful relative order',()=>{
  const values=[{x:1,y:2},{x:2,y:3},{x:3,y:5},{x:4,y:7}];
  const p=chart().createCanvas({width:480,height:320,margin:70}).createData({values})
    .createRegressionPlot({id:'fit',x:'x',y:'y',confidenceMethod:'normal',guides:false})
    .createXAxis({underlay:true,title:false});
  for(const q of [p,p.editXScale({domain:[0,5]}),p.editCanvas({width:520})]){
    const ids=q.graphicSpec.objects['plot-main'].children;
    assert.ok(ids.indexOf('xAxisLine')<ids.indexOf('fitRegressionBands'));
    assert.ok(ids.indexOf('fitRegressionBands')<ids.indexOf('fit'));
    assert.ok(ids.indexOf('fit')<ids.indexOf('fitRegressionLines'));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  }
});

test('Canvas border underlay remains available for existing Polar and Parallel charts',()=>{
  for(const make of [p=>p.createPolarScatterPlot({theta:'x',radius:'y',guides:false})
      .createThetaAxis({ticksAndLabels:false,title:false}).createRadialAxis({ticksAndLabels:false,title:false}),
    p=>p.createParallelCoordinates({dimensions:[{field:'x'},{field:'y'}]})]){
    const p=make(base()).editCanvas({plotBorder:{underlay:true}}),children=p.graphicSpec.objects['plot-main'].children;
    assert.equal(children[0],'plotBorder');
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  }
});
