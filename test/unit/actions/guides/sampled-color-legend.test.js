import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { chart as basic } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';

const rows = Object.freeze([1,2,4,6,8,9].map((v,i) => Object.freeze({x:i,y:v,v,g:i%2?'b':'a'})));
function source(factory=chart) {
  return factory().createCanvas({width:800,height:700,margin:200})
    .createData({id:'rows',values:rows}).createScatterPlot({x:'x',y:'y',guides:false})
    .encodeColor({field:'v',fieldType:'quantitative'});
}
const samples = [2,4,6,8];
const symbols = p => p.graphicSpec.objects.colorGradientSymbols.items.map(i=>i.properties);
const config = p => p.guideConfigs.legend.gradient;

test('sampled color uses the existing continuous owner and literal mapped colors in Full and Basic',()=>{
  for(const factory of [chart,basic]) {
    const values=[...samples], symbol={radius:5,strokeWidth:1.5};
    const p=source(factory).createLegend({representation:'symbols',values,symbol});
    assert.equal(config(p).representation,'symbols');
    assert.deepEqual(config(p).sampling,{mode:'values',values:samples,count:5});
    assert.deepEqual(symbols(p).map(p=>p.fill),['#472d7b','#2c728e','#28ae80','#abdc32']);
    assert.deepEqual(symbols(p).map(p=>p.stroke),symbols(p).map(p=>p.fill));
    assert.ok(symbols(p).every(p=>p.radius===5&&p.strokeWidth===1.5));
    assert.equal(p.graphicSpec.objects.colorGradientStrips,undefined);
    assert.equal(p.graphicSpec.objects.colorGradientTicks,undefined);
    assert.equal(p.semanticSpec.guides.legend.color.scale,'color');
    assert.deepEqual(values,samples); assert.deepEqual(symbol,{radius:5,strokeWidth:1.5});
  }
});

test('omission and explicit gradient retain original default graphics and untagged persisted owner',()=>{
  const p=source(), a=p.createLegend(), b=p.createLegend({representation:'gradient'});
  assert.deepEqual(a.graphicSpec,b.graphicSpec); assert.deepEqual(a.guideConfigs,b.guideConfigs);
  assert.equal(config(a).representation,undefined); assert.equal(config(a).sampling,undefined);
  assert.equal(config(a).count,5); assert.deepEqual(config(a).gradient,{length:120,thickness:12});
  assert.equal(a.graphicSpec.objects.colorGradientSymbols,undefined);
});

test('point recipe is closed and rejects incompatible paint and gradient options atomically',()=>{
  const p=source(), before=serializeProgram(p);
  for(const symbol of [null,[],{type:'line'},{type:'swatch'},{layers:[]},{fill:'red'},{radius:0},{strokeWidth:-1},{stroke:''}]) assert.throws(()=>p.createLegend({representation:'symbols',symbol}));
  for(const args of [{representation:'dots'},{representation:'symbols',gradient:{length:100}},{representation:'symbols',values:'auto'}]) assert.throws(()=>p.createLegend(args));
  assert.equal(serializeProgram(p),before);
});

test('exact samples enforce finite ascending unique domain-bounded arrays including reversed domains',()=>{
  const p=source();
  for(const values of [[],[2,2],[4,2],[NaN],[Infinity],[0],[10],Array.from({length:101},(_,i)=>1+i/101)]) assert.throws(()=>p.createLegend({representation:'symbols',values}));
  assert.throws(()=>p.createLegend({representation:'symbols',values:[2],count:4}));
  assert.equal(symbols(p.createLegend({representation:'symbols',values:[2]})).length,1);
  const reverse=p.editColorScale({domain:[9,1]}).createLegend({representation:'symbols',values:samples});
  assert.deepEqual(reverse.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),['2','4','6','8']);
  assert.deepEqual(symbols(reverse).map(p=>p.fill),['#abdc32','#28ae80','#2c728e','#472d7b']);
});

test('representation transitions preserve common styles and remembered count and exact values but clear symbol-only state',()=>{
  const p=source().createLegend({count:4,gradient:{length:180,thickness:8},labels:{fontSize:10},title:false,border:true});
  const s=p.editLegend({representation:'symbols',values:samples,symbol:{radius:5}});
  assert.equal(config(s).gradient,undefined); assert.equal(config(s).count,undefined);
  assert.equal(config(s).sampling.count,4); assert.equal(config(s).titleVisible,false);
  const a=s.editLegend({values:'auto'}); assert.equal(symbols(a).length,4);
  const b=s.editLegendBlock({target:'scatterPlot',channel:'color',values:'auto'}); assert.equal(symbols(b).length,4);
  const g=s.editLegend({representation:'gradient'});
  assert.deepEqual(config(g).gradient,{length:120,thickness:12}); assert.equal(config(g).count,4);
  for(const key of ['representation','symbol','layout','direction','columns']) assert.equal(config(g)[key],undefined);
  assert.deepEqual(config(g).sampling,{mode:'values',values:samples,count:4});
  assert.equal(config(g).labels.fontSize,10); assert.equal(config(g).titleVisible,false); assert.deepEqual(config(g).border,config(p).border);
  assert.equal(g.graphicSpec.objects.colorGradientSymbols,undefined);
  assert.deepEqual(config(p).gradient,{length:180,thickness:8});
  assert.deepEqual(config(s.editLegend({representation:'gradient',values:[2]})).sampling.values,[2]);
  assert.throws(()=>p.editLegend({representation:'symbols',gradient:{length:99}}));
});

