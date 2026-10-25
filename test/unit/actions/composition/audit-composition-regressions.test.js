import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../../src/index.js';
import { describeAction, getPlotComposition } from '../../../../src/inspection.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { deriveLineSeries } from '../../../../src/grammar/lineSeries.js';
const rows = Array.from({length: 30}, (_,i) => ({category:['A','B','C'][i%3], value:i+2, other:i/2+1, series:i%2?'one':'two', panel:i%3?'P':'Q'}));
const base = () => chart().createCanvas({plot:{width:320,height:280},margin:150}).createData({id:'data',values:rows});
const horizontal = () => base().createBarPlot({id:'plot', x:{field:'value',aggregate:'sum'}, y:{field:'category',fieldType:'nominal'}, color:'series', guides:false});
const point = () => base().createScatterPlot({id:'plot',x:'value',y:'other',color:'series',guides:false});

test('horizontal grouped bars accept compatible native Bar, Dot, Lollipop and Line layers', () => {
 for(const action of ['createBarPlot','createDotPlot','createLollipopPlot','createLinePlot']) {
  const p = horizontal(), before = serializeProgram(p), args = {id:'layer',source:'plot',plot:{action}};
  assert.equal(describeAction(p,{action:'createLayerPlot',options:args}).applicability,'supported');
  const q=p.createLayerPlot(args), role=getPlotComposition(q,{target:'layer'});
  assert.equal(role.channels.x.field,'value'); assert.equal(role.channels.y.field,'category');
  assert.equal(role.channels.x.measurement.operations.at(-1),'sum');
  assert.ok(q.graphicSpec.objects.layer.items.length>0); assert.equal(serializeProgram(p),before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 }
});

test('horizontal aggregate lines use explicit category order and expose aggregate endpoints', () => {
 const p=base().createLinePlot({id:'line',x:{field:'value',aggregate:'sum'},y:{field:'category',fieldType:'nominal',scale:{domain:['C','B','A']}},guides:false});
 const layer=p.semanticSpec.layers.find(l=>l.id==='line');
 const series=deriveLineSeries(rows,layer,{yDomain:['C','B','A']}).series[0].values;
 assert.equal(p.graphicSpec.objects.line.items.length,1);
 assert.deepEqual(series.map(i=>i.y),['C','B','A']);
 assert.deepEqual(series.map(i=>i.x),[175,165,155]);
 assert.equal(p.createOverlay({id:'ends',source:'line',type:'point'}).graphicSpec.objects.ends.items.length,3);
 assert.throws(()=>p.encodePathOrder({target:'line',field:'value'}),/aggregate/);
});

test('Violin silhouette endpoint overlays are rejected by the same public capability as execution',()=>{
 const p=base().createViolinPlot({id:'plot',x:{field:'category',fieldType:'nominal'},y:'value',guides:false});
 const options={source:'plot',id:'follow',type:'line'};
 assert.equal(describeAction(p,{action:'createOverlay',options}).applicability,'incompatible');
 assert.throws(()=>p.createOverlay(options),/density|silhouette|category/i);
 assert.doesNotThrow(()=>p.createLayerPlot({id:'points',source:'plot',plot:{action:'createScatterPlot'}}));
});

test('shared axes follow statistical provenance instead of generated summary field names',()=>{
 const p=base().createViolinPlot({id:'plot',x:{field:'category',fieldType:'nominal'},y:'value',guides:false});
 const q=p.createAdjacentPlot({id:'raw',source:'plot',share:{y:true},plot:{action:'createScatterPlot'}});
 const role=getPlotComposition(q.children.raw,{target:'raw'});
 assert.equal(role.channels.y.field,'value');
 assert.deepEqual(q.children.plot.resolvedScales[p.semanticSpec.layers[0].encoding.y.scale].domain,q.children.raw.resolvedScales[role.channels.y.scale].domain);
});

test('explicit adjacent Area roles and Rug axis replace the source orientation',()=>{
 const p=horizontal();
 const area=p.createAdjacentPlot({id:'area',source:'plot',share:{},plot:{action:'createAreaPlot',inherit:{color:false},options:{x:{field:'category',fieldType:'nominal'},y:{field:'value'}}}});
 assert.equal(getPlotComposition(area.children.area,{target:'area'}).channels.y.field,'value');
 const rug=p.createAdjacentPlot({id:'rug',source:'plot',share:{},plot:{action:'createRugPlot',options:{x:'other',edge:'bottom'}}});
 const layer=rug.children.rug.semanticSpec.layers.find(l=>l.id==='rug');
 assert.equal(layer.encoding.x.field,'other'); assert.equal(layer.encoding.y.field,undefined); assert.equal(layer.encoding.y.datum,0);
});

test('explicit color inheritance suppression does not reintroduce a removed source grouping',()=>{
 for(const action of ['createScatterPlot','createECDFPlot','createDensityPlot','createAreaPlot']) {
  const p=horizontal();
  const options= action==='createScatterPlot'?{x:'value',y:'other'}:action==='createAreaPlot'?{x:{field:'category',fieldType:'nominal'},y:{field:'value'}}:{field:'value'};
  const q=p.createAdjacentPlot({id:'plain',source:'plot',share:{},plot:{action,options,inherit:{color:false}}});
  assert.ok(q.children.plain.semanticSpec.layers.every(l=>!l.encoding.color));
 }
 assert.throws(()=>horizontal().createAdjacentPlot({plot:{action:'createScatterPlot',inherit:{color:'false'}}}),/inheritance/);
});

test('explicit categorical point guides survive adjacent creation without changing implicit unit defaults',()=>{
 const p=base().createScatterPlot({id:'plot',x:'value',y:'other',color:'series'});
 assert.equal(p.guideConfigs.legend?.color,undefined);
 assert.equal(p.createGuides().guideConfigs.legend?.color,undefined);
 const q=p.createGuides({legend:{target:'plot',channels:['color']}})
   .createAdjacentPlot({id:'neighbor',source:'plot',share:{color:true},
     plot:{action:'createScatterPlot',options:{guides:{legend:{channels:['color']}}}}});
 assert.ok(q.children.plot.guideConfigs.legend.color); assert.ok(q.children.neighbor.guideConfigs.legend.color);
 assert.ok(Object.keys(q.graphicSpec.objects).some(id=>id.endsWith('-shared-color-legend')));
});

test('one explicit appearance action atomically edits ordinary marks and persistent facet sources',()=>{
 const facet=point().facet({field:'panel',guides:{legend:false}}), p=hconcat({programs:[{id:'facet',program:facet},{id:'plain',program:point()}]});
 const target=[{childPath:['facet'],id:'plot',facetSource:true},{childPath:['plain'],id:'plot'}];
 const args={target,value:.35};
 assert.equal(describeAction(p,{action:'encodeOpacity',options:args}).applicability,'supported');
 const before=serializeProgram(p),q=p.encodeOpacity(args);
 assert.equal(q.children.plain.markConfigs.plot.opacity,.35);
 for(const child of Object.values(q.children.facet.children))assert.equal(child.markConfigs.plot.opacity,.35);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 assert.equal(serializeProgram(p),before);
 assert.throws(()=>p.encodeOpacity({target:[target[0],{childPath:['plain'],id:'missing'}],value:.1}),/missing/);
 assert.equal(serializeProgram(p),before);
 assert.throws(()=>p.encodeOpacity({target:{childPath:['plain'],id:'plot',facetSource:true},value:.1}),/facet view/);
});

test('binned numeric lines accept raw Point, Area and Heatmap layers without moving their bin assignments',()=>{
 const values=[{x:1,y:2},{x:1.2,y:4},{x:3,y:6},{x:3.2,y:8},{x:5,y:10},{x:5.2,y:12}];
 const p=chart().createCanvas({plot:{width:320,height:280},margin:100}).createData({id:'data',values})
   .createLinePlot({id:'plot',x:{field:'x',bin:{boundaries:[0,2,4,6]}},y:{field:'y',aggregate:'mean'},guides:false});
 const points=p.graphicSpec.objects.plot.items, scale=p.semanticSpec.layers[0].encoding.x.scale;
 for(const action of ['createScatterPlot','createAreaPlot','createHeatmap']) {
  const args={id:'layer',source:'plot',plot:{action}};
  assert.equal(describeAction(p,{action:'createLayerPlot',options:args}).applicability,'supported');
  const q=p.createLayerPlot(args);
  assert.deepEqual(q.resolvedScales[scale].domain,[0,6]);
  assert.deepEqual(q.graphicSpec.objects.plot.items.map(item=>item.properties.commands.map(command=>command.x)),
    points.map(item=>item.properties.commands.map(command=>command.x)));
  assert.deepEqual(deriveLineSeries(values,q.semanticSpec.layers.find(layer=>layer.id==='plot'),
    {xBinBoundaries:[0,2,4,6]}).series[0].values.map(point=>[point.x,point.y]),[[1,3],[3,7],[5,11]]);
  assert.ok(q.graphicSpec.objects.layer?.items?.length || Object.values(q.graphicSpec.objects).some(o=>o.items?.length));
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 }
});

test('automatic binned domains include compatible raw observations while preserving explicit bin edges',()=>{
 const p=chart().createCanvas({plot:{width:320,height:280},margin:100})
  .createData({id:'summary',values:[{x:1,y:2},{x:3,y:4}]})
  .createBarPlot({id:'bins',x:{field:'x',bin:{boundaries:[0,2,4]}},y:{field:'y',aggregate:'mean'},guides:false});
 const q=p.createData({id:'raw',values:[{x:-2,y:2},{x:6,y:4}]})
  .createScatterPlot({id:'points',x:{field:'x',scale:{id:p.semanticSpec.layers[0].encoding.x.scale}},y:'y',guides:false});
 assert.deepEqual(q.resolvedScales[p.semanticSpec.layers[0].encoding.x.scale].domain,[-2,6]);
 assert.deepEqual(q.semanticSpec.layers[0].encoding.x.bin,{boundaries:[0,2,4]});
 assert.equal(p.graphicSpec.objects.bins.items.length,q.graphicSpec.objects.bins.items.length);
});

test('adjacent guide inheritance projects continuous and categorical presentation into their public contracts',()=>{
 for(const continuous of [true,false]) {
  let p=base().createScatterPlot({id:'plot',x:'value',y:'other',guides:false})
   .encodeColor({target:'plot',field:continuous?'value':'series',fieldType:continuous?'quantitative':'nominal',scale:{palette:continuous?'viridis':'tableau10'}})
   .createGuides({legend:{target:'plot',channels:['color']}});
  p=p.editLegend({target:'plot',channel:'color',labels:{fontSize:14},
   ...(continuous?{gradient:{length:130,opacity:.6}}:{itemGap:18})});
  const before=serializeProgram(p),q=p.createAdjacentPlot({id:'neighbor',source:'plot',share:{color:true},
   plot:{action:'createScatterPlot',options:{guides:{legend:{channels:['color']}}}}});
  const legend=Object.values(q.children.neighbor.guideConfigs.legend).find(config=>config.target==='neighbor');
  assert.equal(legend.labels.fontSize,14);
  if(continuous){assert.equal(legend.gradient.length,130);assert.equal(legend.gradient.opacity,.6);}
  else assert.equal(legend.itemGap,18);
  assert.equal(Object.keys(q.graphicSpec.objects).filter(id=>id.endsWith('-shared-color-legend')).length,1);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.equal(serializeProgram(p),before);
 }
});
