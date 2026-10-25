import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { render } from '../../../../src/renderers/canvas/index.js';
import { createMockCanvasContext } from '../../../support/canvas.js';
const rows=[{id:'a',group:'A',x:1,y:2,z:3},{id:'b',group:'A',x:2,y:3,z:4},{id:'c',group:'B',x:3,y:4,z:2},{id:'d',group:'B',x:4,y:2,z:1}];
const base=()=>chart().createCanvas({plot:{width:300,height:300},margin:200}).createData({values:rows})
 .createRadarPlot({id:'radar',wide:{fields:['x','y','z']},groupBy:'id',color:'id',guides:false});
test('independent dash migrates a color-only line legend without losing appearance or owner',()=>{
 const p=base().createLegend({target:'radar',channels:['color'],title:'Observation',labels:{fontSize:15},titleStyle:{fontSize:18},itemGap:9});
 assert.deepEqual(p.guideConfigs.legend.series.channels,['color']);
 const next=p.encodeStrokeDash({target:'radar',field:'group',fieldType:'nominal'}).createGuides({axes:false,grid:false,legend:{target:'radar',channels:['strokeDash']}});
 assert.deepEqual(next.guideConfigs.legend.color.channels,['color']);
 assert.deepEqual(next.guideConfigs.legend.series.channels,['strokeDash']);
 assert.equal(next.guideConfigs.legend.color.title,'Observation');
 assert.equal(next.guideConfigs.legend.color.labels.fontSize,15);
 assert.equal(next.guideConfigs.legend.color.itemGap,9);
 assert.deepEqual(next.guideConfigs.legend.color.symbol,p.guideConfigs.legend.series.symbol);
 assert.equal(next.graphicSpec.objects.colorLegendLabels.items.length,4);
 assert.equal(next.graphicSpec.objects.seriesLegendLabels.items.length,2);
 assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec,next.graphicSpec);
 assert.match(renderToSVG(next),/Observation/);
 assert.doesNotThrow(()=>render(next,createMockCanvasContext()));
 assert.throws(()=>next.createLegend({target:'radar',channels:['strokeDash']}),/missing legend/);
 assert.throws(()=>next.createLegend({target:'radar',channels:['color']}),/missing legend/);
 assert.deepEqual(p.guideConfigs.legend.series.channels,['color']);
 const recolored=next.editColorScale({target:'radar',palette:'set1'}).editCanvas({plot:{width:320,height:300}});
 assert.deepEqual(recolored.guideConfigs.legend.color.domain,['a','b','c','d']);
 assert.deepEqual(recolored.guideConfigs.legend.series.domain,['A','B']);
});
test('same-field dash extends series legend while repeated creation still rejects',()=>{
 const next=base().createLegend({channels:['color'],labels:{fontSize:15}})
  .encodeStrokeDash({field:'id',fieldType:'nominal'}).createLegend({channels:['strokeDash']});
 assert.deepEqual(next.guideConfigs.legend.series.channels,['color','strokeDash']);
 assert.equal(next.guideConfigs.legend.series.labels.fontSize,15);
 assert.equal(next.guideConfigs.legend.color,undefined);
 assert.throws(()=>next.createLegend({channels:['strokeDash']}),/missing legend/);
 assert.match(renderToSVG(next),/<svg/);
});
test('simultaneous independent line legends infer separate field owners in either order',()=>{
 const p=base().encodeStrokeDash({field:'group',fieldType:'nominal'});
 const colorOnly=p.createLegend({channels:['color']});
 assert.deepEqual(colorOnly.guideConfigs.legend.series.channels,['color']);
 assert.equal(colorOnly.guideConfigs.legend.color,undefined);
 assert.equal(colorOnly.createLegend({channels:['strokeDash']}).guideConfigs.legend.color.field,'id');
 for(const channels of [undefined,['color','strokeDash'],['strokeDash','color']]) {
  const next=p.createLegend(channels?{channels}:{});
  assert.deepEqual(next.guideConfigs.legend.color.channels,['color']);
  assert.deepEqual(next.guideConfigs.legend.series.channels,['strokeDash']);
  assert.doesNotThrow(()=>next.rematerializeLegend());
 }
});
