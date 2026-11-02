import { ownArray, ownRecord } from '../core/ownData.js';
import { rejectUnknownProperties, validateGeneratedItemLimit } from '../core/validation.js';
import { packAnimationNumericVector, inspectAnimationNumericVector } from './numericColumns.js';
import { animationResourceLimits, validateAnimationColumnCount, validateAnimationResourceWork, validatePreparedEndpointResources } from './resources.js';
const numericKeys = ['x', 'y', 'radius'];
const closed = (value, fields, label) => {
  ownRecord(value, label); rejectUnknownProperties(value, fields, label);
  if (fields.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every declared field.`);
};
// Only schema-declared paths carry vectors. Lookalike packets elsewhere remain
// ordinary data and reach their existing strict owner unchanged.
function transformEndpoint(endpoint, transform) {
  if (endpoint.scene?.version === 3) {
    ownArray(endpoint.scene.entries, 'Batched transport entries'); ownArray(endpoint.positions, 'Batched transport positions');
    if (endpoint.positions.length !== endpoint.scene.entries.length) throw new TypeError('Batched positions must follow every entry.');
    const positions = endpoint.positions.slice();
    const entries = endpoint.scene.entries.map((entry, index) => {
      ownRecord(entry, 'Batched transport entry'); if (entry.kind !== 'circle-run') return entry;
      ownArray(entry.keys, 'Batched transport keys'); const length = entry.keys.length;
      if (length < 1 || length > 10000) throw new RangeError('Circle runs require 1..10000 rows.');
      closed(entry.properties, ['x', 'y', 'radius', 'appearance'], 'Batched transport properties');
      const position = positions[index]; closed(position, ['kind', 'x', 'y'], 'Batched transport position');
      if (position.kind !== 'point-run') throw new TypeError('Circle runs require point positions.');
      const channels = {};
      for (const channel of ['x', 'y']) { closed(position[channel], ['values', 'scale'], 'Batched transport channel'); channels[channel] = { ...position[channel], values: transform(position[channel].values, length) }; }
      positions[index] = { kind: 'point-run', ...channels };
      let decisions = entry.decisions;
      if (decisions !== null) {
        closed(decisions, ['kind', 'kernel', 'ownerKey', 'role', 'sourceIndices', 'targetIndices', 'itemKeys'], 'Batched transport decisions');
        decisions = { ...decisions, sourceIndices: transform(decisions.sourceIndices, length), targetIndices: transform(decisions.targetIndices, length) };
      }
      return { ...entry, properties: { ...entry.properties, ...Object.fromEntries(numericKeys.map(key => [key, transform(entry.properties[key], length)])) }, decisions };
    });
    return { ...endpoint, scene: { ...endpoint.scene, entries }, positions };
  }
  if (endpoint.graphicSpec !== undefined) {
    ownRecord(endpoint.graphicSpec.objects, 'Batched transport objects');
    const objects = Object.fromEntries(Object.entries(endpoint.graphicSpec.objects).map(([id, object]) => {
      if (object.type !== 'circle-batch') return [id, object];
      closed(object.properties, ['x', 'y', 'radius', 'appearance'], 'Batched transport properties');
      const length = object.properties.x.length;
      if (!Number.isSafeInteger(length) || length < 1 || length > 10000) throw new RangeError('Circle batches require 1..10000 rows.');
      return [id, { ...object, properties: { ...object.properties, ...Object.fromEntries(numericKeys.map(key => [key, transform(object.properties[key], length)])) } }];
    }));
    return { ...endpoint, graphicSpec: { ...endpoint.graphicSpec, objects } };
  }
  return endpoint;
}
export function projectBatchNumericColumns(raw) {
  const transform = (values, length) => { ownArray(values, 'Batched numeric values'); if (values.length !== length) throw new TypeError('Batched numeric lengths differ.'); return packAnimationNumericVector(values); };
  return { ...raw, from: transformEndpoint(raw.from, transform), to: transformEndpoint(raw.to, transform) };
}
// Exact legacy traversal cost, calculated arithmetically for repeated columns.
// No conceptual row object or expanded numeric array is allocated by preflight.
function measurePlan(raw, weighted, numeric = new Set()) {
  const keyWork = key => weighted ? key.length : 0;
  const work = value => {
    if(numeric.has(value)){let result=1+value.length;for(let index=0;index<value.length;index++)result+=keyWork(String(index));return result;}
    let result=1;if(typeof value==='string')return result+(weighted?value.length:0);
    if(value!==null&&typeof value==='object')for(const[key,child]of Object.entries(value))result+=keyWork(key)+work(child);return result;
  };
  const field=(key,value)=>keyWork(key)+work(value);
  const endpointWork=endpoint=>{
    if(endpoint.scene?.version!==3)return work(endpoint);
    const scene=endpoint.scene;let nodes=1,positions=1,decisions=1,count=0,decisionCount=0;
    for(let index=0;index<scene.entries.length;index++){
      const entry=scene.entries[index],position=endpoint.positions[index];
      if(entry.kind==='single'){
        nodes+=keyWork(String(count))+work(entry.node);positions+=keyWork(String(count))+work(position.value);
        if(entry.decision!==null)decisions+=keyWork(String(decisionCount++))+work(entry.decision);count++;continue;
      }
      if(entry.kind!=='circle-run')throw new TypeError('Unknown batched transport entry.');
      const nodeStatic=1+field('type','circle')+field('topology',entry.topology)+field('offset',entry.offset)+field('clip',entry.clip)+field('clips',entry.clips)+
        keyWork('properties')+work(entry.properties.appearance)+3+keyWork('x')+keyWork('y')+keyWork('radius');
      const positionStatic=1+['x','y'].reduce((sum,key)=>sum+keyWork(key)+1+field('value',0)+field('scale',position[key].scale),0);
      const table=entry.decisions,decisionStatic=table===null?0:1+field('sourceIndex',0)+field('targetIndex',0)+field('role',table.role)+field('ownerKey',table.ownerKey)+field('kind',table.kind)+field('kernel',table.kernel);
      for(let row=0;row<entry.keys.length;row++){
        const digits=keyWork(String(count++));nodes+=digits+nodeStatic+field('key',entry.keys[row]);positions+=digits+positionStatic;
        if(table!==null)decisions+=keyWork(String(decisionCount++))+decisionStatic+field('itemKey',table.itemKeys[row]);
      }
    }
    let result=1;for(const[key,value]of Object.entries(endpoint)){
      result+=keyWork(key);
      if(key==='scene')result+=1+field('version',2)+field('width',scene.width)+field('height',scene.height)+keyWork('nodes')+nodes;
      else if(key==='positions')result+=positions;
      else if(key==='view')result+=work(value)+keyWork('decisions')+decisions;
      else result+=work(value);
    }return result;
  };
  let result=1;for(const[key,value]of Object.entries(raw))result+=keyWork(key)+(key==='from'||key==='to'?endpointWork(value):work(value));return result;
}
export const batchLogicalPlanWork = (raw,numeric) => measurePlan(raw,true,numeric);
export const batchLogicalPlanValues = (raw,numeric) => measurePlan(raw,false,numeric);
export function restoreBatchNumericColumns(raw, resources, columnCells = 0) {
  const pending = [], limits = animationResourceLimits(resources); let cells = columnCells, totalRows = 0;
  const transform = (packet, length) => {
    const proof = inspectAnimationNumericVector(packet); if (proof.length !== length) throw new TypeError('Batched numeric lengths differ.');
    validateAnimationColumnCount(cells += length, 'cells', resources); pending.push(proof); return proof;
  };
  const inspected = { ...raw, from: transformEndpoint(raw.from, transform), to: transformEndpoint(raw.to, transform) };
  for (const endpoint of [inspected.from, inspected.to]) if (endpoint.scene?.version === 3) {
    let rows = 0; for (const entry of endpoint.scene.entries) rows += entry.kind === 'circle-run' ? entry.keys.length : 1;
    validateGeneratedItemLimit(rows, 'Animation scoped endpoint nodes', limits.maxOutputNodes); totalRows += rows;
    ownArray(endpoint.identities,'Batched transport identities');ownArray(endpoint.backgrounds,'Batched transport backgrounds');
    if(endpoint.identities.length!==rows)throw new TypeError('Batched identities must follow logical rows.');
    validatePreparedEndpointResources({scene:{nodes:{length:rows}},identities:endpoint.identities,backgrounds:endpoint.backgrounds},endpoint.guides??[],resources);
  }
  validateGeneratedItemLimit(totalRows, 'Animation endpoint nodes', limits.maxEndpointNodes);
  for (const proof of pending) proof.validateFinite();
  const numeric=new Set(pending);
  validateAnimationColumnCount(batchLogicalPlanValues(inspected,numeric),'expandedValues',resources);
  validateAnimationResourceWork(batchLogicalPlanWork(inspected,numeric), 'Animation preparation work', resources);
  // All packet shapes, canonical bytes, finite bits, length/cell/logical work
  // ceilings precede allocation of any expanded numeric vector.
  const allocated = new Map(); for (const proof of pending) allocated.set(proof, Array.from({ length: proof.length }, (_, index) => proof.at(index)));
  return { ...raw, from: transformEndpoint(inspected.from, proof => allocated.get(proof)), to: transformEndpoint(inspected.to, proof => allocated.get(proof)) };
}
