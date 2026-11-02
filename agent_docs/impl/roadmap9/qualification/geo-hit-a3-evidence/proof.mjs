import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildPartIndex,indexedDistance,lowerBound} from './part-index.mjs';
registerHooks({load(url,context,next){const result=next(url,context);if(url.endsWith('/src/grammar/hitShapes.js'))return{...result,source:result.source+'\nexport const inspectPrivateShape=value=>states.get(value);\n'};return result;}});
const {chart}=await import('../../src/index.js');
const {createTransitionScene}=await import('../../src/scene.js');
const {prepareConcreteHitShape}=await import('../../src/interaction/hitConcrete.js');
const {inspectPrivateShape,hitShape,nearestHitShape,hitShapeAnchor}=await import('../../src/grammar/hitShapes.js');
const {pathFillContains,pathStrokeDistance,segmentDistance}=await import('../../src/grammar/pathGeometry.js');
const coordinates=Array.from({length:1000},(_,i)=>[-30+60*i/999,(i%2?1:-1)*5]);
const program=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates}}]}}).createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2});
const node=createTransitionScene(program,{format:'canvas'}).nodes.find(n=>n.type==='path');
const shape=prepareConcreteHitShape(node,program.materializationConfigs.textMetrics),state=inspectPrivateShape(shape),parts=state.strokes,index=buildPartIndex(parts);
assert.equal(parts.length,3297);const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const before=hash(parts);let assertions=0,maxVisited=0;
const distance=(part,q)=>pathFillContains(part.commands,q,{fillRule:part.fillRule})?0:pathStrokeDistance(part.commands,q);
for(let i=0;i<71;i++){const q={x:80+i*3.4,y:180+(i%13)*3.1};let visited=0;
 const actual=indexedDistance(index,q,part=>{visited++;return distance(part,q);});const expected=Math.min(...parts.map(part=>distance(part,q)));assert.equal(actual,expected);maxVisited=Math.max(maxVisited,visited);assertions++;
 const result=hitShape(shape,q,{slop:0});if(q.x>=20&&q.x<=380&&q.y>=20&&q.y<=380)assert.equal(actual,result.distance);
}
for(const exponent of[-1074,-1022,-100,-20,0,20,100,1023])for(const sign of[-1,1]){const a=sign*2**exponent,b=a===0?Number.MIN_VALUE:a/2,q={x:a,y:-b},box=[Math.min(a,b),Math.min(a,b),Math.max(a,b),Math.max(a,b)];const lower=lowerBound(box,q);let d;try{d=segmentDistance(q,{x:a,y:a},{x:b,y:b});}catch{assert.equal(lower,0);continue;}assert.ok(lower<=d);assertions++;}
assert.equal(hash(parts),before);assert.throws(()=>buildPartIndex(parts,1),/work budget/);
const receipt={kind:'read-only numeric prototype; no product change',parts:parts.length,footprintSHA256:before,indexBuildWork:index.work,nodes:index.metadata.length/4,distanceOracles:assertions,maxVisited,focusAnchor:hitShapeAnchor(shape),guards:'unchanged',limitations:['No public policy integration yet','No large runtime/P95','General indexed nearest clip/focus integration still required']};writeFileSync('.artifacts/geo-hit-a3/proof.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
