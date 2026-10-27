import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { chart as basic } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { renderToPNGBuffer } from '../../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../../src/renderers/pdf.js';
const rows=Object.freeze([{x:0,y:0,v:35,panel:'A'},{x:1,y:1,v:60,panel:'B'},{x:2,y:0,v:85,panel:'A'}].map(Object.freeze));
const scale=Object.freeze({domain:Object.freeze([35,85]),range:Object.freeze(['blue','red'])});
const options=Object.freeze({field:'v',fieldType:'quantitative',scale});
function base(values=rows,mark={}){return chart().createCanvas({width:800,height:700,margin:200}).createData({id:'raw',values}).createTickMark({length:20,strokeWidth:1,...mark});}
const position=p=>p.encodeX({field:'x'}).encodeY({field:'y'});
const paint=p=>p.graphicSpec.objects.tick.items.map(i=>i.properties.stroke);
const properties=p=>p.graphicSpec.objects.tick.items.map(i=>i.properties);

test('numeric Tick color has literal mapped stroke colors and unchanged endpoints',()=>{
 const original=position(base()),before=serializeProgram(original),p=original.encodeColor(options);
 assert.deepEqual(paint(p),['#0000ff','#800080','#ff0000']);
 assert.equal(p.semanticSpec.layers[0].encoding.color.field,'v');assert.equal(p.semanticSpec.layers[0].encoding.stroke,undefined);
 for(let i=0;i<3;i++)for(const k of ['x1','x2','y1','y2','strokeWidth','opacity'])assert.equal(properties(p)[i][k],properties(original)[i][k]);
 assert.deepEqual(p.semanticSpec.datasets[0].values,rows);assert.equal(serializeProgram(original),before);
 assert.equal(p.markConfigs.tick.stroke,undefined);assert.deepEqual(options.scale.domain,[35,85]);
});
test('color before positions and Rug scaffold converge with complete Tick authoring',()=>{
 const first=base().encodeColor(options);assert.deepEqual(first.graphicSpec.objects.tick.items,[]);
 const p=position(first),q=position(base()).encodeColor(options);assertEquivalentMeaning(p.graphicSpec,q.graphicSpec);
 const rug=chart().createCanvas({width:800,height:700,margin:200}).createData({id:'raw',values:rows})
  .createRugPlot({x:'x',edge:'bottom',guides:false}).editTickMark({length:20,strokeWidth:1})
  .encodeY({field:'y'}).encodeColor(options);
 assert.deepEqual(rug.graphicSpec.objects.rugPlot.items.map(i=>i.properties),properties(q));
});
test('color legends use solid mapped ramps, exact ticks and sampled color symbols',()=>{
 const p=position(base()).encodeColor(options).createLegend({values:[40,60,80],gradient:{length:125}});
 assert.deepEqual(p.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),['40','60','80']);
 assert.equal(p.graphicSpec.objects.strokeGradientStrips,undefined);
 assert.equal(p.graphicSpec.objects.colorGradientStrips.items.length,60);
 assert(p.graphicSpec.objects.colorGradientStrips.items.every(i=>i.properties.fill===i.properties.stroke&&i.properties.strokeWidth===0));
 const symbols=p.editLegend({representation:'symbols'});assert.deepEqual(symbols.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),['40','60','80']);
 assert.equal(symbols.graphicSpec.objects.colorGradientSymbols.items.length,3);
 assert.deepEqual(properties(symbols),properties(p));
 assert.deepEqual(deserializeProgram(serializeProgram(symbols)).graphicSpec,symbols.graphicSpec);
});
for(const type of ['quantize','quantile','threshold'])test(`${type} Tick color uses the existing numeric interval legend`,()=>{
 const sc={type,range:['blue','red'],...(type==='threshold'?{domain:[60]}:type==='quantize'?{domain:[35,85]}:{})};
 const p=position(base()).encodeColor({field:'v',fieldType:'quantitative',scale:sc}).createLegend();
 assert.deepEqual(paint(p),['blue','red','red']);
 assert(p.guideConfigs.legend.interval);assert.equal(p.guideConfigs.legend.gradient,undefined);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});