test('focused and block editors retain sampled owner and use existing symbol-area units',()=>{
  const p=source().createLegend({representation:'symbols',values:samples});
  const a=p.editLegendSymbols({symbol:{radius:5}}).editLegendLabels({fontSize:11,format:'.1f'}).editLegendTitle({title:'Samples',fontWeight:700}).editLegendBorder({border:true});
  assert.ok(symbols(a).every(p=>p.radius===5));
  assert.deepEqual(a.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),['2.0','4.0','6.0','8.0']);
  const b=a.editLegendBlock({target:'scatterPlot',channel:'color',symbol:{size:Math.PI*9,stroke:'black',strokeWidth:2,opacity:.4}});
  assert.ok(symbols(b).every(p=>p.radius===3&&p.stroke==='black'&&p.strokeWidth===2&&p.opacity===.4));
  assert.throws(()=>b.editLegendBlock({target:'scatterPlot',channel:'color',symbol:{fill:'red'}}));
  assert.throws(()=>b.editLegendBlock({target:'scatterPlot',channel:'color',labelMap:[{value:2,label:'Two'}]}));
  const reset=a.editLegendSymbols({symbol:'auto'}); assert.ok(symbols(reset).every(p=>p.radius===7&&p.strokeWidth===1));
  assert.equal(config(p).labels.fontSize,12);
});

for(const position of ['left','right','top','bottom','top-left','top-right','bottom-left','bottom-right']) test(`sampled color item layout and group replay at ${position}`,()=>{
  const p=source().createLegend({representation:'symbols',values:samples,position,border:true});
  assert.equal(config(p).itemGap,['top','bottom'].includes(position)?20:18);
  const q=p.editLegendLayout({columns:2,direction:'horizontal'});
  assert.equal(config(q).columns,2); assert.equal(symbols(q).length,4);
  const r=q.editCanvas({width:840,height:740});
  assert.equal(symbols(r).length,4);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec,r.graphicSpec);
});

test('color symbols retain value-space samples independently of gradient tick spacing',()=>{
  const p=source();
  for(const count of [0,1,2.2,10001]) assert.throws(()=>p.createLegend({representation:'symbols',count}));
  for(const type of ['log','symlog']) {
    const q=p.editColorScale({type,domain:[1,100]}).createLegend({representation:'symbols',count:5});
    const gradient=p.editColorScale({type,domain:[1,100]}).createLegend({count:5});
    const expected=type==='log'?['1','10','100']:['20','40','60','80','100'];
    assert.deepEqual(q.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),expected);
    const switched=gradient.editLegend({representation:'symbols'});
    assert.deepEqual(switched.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),expected);
  }
  const mid=p.editColorScale({domain:[1,9],midpoint:4}).createLegend({representation:'symbols',count:3});
  assert.equal(symbols(mid).length,4);
});

test('mixed content representation edits preserve companions and explicit channels replace final set',()=>{
  const p=source().encodeSize({field:'v'}).createLegend({channels:['color']}).createLegend({channels:['size']});
  const size=p.guideConfigs.legend.size;
  const a=p.editLegend({representation:'symbols',values:samples});
  assert.deepEqual(a.guideConfigs.legend.size,size);
  assert.throws(()=>a.editLegendSymbols({symbol:{radius:4}}),/block/i);
  const b=a.editLegendBlock({target:'scatterPlot',channel:'color',symbol:{size:Math.PI*16}});
  assert.deepEqual(b.guideConfigs.legend.size,size);
  const c=b.editLegend({channels:['color','size'],representation:'gradient'});
  assert.deepEqual(c.guideConfigs.legend.size,size);
  assert.ok(c.graphicSpec.objects.colorGradientStrips);
  const d=c.editLegend({channels:['color'],representation:'symbols',values:samples});
  assert.equal(d.guideConfigs.legend.size,undefined);
  assert.throws(()=>d.editLegend({channels:['size'],representation:'symbols'}));
  assert.equal(d.editLegend({channels:['size']}).guideConfigs.legend.gradient,undefined);
  const created=source().encodeSize({field:'v'}).createLegend({channels:['color','size'],representation:'symbols'});
  assert.ok(created.guideConfigs.legend.size); assert.equal(config(created).representation,'symbols');
});

