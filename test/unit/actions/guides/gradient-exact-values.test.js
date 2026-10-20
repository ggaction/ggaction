import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chart } from '../../../../src/index.js';
import { chart as basic } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { renderToPNG } from '../../../../src/renderers/png.js';
import { renderToPDF } from '../../../../src/renderers/pdf.js';
import { resolveSharedFacetLegends } from '../../../../src/grammar/facets/guides.js';

const rows=Object.freeze([{x:0,y:0,v:35,panel:'A'},{x:1,y:1,v:60,panel:'B'},{x:2,y:0,v:85,panel:'A'}].map(Object.freeze));
function source(channel='color',factory=chart,scale={domain:[35,85],palette:'viridis'}) {
 const p=factory().createCanvas({width:800,height:700,margin:200}).createData({values:rows});
 if(factory===basic&&channel==='stroke')return p.createScatterPlot({x:'x',y:'y',guides:false,stroke:{field:'v',fieldType:'quantitative',scale}});
 return p.createScatterPlot({x:'x',y:'y',guides:false})
  [channel==='color'?'encodeColor':'encodeStroke']({field:'v',fieldType:'quantitative',scale});
}
const kind=c=>c==='color'?'gradient':'strokeGradient';
const config=(p,c='color')=>p.guideConfigs.legend[kind(c)];
const items=(p,c,role)=>p.graphicSpec.objects[c+'Gradient'+role].items.map(i=>i.properties);
const labels=(p,c='color')=>items(p,c,'Labels').map(p=>p.text);
function assertFractions(p,c,expected,vertical=true){
 const strips=items(p,c,'Strips'),ticks=items(p,c,'Ticks');
 const start=Math.min(...strips.map(s=>vertical?s.y:s.x));
 const length=config(p,c).gradient.length;
 assert.equal(ticks.length,expected.length);
 expected.forEach((v,i)=>assert.ok(Math.abs((vertical?ticks[i].y1:ticks[i].x1)-(start+length*(vertical?1-v:v)))<1e-9));
}
for(const factory of [chart,basic])for(const channel of ['color','stroke'])test(`${factory===chart?'Full':'Basic'} ${channel} exact ticks preserve scale, marks, ramp and caller values`,()=>{
 const base=source(channel,factory),before=serializeProgram(base),values=Object.freeze([40,60,80]);
 const auto=base.createLegend({gradient:{length:125}}),p=base.createLegend({values,gradient:{length:125}});
 assert.deepEqual(labels(p,channel),['40','60','80']);assertFractions(p,channel,[.1,.5,.9]);
 assert.deepEqual(items(p,channel,'Strips').map(p=>p.fill),items(auto,channel,'Strips').map(p=>p.fill));
 assert.deepEqual(p.semanticSpec.scales,base.semanticSpec.scales);
 assert.deepEqual(p.graphicSpec.objects.scatterPlot,base.graphicSpec.objects.scatterPlot);
 assert.equal(serializeProgram(base),before);assert.deepEqual(values,[40,60,80]);
 assert.deepEqual(config(p,channel).sampling,{mode:'values',values:[40,60,80],count:5});
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 if(factory===chart){const q=p.editLegendLabels({fontSize:10}).editCanvas({width:820});
 assert.deepEqual(labels(q,channel),['40','60','80']);assertFractions(q,channel,[.1,.5,.9]);}
});
for(const channel of ['color','stroke'])test(`${channel} exact sampling edits preserve remembered count and reset explicitly`,()=>{
 const base=source(channel).createLegend({count:7}),before=serializeProgram(base),p=base.editLegend({values:[40,60,80]});
 assert.equal(config(p,channel).sampling.count,7);assert.deepEqual(labels(p,channel),['40','60','80']);
 assert.deepEqual(labels(p.editLegend({title:'Edited'}),channel),['40','60','80']);
 assert.throws(()=>p.editLegend({count:4}),/values to "auto"/);
 const q=p.editLegend({values:'auto'});assert.equal(config(q,channel).sampling,undefined);assert.equal(config(q,channel).count,7);assert.equal(labels(q,channel).length,7);
 const r=p.editLegend({values:'auto',count:3});assert.equal(labels(r,channel).length,3);
 assert.equal(serializeProgram(base),before);
 assert.throws(()=>p.editLegendBlock({target:'scatterPlot',channel,values:[50]}),/sampled legend block/);
 assert.deepEqual(labels(p.editLegend({channel,values:[50]}),channel),['50']);
});
for(const channel of ['color','stroke'])test(`${channel} invalid exact values and domain edits are atomic`,()=>{
 const base=source(channel),before=serializeProgram(base);
 for(const values of [[],[40,40],[60,40],[-0,0],[NaN],[Infinity],['40'],null,[34],[86],Array.from({length:101},(_,i)=>35+i/3)])assert.throws(()=>base.createLegend({values}));
 assert.throws(()=>base.createLegend({values:[40],count:3}));assert.throws(()=>base.createLegend({values:'auto'}));
 const p=base.createLegend({values:[40,60,80]}),frozen=serializeProgram(p);
 assert.throws(()=>p.editScale({id:channel,domain:[35,70]}),/outside the scale domain/);
 assert.throws(()=>p.editScale({id:channel,type:'quantize',range:['red','blue']}),/custom family settings/);
 assert.equal(serializeProgram(p),frozen);assert.equal(serializeProgram(base),before);
 assert.deepEqual(labels(base.createLegend({values:[60]}),channel),['60']);
});
for(const channel of ['color','stroke'])for(const position of ['left','right','top','bottom'])test(`${channel} explicit value geometry at ${position}`,()=>{
 const p=source(channel).createLegend({position,values:[40,60,80],gradient:{length:125}});
 assertFractions(p,channel,[.1,.5,.9],['left','right'].includes(position));
 assert.deepEqual(labels(p,channel),['40','60','80']);
});
for(const [name,scale,values,fractions]of [
 ['reversed',{domain:[85,35]},[40,60,80],[.9,.5,.1]],
 ['log',{type:'log',domain:[1,100]},[1,10,100],[0,.5,1]],
 ['sqrt',{type:'sqrt',domain:[0,100]},[0,25,100],[0,.5,1]],
 ['pow',{type:'pow',exponent:2,domain:[0,10]},[0,5,10],[0,.25,1]],
 ['symlog',{type:'symlog',constant:1,domain:[-9,9]},[-9,0,9],[0,.5,1]],
 ['midpoint',{domain:[0,100],midpoint:40},[20,80],[.2,.8]]
])test(`exact ticks use ${name} positions without inserting values`,()=>{
 const p=source('color',chart,scale).createLegend({values,gradient:{length:125}});
 assertFractions(p,'color',fractions);assert.equal(labels(p).length,values.length);
});
test('representation changes retain exact values while removing symbol-only settings',()=>{
 const p=source().createLegend({count:7}).editLegend({values:[40,60,80]});
 const s=p.editLegend({representation:'symbols'}),g=s.editLegend({representation:'gradient'});
 assert.deepEqual(config(s).sampling,{mode:'values',values:[40,60,80],count:7});
 assert.deepEqual(config(g).sampling,config(s).sampling);assertFractions(g,'color',[.1,.5,.9]);
 assert.equal(config(g).symbol,undefined);assert.equal(g.graphicSpec.objects.colorGradientSymbols,undefined);
 assert.equal(config(g.editLegend({values:'auto'})).sampling,undefined);
});
test('persistence rejects malformed gradient sampling even without an explicit representation tag',()=>{
 for(const channel of ['color','stroke']){
  const p=source(channel).createLegend({values:[40,60,80]}),before=serializeProgram(p);
  for(const sampling of [{mode:'auto',count:5},{mode:'values',count:5,values:[80,40]},{mode:'values',count:5,values:[40,90]},{mode:'values',count:3,values:[40]},{mode:'values',count:5,values:[40],extra:1}]){
   const corrupt=p._withLegendConfig(kind(channel),{...config(p,channel),sampling});assert.throws(()=>serializeProgram(corrupt));
  }
  assert.equal(serializeProgram(p),before);
 }
});
test('shared facet legends retain matching exact samples and reject mismatches',()=>{
 const p=source().createLegend({values:[40,60,80]});
 const f=p.facet({field:'panel',guides:{legend:'shared'}});
 assert.deepEqual(deserializeProgram(serializeProgram(f)).graphicSpec,f.graphicSpec);
 const children=[p,p.editLegend({values:[50,70]})].map((v,i)=>({id:'cell'+i,guideConfigs:v.guideConfigs,resolvedScales:v.resolvedScales}));
 assert.throws(()=>resolveSharedFacetLegends(children),/incompatible gradient legend config/);
});
test('explicit gradient ticks render through SVG, PNG and PDF without changing the ramp',async t=>{
 const p=source('stroke').createLegend({values:[40,60,80],gradient:{length:125,opacity:.7}});
 const svg=renderToSVG(p);assert.match(svg,/>40<\/text>/);assert.match(svg,/>60<\/text>/);assert.match(svg,/>80<\/text>/);
 const d=await mkdtemp(join(tmpdir(),'ggaction-gradient-exact-'));t.after(()=>rm(d,{recursive:true,force:true}));
 const png=join(d,'chart.png'),pdf=join(d,'chart.pdf');await renderToPNG(p,{output:png,pixelRatio:1});await renderToPDF(p,{output:pdf});
 assert.deepEqual([...((await readFile(png)).subarray(0,8))],[137,80,78,71,13,10,26,10]);assert.match((await readFile(pdf)).toString('latin1'),/^%PDF-/);
});
