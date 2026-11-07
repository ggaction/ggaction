import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chart} from '../../../../../src/index.js';
import {resolveRouteInput} from '../../../../../src/materialization/graph/routeInput.js';
import {prepareRouteInput} from '../../../../../src/grammar/graph/routes/common.js';
import {routeLength,resampleRoute,validateRoutePoints} from '../../../../../src/grammar/graph/routes/polyline.js';
import {routeDensitySamples} from '../../../../../src/grammar/graph/routes/densityField.js';
import {densityRouteBandwidth} from '../../../../../src/grammar/graph/routes/density.js';

// Research only. No field, advection, full solver, relaxed budget, or new wire.
// Same raw expressions as the canonical original non-hierarchical route fixture.
function fixture(n) {
  const nodes=Array.from({length:n},(_,id)=>({id}));
  const edges=nodes.map(({id})=>({id,source:id,target:(id+Math.floor(n/3))%n}));
  const positions=nodes.map(({id})=>({key:id,x:200+150*Math.cos(2*Math.PI*id/n),y:200+150*Math.sin(2*Math.PI*id/n)}));
  const program=chart().createCanvas({width:400,height:400,margin:0,background:'white'})
    .createData({id:'nodes',values:nodes,keyField:'id'}).createData({id:'edges',values:edges,keyField:'id'})
    .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'source',target:'target'})
    .layoutGraph({id:'layout',method:'fixed',options:{positions}});
  const graph=program.semanticSpec.resources.find(r=>r.kind==='graph');
  const layout=program.semanticSpec.resources.find(r=>r.kind==='layout');
  return prepareRouteInput(resolveRouteInput(program,graph,layout,{method:'density',options:{},coordinateSpace:'world'}).input);
}

// Preserve each subtraction/hypot/half-add/atan2 exactly once and in its original
// route/index order. Typed storage only; production still uses object samples.
function pack(routes) {
  const count=routes.reduce((sum,route)=>sum+route.length,0);
  const weights=new Float64Array(count),angles=new Float64Array(count),offsets=new Uint32Array(routes.length+1);
  let cursor=0,checks=0,maximumSegmentScratch=0;
  routes.forEach((points,edge)=>{
    validateRoutePoints(points);
    const lengths=new Float64Array(points.length-1);maximumSegmentScratch=Math.max(maximumSegmentScratch,lengths.byteLength);
    for(let i=1;i<points.length;i++)lengths[i-1]=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    if(!lengths.every(Number.isFinite))throw new RangeError('Nonfinite segment');
    offsets[edge]=cursor;
    for(let i=0;i<points.length;i++){
      const point=points[i],previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      let dx=next.x-previous.x,dy=next.y-previous.y;
      if(dx===0&&dy===0){dx=next.x-point.x;dy=next.y-point.y;}
      weights[cursor]=(lengths[i-1]??0)/2+(lengths[i]??0)/2;
      angles[cursor]=Math.atan2(dy,dx);cursor++;
    }
    const old=routeDensitySamples(points);
    for(let i=0;i<points.length;i++){
      assert.ok(Object.is(weights[offsets[edge]+i],old[i].weight));
      assert.ok(Object.is(angles[offsets[edge]+i],old[i].angle));checks+=2;
    }
  });
  offsets[routes.length]=cursor;
  return {count,checks,weightBytes:weights.byteLength,angleBytes:angles.byteLength,offsetBytes:offsets.byteLength,maximumSegmentScratch,
    scalarHash:createHash('sha256').update(new Uint8Array(weights.buffer)).update(new Uint8Array(angles.buffer)).digest('hex')};
}

const prior=JSON.parse(readFileSync(new URL('../density-budget-evidence/audit.json',import.meta.url)));
const results=[];
for(const n of [100,1000]) {
  const context=fixture(n),initial=context.edges.map(edge=>[edge.source,edge.target]);
  const counts=initial.map(points=>Math.max(2,Math.ceil(routeLength(points)/Math.min(densityRouteBandwidth(0)/4,1/256))+1));
  const S=counts.reduce((sum,count)=>sum+count,0),beforeResampling=context.budget.diagnostics();
  context.budget.samples(2*n+S);context.budget.charge(S);
  const routes=initial.map((points,i)=>resampleRoute(points,counts[i]));
  context.budget.samples(6*S+2*n);context.budget.charge(24*S);
  const packed=pack(routes),existing=prior.rows.find(row=>row.size===n);
  assert.equal(S,existing.samples);
  results.push({edges:n,S,maximumEdgeSamples:Math.max(...counts),beforeResampling,beforeField:context.budget.diagnostics(),packed,
    retainedCoordinateNumbers:2*S,removedWeightedCoordinateCopies:2*S,removedFlatReferences:S,
    oldWeightedSampleNumberPayload:32*S,oldNestedAndFlatReferenceSlots:2*S,
    packedNumericPayload:packed.weightBytes+packed.angleBytes+packed.offsetBytes,
    existingFirstField:{source:prior.sourceCommit,rows:existing.rows,candidates:existing.candidates,charge:S+existing.rows+existing.candidates},
    firstFieldCumulativeWork:context.budget.diagnostics().work+S+existing.rows+existing.candidates,
    preservedInitialPeakSamples:6*S+2*n,
    note:'Stops before first field. Prior field counters are reused only after source hash equality; no full iteration or P95.'});
}
const hostile=[
  [{x:-0,y:0},{x:0,y:-0}],
  [{x:0,y:0},{x:0,y:0},{x:1,y:-1},{x:0,y:0}],
  [{x:1,y:1},{x:0,y:0},{x:-1,y:-1}],
  [{x:1e-300,y:-1e-300},{x:2e-300,y:1e-300},{x:1e-300,y:-1e-300}]
];
const sources=['src/grammar/graph/routes/density.js','src/grammar/graph/routes/densityField.js','src/grammar/graph/routes/polyline.js','src/grammar/graph/routes/budget.js'];
const sourceSHA256=Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(new URL('../../../../../'+path,import.meta.url))).digest('hex')]));
for(const path of sources.filter(path=>Object.hasOwn(prior.sourceSHA256,path)))assert.equal(sourceSHA256[path],prior.sourceSHA256[path]);
const output={schemaVersion:1,status:'read-only initial preparation and packed-storage research; not product, admission, heap, or performance qualification',
  source:'61ddab0aa7e55c1aac9708af57af4650e337d84b',node:process.version,authorization:'../../AUTHORIZATION.json',results,
  edgeCases:pack(hostile),sourceSHA256,limits:{fieldExecuted:false,laterIterationsExecuted:false,solverExecuted:false,guardChanged:false,productModified:false}};
writeFileSync(new URL('./density-packed-audit.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
