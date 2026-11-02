import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {writeFileSync} from 'node:fs';
const indexURL=new URL('./part-index.mjs',import.meta.url).href;
const old=`else for (const part of nearest ? [...state.fill, ...state.strokes] : state.strokes) {
      const value = nearest && state.clips.length && !contains(part, point) ? clippedBoundaryDistance(part, state.clips, point, spend) : boundaryDistance(part, point);
      distance = Math.min(distance, value);
    }`;
const replacement=`else {
      const visit = part => nearest && state.clips.length && !contains(part, point) ? clippedBoundaryDistance(part, state.clips, point, spend) : boundaryDistance(part, point);
      distance = state.fill.length ? Math.min(...(nearest ? [...state.fill,...state.strokes] : state.strokes).map(visit)) : indexedDistance(state.partIndex,point,visit,spend);
    }`;
registerHooks({load(url,context,next){const result=next(url,context);if(url.includes('/src/grammar/hitShapes.js?')){let source=String(result.source);if(url.endsWith('?candidate')){assert.ok(source.includes(old));source=`import {buildPartIndex,indexedDistance} from '${indexURL}';\n`+source.replace(old,replacement);source+='\nconst originalPrepare=prepareHitShape;prepareHitShape=input=>{const result=originalPrepare(input),state=states.get(result);states.set(result,{...state,partIndex:buildPartIndex(state.strokes)});return result;};\n';}return{...result,source:source+'\nexport const inspectPrivateShape=value=>states.get(value);\n'};}return result;}});
const before=await import('../../src/grammar/hitShapes.js?baseline'),after=await import('../../src/grammar/hitShapes.js?candidate');
const identity=[1,0,0,1,0,0],base={geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:30,y:20},{op:'L',x:40,y:-20},{op:'L',x:60,y:0}],fillRule:'nonzero'},paint:{fill:false,stroke:{width:2,lineCap:'butt',lineJoin:'miter',miterLimit:10},opacity:1},transform:identity,clips:[]};
const fixtures=[base];
for(const lineCap of['butt','round','square'])for(const lineJoin of['miter','bevel','round'])fixtures.push({...base,paint:{...base.paint,stroke:{width:4,lineCap,lineJoin,miterLimit:1,dash:[3,1,2]}}});
fixtures.push({...base,transform:[-1,0.4,0.3,1.5,7,11]},{...base,transform:[0,0,0,0,0,0]},{...base,paint:{...base.paint,opacity:0}},{...base,paint:{...base.paint,fill:true}},
 {...base,clips:[{geometry:{type:'rect',rect:{x:10,y:-10,width:25,height:20}},transform:identity}]},
 {...base,clips:[{geometry:{type:'rect',rect:{x:10,y:-10,width:25,height:20}},transform:identity},{geometry:{type:'rect',rect:{x:20,y:0,width:25,height:5}},transform:identity}]},
 {...base,clips:[{geometry:{type:'rect',rect:{x:20,y:0,width:0,height:0}},transform:identity}]},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:0,y:0},{op:'L',x:1e-300,y:1e-300}],fillRule:'evenodd'}},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:2**30,y:0}],fillRule:'nonzero'}},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'C',x1:40,y1:70,x2:-10,y2:-20,x:80,y:0},{op:'Z'}],fillRule:'evenodd'}});
let cases=0,parts=0,anchors=0;const capture=fn=>{try{return{value:fn()};}catch(e){return{name:e.name,message:e.message};}};
for(const input of fixtures){const a=before.prepareHitShape(input),b=after.prepareHitShape(input);const sa=before.inspectPrivateShape(a),sb=after.inspectPrivateShape(b);assert.deepEqual(sa.strokes,sb.strokes);assert.deepEqual(sa.fill,sb.fill);assert.deepEqual(sa.clips,sb.clips);parts+=sa.strokes.length;
 for(const q of[{x:0,y:0},{x:-0,y:-0},{x:15,y:8},{x:30,y:20},{x:60,y:0},{x:90,y:40},{x:2**40,y:2**40},{x:Number.MIN_VALUE,y:-Number.MIN_VALUE}])for(const slop of[0,3,6])for(const invisible of[false,true]){
 const options={slop,hitInvisible:invisible};assert.deepEqual(capture(()=>after.hitShape(b,q,options)),capture(()=>before.hitShape(a,q,options)));assert.deepEqual(capture(()=>after.nearestHitShape(b,q,options)),capture(()=>before.nearestHitShape(a,q,options)));cases+=2;}
 assert.deepEqual(capture(()=>after.hitShapeAnchor(b)),capture(()=>before.hitShapeAnchor(a)));anchors++;
}
writeFileSync('.artifacts/geo-hit-a3/shape-proof.json',JSON.stringify({kind:'read-only loader prototype against unchanged scalar owner',fixtures:fixtures.length,fullResultOracles:cases,partsCompared:parts,anchors,productChanges:false},null,2));console.log({fixtures:fixtures.length,cases,parts,anchors});
