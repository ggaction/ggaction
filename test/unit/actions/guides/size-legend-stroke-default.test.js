import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {renderToSVG} from '../../../../src/renderers/svg.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';

function base(type='linear',position='right'){
 const domain=type==='ordinal'?['small','large']:[0,2];
 return chart().createCanvas({width:700,height:600,margin:{left:80,right:260,top:80,bottom:100}})
  .createData({values:[{x:0,y:0,s:type==='ordinal'?'small':1,c:'A'},{x:1,y:1,s:type==='ordinal'?'large':2,c:'B'}]})
  .createScatterPlot({x:{field:'x'},y:{field:'y'},guides:false})
  .encodeColor({field:'c',fieldType:'nominal'})
  .encodeSize({field:'s',fieldType:type==='ordinal'?'nominal':'quantitative',scale:{type,domain,range:[1,100]}})
  .createLegend({channels:['color'],position,labels:{fontSize:10}})
  .createLegend({channels:['size'],position,labels:{fontSize:10}});
}
function symbols(p){return p.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.properties);}
for(const type of['linear','ordinal','quantize'])for(const position of['right','top-left']){
 test(`size block stroke defaults render through ${type} ${position} refresh and persistence`,()=>{
  const p=base(type,position),snapshot=JSON.stringify(p),input={target:'scatterPlot',channel:'size',symbol:{fill:'orange',opacity:.7,stroke:'transparent'}},saved=structuredClone(input);
  const q=p.editLegendBlock(input);
  assert.deepEqual(input,saved);assert.equal(JSON.stringify(p),snapshot);
  assert(symbols(q).every(s=>s.stroke==='transparent'&&s.strokeWidth===0));
  assert.match(renderToSVG(q),/<svg/);
  const replay=q.editCanvas({width:750}).editSizeScale({target:'scatterPlot',range:[4,64]});
  assert(symbols(replay).every(s=>s.stroke==='transparent'&&s.strokeWidth===0));assert.match(renderToSVG(replay),/<svg/);
  const restored=deserializeProgram(serializeProgram(q));assert.deepEqual(restored.graphicSpec,q.graphicSpec);assert.match(renderToSVG(restored),/<svg/);
  const explicit=q.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{stroke:'black',strokeWidth:2}});
  assert(symbols(explicit).every(s=>s.stroke==='black'&&s.strokeWidth===2));assert.match(renderToSVG(explicit),/<svg/);
  const replaced=explicit.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{stroke:'orange'}});
  assert(symbols(replaced).every(s=>s.stroke==='orange'&&s.strokeWidth===0));assert.match(renderToSVG(replaced),/<svg/);
  const cleared=q.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{}});
  assert.deepEqual(cleared.graphicSpec,p.graphicSpec);assert.equal(JSON.stringify(p),snapshot);
 });
}
test('omitted size stroke retains the exact existing unoutlined sample properties',()=>{
 const p=base(),q=p.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{fill:'orange'}});
 assert(symbols(q).every(s=>s.stroke===undefined&&s.strokeWidth===undefined));assert.match(renderToSVG(q),/<svg/);
 const before=JSON.stringify(p);
 for(const width of[-1,Infinity,NaN])assert.throws(()=>p.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{stroke:'black',strokeWidth:width}}));
 assert.equal(JSON.stringify(p),before);
});

test('inferred zero size sample outline matches explicit zero in SVG and native Canvas PNG',async()=>{
 const {renderToPNGBuffer}=await import('../../../../src/renderers/png.js');
 const p=base('ordinal'),input={target:'scatterPlot',channel:'size',symbol:{fill:'orange',opacity:.7,stroke:'transparent'}},q=p.editLegendBlock(input),explicit=p.editLegendBlock({...input,symbol:{...input.symbol,strokeWidth:0}});
 assert.deepEqual(q.graphicSpec,explicit.graphicSpec);
 assert.equal(renderToSVG(q),renderToSVG(explicit));
 const [a,b]=await Promise.all([renderToPNGBuffer(q),renderToPNGBuffer(explicit)]);
 assert(a.bytes>0);assert.equal(a.width,700);assert.equal(a.height,600);assert.deepEqual(a.buffer,b.buffer);
});
