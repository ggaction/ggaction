// Research file copied by build.mjs. No product owner imports this module.
import {ownArray,ownRecord} from '__CORE__/ownData.js';
import {isPlainObject} from '__CORE__/immutable.js';
import {encodeValue,invalidSnapshot} from '__CORE__/valueEncoding.js';
import {scanJSONString} from './scalar.generated.mjs';
const cursors=new WeakMap(),encoder=new TextEncoder();
function options(value,keys,label){ownRecord(value,label);for(const key of Object.keys(value))if(!keys.includes(key))throw TypeError(`${label} unknown ${key}.`);for(const key of keys)if(!Object.hasOwn(value,key)||!Number.isSafeInteger(value[key])||value[key]<1)throw RangeError(`${label} requires ${key}.`);}
function charge(s,count){if(count>s.limits.maxBytes-s.bytes)throw RangeError('Prototype encoded bytes exceeded.');s.bytes+=count;}
function step(s){if(++s.steps>s.limits.maxSteps)throw RangeError('Prototype steps exceeded.');}
function* atom(s,text){step(s);charge(s,text.length);const bytes=encoder.encode(text);s.maxAtom=Math.max(s.maxAtom,bytes.length);yield bytes;}
function* string(s,text){
  // The source owner checks length+2 before the first escaping/byte allocation.
  const scanner=scanJSONString(text,s.bytes,s.limits.maxBytes);
  let next=scanner.next();
  yield* atom(s,'"');
  while(!next.done){
    step(s);
    const {start,end,bytes:count}=next.value;
    // At most two UTF16 units. Native JSON decides escapes; a valid pair never
    // reaches TextEncoder as two isolated surrogate strings.
    charge(s,count);
    const bytes=encoder.encode(JSON.stringify(text.slice(start,end)).slice(1,-1));
    if(bytes.length!==count)throw Error('Source scalar count disagrees with native JSON atom.');
    s.maxAtom=Math.max(s.maxAtom,bytes.length);yield bytes;
    next=scanner.next();
  }
  yield* atom(s,'"');
}
function* scalarTree(s,value){
  if(typeof value==='string'){yield* string(s,value);return;}
  if(Array.isArray(value)){yield* atom(s,'[');for(let i=0;i<value.length;i++){if(i)yield* atom(s,',');yield* scalarTree(s,value[i]);}yield* atom(s,']');return;}
  yield* atom(s,JSON.stringify(value));
}
function* visit(s,value,path,depth){
  if(value===null||typeof value!=='object'){
    // Existing scalar/tag decisions and unsupported-value diagnostic owner.
    yield* scalarTree(s,encodeValue(value,path));return;
  }
  if(s.ancestors.has(value))throw invalidSnapshot(`Cannot serialize a cycle at ${path}.`,path);
  if(depth>s.limits.maxDepth)throw RangeError(`Prototype depth exceeded at ${path}.`);
  const array=Array.isArray(value);
  if(!array&&!isPlainObject(value))throw invalidSnapshot(`Cannot serialize a class instance at ${path}.`,path);
  if(array&&value.length>s.limits.maxBytes-s.bytes)throw RangeError('Prototype array minimum bytes exceeded.');
  if(array)ownArray(value,'Prototype array',false);else ownRecord(value,'Prototype record');
  // This prototype consumes an existing immutable native snapshot. It does not
  // clone/freeze caller data and does not grant native/domain authority.
  if(!Object.isFrozen(value))throw TypeError('Prototype requires an immutable snapshot.');
  const keys=array?undefined:Object.keys(value),length=array?value.length:keys.length;
  const minimum=(array?12:13)+Math.max(0,length-1);
  if(minimum>s.limits.maxBytes-s.bytes)throw RangeError('Prototype container minimum bytes exceeded.');
  s.ancestors.add(value);s.depth=Math.max(s.depth,depth);
  try{
    yield* atom(s,array?'["array",[':'["object",[');
    for(let index=0;index<length;index++){
      if(index)yield* atom(s,',');
      const key=array?String(index):keys[index];
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(array&&descriptor===undefined){yield* atom(s,'["hole"]');continue;}
      if(!array){yield* atom(s,'[');yield* string(s,key);yield* atom(s,',');}
      yield* visit(s,descriptor.value,array?`${path}[${index}]`:`${path}.${key}`,depth+1);
      if(!array)yield* atom(s,']');
    }
    yield* atom(s,']]');
  }finally{s.ancestors.delete(value);}
}
export function createStrictTaggedCursor(snapshot,limits){
  options(limits,['maxBytes','maxDepth','maxSteps'],'Prototype limits');
  if(limits.maxDepth>64)throw RangeError('Prototype maximum depth is 64.');
  const s={limits:{...limits},bytes:0,steps:0,depth:0,maxAtom:0,ancestors:new Set(),pending:null,offset:0,status:'active',iterator:null};
  s.iterator=visit(s,snapshot,'payload',0);
  const handle=Object.freeze({});cursors.set(handle,s);return handle;
}
export function advanceStrictTaggedCursor(handle,budget){
  const s=cursors.get(handle);if(s===undefined||s.status!=='active')throw TypeError('Prototype cursor is not active.');
  options(budget,['maxBytes','maxSteps'],'Prototype chunk');
  // A fixed chunk is not input-sized escaping. Its explicit cap precedes alloc.
  if(budget.maxBytes>65536||budget.maxSteps>4096)throw RangeError('Prototype chunk maximum exceeded.');
  const output=new Uint8Array(Math.min(budget.maxBytes,s.limits.maxBytes));
  let used=0,turns=0;
  try{
    while(used<output.length&&turns<budget.maxSteps){
      if(s.pending===null){const next=s.iterator.next();turns++;if(next.done){s.status='done';s.iterator=null;break;}s.pending=next.value;s.offset=0;}
      const count=Math.min(s.pending.length-s.offset,output.length-used);
      output.set(s.pending.subarray(s.offset,s.offset+count),used);used+=count;s.offset+=count;
      if(s.offset===s.pending.length)s.pending=null;
    }
    return {bytes:output.subarray(0,used),done:s.status==='done',stats:{bytes:s.bytes,steps:s.steps,depth:s.depth,maxAtom:s.maxAtom}};
  }catch(error){clearStrictTaggedCursor(handle);throw error;}
}
export function clearStrictTaggedCursor(handle){
  const s=cursors.get(handle);if(s===undefined)throw TypeError('Unknown prototype cursor.');
  s.iterator?.return();s.iterator=null;s.pending=null;s.ancestors.clear();s.status='cleared';
}
