// Development reproduction only; no package mutation or external request.
import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
const canvas={width:240,height:120,margin:{left:20,right:100,top:10,bottom:20}},values=[{id:0},{id:1}],scale={domain:['Regression','Reference'],range:['firebrick','black'],unknown:'transparent'};
const base=chart().createCanvas(canvas).createData({values});
const point=base.createScatterPlot({x:'id',y:'id',guides:false}).encodeColor({field:'kind',fieldType:'nominal',scale});
assert.equal(point.graphicSpec.objects.scatterPlot.items.length,2);assert.deepEqual(point.semanticSpec.datasets[0].values,values);
const results=[];for(const alias of [false,true]){let p=base,field='kind';if(alias){p=p.createComputedData({id:'display',as:'displayKey',expression:{constant:'undefined'}});field='displayKey';}try{p=p.createLinePlot({x:'id',y:'id',guides:false}).encodeColor({field,fieldType:'nominal',scale});results.push({alias,status:'accepted'});}catch(error){results.push({alias,status:'rejected',error:error.message});}}
assert(results.every(r=>r.status==='rejected'));assert(results[0].error.includes('nominal value'));assert(results[1].error.includes('row-owned point'));assert.deepEqual(base.semanticSpec.datasets[0].values,values);assert(values.every(r=>!Object.hasOwn(r,'kind')));
console.log(JSON.stringify({status:'reproduced',existingPointControl:'pass',rawRowsUnchanged:true,rows:2,results,publicApiChanged:false,schoolRequests:0,chartPixelsInspected:false},null,2));