test('categorical, interval and stroke-only requests reject representation',()=>{
  for(const p of [source().encodeColor({field:'g',fieldType:'nominal'}),source().editColorScale({type:'quantize',range:['red','blue']})]) assert.throws(()=>p.createLegend({representation:'symbols'}));
  const p=source().encodeStroke({field:'v',fieldType:'quantitative'});
  assert.throws(()=>p.createLegend({channels:['stroke'],representation:'symbols'}));
});

test('scale revisions rematerialize paints and reject out-of-domain exact samples atomically',()=>{
  const p=source().createLegend({representation:'symbols',values:samples}), before=serializeProgram(p);
  const q=p.editColorScale({domain:[0,10]});
  assert.notDeepEqual(symbols(q).map(p=>p.fill),symbols(p).map(p=>p.fill));
  assert.throws(()=>p.editColorScale({domain:[3,9]}),/outside/);
  assert.equal(serializeProgram(p),before);
  const categorical=p.encodeColor({field:'g',fieldType:'nominal',scale:{type:'ordinal',domain:['a','b'],range:['red','blue']}});
  assert.equal(categorical.guideConfigs.legend.gradient,undefined); assert.ok(categorical.guideConfigs.legend.color);
  assert.equal(categorical.graphicSpec.objects.colorGradientSymbols,undefined);
  const interval=p.editColorScale({type:'quantize',range:['red','blue']}); assert.ok(interval.guideConfigs.legend.interval);
});

test('persistence validates discriminator and sampling while restored program remains editable',()=>{
  const p=source().createLegend({representation:'symbols',values:samples});
  const q=deserializeProgram(serializeProgram(p)); assert.deepEqual(q.graphicSpec,p.graphicSpec);
  assert.equal(symbols(q.editLegendSymbols({symbol:{radius:4}}))[0].radius,4);
  for(const patch of [{representation:'dots'},{representation:'symbols',sampling:{mode:'values',values:[4,2],count:5}},{representation:'symbols',symbol:{type:'line'}}]) {
    const corrupt=p._withLegendConfig('gradient',{...config(p),...patch}); assert.throws(()=>serializeProgram(corrupt));
  }
});

test('stored gradient representation rejects every stale symbol-only property',()=>{
  const p=source().createLegend(), before=serializeProgram(p);
  for(const [key,value] of Object.entries({
    sampling:{mode:'auto',count:5},symbol:{type:'point',radius:5,strokeWidth:1},
    columns:2,direction:'horizontal',layout:'edge'
  })) {
    const corrupt=p._withLegendConfig('gradient',{
      ...config(p),representation:'gradient',[key]:value
    });
    assert.throws(()=>serializeProgram(corrupt),key==='sampling'?/Gradient exact sampling must retain/:/Gradient color legend cannot store symbol representation settings/);
    assert.equal(serializeProgram(p),before);
  }
});

test('remove and recreate do not leave exclusive graphics or stale semantic resources',()=>{
  const p=source().createLegend({representation:'symbols',values:samples});
  const q=p.removeLegend({target:'scatterPlot'}); assert.equal(q.graphicSpec.objects.colorGradientSymbols,undefined);
  const r=q.createLegend(); assert.ok(r.graphicSpec.objects.colorGradientStrips); assert.equal(config(r).representation,undefined);
});

test('shared facet/repeat persistence and SVG consume concrete sampled circles only',()=>{
  const p=source().createLegend({representation:'symbols',values:samples,position:'top-left'});
  for(const q of [p.facet({field:'g',guides:{legend:'shared'}}),p.repeatCharts({channel:'x',fields:['x','y'],guides:{legend:'shared'}})]) {
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
    assert.ok(renderToSVG(q).includes('<circle'));
  }
  const svg=renderToSVG(p); assert.ok(svg.includes('#472d7b')); assert.ok(!svg.includes('colorGradientStrips'));
});

test('nested facade guides forward sampled values for point, bar, rectangle and text consumers',()=>{
  const guide={axes:false,grid:false,legend:{representation:'symbols',values:samples}};
  for(const factory of [chart,basic]) {
    const base=()=>factory().createCanvas({width:800,height:700,margin:200}).createData({values:rows});
    const programs=[
      base().createScatterPlot({x:'x',y:'y',color:{field:'v',fieldType:'quantitative'},guides:guide}),
      base().createBarPlot({x:{field:'x',fieldType:'nominal'},y:'v',color:{field:'v',fieldType:'quantitative'},guides:guide}),
      base().createHeatmap({x:{field:'x',fieldType:'nominal'},y:{field:'y',fieldType:'nominal'},color:{field:'v',fieldType:'quantitative'},guides:guide}),
      ...(factory===chart?[base().createTextPlot({x:'x',y:'y',text:'g',color:{field:'v',fieldType:'quantitative'},guides:guide})]:[])
    ];
    for(const p of programs) assert.deepEqual(symbols(p).map(p=>p.fill),['#472d7b','#2c728e','#28ae80','#abdc32']);
  }
});

