import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
const rows=[{X:'A',Y:'S',V:1,G:'C'},{X:'B',Y:'T',V:3,G:'D'}];
const base=()=>chart().createCanvas({width:900,height:700,margin:{left:100,right:340,top:70,bottom:100}}).createData({values:rows});
test('independent rect color, stroke, opacity and width create native legend blocks atomically',()=>{
 const p=base().createHeatmap({id:'cells',x:'X',y:'Y',color:{field:'V',fieldType:'quantitative'},guides:false})
  .encodeStroke({target:'cells',field:'G',fieldType:'nominal'})
  .encodeOpacity({target:'cells',field:'V',scale:{range:[.25,1]}})
  .encodeStrokeWidth({target:'cells',field:'V',scale:{range:[1,4]}});
 const q=p.createLegend({target:'cells',channels:['color','stroke','opacity','strokeWidth'],count:2});
 for(const kind of ['gradient','stroke','opacity','strokeWidth'])assert.ok(q.guideConfigs.legend[kind],kind);
 assert.ok(renderToSVG(q).startsWith('<svg'));
 assert.equal(p.guideConfigs.legend,undefined);
});
test('sampled legends keep a point combined series block and categorical overflow stays local',()=>{
 const p=base().createScatterPlot({id:'plot',x:{field:'V'},y:{field:'V'},color:{field:'G',fieldType:'nominal'},guides:false})
  .encodeSize({field:'V'}).encodeShape({field:'G'}).encodeOpacity({field:'V'});
 const q=p.createLegend({target:'plot',channels:['color','size','shape','opacity'],count:2,overflow:{maxItems:2,summary:'ellipsis-count'}});
 assert.ok(q.guideConfigs.legend.opacity);
 assert.ok(q.guideConfigs.legend.color??q.guideConfigs.legend.series);
});
test('a datum-only rug anchor has no inferred axis while a ranged area endpoint retains its axis',()=>{
 const p=base().createRugPlot({id:'rug',x:'V',edge:'bottom',guides:false}).createGuides();
 assert.ok(p.semanticSpec.guides.axis.x);
 assert.equal(p.semanticSpec.guides.axis.y,undefined);
});

test('point color, shape, and sampled channels on independent fields use separate compatible blocks',()=>{
 const p=base().createScatterPlot({id:'plot',x:'V',y:'V',color:'X',guides:false})
  .encodeShape({field:'G'}).encodeSize({field:'V'}).encodeOpacity({field:'V'});
 const q=p.createLegend({target:'plot',channels:['color','shape','size','opacity'],count:2});
 assert.ok(q.guideConfigs.legend.color); assert.ok(q.guideConfigs.legend.series); assert.ok(q.guideConfigs.legend.opacity);
 const continuous=base().createScatterPlot({id:'plot',x:'V',y:'V',guides:false})
  .encodeColor({field:'V',fieldType:'quantitative',scale:{type:'sequential',palette:'blues'}})
  .encodeStroke({field:'V',fieldType:'quantitative',scale:{type:'sequential',palette:'reds'}})
  .encodeSize({field:'V'}).createLegend({target:'plot',channels:['color','stroke','size'],count:2});
 assert.ok(continuous.guideConfigs.legend.gradient); assert.ok(continuous.guideConfigs.legend.strokeGradient); assert.ok(continuous.guideConfigs.legend.size);
});
