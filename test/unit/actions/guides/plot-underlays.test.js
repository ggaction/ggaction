import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat} from '../../../../src/index.js';
import {chart as basicChart} from '../../../../src/basic.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {decodeValue,encodeSharedValue} from '../../../../src/persistence/codec.js';
import {renderToSVG} from '../../../../src/renderers/svg.js';
import {createPlotUnderlayProgram} from '../../../../examples/plot-guide-underlays/program.js';

const order=p=>p.graphicSpec.objects['plot-main'].children;
const values=[{panel:'A',x:0,y:1},{panel:'B',x:1,y:2}];
function scatter(factory=chart){return factory().createCanvas({width:400,height:300,margin:90})
  .createData({values}).createScatterPlot({x:'x',y:'y',guides:false});}

test('axis and border opt-ins act independently and reset to the same default scene',()=>{
  const defaults=createPlotUnderlayProgram({axisUnderlay:false,borderUnderlay:false}),saved=serializeProgram(defaults);
  for(const [axisUnderlay,borderUnderlay,expected] of [
    [false,false,['horizontalGridLines','barPlot','plotBorder','xAxisLine']],
    [true,false,['horizontalGridLines','xAxisLine','barPlot','plotBorder']],
    [false,true,['horizontalGridLines','plotBorder','barPlot','xAxisLine']],
    [true,true,['horizontalGridLines','plotBorder','xAxisLine','barPlot']]]){
    const p=createPlotUnderlayProgram({axisUnderlay,borderUnderlay});
    assert.deepEqual(order(p),expected);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
    assert.deepEqual(p.editXAxis({underlay:false}).editCanvas({plotBorder:{underlay:false}}).graphicSpec,defaults.graphicSpec);
    assert.deepEqual(p.editXAxis({underlay:undefined}).graphicSpec,p.graphicSpec);
    assert.equal(serializeProgram(defaults),saved);
  }
});

test('axis creation, aggregate creation and later editing converge without exposing component-level flags',()=>{
  const s=scatter(),options={line:{color:'black'},title:false};
  const a=s.createXAxis({...options,underlay:true});
  const b=s.createXAxis(options).editXAxis({underlay:true});
  const c=s.createAxes({x:{...options,underlay:true},y:false});
  assert.deepEqual(a.graphicSpec,b.graphicSpec);assert.deepEqual(a.graphicSpec,c.graphicSpec);
  for(const method of ['createXAxisLine','editXAxisLine','editXAxisLabels'])
    assert.throws(()=>a[method]({underlay:true}),/Unknown/);
  const guided=scatter().createGuides({axes:{x:{underlay:true},y:false}});
  assert.equal(guided.guideConfigs.axis.x.frame.underlay,true);
  assert.throws(()=>guided.createScatterPlot({id:'second',x:'x',y:'y',guides:{axes:{x:{underlay:false},y:false}}}),/different underlay/);
});

test('frame offset edits preserve underlay and placement edits preserve offset',()=>{
  const p=scatter().createXAxis({title:false,underlay:true,offset:3});
  assert.deepEqual(p.guideConfigs.axis.x.frame,{offset:3,underlay:true});
  const changed=p.editXAxis({offset:7});assert.deepEqual(changed.guideConfigs.axis.x.frame,{offset:7,underlay:true});
  const reset=changed.editXAxis({underlay:false});assert.deepEqual(reset.guideConfigs.axis.x.frame,{offset:7});
  assert.equal(order(reset).at(-1),'xAxisLabels');
  assert.deepEqual(reset.editXAxis({underlay:true}).graphicSpec,changed.graphicSpec);
  const noOffset=scatter().createXAxis({title:false}).editXAxis({underlay:true}).editXAxis({underlay:false});
  assert.equal(noOffset.guideConfigs.axis.x.frame,undefined);
});

test('grid ranks, later marks, later axis parts and border object replacement retain their owners',()=>{
  const p=createPlotUnderlayProgram();
  const front=p.editHorizontalGrid({zIndex:2});
  assert.deepEqual(order(front),['plotBorder','xAxisLine','barPlot','horizontalGridLines']);
  const withPoint=front.createPointMark({id:'extra'}).encodeX({field:'category',fieldType:'nominal'})
    .encodeY({field:'value'});
  assert.ok(order(withPoint).indexOf('extra')>order(withPoint).indexOf('xAxisLine'));
  assert.ok(order(withPoint).indexOf('extra')<order(withPoint).indexOf('horizontalGridLines'));
  const ticks=p.createXAxisTicksAndLabels({values:['a','b']});
  assert.ok(order(ticks).indexOf('xAxisLabels')<order(ticks).indexOf('barPlot'));
  const replaced=p.editCanvas({plotBorder:{color:'red'}});
  assert.equal(replaced.materializationConfigs.canvas.plotBorder.underlay,undefined);
  assert.ok(order(replaced).indexOf('plotBorder')>order(replaced).indexOf('barPlot'));
  assert.equal(p.editCanvas({width:260}).materializationConfigs.canvas.plotBorder.underlay,true);
});