test('explicit group row/column/wrap and free anchor coexist with independent item columns',()=>{
  const p=source().encodeSize({field:'v'}).createLegend({channels:['color','size'],representation:'symbols',blockLayout:'column',position:'right'});
  for(const blockLayout of ['row','column','wrap']) {
    const q=p.editLegendLayout({blockLayout,at:{x:200,y:210}});
    assert.equal(q.guideConfigs.legendGroups.scatterPlot.blockLayout,blockLayout);
    assert.equal(symbols(q).length,5);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  }
});

test('data revision updates automatic samples while exact sampling failures preserve old snapshots',()=>{
  const p=source().createLegend({representation:'symbols'});
  const q=p.reviseData({source:'rows',id:'revised',values:rows.map(r=>({...r,v:r.v*2}))});
  assert.notDeepEqual(q.graphicSpec.objects.colorGradientLabels,p.graphicSpec.objects.colorGradientLabels);
  const e=source().createLegend({representation:'symbols',values:samples});
  assert.throws(()=>e.reviseData({source:'rows',id:'revised',values:rows.map(r=>({...r,v:r.v+20}))}),/outside/);
  assert.deepEqual(config(e).sampling.values,samples);
});

test('literal four-sample geometry reaches SVG, Canvas, PNG and PDF without renderer inference',async()=>{
  const p=chart().createCanvas({width:500,height:400,margin:100})
    .createData({values:[{x:1,y:1,v:1},{x:2,y:2,v:9}]}).createScatterPlot({x:'x',y:'y',guides:false})
    .encodeColor({field:'v',fieldType:'quantitative'}).createLegend({representation:'symbols',values:samples,position:'top-left',symbol:{radius:5,strokeWidth:1.5},labels:{fontSize:10},titleStyle:{fontSize:11,fontWeight:700}});
  const expected=[
    {x:113.75,y:136.75,radius:5,fill:'#472d7b',stroke:'#472d7b',strokeWidth:1.5,opacity:1},
    {x:113.75,y:154.75,radius:5,fill:'#2c728e',stroke:'#2c728e',strokeWidth:1.5,opacity:1},
    {x:113.75,y:172.75,radius:5,fill:'#28ae80',stroke:'#28ae80',strokeWidth:1.5,opacity:1},
    {x:113.75,y:190.75,radius:5,fill:'#abdc32',stroke:'#abdc32',strokeWidth:1.5,opacity:1}
  ];
  assert.deepEqual(symbols(p),expected);
  const {render}=await import('../../../../src/renderers/canvas/index.js');
  const {createMockCanvasContext,findCanvasCalls}=await import('../../../support/canvas.js');
  const context=createMockCanvasContext(); render(p,context);
  assert.deepEqual(findCanvasCalls(context,'arc').filter(c=>c.args[0]===113.75).map(c=>c.args.slice(0,3)),expected.map(s=>[s.x,s.y,s.radius]));
  const svg=renderToSVG(p);
  for(const s of expected) assert.ok(svg.includes(`cx="${s.x}" cy="${s.y}" r="5"`));
  const {renderToPNGBuffer}=await import('../../../../src/renderers/png.js');
  const {renderToPDFBuffer}=await import('../../../../src/renderers/pdf.js');
  const png=await renderToPNGBuffer(p), restored=deserializeProgram(serializeProgram(p));
  assert.deepEqual((await renderToPNGBuffer(restored)).buffer,png.buffer);
  const pdf=await renderToPDFBuffer(p);
  assert.deepEqual([png.width,png.height,pdf.width,pdf.height],[500,400,500,400]);
  assert.equal(Buffer.from(pdf.buffer).subarray(0,4).toString(),'%PDF');
});

test('Polar point facade forwards explicit sampled color while preserving its positional frame',()=>{
  const p=chart().createCanvas({width:800,height:700,margin:200}).createData({values:rows})
    .createPolarScatterPlot({theta:'x',radius:'y',color:{field:'v',fieldType:'quantitative'},guides:{axes:false,grid:false,legend:{representation:'symbols',values:samples,position:'top-left'}}});
  assert.deepEqual(symbols(p).map(s=>s.fill),['#472d7b','#2c728e','#28ae80','#abdc32']);
  assert.equal(p.semanticSpec.coordinates[0].type,'polar');
  assert.equal(p.semanticSpec.guides.legend.color.scale,'color');
});
