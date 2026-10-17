import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chart} from '../../../src/index.js';
if (!process.argv[2]) throw new Error('Provide the preserved source JSON path.');
const bytes=fs.readFileSync(process.argv[2]);const values=JSON.parse(bytes);
assert.equal(values.length,26265);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'1ae3e91972addcbdba23e94c13e30fce6708b402efe315403b1ed8b2d23ffd02');
const base=chart().createData({id:'raw',values})
 .createComputedData({id:'parsed',as:'instant',expression:{op:'parseTime',operand:{op:'concat',operands:[{op:'replaceLiteral',operand:{op:'replaceLiteral',operand:{op:'replaceLiteral',operand:{field:'date'},search:'/',replacement:'-'},search:'/',replacement:'-'},search:' ',replacement:'T'},{constant:'Z'}]},format:'auto'}})
 .createComputedData({id:'numeric',as:'measurement',expression:{op:'toNumber',operand:{field:'temperature'}}});
const evidence=[];
for(const [kind,expectedGroups] of [['clock',19194],['hour',10968],['minute',25909]]) {
 const expression=kind==='clock'?{op:'subtract',left:{field:'instant'},right:{op:'multiply',left:{op:'floor',operand:{op:'divide',left:{field:'instant'},right:{constant:86400000}}},right:{constant:86400000}}}:{op:'multiply',left:{op:'floor',operand:{op:'divide',left:{field:'instant'},right:{constant:kind==='hour'?3600000:60000}}},right:{constant:kind==='hour'?3600000:60000}};
 const program=base.createComputedData({id:'bucket',as:'bucket',expression})
  .createSummaryData({id:'means',groupBy:'bucket',aggregates:[{op:'mean',field:'measurement',as:'mean'}],members:'members'});
 const expected=new Map();
 for(const row of values) {
  const [year,month,day,hour,minute,second]=row.date.match(/\d+/g).map(Number);
  const key=kind==='clock'?((hour*60+minute)*60+second)*1000:Date.UTC(year,month-1,day,hour,kind==='hour'?0:minute);
  const group=expected.get(key)??{sum:0,count:0,raw:[]};group.sum+=Number(row.temperature);group.count++;group.raw.push(row);expected.set(key,group);
 }
 const output=program.semanticSpec.datasets.at(-1).values;
 assert.equal(expected.size,expectedGroups);assert.equal(output.length,expectedGroups);
 let maximumError=0,memberCount=0;const entries=[...expected.entries()];
 output.forEach((row,index)=>{
  const [key,group]=entries[index];assert.equal(row.bucket,key);
  const difference=Math.abs(row.mean-group.sum/group.count);maximumError=Math.max(maximumError,difference);
  assert.ok(difference<=1e-12);
  assert.deepEqual(row.members.map(({date,temperature})=>({date,temperature})),group.raw);memberCount+=row.members.length;
 });
 assert.deepEqual(program.semanticSpec.datasets[0].values,values);assert.equal(memberCount,26265);
 evidence.push({kind,groups:output.length,memberCount,maximumAbsoluteMeanError:maximumError,rawRowsUnchanged:true,pathHold:kind==='minute'});
}
console.log(JSON.stringify({sha256:createHash('sha256').update(bytes).digest('hex'),rawRows:values.length,evidence},null,2));
