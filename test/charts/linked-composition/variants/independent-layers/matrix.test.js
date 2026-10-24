import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../../src/index.js';
import {getPlotComposition} from '../../../../../src/inspection.js';
const rows=Array.from({length:30},(_,i)=>({g:['A','B','C'][i%3],v:2+i%11,x:i+1,a:i+2,b:i+3,c:i+4,id:`r${i}`}));
const base=()=>chart().createCanvas({plot:{width:420,height:340},margin:100}).createData({id:'d',values:rows});
const tests=[];
for(const horizontal of [false,true]) {
const xy=horizontal?{x:{field:'v',fieldType:'quantitative'},y:{field:'g',fieldType:'nominal'}}:{x:{field:'g',fieldType:'nominal'},y:{field:'v',fieldType:'quantitative'}};
for(const source of ['createBeeswarmPlot','createBoxPlot','createViolinPlot','createGradientPlot','createIntervalPlot'])
for(const dest of ['createScatterPlot','createBoxPlot','createViolinPlot','createGradientPlot','createIntervalPlot','createDotPlot','createLollipopPlot','createRaincloudPlot','createBeeswarmPlot','createRugPlot'])
 tests.push([`${horizontal?'h':'v'} ${source} -> ${dest}`,()=>base()[source]({id:'p',...xy,...(source==='createIntervalPlot'?{[horizontal?'x':'y']:{field:'v',center:'mean',extent:'ci'}}:{})}).createLayerPlot({source:'p',id:'q',plot:{action:dest,options:{}}})]);
}
for(const source of ['createScatterPlot','createLinePlot','createAreaPlot','createRegressionPlot','createHeatmap'])
for(const dest of ['createScatterPlot','createLinePlot','createAreaPlot','createRegressionPlot','createHeatmap','createTextPlot','createRugPlot'])
 tests.push([`${source} -> ${dest}`,()=>base()[source]({id:'p',x:'x',y:{field:'v',fieldType:'quantitative'},...(source==='createHeatmap'?{bin:{bins:8}}:source==='createAreaPlot'?{y:'v'}:{})}).createLayerPlot({source:'p',id:'q',plot:{action:dest}})]);
for(const source of ['createDensityPlot','createECDFPlot','createHistogram'])
for(const dest of [source,'createRugPlot']) tests.push([`${source} -> ${dest}`,()=>base()[source]({id:'p',field:'v'}).createLayerPlot({source:'p',id:'q',plot:{action:dest}})]);
for(const source of ['createPolarScatterPlot','createPolarLinePlot'])for(const dest of ['createPolarScatterPlot','createPolarLinePlot']) tests.push([`${source} -> ${dest}`,()=>base()[source]({id:'p',theta:'x',radius:'v'}).createLayerPlot({source:'p',id:'q',plot:{action:dest}})]);
for(const [action,options] of [['createRadarPlot',{wide:{fields:['a','b','c']},groupBy:'id'}],['createParallelCoordinates',{dimensions:['a','b','c']}],['createHorizonPlot',{x:'x',y:{field:'v',fieldType:'quantitative'}}]]) tests.push([action,()=>base()[action]({id:'p',...options}).createLayerPlot({source:'p',id:'q',plot:{action}})]);
for (const [name,run] of tests) test(name,()=>{ const p=run(); const descriptor=getPlotComposition(p,{target:'q'}); assert.ok(descriptor.ownedMarks.length); assert.equal(descriptor.data,'d'); });
