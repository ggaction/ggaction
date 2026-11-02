import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { validateAnimationColumnCount, animationColumnLimits } from "./resources.js";
import { inspectAnimationEnvelopeValue, validateAnimationEnvelopeAllocation, ANIMATION_ENVELOPE_LIMITS } from "./envelopeCodec.js";

// Private lossless data layout. It does not confer endpoint or family authority.
const label = "Animation columns";
const equal = (a, b) => Object.is(a, b);
const scalar = value => value === null || !["object", "function", "symbol"].includes(typeof value);
const fields = (value, keys) => {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} has unknown or missing fields.`);
};
function variant(value, names) {
  ownRecord(value, label); const keys = Object.keys(value);
  if (keys.length !== 1 || !names.includes(keys[0])) throw new TypeError(`${label} has an invalid variant.`);
  return keys[0];
}
function integer(value, maximum = 10_000_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new RangeError(`${label} has an invalid length or reference.`);
  return value;
}
function define(target, key, value) {
  Object.defineProperty(target, key, {value, enumerable:true, writable:true, configurable:true});
}
function inspectPhysical(input) {
  const decoded=inspectAnimationEnvelopeValue(input,false,true);
  return {physicalValues:decoded.physicalValues, encodedValues:decoded.estimatedEncodedValues, bytes:decoded.estimatedEncodedBytes};
}
function treeSize(value, ancestors = new Set(), depth = 0, scope) {
  if (depth > 128) throw new RangeError(`${label} nesting exceeds 128 levels.`);
  if (scalar(value)) return 1;
  if (typeof value !== "object" || value === null || ancestors.has(value)) throw new TypeError(`${label} requires acyclic plain data.`);
  if (Array.isArray(value)) ownArray(value, label, false); else ownRecord(value, label);
  ancestors.add(value); let size = 1;
  if (Array.isArray(value)) {
    validateAnimationColumnCount(value.length,"expandedValues",scope);
    for (let i=0;i<value.length;i++) size += Object.hasOwn(value,i) ? treeSize(value[i],ancestors,depth+1,scope) : 1;
  } else for (const child of Object.values(value)) size += treeSize(child,ancestors,depth+1,scope);
  ancestors.delete(value); validateAnimationColumnCount(size,"expandedValues",scope); return size;
}

export function prepareAnimationColumns(input, scope) {
  // Count every logical occurrence even when the compact representation shares it.
  const logicalValues = treeSize(input,new Set(),0,scope), vectors = [], ancestors = new Set();
  let descriptorVisits = 0, cellVisits = 0, interningWork = 0, internNodes = 0;
  const uniqueLowerBound={physicalValues:0,encodedValues:0,bytes:0};
  const internLimit=animationColumnLimits(scope).preparedTraversalWork;
  const negativeZero=Symbol("negative zero"),shapeIndex=Symbol("shape index"),interned=internMap();
  const shapeKinds={hole:Symbol("hole"),null:Symbol("null"),undefined:Symbol("undefined"),array:Symbol("array"),object:Symbol("object")};
  function internMap() {
    validateGeneratedItemLimit(++internNodes,"Animation column intern nodes",ANIMATION_ENVELOPE_LIMITS.values);
    return new Map();
  }
  function internCandidates() {
    validateGeneratedItemLimit(++internNodes,"Animation column intern nodes",ANIMATION_ENVELOPE_LIMITS.values);
    return [];
  }
  function internValue(value) {
    interningWork+=1+(typeof value==="string"?value.length:0);
    validateGeneratedItemLimit(interningWork,"Animation column interning work",internLimit);
  }
  function sameScalar(a,b) {internValue(a);internValue(b);return Object.is(a,b);}
  function bucket(index,parts) {
    let branch=index;
    for(let i=0;i<parts.length-1;i++){
      const key=parts[i];internValue(key);
      if(!branch.has(key))branch.set(key,internMap());branch=branch.get(key);
    }
    const last=parts.at(-1);internValue(last);
    if(!branch.has(last))branch.set(last,internCandidates());return branch.get(last);
  }
  function retainUnique(value) {
    const size=inspectPhysical(value);
    const physical=uniqueLowerBound.physicalValues+size.physicalValues;
    const encoded=uniqueLowerBound.encodedValues+size.encodedValues;
    const bytes=uniqueLowerBound.bytes+size.bytes;
    validateAnimationEnvelopeAllocation(physical,encoded,bytes);
    Object.assign(uniqueLowerBound,{physicalValues:physical,encodedValues:encoded,bytes});
  }
  function descriptors(count) {
    descriptorVisits += count;
    validateAnimationColumnCount(descriptorVisits,"descriptors",scope);
  }
  function rowColumn(rows, key) {
    // Reject the next dense allocation before materializing its input cells.
    validateAnimationColumnCount(cellVisits + rows.length,"cells",scope);
    return column(rows.map(row=>row[key]));
  }
  function vector(values) {
    const candidates=bucket(interned,[values.length,values[0],values.at(-1)]);
    for(const index of candidates)if(values.every((value,i)=>sameScalar(value,vectors[index][i])))return index;
    retainUnique(values);
    const index=vectors.length;vectors.push(values);candidates.push(index);return index;
  }
  function column(values) {
    cellVisits += values.length; validateAnimationColumnCount(cellVisits,"cells",scope);
    if (values.every(value=>equal(value,values[0]))) return {constant:values[0]};
    if (values.every(scalar)) {
      const runs=[];
      for(const value of values){const last=runs.at(-1);if(last&&equal(last[1],value))last[0]++;else runs.push([1,value]);}
      if(runs.length*4+4<values.length)return {runs};
      return {vector:vector(values)};
    }
    return {node:lower(values)};
  }
  function lower(value) {
    if (scalar(value)) return {literal:value};
    if (ancestors.has(value)) throw new TypeError(`${label} cannot contain cycles.`);
    ancestors.add(value); let result;
    if (Array.isArray(value)) {
      ownArray(value,label,false); descriptors(Object.keys(value).length);
      const rows = Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)?value[i]:undefined);
      const records = value.length > 1 && rows.every(row=>row===null||row===undefined||Array.isArray(row)||isPlainObject(row)) && rows.some(row=>row!==null&&typeof row==="object");
      if (records) {
        const shapes=[], shapeKeys=internMap(), shape=[], groups=[];
        for(let i=0;i<value.length;i++) {
          let definition;
          if(!Object.hasOwn(value,i)) definition={hole:true};
          else if(rows[i]===null||rows[i]===undefined) definition={literal:rows[i]};
          else {
            if(Array.isArray(rows[i])) ownArray(rows[i],label,false); else ownRecord(rows[i],label);
            const keys=Object.keys(rows[i]); descriptors(keys.length);
            definition=Array.isArray(rows[i])?{length:rows[i].length,keys}:{keys};
          }
          // Equal key lists may have independent columns for concrete primitive kinds.
          const discriminator=rows[i]!==null&&typeof rows[i]==="object"?["type","kind","reason"].map(key=>Object.hasOwn(rows[i],key)&&scalar(rows[i][key])?[key,rows[i][key]]:[]):[];
          // Every ordered key and discriminator is an exact primitive Map key.
          // SameValueZero differs from Object.is only for zero, so separate -0.
          let branch=shapeKeys;
          const step=value=>{
            internValue(value);const key=Object.is(value,-0)?negativeZero:value;
            if(!branch.has(key))branch.set(key,internMap());branch=branch.get(key);
          };
          if(Object.hasOwn(definition,"hole"))step(shapeKinds.hole);
          else if(Object.hasOwn(definition,"literal"))step(definition.literal===null?shapeKinds.null:shapeKinds.undefined);
          else {
            step(Object.hasOwn(definition,"length")?shapeKinds.array:shapeKinds.object);
            if(Object.hasOwn(definition,"length"))step(definition.length);
            step(definition.keys.length);for(const key of definition.keys)step(key);
            for(const part of discriminator){step(part.length);if(part.length)step(part[1]);}
          }
          let index=branch.get(shapeIndex);
          if(index===undefined){
            // The discriminator is not stored in the compact packet.
            retainUnique(definition);index=shapes.length;shapes.push(definition);groups.push([]);branch.set(shapeIndex,index);
          }
          shape.push(index);groups[index].push(rows[i]);
        }
        const columns=[];
        shapes.forEach((definition,index)=>{if(Object.hasOwn(definition,"keys"))columns.push([index,definition.keys.map(key=>[key,rowColumn(groups[index],key)])]);});
        result={records:{length:value.length,shapes,shape:column(shape),columns}};
      } else result={literal:value};
    } else {
      ownRecord(value,label); const entries=Object.entries(value); descriptors(entries.length);
      result={object:entries.map(([key,child])=>[key,lower(child)])};
    }
    ancestors.delete(value);return result;
  }
  const compact={kind:"animation-columns",version:1,root:lower(input),vectors};
  validateAnimationColumnCount(descriptorVisits,"descriptors",scope);
  const physical=inspectPhysical(compact);
  const checked=validateAnimationColumns(compact,scope);
  return {compact:cloneAndFreeze(compact),metrics:{logicalValues,descriptorVisits,cellVisits,interningWork,internNodes,uniqueLowerBound,...physical,validatedLogicalValues:checked.logicalValues}};
}

export function validateAnimationColumns(input, scope) {
  // This independent physical byte/descriptor walk also runs for native preparation.
  const physical=inspectPhysical(input);
  fields(input,["kind","version","root","vectors"]);
  if(input.kind!=="animation-columns"||input.version!==1) throw new TypeError(`${label} has an unsupported version.`);
  ownArray(input.vectors,label);
  for(const vector of input.vectors){ownArray(vector,label);if(!vector.every(scalar))throw new TypeError(`${label} vectors require scalar values.`);}
  const nodeProof=new Map(),shapeKeySets=new Map(); let descriptorVisits=0,cellVisits=0;
  const descriptors=count=>{descriptorVisits+=count;validateAnimationColumnCount(descriptorVisits,"descriptors",scope);};
  const ref=(index,length)=>{integer(index,input.vectors.length-1);const vector=input.vectors[index];if(vector.length!==length)throw new RangeError(`${label} vector length differs from its rows.`);return vector;};
  function column(value,length,selector=false) {
    cellVisits+=length;validateAnimationColumnCount(cellVisits,"cells",scope);
    const tag=variant(value,selector?["constant","vector","runs"]:["constant","vector","runs","node"]);
    if(tag==="constant"){const size=treeSize(value.constant);validateAnimationColumnCount(size*length,"expandedValues",scope);return {at:()=>value.constant,logicalSum:size*length};}
    if(tag==="vector"){const vector=ref(value.vector,length);return{at:i=>vector[i],logicalSum:length};}
    if(tag==="runs"){
      ownArray(value.runs,label);let count=0;const ends=[];
      for(const run of value.runs){ownArray(run,label);if(run.length!==2||!Number.isSafeInteger(run[0])||run[0]<=0||!scalar(run[1]))throw new TypeError(`${label} has an invalid scalar run.`);count+=run[0];integer(count,length);ends.push(count);}
      if(count!==length)throw new RangeError(`${label} run lengths differ from its rows.`);
      return {logicalSum:length,at:i=>{let lo=0,hi=ends.length;while(lo<hi){const mid=(lo+hi)>>>1;if(i<ends[mid])hi=mid;else lo=mid+1;}return value.runs[lo][1];}};
    }
    const nested=node(value.node);
    if(!Object.hasOwn(nested,"array")||nested.array!==true||nested.length!==length)throw new RangeError(`${label} nested column length differs from its rows.`);
    return {at:i=>nested.at(i),logicalSum:nested.logical-1};
  }
  function shape(value) {
    ownRecord(value,label);
    if(Object.hasOwn(value,"literal")){fields(value,["literal"]);if(value.literal!==null&&value.literal!==undefined)throw new TypeError(`${label} row literals require null or undefined.`);return value;}
    if(Object.hasOwn(value,"hole")){fields(value,["hole"]);if(value.hole!==true)throw new TypeError(`${label} row hole must be true.`);return value;}
    fields(value,Object.hasOwn(value,"length")?["length","keys"]:["keys"]);ownArray(value.keys,label);
    const keys=new Set(value.keys);
    if(value.keys.some(key=>typeof key!=="string")||keys.size!==value.keys.length)throw new TypeError(`${label} shape keys must be unique strings.`);
    if(Object.hasOwn(value,"length")){integer(value.length);if(value.keys.some(key=>!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))throw new TypeError(`${label} array shape has an invalid index.`);}
    shapeKeySets.set(value,keys);return value;
  }
  function node(value) {
    if(nodeProof.has(value))return nodeProof.get(value);
    const tag=variant(value,["literal","object","array","records"]);let proof;
    if(tag==="literal") {
      const logical=treeSize(value.literal),array=Array.isArray(value.literal);
      proof={logical,array,length:array?value.literal.length:undefined,at:i=>value.literal[i],restore:()=>value.literal};
    } else if(tag==="object") {
      ownArray(value.object,label);const seen=new Set();let logical=1;
      const entries=value.object.map(entry=>{ownArray(entry,label);if(entry.length!==2||typeof entry[0]!=="string"||seen.has(entry[0]))throw new TypeError(`${label} object entries require unique keys.`);seen.add(entry[0]);const child=node(entry[1]);logical+=child.logical;descriptors(1);return[entry[0],child];});
      proof={logical,restore:()=>{const result={};for(const[key,child]of entries)define(result,key,child.restore());return result;}};
    } else if(tag==="array") {
      ownArray(value.array,label);const children=value.array.map(node),logical=1+children.reduce((sum,child)=>sum+child.logical,0);
      proof={logical,array:true,length:children.length,at:i=>children[i].restore(),restore:()=>children.map(child=>child.restore())};
    } else {
      const rows=value.records;fields(rows,["length","shapes","shape","columns"]);integer(rows.length);ownArray(rows.shapes,label);const shapes=rows.shapes.map(shape);
      const selection=column(rows.shape,rows.length,true), frequencies=Array(shapes.length).fill(0);
      validateAnimationColumnCount(rows.length+1,"expandedValues",scope);
      const selected=i=>{const index=selection.at(i);integer(index,shapes.length-1);return index;};
      for(let i=0;i<rows.length;i++)frequencies[selected(i)]++;
      ownArray(rows.columns,label);const columns=new Map();
      let logical=1+rows.length;
      for(const entry of rows.columns){
        ownArray(entry,label);if(entry.length!==2)throw new TypeError(`${label} requires shape columns.`);
        integer(entry[0],shapes.length-1);const index=entry[0],definition=shapes[index];
        if(columns.has(index)||!Object.hasOwn(definition,"keys"))throw new TypeError(`${label} columns differ from shape fields.`);
        ownArray(entry[1],label);const fields=new Map();
        for(const item of entry[1]){ownArray(item,label);if(item.length!==2||typeof item[0]!=="string"||fields.has(item[0])||!shapeKeySets.get(definition).has(item[0]))throw new TypeError(`${label} columns differ from shape fields.`);descriptors(frequencies[index]);const values=column(item[1],frequencies[index]);fields.set(item[0],values);logical+=values.logicalSum;validateAnimationColumnCount(logical,"expandedValues",scope);}
        if(fields.size!==definition.keys.length)throw new TypeError(`${label} has missing columns.`);
        if(Object.hasOwn(definition,"length"))logical+=(definition.length-definition.keys.length)*frequencies[index];
        validateAnimationColumnCount(logical,"expandedValues",scope);columns.set(index,fields);
      }
      if(shapes.some((definition,index)=>Object.hasOwn(definition,"keys")&&!columns.has(index)))throw new TypeError(`${label} has missing shape columns.`);
      let ranks;
      const prepareRanks=()=>{if(ranks===undefined){ranks=new Uint32Array(rows.length);const counts=Array(shapes.length).fill(0);for(let i=0;i<rows.length;i++)ranks[i]=counts[selected(i)]++;}};
      const restoreRow=i=>{
        const index=selected(i),definition=shapes[index];if(Object.hasOwn(definition,"literal"))return definition.literal;
        if(Object.hasOwn(definition,"hole"))return undefined;
        prepareRanks();const row=Object.hasOwn(definition,"length")?new Array(definition.length):{};
        for(const key of definition.keys)define(row,key,columns.get(index).get(key).at(ranks[i]));return row;
      };
      proof={logical,array:true,length:rows.length,at:restoreRow,restore:()=>{const result=new Array(rows.length);for(let i=0;i<rows.length;i++)if(!Object.hasOwn(shapes[selected(i)],"hole"))result[i]=restoreRow(i);return result;}};
    }
    validateAnimationColumnCount(proof.logical,"expandedValues",scope);nodeProof.set(value,proof);return proof;
  }
  const root=node(input.root);
  return {logicalValues:root.logical,descriptorVisits,cellVisits,...physical,restore:root.restore};
}

export function restoreAnimationColumns(input, scope) {
  return validateAnimationColumns(input,scope).restore();
}
