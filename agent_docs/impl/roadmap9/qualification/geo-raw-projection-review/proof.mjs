import './loader.mjs';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=process.cwd(), source=name=>`file://${root}/src/grammar/geo/${name}.js`;
const original=await import(source('projections')+'?baseline'),candidate=await import(source('projections'));
const {projectGeometry:oldStream}=await import(source('stream')+'?baseline'),{projectGeometry:newStream}=await import(source('stream'));
const {PROJECTION_DESCRIPTORS}=await import(source('projectionOptions')),{isOwned}=await import(`file://${root}/src/core/immutable.js`);
const receipt={kind:'read-only load-hook prototype; source unmodified; not performance qualification',projectionPairs:0,geometryPairs:0,counts:[]};
function same(a,b,args){let x,y,e,f;try{x=a(...args);}catch(error){e=[error.name,error.message];}try{y=b(...args);}catch(error){f=[error.name,error.message];}assert.deepEqual(f,e);if(!e)assert.deepEqual(y,x);return y;}
for(const {type,spherical,composite} of PROJECTION_DESCRIPTORS){
 const cases=[{type},{type,scalePx:100,translatePx:[200,200]},...(composite?[]:[{type,reflectX:true,reflectY:true,clipExtentPx:[[-100,-100],[100,100]]}])];
 for(const options of cases){const a=original.createProjectionKernel(options),b=candidate.createProjectionKernel(options),raw=candidate.createProjectionCalculation(options);
  for(const point of [[-0,-0],[0,0],[180,0],[-180,0],[0,90],[0,-90],[-150,64],[-157,20],[-100,40],...[...Array(20)].map((_,i)=>[-170+17*i,-80+8*i])]){
   const forward=same(a.forward,b.forward,[point]);assert.deepEqual(raw.forward(point),forward);assert.ok(isOwned(forward));if(forward.point){assert.ok(isOwned(forward.point));same(a.inverse,b.inverse,[forward.point]);}assert.equal(isOwned(raw.forward(point)),false);receipt.projectionPairs++;
  }
  for(const bad of [[0,91],[],[Infinity,0],[NaN,0],[0],Object.assign([0,0],{extra:1})])same(a.forward,b.forward,[bad]);
  const mutable=[10,20],result=b.forward(mutable);mutable[0]=90;if(result.point)assert.ok(Object.isFrozen(result.point));
 }
}
const shapes=[{type:'Point',coordinates:[-0,0]}, {type:'MultiPoint',coordinates:[[-100,40],[-150,64],[-157,20]]},{type:'LineString',coordinates:[[179,0],[-179,0]]},{type:'LineString',coordinates:[[-80,0],[80,0]]},{type:'Polygon',coordinates:[[[-20,-20],[20,-20],[20,20],[-20,20],[-20,-20]],[[-5,-5],[-5,5],[5,5],[5,-5],[-5,-5]]]},{type:'GeometryCollection',geometries:[null,{type:'LineString',coordinates:[[-20,0],[20,5]]}]}];
for(const {type,spherical} of PROJECTION_DESCRIPTORS)for(const shape of shapes){const options={coordinateKind:spherical?'geographic':'planar'};const before=structuredClone(shape);same(oldStream,newStream,[shape,{type,scalePx:100},options]);assert.deepEqual(shape,before);receipt.geometryPairs++;}
for(const n of[20,1000]){
 const shape={type:'LineString',coordinates:Array.from({length:n},(_,i)=>[-30+60*i/(n-1),(i%2?1:-1)*5])},projection={type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5},options={coordinateKind:'geographic',maxPoints:200000};
 let start=globalThis.projectionOwnershipAdds;const a=oldStream(shape,projection,options),baseline=globalThis.projectionOwnershipAdds-start;
 start=globalThis.projectionOwnershipAdds;const b=newStream(shape,projection,options),prototype=globalThis.projectionOwnershipAdds-start;
 assert.deepEqual(b,a);assert.ok(isOwned(b));assert.ok(isOwned(b.parts[0].commands[0]));receipt.counts.push({vertices:n,baseline,prototype,saved:baseline-prototype,diagnostics:b.diagnostics,hash:createHash('sha256').update(JSON.stringify(b)).digest('hex')});
}
for(const [shape,projection,options] of [[shapes[2],{type:'equirectangular'},{coordinateKind:'geographic',maxPoints:1}],[shapes[0],{type:'identity'},{coordinateKind:'geographic'}],[{type:'LineString',coordinates:[[0,0],[180,0]]},{type:'equirectangular'},{coordinateKind:'geographic',interpolation:'great-circle'}]])same(oldStream,newStream,[shape,projection,options]);
writeFileSync('.artifacts/geo-hit-a3/raw-projection/proof.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
