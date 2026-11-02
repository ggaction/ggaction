import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createStrictTaggedCursor as create,advanceStrictTaggedCursor as advance,clearStrictTaggedCursor as clear} from '../../../../../.artifacts/tagged-cursor/prototype.mjs';
import {scanJSONString} from '../../../../../.artifacts/tagged-cursor/scalar.generated.mjs';
import {encodeValue} from '../../../../../src/core/valueEncoding.js';
import {canonicalJSON} from '../../../../../src/core/contentDigest.js';
import {createSha256State,updateSha256,finishSha256,clearSha256} from '../../../../../src/core/sha256.js';
import {validateInferenceBytes} from '../../../../../src/grammar/graph/inferenceBudget.js';
const encoder=new TextEncoder(),limits={maxBytes:1000000,maxDepth:64,maxSteps:1000000};
const expected=value=>encoder.encode(canonicalJSON(encodeValue(value)));
function frozen(value,seen=new Set()){if(value===null||typeof value!=='object'||seen.has(value))return value;seen.add(value);for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))frozen(descriptor.value,seen);return Object.freeze(value);}
function drain(value,{bytes=7,steps=5,limit=limits}={}){
 const cursor=create(value,limit),sha=createSha256State(),parts=[];let size=0,last;
 try{do{last=advance(cursor,{maxBytes:bytes,maxSteps:steps});parts.push(last.bytes);size+=last.bytes.length;updateSha256(sha,last.bytes);}while(!last.done);
 const all=new Uint8Array(size);let at=0;for(const part of parts){all.set(part,at);at+=part.length;}return {bytes:all,hash:finishSha256(sha),stats:last.stats,chunks:parts.length};
 }finally{clear(cursor);clearSha256(sha);}
}
const groups=[];
const shared=frozen({x:['é','🌍',-0,NaN,undefined]}),sparse=[];sparse.length=5;sparse[2]=undefined;sparse[4]='end';
const values=[null,true,false,0,-0,NaN,Infinity,-Infinity,undefined,1e-300,1e300,12345678901234567890n,'',
 '\b\t\n\f\r\0\u001f"\\é한🙂\ud800x\udc00',[],{},sparse,{b:1,a:2,10:'ten',2:'two'},
 Object.assign(Object.create(null),{a:1}),['number','NaN'],['reference',0],{a:shared,b:shared},10n**256n];
