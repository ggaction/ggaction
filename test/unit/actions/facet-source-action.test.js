import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../src/index.js';
import { renderToSVG } from '../../../src/renderers/svg.js';
import { serializeProgram, deserializeProgram } from '../../../src/persistence.js';
import { inspectProgram, describeAction } from '../../../src/inspection.js';
const rows = Array.from({length:12}, (_,i)=>({X:i,Y:i*i+1,G:i%3 ? 'B':'A',H:i%2?'C':'D'}));
const source = () => chart().createCanvas({width:600,height:420,margin:{left:80,right:150,top:45,bottom:65}})
  .createData({values:rows}).createScatterPlot({id:'plot',x:'X',y:'Y',guides:false});
const facet = () => source().facet({field:'G',columns:2,guides:{axes:'outer',legend:false}}).createGuides();

test('facet source mark filters replay within each partition and preserve empty shared-scale cells', () => {
 const initial=facet(), before=serializeProgram(initial);
 const next=initial.editFacetSource({action:{method:'filterMarks',options:{target:'plot',channel:'y',op:'gte',value:90}}});
 const children=Object.values(next.children);
 assert.equal(children.reduce((sum,child)=>sum+child.graphicSpec.objects.plot.items.length,0),2);
 assert.ok(children.some(child=>child.graphicSpec.objects.plot.items.length===0));
 for(const child of children) {
  const layer=child.semanticSpec.layers.find(layer=>layer.id==='plot');
  const values=child.semanticSpec.datasets.find(dataset=>dataset.id===layer.data).values;
  assert.ok(values.every(row=>row.Y>=90));
 }
 assert.deepEqual(serializeProgram(initial),before);
 const restored=next.editFacetSource({action:{method:'removeMarkFilter',options:{target:'plot'}}});
 assert.equal(Object.values(restored.children).reduce((sum,child)=>sum+child.graphicSpec.objects.plot.items.length,0),rows.length);
 assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))),renderToSVG(next));
});

test('one source action edits full-data marks and rederives every facet without changing its input',()=>{
 const p=facet(), before=serializeProgram(p);
 const next=p.editFacetSource({action:{method:'encodeOpacity',options:{target:'plot',value:.4}}});
 assert.equal(next.trace.children.length,p.trace.children.length+1);
 assert.equal(next.trace.children.at(-1).op,'editFacetSource');
 for(const child of Object.values(next.children)) assert.ok(child.graphicSpec.objects.plot.items.every(i=>i.properties.opacity===.4));
 assert.deepEqual(serializeProgram(p),before);
 assert.equal(describeAction(p,{action:'editFacetSource',options:{action:{method:'encodeSize',options:{target:'plot',value:80}}}}).applicability,'supported');
 assert.equal(inspectProgram(next).findings.filter(f=>f.severity==='error').length,0);
});

test('source actions restore full item grain, source guide components, and new dependent mark configurations',()=>{
 let p=facet().editFacetSource({action:{method:'createMarkLabels',options:{source:'plot',field:'Y'}}});
 for(const child of Object.values(p.children)) {
  const label=child.semanticSpec.layers.find(l=>l.source==='plot');
  assert.ok(label);
  assert.equal(child.graphicSpec.objects[label.id].items.length,child.graphicSpec.objects.plot.items.length);
 }
 p=p.editFacetSource({action:{method:'editXAxisLabels',options:{fontSize:10}}});
 assert.equal(p.guideConfigs.axis.x.labels.fontSize,10);
 assert.ok(renderToSVG(p).startsWith('<svg'));
 const stat=facet().editFacetSource({action:{method:'createStatisticalReference',options:{source:'plot',axis:'y',statistic:{op:'mean'},stroke:'#222222',strokeWidth:2.5}}});
 for(const child of Object.values(stat.children)) assert.ok(child.markConfigs.statisticalReference?.statisticalReference);
});

test('final guide setup follows source encodings and retains a parent title through persistence',()=>{
 const p=facet().editFacetSource({action:{method:'encodeColor',options:{target:'plot',field:'H',fieldType:'nominal'}}})
  .createGuides({legend:{target:'plot',channels:['color']}}).createTitle({text:'Facet title'}).createGuides();
 assert.equal(p.trace.children.at(-1).op,'createGuides');
 assert.equal(p.semanticSpec.title.text,'Facet title');
 assert.ok(Object.values(p.children).every(child=>Object.keys(child.semanticSpec.guides.legend??{}).length>0));
 const copy=deserializeProgram(serializeProgram(p));
 assert.equal(renderToSVG(copy),renderToSVG(p));
 assert.ok(renderToSVG(copy.editFacetSource({action:{method:'encodeSize',options:{target:'plot',value:80}}})).startsWith('<svg'));
});

test('source descriptors reject ambiguous options, extension primitives and composition actions atomically',()=>{
 const p=facet(), before=serializeProgram(p);
 for(const args of [{},{program:source(),action:{method:'encodeSize'}},{action:{method:'editSemantic'}},{action:{method:'facet'}},{action:{method:'unknown'}}]) assert.throws(()=>p.editFacetSource(args));
 assert.deepEqual(serializeProgram(p),before);
 assert.ok(p.editFacetSource({program:source().createGuides().encodeOpacity({target:'plot',value:.5})}).children);
});

