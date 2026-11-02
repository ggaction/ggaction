import assert from 'node:assert/strict';
import test from 'node:test';
import {getErrorDetails} from '../../../src/core/diagnostics.js';
import {chart} from '../../../src/index.js';
import {planTransition,sampleTransition} from '../../../src/animation.js';
import {exportTransitionPlan,restoreTransitionPlan} from '../../../src/animation/planner.js';
import {prepareAnimationColumns,restoreAnimationColumns,validateAnimationColumns} from '../../../src/animation/columnCodec.js';
import {encodeAnimationEnvelope,decodeAnimationEnvelope,validateAnimationEnvelopeAllocation} from '../../../src/animation/envelopeCodec.js';
import {createOfflineResourceScope} from '../../../src/animation/resources.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const compact=root=>({kind:'animation-columns',version:1,root,vectors:[]});
const roundtrip=value=>{const prepared=prepareAnimationColumns(value);assert.equal(prepared.metrics.logicalValues,prepared.metrics.validatedLogicalValues);return restoreAnimationColumns(decodeAnimationEnvelope(encodeAnimationEnvelope(prepared.compact)));};
const point=()=>chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
 .createData({id:'rows',keyField:'id',values:[{id:0,x:.2,y:.3},{id:1,x:.3,y:.4}]})
 .createPointMark({id:'points'}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});

test('private columns preserve independent literal rows including absence undefined holes tuples and key order',()=>{
 const expected=[{b:2,a:undefined},null,undefined,,{a:4,b:3},[,5],[],{}];
 Object.defineProperty(expected[4],'__proto__',{value:{safe:true},enumerable:true,writable:true,configurable:true});
 const restored=roundtrip(expected);assert.deepEqual(restored,expected);
 assert.deepEqual(Object.keys(restored[0]),['b','a']);assert.ok(Object.hasOwn(restored[0],'a'));
 assert.ok(Object.hasOwn(restored,2));assert.ok(!Object.hasOwn(restored,3));assert.ok(!Object.hasOwn(restored[5],0));
 assert.deepEqual(Object.keys(restored[4]),['a','b','__proto__']);assert.equal(Object.getPrototypeOf(restored[4]),Object.prototype);
});

test('scalar runs preserve exact repeated values and complete logical row count',()=>{
 const expected=Array.from({length:120},(_,i)=>({x:i<40?-0:i<80?NaN:3n,fill:i<60?'red':'blue'}));
 const prepared=prepareAnimationColumns(expected);assert.match(JSON.stringify(prepared.compact,(_,v)=>typeof v==='bigint'?'bigint':v),/runs/);
 assert.deepEqual(restoreAnimationColumns(prepared.compact),expected);assert.equal(prepared.metrics.logicalValues,361);
 assert.ok(prepared.metrics.encodedValues<120);assert.ok(Object.is(restoreAnimationColumns(prepared.compact)[0].x,-0));
});

test('exact scalar vectors intern values while preserving signed zero and typed values',()=>{
 const values=Array.from({length:40},(_,i)=>({a:i,b:i,c:i===0?-0:i,d:i===0?'0':i}));
 const prepared=prepareAnimationColumns(values),restored=restoreAnimationColumns(prepared.compact);
 assert.deepEqual(restored,values);assert.equal(prepared.compact.vectors.length,3);
});

test('literal fallback and snapshots preserve mixed data styles and later caller mutation',()=>{
 const shared={opacity:.5},expected={mixed:[7,{x:1},,undefined],styles:[{paint:{color:'red'},shared},{paint:{color:'blue'},shared}],special:[Infinity,-Infinity,NaN,-0,4n]};
 const prepared=prepareAnimationColumns(expected),before=structuredClone(expected);expected.mixed[1].x=99;shared.opacity=1;
 assert.deepEqual(restoreAnimationColumns(prepared.compact),before);assert.ok(Object.isFrozen(prepared.compact));
 assert.deepEqual(roundtrip([]),[]);assert.deepEqual(roundtrip({}),{});
});

test('external array nodes and shared descriptor nodes retain their logical expansion charge',()=>{
 const literal={literal:{x:1}},root={object:[['a',literal],['b',literal],['array',{array:[{literal:1},{literal:undefined}]}]]};
 assert.deepEqual(restoreAnimationColumns(compact(root)),{a:{x:1},b:{x:1},array:[1,undefined]});
 assert.equal(validateAnimationColumns(compact(root)).logicalValues,8);
});