let cases=0;
for(const input of values){const value=frozen(input),bytes=expected(value),hash=createHash('sha256').update(bytes).digest('hex');
 for(const chunk of [1,2,3,4,7,64]){const actual=drain(value,{bytes:chunk});assert.deepEqual(actual.bytes,bytes);assert.equal(actual.hash,hash);cases++;}
 assert.equal(drain(value,{limit:{...limits,maxBytes:bytes.length}}).bytes.length,bytes.length);
 assert.throws(()=>drain(value,{limit:{...limits,maxBytes:bytes.length-1}}),RangeError);
 assert.equal(validateInferenceBytes(value,{policy:'bounded-inference@1',maxWork:100000000,maxBytes:bytes.length}),bytes.length);
}
groups.push({name:'whole tagged bytes/hash, insertion and integer-key order, tags, hole, DAG, quotas',cases});
let unitCount=0;
for(let unit=0;unit<=0xffff;unit+=(process.argv.includes('--full')?1:257)){
 const text=String.fromCharCode(unit),native=encoder.encode(JSON.stringify(text)),iterator=scanJSONString(text,0,native.length);
 let next,total=2;do{next=iterator.next();if(!next.done)total+=next.value.bytes;}while(!next.done);
 assert.equal(next.value,native.length);assert.equal(total,native.length);
 assert.deepEqual(drain(text,{bytes:1}).bytes,native);unitCount++;
}
for(const text of ['\ud800\udc00','\udbff\udfff','a\ud800\udc00b','\ud800\ud800\udc00\udfff','\udc00\ud800x\udfff'])assert.deepEqual(drain(text,{bytes:1}).bytes,expected(text));
groups.push({name:'production scalar body/native JSON UTF16 count and split UTF8 bytes',units:unitCount});
let getter=0;const accessor=Object.freeze({get x(){getter++;return 1;}});
assert.throws(()=>drain(accessor),/accessors/);assert.equal(getter,0);
assert.deepEqual(encodeValue(accessor),['object',[['x',1]]]);assert.equal(getter,1);
const cycle={};cycle.self=cycle;frozen(cycle);
const hidden={};Object.defineProperty(hidden,'x',{value:1});Object.freeze(hidden);
const named=[];named.extra=1;frozen(named);
const symbol=frozen({[Symbol('x')]:1});
for(const value of [cycle,hidden,named,symbol,Object.freeze(new Date()),frozen(Object.create({x:1})),Symbol('x'),()=>0])assert.throws(()=>drain(value));
assert.throws(()=>drain({x:1}),/immutable snapshot/);
let deep={};for(let i=0;i<66;i++)deep={child:deep};frozen(deep);assert.throws(()=>drain(deep),/depth/);
assert.throws(()=>drain(frozen([1,2]),{limit:{...limits,maxSteps:1}}),/steps/);
let inheritedReads=0;Object.defineProperty(Object.prototype,'unused',{configurable:true,get(){inheritedReads++;throw Error('inherited');}});
try{assert.deepEqual(drain(frozen({a:1})).bytes,expected({a:1}));}finally{delete Object.prototype.unused;}assert.equal(inheritedReads,0);
for(const invalid of [{...limits,extra:1},{...limits,maxBytes:undefined},{maxDepth:64,maxSteps:100},{...limits,maxDepth:0},{...limits,maxDepth:65}])assert.throws(()=>create(null,invalid));
const invalid=Object.defineProperty({...limits},'maxBytes',{get(){getter++;return 10;}});assert.throws(()=>create(null,invalid),/accessors/);assert.equal(getter,1);
groups.push({name:'strict descriptor and error boundaries; generic getter behavior unchanged',passed:true});
let allocations=0,escapes=0;const encode=TextEncoder.prototype.encode,stringify=JSON.stringify;
const cursor=create('x'.repeat(4096),{...limits,maxBytes:32});
TextEncoder.prototype.encode=function(value){allocations++;return encode.call(this,value);};
JSON.stringify=function(...args){escapes++;return stringify(...args);};
try{assert.throws(()=>advance(cursor,{maxBytes:32,maxSteps:4}),/encoded bytes/);assert.equal(allocations,0);assert.equal(escapes,0);}finally{TextEncoder.prototype.encode=encode;JSON.stringify=stringify;clear(cursor);}
assert.throws(()=>advance(cursor,{maxBytes:1,maxSteps:1}),/not active/);
groups.push({name:'string minimum quota before any escaping/TextEncoder allocation',allocations,escapes,fixedScratchBytes:32});
const oversized=[];oversized.length=1000;Object.defineProperty(oversized,0,{get(){getter++;throw Error('must not read');},enumerable:true});Object.freeze(oversized);
const descriptors=Object.getOwnPropertyDescriptors;let largeInspections=0;
Object.getOwnPropertyDescriptors=function(value){if(value===oversized)largeInspections++;return descriptors(value);};
try{assert.throws(()=>drain(oversized,{limit:{...limits,maxBytes:20}}),/array minimum/);}finally{Object.getOwnPropertyDescriptors=descriptors;}
assert.equal(largeInspections,0);assert.equal(getter,1);
const keyValue=frozen({['x'.repeat(4096)]:1});assert.throws(()=>drain(keyValue,{limit:{...limits,maxBytes:40}}),/encoded bytes/);
groups.push({name:'array minimum before descriptor allocation and oversized key quota',largeInspections,getterReads:0});
async function asynchronous(value,abortAfter){
 const controller=new AbortController(),reason=Error('scheduled abort'),cursor=create(value,limits),sha=createSha256State();
 let chunks=0,terminal=0,commits=0,scheduledAt,observedAt,callbacks=0,digest;
 try{while(true){AbortSignal.prototype.throwIfAborted.call(controller.signal);const result=advance(cursor,{maxBytes:8,maxSteps:8});chunks++;updateSha256(sha,result.bytes);if(result.done){digest=finishSha256(sha);commits++;break;}
 if(chunks===abortAfter)setTimeout(()=>{callbacks++;scheduledAt=performance.now();controller.abort(reason);},0);
 await new Promise(resolve=>setTimeout(resolve,0));AbortSignal.prototype.throwIfAborted.call(controller.signal);
 }}catch(error){assert.equal(error,reason);observedAt=performance.now();}finally{terminal++;clear(cursor);clearSha256(sha);}
 assert.equal(terminal,1);assert.throws(()=>advance(cursor,{maxBytes:1,maxSteps:1}),/not active/);
 return {chunks,terminal,commits,callbacks,abortLatencyMs:observedAt===undefined?null:observedAt-scheduledAt,digest};
}
const small=frozen({text:'🌍\ud800é'.repeat(5),a:[undefined,-0,1]});const turns=drain(small,{bytes:8,steps:8}).chunks,aborts=[];
for(let boundary=1;boundary<turns;boundary++){const result=await asynchronous(small,boundary);assert.equal(result.chunks,boundary);assert.equal(result.commits,0);assert.equal(result.callbacks,1);aborts.push(result);}
const complete=await asynchronous(small,Infinity);assert.equal(complete.digest,createHash('sha256').update(expected(small)).digest('hex'));assert.equal(complete.commits,1);
groups.push({name:'actual macrotask abort at every small chunk boundary, terminal1/commit0/clear',boundaries:aborts.length,maxObservedAbortLatencyMs:Math.max(...aborts.map(x=>x.abortLatencyMs)),complete});
const report={status:'research-prototype-only',node:process.version,source:JSON.parse(await readFile('.artifacts/tagged-cursor/source.json')),groups,productChanges:0,largeExecutions:0,performanceQualification:false,commitCounterMeaning:'final digest publication only; no native ChartProgram action is invoked',remaining:['wide native enumeration is indivisible','BigInt.toString is indivisible','immutable snapshot acquisition is outside cursor','no route/native authority or public async entry']};
await writeFile(`.artifacts/tagged-cursor/audit-${process.versions.node.split('.')[0]}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
