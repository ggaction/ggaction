import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON,contentDigest,contentBytesDigest} from '../../../../../src/core/contentDigest.js';
import {encodeValue} from '../../../../../src/core/valueEncoding.js';
import {validateInferenceBytes} from '../../../../../src/grammar/graph/inferenceBudget.js';
import {getErrorDetails} from '../../../../../src/core/diagnostics.js';
const root=fileURLToPath(new URL('../../../../../',import.meta.url)),records=[];
const json=value=>canonicalJSON(encodeValue(value));
function record(name,fn){const value=fn();records.push({name,...value});}
record('raw lexical keys versus tagged native entry order',()=>{
 const a={b:1,a:2},b={a:2,b:1};
 assert.equal(canonicalJSON(a),canonicalJSON(b));assert.notEqual(json(a),json(b));
 assert.equal(canonicalJSON({'2':'two','10':'ten',b:0,a:1}),'\u007b"10":"ten","2":"two","a":1,"b":0}');
 const raw=canonicalJSON(a),tagged=json(a);assert.equal(tagged,'["object",[["b",1],["a",2]]]');
 return {raw,tagged,reordered:json(b)};
});
record('typed unusual scalar and sparse vector bytes',()=>{
 const value=[-0,NaN,Infinity,-Infinity,undefined,-123n,,['number','NaN']];
 const text=json(value),expected='["array",[["number","-0"],["number","NaN"],["number","Infinity"],["number","-Infinity"],["undefined"],["bigint","-123"],["hole"],["array",["number","NaN"]]]]';
 assert.equal(text,expected);assert.equal(contentDigest(text),createHash('sha256').update(text).digest('hex'));
 assert.equal(canonicalJSON(-0),'0');assert.equal(canonicalJSON(NaN),'null');
 assert.equal(canonicalJSON(undefined),undefined);assert.equal(canonicalJSON([undefined,undefined]),'[,]');
 return {text,bytes:new TextEncoder().encode(text).length,digest:contentDigest(text),rawUndefined:'returns undefined',rawTwoUndefined:'[,]'};
});
record('JSON escape and raw UTF8 are distinct',()=>{
 const inputs=['\b\t\n\f\r\u0000\u001f','"\\','\u2028\u2029','\ud800','\udc00','\ud800\udc00','\ud800x\udc00','é한🙂'];
 for(const input of inputs){assert.equal(json(input),JSON.stringify(input));assert.equal(contentDigest(input),createHash('sha256').update(input).digest('hex'));}
 assert.equal(new TextEncoder().encode('\ud800').length,3);assert.equal(new TextEncoder().encode(json('\ud800')).length,8);
 return {cases:inputs.length,loneSurrogateRawBytes:3,loneSurrogateJSONBytesIncludingQuotes:8};
});
record('digest padding boundaries and default coercion',()=>{
 const lengths=[0,1,55,56,63,64,65,119,120,127,128,129];
 for(const length of lengths)for(const value of ['x'.repeat(length),'é'.repeat(length)])assert.equal(contentDigest(value),createHash('sha256').update(value).digest('hex'));
 assert.equal(contentDigest(undefined),contentDigest(''));assert.equal(contentDigest(123),contentDigest('123'));
 const bytes=new Uint8Array([9,1,2,3,9]);assert.equal(contentBytesDigest(bytes.subarray(1,4)),createHash('sha256').update(new Uint8Array([1,2,3])).digest('hex'));
 assert.throws(()=>contentBytesDigest(new Uint8Array(new SharedArrayBuffer(2))),TypeError);
 return {vectors:lengths.length*2,undefinedIsEmpty:true,numberCoerced:true,subviewExact:true,sharedMemoryRejected:true};
});
record('legacy getter snapshot versus strict caller preflight',()=>{
 let hits=0;const value=Object.defineProperty({a:1},'b',{enumerable:true,get(){hits++;return 2;}});
 assert.equal(json(value),'["object",[["a",1],["b",2]]]');assert.equal(hits,1);
 const before=hits;assert.throws(()=>validateInferenceBytes(value,{policy:'bounded-inference@1',maxWork:100,maxBytes:1024}),/accessors/);assert.equal(hits,before);
 const order=[];const child=Object.defineProperty({},'x',{enumerable:true,get(){order.push('child');return 0;}});
 const obj=Object.defineProperty({a:child},'b',{enumerable:true,get(){order.push('parent-b');return 1;}});
 encodeValue(obj);assert.deepEqual(order,['parent-b','child']);
 return {genericGetterReads:1,strictAdditionalReads:0,legacyReadOrder:order};
});
record('legacy structural error precedence',()=>{
 let hits=0;const value=Object.defineProperty({},'read',{enumerable:true,get(){hits++;return 1;}});
 value[Symbol('unsupported')]=1;
 let error;try{encodeValue(value);}catch(e){error=e;}
 assert.match(error.message,/symbol keys/);assert.equal(hits,0);
 const hidden=Object.defineProperty(Object.defineProperty({},'read',{enumerable:true,get(){hits++;return 1;}}),'hidden',{value:1});
 assert.throws(()=>encodeValue(hidden),/hidden or named/);assert.equal(hits,0);
 const cycle={};cycle.self=cycle;assert.throws(()=>encodeValue(cycle),/cycle/);
 const proto=Object.assign(Object.create(null),{constructor:'safe',x:1});assert.match(json(proto),/constructor/);
 return {symbolError:{name:error.name,message:error.message,details:getErrorDetails(error)},getterReads:hits,cycleRejected:true,nullPrototypeSupported:true};
});
const files=[];async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else if(entry.name.endsWith('.js'))files.push(file);}}await visit(path.join(root,'src'));
const callsites=[];
for(const file of files){const source=await readFile(file,'utf8');const lines=source.split('\n');const matches=[];for(let i=0;i<lines.length;i++)if(/\b(?:contentDigest|contentBytesDigest|canonicalJSON|encodeValue)\(/.test(lines[i]))matches.push({line:i+1,text:lines[i].trim()});if(matches.length)callsites.push({file:path.relative(root,file),sourceSHA256:createHash('sha256').update(source).digest('hex'),matches});}
const report={schemaVersion:1,status:'existing-source baseline and proposal inventory only',source:'a9994e302',node:process.version,productChanges:0,
 interpretation:'No candidate resumable implementation, performance or cancellation qualification; existing sync edge cases pin compatibility.',records,callsites};
await writeFile(new URL('./audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({records:records.length,directCallsiteFiles:callsites.length,directLines:callsites.reduce((n,f)=>n+f.matches.length,0),productChanges:0}));