test('native sampled and partition payloads retain every field and existing semantic validation',()=>{
 const from=point(),to=from.editScale({id:'x',domain:[0,2],nice:false}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}});
 const middle=sampleTransition(plan,37),rebased=planTransition({from:middle,to,options:{durationMs:100,easing:'linear'}});
 const {before,after}=partitionFrameEndpoints({labels:true,clip:true});
 const partition=planTransition({from:before,to:after,options:{durationMs:100,easing:'linear'}});
 for(const native of[plan,rebased,partition]){
  const raw=exportTransitionPlan(native),decoded=roundtrip(raw);assert.deepEqual(decoded,raw);
  const restored=restoreTransitionPlan(decoded);for(const time of[0,29,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(native,time));
 }
 const raw=roundtrip(exportTransitionPlan(plan));raw.from.positions[1].x.value=999;
 assert.throws(()=>restoreTransitionPlan(raw),/differs/);
});

test('closed external headers nodes and object entries reject malformed data',()=>{
 for(const mutate of[p=>p.kind='other',p=>p.version=2,p=>p.extra=true,p=>delete p.root,p=>p.root={other:1},p=>p.root={literal:1,array:[]},p=>p.root={object:[['a',{literal:1}],['a',{literal:2}]]},p=>p.root={object:[[3,{literal:1}]]},p=>p.root={object:[[]]},p=>p.root={array:Array(1)},p=>p.vectors=[[{}]]]){
  const input=compact({literal:1});mutate(input);assert.throws(()=>restoreAnimationColumns(input));
 }
});

const records=()=>compact({records:{length:2,shapes:[{keys:['x']}],shape:{constant:0},columns:[[0,[['x',{vector:0}]]]]}});

test('external lengths references shapes and dense columns reject forged descriptors',()=>{
 for(const mutate of[p=>p.root.records.length=-1,p=>p.root.records.length=.5,p=>p.root.records.shape={constant:4},p=>p.root.records.shape={node:{literal:[0,0]}},p=>p.root.records.shapes=[{keys:['x','x']}],p=>p.root.records.shapes=[{keys:[7]}],p=>p.root.records.shapes=[{hole:false}],p=>p.root.records.shapes=[{literal:3}],p=>p.root.records.shapes=[{length:2,keys:['01']}],p=>p.root.records.shapes=[{length:1,keys:['1']}],p=>p.root.records.columns=[],p=>p.root.records.columns.push(p.root.records.columns[0]),p=>p.root.records.columns[0][1].push(['y',{constant:1}]),p=>p.root.records.columns[0][1].push(['x',{constant:1}]),p=>p.root.records.columns[0][1][0][1]={vector:-1},p=>p.root.records.columns[0][1][0][1]={vector:.5},p=>p.root.records.columns[0][1][0][1]={vector:1},p=>p.vectors=[[1]],p=>p.root.records.columns[0][1][0][1]={node:{literal:[1]}}]){
  const input=records();input.vectors=[[1,2]];mutate(input);assert.throws(()=>restoreAnimationColumns(input));
 }
});

test('scalar run lengths values overflow and expansion fail before materialization',()=>{
 for(const runs of[[[0,0]], [[-1,0]], [[.5,0]], [[3,0]], [[1,0]], [[Number.MAX_SAFE_INTEGER,0],[1,0]], [[2,{}]], [[2]], Array(1)]){
  const input=records();input.vectors=[];input.root.records.columns[0][1][0][1]={runs};assert.throws(()=>restoreAnimationColumns(input));
 }
 const expansion=compact({records:{length:100000,shapes:[{keys:['x']}],shape:{constant:0},columns:[[0,[['x',{constant:Array(101).fill(1)}]]]]}});
 assert.throws(()=>restoreAnimationColumns(expansion),e=>getErrorDetails(e)?.code==='resource-limit'&&getErrorDetails(e)?.limit===10000000);
 const huge=compact({records:{length:10000000,shapes:[{hole:true}],shape:{constant:0},columns:[]}});
 assert.throws(()=>restoreAnimationColumns(huge),/expandedValues/);
});