test('named and standalone axes keep target identity and underlay intent',()=>{
  const p=scatter().createYAxis({id:'rightAxis',position:'right',underlay:true,title:false});
  assert.equal(p.guideConfigs.axis.rightAxis.frame.underlay,true);
  assert.ok(order(p).indexOf('axis_rightAxis__Line')<order(p).indexOf('scatterPlot'));
  assert.equal(p.editYAxis({target:'rightAxis',offset:3}).guideConfigs.axis.rightAxis.frame.underlay,true);
  const standalone=chart().createCanvas({width:400,height:300,margin:90})
    .createCoordinate({id:'frame',type:'cartesian'}).createScale({id:'amount',type:'linear',domain:[0,10]})
    .createXAxis({coordinate:'frame',scale:'amount',underlay:true});
  assert.equal(standalone.semanticSpec.layers.length,0);
  assert.deepEqual(deserializeProgram(serializeProgram(standalone)).graphicSpec,standalone.graphicSpec);
});

test('data, scales, themes, measured text, source facets and nested concat preserve concrete order',()=>{
  const p=scatter().createXAxis({underlay:true,title:false}).editCanvas({plotBorder:{underlay:true}}),before=serializeProgram(p);
  for(const q of [p.editCanvas({width:420}),p.editXScale({domain:[0,2]}),p.applyTheme({theme:'light'}),
    p.applyTextMetrics({profile:{schemaVersion:1,id:'small',measurements:[]}}),
    p.reviseData({source:'data',id:'revised',values:values.map(row=>({...row,y:row.y+1}))})]){
    assert.equal(q.guideConfigs.axis.x.frame.underlay,true);
    assert.ok(order(q).indexOf('xAxisLine')<order(q).indexOf('scatterPlot'));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  }
  const facet=p.facet({field:'panel',guides:{axes:'outer'}}).editFacetSource({program:p.editPointMark({fill:'red'})});
  for(const child of Object.values(facet.children))if(child.graphicSpec.objects.xAxisLine!==undefined)
    assert.ok(order(child).indexOf('xAxisLine')<order(child).indexOf('scatterPlot'));
  const composite=hconcat({programs:[facet,facet]});assert.match(renderToSVG(composite),/<svg/);
  assert.deepEqual(deserializeProgram(serializeProgram(composite)).graphicSpec,composite.graphicSpec);
  assert.equal(serializeProgram(p),before);
});

test('Basic creation accepts the same underlay contract while invalid options and persisted false remain atomic',()=>{
  const p=scatter(basicChart).createXAxis({underlay:true,title:false});
  assert.equal(p.guideConfigs.axis.x.frame.underlay,true);
  const border=basicChart().createCanvas({plotBorder:{underlay:true}});
  assert.equal(border.materializationConfigs.canvas.plotBorder.underlay,true);
  const s=scatter(),before=serializeProgram(s);
  for(const underlay of [null,0,1,'true','before']){
    assert.throws(()=>s.createXAxis({underlay}),/boolean/);
    assert.throws(()=>s.editCanvas({plotBorder:{underlay}}),/boolean/);
  }
  assert.equal(serializeProgram(s),before);
  const stored=JSON.parse(serializeProgram(s.createXAxis({underlay:true,title:false}))),state=decodeValue(stored.payload);
  state.materializationConfigs.guides.axis.x.frame.underlay=false;stored.payload=encodeSharedValue(state);
  assert.throws(()=>deserializeProgram(JSON.stringify(stored)),/canonical true/);
});

test('editable snapshots reject noncanonical border and non-Cartesian axis underlay intent',()=>{
  const stored=JSON.parse(serializeProgram(createPlotUnderlayProgram())),state=decodeValue(stored.payload);
  state.materializationConfigs.canvas.plotBorder.underlay=false;stored.payload=encodeSharedValue(state);
  assert.throws(()=>deserializeProgram(JSON.stringify(stored)),/canonical true/);
  const polar=chart().createCanvas({width:400,height:400,margin:90}).createData({values})
    .createPolarScatterPlot({theta:'x',radius:'y',guides:false}).createThetaAxis({ticksAndLabels:false,title:false});
  const envelope=JSON.parse(serializeProgram(polar)),bad=decodeValue(envelope.payload);
  bad.materializationConfigs.guides.axis.theta.frame={underlay:true};envelope.payload=encodeSharedValue(bad);
  assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/Cartesian axis owner/);
});