test('facet inspection rejects aggregate partition outputs and accepts their raw ancestor without executing',()=>{
 const q=chart().createCanvas().createData({values:rows}).createHeatmap({id:'cells',x:{field:'X',fieldType:'quantitative'},y:{field:'Y',fieldType:'quantitative'},bin:{bins:2},guides:false});
 const layer=q.semanticSpec.layers.find(l=>l.id==='cells');
 const before=q.trace;
 assert.equal(describeAction(q,{action:'facet',options:{field:'G',data:'data'}}).applicability,'supported');
 assert.equal(describeAction(q,{action:'facet',options:{field:layer.encoding.x.field,data:layer.data}}).applicability,'incompatible');
 assert.equal(q.trace,before);
});


test('facet partitions authored guide values and restores their full source intent', () => {
 const base = chart().createCanvas({width:600,height:420}).createData({values:[
  {x:'A',y:2,g:'a'}, {x:'B',y:4,g:'b'}, {x:'C',y:6,g:'b'}
 ]}).createBarPlot({x:'x',y:'y'})
  .editXAxisTicks({values:['A','C']}).editXAxisLabels({values:['A','C']})
  .createVerticalGrid({values:['A','C']});
 const before = serializeProgram(base);
 const independent = base.facet({field:'g',scales:{x:'independent'}});
 assert.deepEqual(Object.values(independent.children).map(child=>child.guideConfigs.axis.x.ticks.values), [['A'],['C']]);
 assert.deepEqual(Object.values(independent.children).map(child=>child.guideConfigs.axis.x.labels.values), [['A'],['C']]);
 assert.deepEqual(Object.values(independent.children).map(child=>child.guideConfigs.grid.vertical.values), [['A'],['C']]);
 const restored = deserializeProgram(serializeProgram(independent)).editFacetScales({x:'shared'});
 for(const child of Object.values(restored.children)) assert.deepEqual(child.guideConfigs.axis.x.ticks.values,['A','C']);
 assert.deepEqual(serializeProgram(base), before);
 assert.equal(renderToSVG(deserializeProgram(serializeProgram(independent))),renderToSVG(independent));
 assert.throws(()=>base.editXAxisTicks({values:['not observed']}),/inside the scale domain/);
});

test('independent continuous facets clip inherited tick selections including empty selections', () => {
 const base = chart().createCanvas({width:600,height:420}).createData({values:[
  {x:1,y:2,g:'a'}, {x:2,y:4,g:'a'}, {x:10,y:6,g:'b'}, {x:20,y:8,g:'b'}
 ]}).createScatterPlot({x:'x',y:'y'})
  .editXAxisTicks({values:[1,2]}).editXAxisLabels({values:[1,2]});
 const faceted = base.facet({field:'g',scales:{x:'independent'}});
 assert.deepEqual(Object.values(faceted.children).map(child=>child.guideConfigs.axis.x.ticks.values),[[1,2],[]]);
 assert.ok(renderToSVG(faceted).startsWith('<svg'));
});


test('final default guides preserve fully guided facet snapshots without rederiving cells', () => {
 const base = source().encodeColor({target:'plot',field:'H',fieldType:'nominal'}).createGuides();
 const faceted = base.facet({field:'G',guides:{axes:'outer',legend:'shared'}});
 const before = serializeProgram(faceted);
 const next = faceted.createGuides();
 assert.equal(next.graphicSpec,faceted.graphicSpec);
 assert.equal(next.children,faceted.children);
 assert.deepEqual(next.semanticSpec,faceted.semanticSpec);
 assert.equal(next.trace.children.at(-1).op,'createGuides');
 assert.equal(next.trace.children.at(-1).children.length,0);
 assert.deepEqual(serializeProgram(faceted),before);
 assert.throws(()=>next.createGuides({axes:{x:{ticksAndLabels:{labels:{fontSize:9}}}}}), /requires a missing/);
 const unguided = source().facet({field:'G'});
 const guided = unguided.createGuides();
 assert.notEqual(guided.children,unguided.children);
 assert.ok(Object.values(guided.children).every(child=>child.guideConfigs.axis.x));
});


test('faceted heatmap rematerialization preserves shared position domains before guides run', () => {
 const base=chart().createCanvas({width:600,height:420,margin:{left:80,right:160,top:40,bottom:70}})
  .createData({values:[{x:'A',y:'a',v:2},{x:'B',y:'a',v:4},{x:'A',y:'b',v:3},{x:'B',y:'b',v:6}]})
  .createHeatmap({id:'plot',x:{field:'x',fieldType:'nominal'},y:{field:'y',fieldType:'nominal'},color:{field:'v',fieldType:'quantitative'}})
  .editYAxisTicks({values:['a','b']}).editYAxisLabels({values:['a','b']});
 const facets=base.facet({field:'y',scales:{color:'independent'}});
 for(const child of Object.values(facets.children)) {
  assert.deepEqual(child.resolvedScales.y.domain,['a','b']);
  assert.deepEqual(child.guideConfigs.axis.y.ticks.values,['a','b']);
  assert.equal(child.graphicSpec.objects.plot.items.length,2);
 }
 assert.equal(renderToSVG(deserializeProgram(serializeProgram(facets))),renderToSVG(facets));
});
