import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../src/index.js';

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