test('plain-data boundaries reject getters cycles and executable data before reading',()=>{
 let reads=0;const input={get x(){reads++;return 1;}};assert.throws(()=>prepareAnimationColumns(input),/accessor/);assert.equal(reads,0);
 const external=compact({literal:1});Object.defineProperty(external,'root',{get(){reads++;return {literal:1};},enumerable:true});assert.throws(()=>restoreAnimationColumns(external),/accessor/);assert.equal(reads,0);
 const cycle={};cycle.self=cycle;assert.throws(()=>prepareAnimationColumns(cycle),/acyclic/);assert.throws(()=>prepareAnimationColumns({x(){}}));assert.throws(()=>prepareAnimationColumns(new Date()));
});

test('external nested array columns and mixed literal columns restore every actual cell',()=>{
 const input=records();input.vectors=[];
 input.root.records.columns[0][1][0][1]={node:{array:[{literal:{paint:'red'}},{literal:'none'}]}};
 assert.deepEqual(restoreAnimationColumns(input),[{x:{paint:'red'}},{x:'none'}]);
 const mixed=[{paint:7},{paint:{fill:'red'}}];assert.deepEqual(roundtrip(mixed),mixed);
 const hole=records();hole.vectors=[];
 hole.root.records.columns[0][1][0][1]={node:{records:{length:2,shapes:[{hole:true}],shape:{constant:0},columns:[]}}};
 assert.deepEqual(restoreAnimationColumns(hole),[{x:undefined},{x:undefined}]);
});

test('closed shape variants never read inherited optional getters',()=>{
 const input=records();input.vectors=[];input.root.records.columns[0][1][0][1]={constant:1};
 let reads=0,decoded,prepared,nestedRejected;
 const names=['hole','keys','array'];
 const prior=names.map(name=>Object.getOwnPropertyDescriptor(Object.prototype,name));
 try {
  for(const name of names)Object.defineProperty(Object.prototype,name,{configurable:true,get(){reads++;return true;}});
  decoded=restoreAnimationColumns(input);
  prepared=prepareAnimationColumns([null,{x:1}]).compact;
  const bad=records();bad.vectors=[];bad.root.records.columns[0][1][0][1]={node:{object:[]}};
  try{restoreAnimationColumns(bad);}catch(error){nestedRejected=error instanceof RangeError;}
 }finally{
  names.forEach((name,index)=>{if(prior[index]===undefined)delete Object.prototype[name];else Object.defineProperty(Object.prototype,name,prior[index]);});
 }
 assert.equal(reads,0);assert.equal(nestedRejected,true);
 assert.deepEqual(decoded,[{x:1},{x:1}]);assert.deepEqual(restoreAnimationColumns(prepared),[null,{x:1}]);
});

test('wide closed row shapes preserve all fields their order and exact accounting',()=>{
 const keys=Array.from({length:5000},(_,index)=>'field'+index);
 const input=compact({records:{length:1,shapes:[{keys}],shape:{constant:0},columns:[[0,keys.map((key,index)=>[key,{constant:index}])]]}});
 const checked=validateAnimationColumns(input),expected=Object.fromEntries(keys.map((key,index)=>[key,index]));
 assert.equal(checked.logicalValues,5002);assert.equal(checked.descriptorVisits,5000);assert.equal(checked.cellVisits,5001);
 assert.deepEqual(checked.restore(),[expected]);assert.deepEqual(Object.keys(checked.restore()[0]),keys);
 input.root.records.columns[0][1][4999][0]='absent';assert.throws(()=>restoreAnimationColumns(input),/differ from shape/);
});

test('preallocation encoding estimates match independent literal tagged layouts and UTF8 byte counts',async()=>{
 const {inspectAnimationEnvelopeValue}=await import('../../../src/animation/envelopeCodec.js');
 const cases=[[null,1,4],[undefined,2,13],[NaN,3,16],[-0,3,15],[2n,3,14],[[],3,12],[{},3,13],[{length:2,a:3},9,33],[Array(2),7,29],[{a:undefined},7,32],['\ud800',1,8],['\n',1,4],['😀',1,6]];
 for(const[value,count,bytes]of cases){const estimate=inspectAnimationEnvelopeValue(value,false,true);assert.equal(estimate.estimatedEncodedValues,count);assert.equal(estimate.estimatedEncodedBytes,bytes);}
});