for(const [type,extra,values]of [
 ['log',{},[1,10,100]],['sqrt',{},[0,25,100]],['pow',{exponent:2},[0,5,10]],['symlog',{constant:1},[-9,0,9]]
])test(`${type} numeric colors preserve Tick geometry and use an existing mapper`,()=>{
 const data=values.map((v,i)=>({x:i,y:i,v}));
 const p=position(base(data)).encodeColor({field:'v',fieldType:'quantitative',scale:{type,...extra,domain:[values[0],values[2]],range:['blue','red']}});
 assert.equal(paint(p)[0],'#0000ff');assert.equal(paint(p)[2],'#ff0000');
 const expected=type==='pow'?'#4000bf':'#800080';assert.equal(paint(p)[1],expected);
 assert.deepEqual(properties(p).map(i=>Math.hypot(i.x1-i.x2,i.y1-i.y2)),[20,20,20]);
});
test('temporal Tick color retains raw dates and uses the shared color legend',()=>{
 const data=[{x:0,y:0,t:'2020-01-01'},{x:1,y:1,t:'2020-01-03'}],domain=[Date.UTC(2020,0,1),Date.UTC(2020,0,3)];
 const p=position(base(data)).encodeColor({field:'t',fieldType:'temporal',scale:{domain,range:['blue','red']}})
  .createLegend({values:domain,labels:{format:'%Y-%m-%d'}});
 assert.deepEqual(paint(p),['#0000ff','#ff0000']);assert.deepEqual(p.semanticSpec.datasets[0].values,data);
 assert.deepEqual(p.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.text),['2020-01-01','2020-01-03']);
});
test('Tick color and stroke assignments reject ambiguous paint atomically',()=>{
 const p=position(base()).encodeColor(options),before=serializeProgram(p),s=position(base()).encodeStroke(options),strokeBefore=serializeProgram(s);
 for(const update of [()=>p.encodeStroke({value:'green'}),()=>p.encodeStroke(options),()=>p.editTickMark({stroke:'green'})])assert.throws(update,/Tick color and stroke cannot coexist/);
 assert.throws(()=>s.encodeColor(options),/Tick color and stroke cannot coexist/);
 assert.equal(serializeProgram(p),before);assert.equal(serializeProgram(s),strokeBefore);
 const withLegend=p.createLegend({values:[40,60,80]}),removed=withLegend.removeEncoding({channel:'color'});
 assert.equal(removed.semanticSpec.layers[0].encoding.color,undefined);assert.equal(removed.guideConfigs.legend?.gradient,undefined);
 assert.deepEqual(paint(removed),['#4c78a8','#4c78a8','#4c78a8']);
 assert.deepEqual(paint(removed.encodeStroke(options)),paint(p));
 const constant=position(base(rows,{stroke:'green'})).encodeColor(options).removeEncoding({channel:'color'});
 assert.deepEqual(paint(constant),['#4c78a8','#4c78a8','#4c78a8']);
});
test('unsupported categorical, layout, aggregate and unknown requests retain prior state',()=>{
 const p=position(base()),before=serializeProgram(p);
 for(const bad of [{field:'panel'},{field:'panel',fieldType:'ordinal'},{...options,layout:'overlay'},{...options,aggregate:'mean'},{...options,scale:{...scale,unknown:'gray'}}])assert.throws(()=>p.encodeColor(bad));
 assert.equal(serializeProgram(p),before);assert.equal(basic().createTickMark,undefined);assert.equal(basic().createRugPlot,undefined);
});
test('missing Tick color follows error/skip without replacing raw data',()=>{
 const data=[{x:0,y:0,v:35},{x:1,y:1,v:null},{x:2,y:0,v:85}];
 const p=position(base(data)),before=serializeProgram(p);assert.throws(()=>p.encodeColor(options));assert.equal(serializeProgram(p),before);
 const skip=position(base(data,{missing:'skip'})).encodeColor(options);
 assert.deepEqual(paint(skip),['#0000ff','#ff0000']);assert.deepEqual(skip.semanticSpec.datasets[0].values,data);
 assert.deepEqual(deserializeProgram(serializeProgram(skip)).graphicSpec,skip.graphicSpec);
});
test('Canvas, scale, data and selection replay retain the numerical color mapping',()=>{
 const p=position(base()).encodeColor(options).createLegend({values:[40,60,80]});
 const q=p.editCanvas({width:840}).editColorScale({reverse:true});assert.deepEqual(paint(q),['#ff0000','#800080','#0000ff']);
 const revised=p.reviseData({source:'raw',id:'revision',values:[{x:1,y:1,v:85}]});
 assert.deepEqual(paint(revised),['#ff0000']);assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
 const selected=p.selectMarks({id:'chosen',channel:'color',op:'eq',value:35}).highlightMarks({selection:'chosen',color:'orange'});
 assert.equal(paint(selected).at(-1),'orange');assert.deepEqual(paint(selected).slice(0,-1),paint(p).slice(1));
 assert.deepEqual(deserializeProgram(serializeProgram(selected)).graphicSpec,selected.graphicSpec);
 assert.equal(paint(selected.editCanvas({width:820})).at(-1),'orange');
});
test('Tick clipping, facet shared legends and persistence keep one color owner',()=>{
 const p=position(base(rows,{clip:true})).encodeColor(options).createLegend({values:[40,60,80]});
 assert.deepEqual(p.graphicSpec.objects.tick.clip,{x:200,y:200,width:400,height:300});
 const f=p.facet({field:'panel',guides:{legend:'shared'}});assert.deepEqual(Object.keys(f.guideConfigs.legend),['gradient']);
 assert.deepEqual(deserializeProgram(serializeProgram(f)).graphicSpec,f.graphicSpec);
 const layer=p.semanticSpec.layers[0],corrupt=p.editSemantic({property:'layer[tick].encoding.stroke.field',value:'v'}).editSemantic({property:'layer[tick].encoding.stroke.fieldType',value:'quantitative'}).editSemantic({property:'layer[tick].encoding.stroke.scale',value:layer.encoding.color.scale});
 assert.throws(()=>serializeProgram(corrupt),/Tick color and stroke cannot coexist/);
});
test('solid Tick colors are renderer-equivalent to existing stroke mapping before adding a color legend',async()=>{
 const baseProgram=position(base()),p=baseProgram.encodeColor(options),s=baseProgram.encodeStroke(options);
 assert.deepEqual(properties(p),properties(s));assert.equal(renderToSVG(p),renderToSVG(s));
 assert.deepEqual((await renderToPNGBuffer(p)).buffer,(await renderToPNGBuffer(s)).buffer);
 const ramp=p.createLegend({values:[40,60,80],gradient:{length:125,opacity:.7}});
 assert.ok((await renderToPNGBuffer(ramp)).buffer.length>100);assert.ok((await renderToPDFBuffer(ramp)).buffer.length>100);
 assert.deepEqual(deserializeProgram(serializeProgram(ramp)).graphicSpec,ramp.graphicSpec);
});
