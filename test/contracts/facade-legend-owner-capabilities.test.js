import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../src/index.js';
import {appendFacadeLegendCombinations} from '../support/scenarios/realistic-facade-legend-combinations.js';
import {realisticRecordView} from '../support/scenarios/realistic-data.js';

function seed(){return chart().createCanvas({width:1800,height:1400,margin:400}).createData({id:'data',values:[{x:1,y:2,low:1,high:3,g:'A'},{x:2,y:3,low:2,high:4,g:'B'}]});}
for(const [action,options] of [
 ['createLinePlot',{x:'x',y:'y',color:'g'}],
 ['createBarPlot',{x:'x',y:'y',color:'g'}],
 ['createIntervalPlot',{x:'g',y:{center:'y',lower:'low',upper:'high'},color:'g'}],
 ['createDotPlot',{category:'g',value:'y'}]
]) test(`${action} rejects another mark's combined legend atomically`,()=>{
 const p=seed(),snapshot=structuredClone(p);
 assert.doesNotThrow(()=>p[action]({...options,guides:false}));
 for(const combine of ['size-shape','color-size']) {
  assert.throws(()=>p[action]({...options,guides:{axes:false,grid:false,legend:{combine}}}));
  assert.deepEqual(structuredClone(p),snapshot);
 }
});
test('categorical path legends reject bottom titles while gradient legends retain them',()=>{
 const p=seed(),snapshot=structuredClone(p);
 assert.throws(()=>p.createLinePlot({x:'x',y:'y',color:'g',guides:{axes:false,grid:false,legend:{position:'bottom',titlePosition:'bottom'}}}),/titlePosition/);
 assert.deepEqual(structuredClone(p),snapshot);
 const gradient=p.createScatterPlot({x:'x',y:'y',color:{field:'y',fieldType:'quantitative'},guides:{axes:false,grid:false,legend:{titlePosition:'bottom',direction:'horizontal',gradient:{length:120,thickness:16}}}});
 assert.equal(gradient.guideConfigs.legend.gradient.titlePosition,'bottom');
});
test('quantitative fusion rejects a polar point without changing its source program',()=>{
 const p=seed(),snapshot=structuredClone(p);
 assert.throws(()=>p.createPolarScatterPlot({
  theta:{field:'x',scale:{type:'linear'}},radius:{field:'y',scale:{type:'linear'}},
  color:{field:'y',fieldType:'quantitative',scale:{domain:[2,3]}},
  size:{field:'y',scale:{domain:[2,3]}},
  guides:{axes:false,grid:false,legend:{combine:'color-size'}}
 }),/Cartesian circle point/);
 assert.deepEqual(structuredClone(p),snapshot);
});
for(const dataset of ['tt-tour-de-france-winners','tt-london-marathon-winners','tt-penguins']) test(`point-owned facade combinations execute five times on ${dataset}`,()=>{
 const view=realisticRecordView(dataset,{rowLimit:24});
 const p=chart().createCanvas({width:3000,height:2200,margin:700}).createData({id:'analysisRows',values:view.rows});
 for(let repetition=0;repetition<5;repetition++) for(const action of ['createScatterPlot','createPolarScatterPlot','createStripPlot','createBeeswarmPlot','createRaincloudPlot']) {
  const result=appendFacadeLegendCombinations(p,{action,xField:'orderNumeric',yField:'value',numberField:'value',categoryField:'category',modes:action==='createPolarScatterPlot'||action==='createRaincloudPlot'?['size-shape']:['size-shape','color-size']});
  assert.deepEqual(result.semanticSpec.datasets.find(d=>d.id==='analysisRows').values,view.rows);
 }
});