test('encoded expansion and escaped bytes fail in the estimate before tagged output allocation',async()=>{
 const {inspectAnimationEnvelopeValue}=await import('../../../src/animation/envelopeCodec.js');
 const input=Array.from({length:180000},()=>({x:1}));
 assert.throws(()=>inspectAnimationEnvelopeValue(input,false,true),e=>getErrorDetails(e)?.code==='resource-limit');
 assert.throws(()=>inspectAnimationEnvelopeValue('\0'.repeat(12*1024*1024),false,true),e=>getErrorDetails(e)?.optionPath==='animation.bytes');
 // These strings would reach vector and shape-key interning respectively.
 // Their escaped tagged JSON must be rejected before the interning encoding.
 const escaped='\0'.repeat(12*1024*1024);
 const scope=createOfflineResourceScope({maxOutputNodes:100001});
 assert.throws(()=>prepareAnimationColumns([{x:escaped},{x:'other'}],scope),e=>getErrorDetails(e)?.optionPath==='animation.bytes');
 assert.throws(()=>prepareAnimationColumns([{[escaped]:1},{small:2}],scope),e=>getErrorDetails(e)?.optionPath==='animation.bytes');
});

test('intern buckets compare complete scalar vectors and ordered shape keys after collisions',()=>{
 const values=[{first:1,middle:2,last:4},{first:1,middle:3,last:4},{type:'circle',x:1},{type:'path',x:1},{type:{raw:1},x:1}];
 assert.deepEqual(roundtrip(values),values);
 const collision=Array.from({length:4},(_,i)=>({a:[NaN,0,1,undefined][i],b:[NaN,-0,1,undefined][i],c:[NaN,0,2,undefined][i]}));
 const prepared=prepareAnimationColumns(collision);assert.equal(prepared.compact.vectors.length,3);assert.deepEqual(restoreAnimationColumns(prepared.compact),collision);
 const ordered=[{a:1,b:2,z:3},{a:1,c:2,z:3},{a:1,z:3,b:2}];assert.deepEqual(roundtrip(ordered),ordered);
});

test('unique retained lower bounds reject escaped accumulation while exact duplicates remain valid',()=>{
 const scope=createOfflineResourceScope({maxOutputNodes:100001}),nul='\0'.repeat(400000);
 const unique=[0,1].map(row=>Object.fromEntries(Array.from({length:16},(_,column)=>['field'+column,nul+row+':'+column])));
 assert.throws(()=>prepareAnimationColumns(unique,scope),error=>getErrorDetails(error)?.optionPath==='animation.bytes');
 const duplicate=[0,1].map(row=>Object.fromEntries(Array.from({length:16},(_,column)=>['field'+column,nul+row])));
 const prepared=prepareAnimationColumns(duplicate,scope);
 assert.equal(prepared.compact.vectors.length,1);assert.deepEqual(restoreAnimationColumns(prepared.compact,scope),duplicate);
 assert.ok(prepared.metrics.uniqueLowerBound.bytes<67108864);assert.ok(prepared.metrics.interningWork<=140000000);
});

test('independent intern work and envelope allocation enforce their exact fixed bounds',()=>{
 validateAnimationEnvelopeAllocation(1000000,1000000,67108864);
 for(const counts of[[1000001,1,1],[1,1000001,1],[1,1,67108865],[-1,1,1],[1,1,NaN]])assert.throws(()=>validateAnimationEnvelopeAllocation(...counts),error=>getErrorDetails(error)?.code==='resource-limit');
 // Two ordered shape trie traversals charge14; vector probes charge length+8.
 const length=10000000-22;
 const exact=prepareAnimationColumns([{x:'a'.repeat(length)},{x:'other'}]);assert.equal(exact.metrics.interningWork,10000000);
 const over=[{x:'a'.repeat(length+1)},{x:'other'}];assert.throws(()=>prepareAnimationColumns(over),error=>getErrorDetails(error)?.limit===10000000);
 const scoped=prepareAnimationColumns(over,createOfflineResourceScope({maxOutputNodes:100001}));assert.equal(scoped.metrics.interningWork,10000001);assert.deepEqual(restoreAnimationColumns(scoped.compact),over);
});
