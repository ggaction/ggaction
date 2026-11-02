import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat} from '../../../src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../../src/animation.js';
import {cloneAndFreeze,isOwned} from '../../../src/core/immutable.js';
import {prepareAnimationHitFrame} from '../../../src/interaction/hitProgram.js';
import {createHitFrameBridge} from '../../../src/interaction/hitFrame.js';
import {animationFrameProvenance} from '../../../src/animation/frameProvenance.js';
const points=(margin=20)=>chart().createCanvas({width:300,height:200,margin})
 .createData({id:'rows',keyField:'id',values:[{id:'a',x:2,y:3}]}).createPointMark({id:'points',fill:'black'})
 .encodeX({field:'x',scale:{id:'x',domain:[0,10],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,10],nice:false}});
const options=explicit=>({durationMs:100,easing:'linear',...(explicit?{maxEndpointNodes:100,maxOutputNodes:60}:{})});
function frozen(value){if(value===null||typeof value!=='object')return;assert.ok(Object.isFrozen(value));for(const child of Object.values(value))frozen(child);}
function replay(plan,time){const saved=serializeAnimation(plan),restored=deserializeAnimation(saved).plan;assert.equal(serializeAnimation(restored),saved);assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));}

test('point frame tuples preserve native hit authority and immutable path clips through timeline patches',()=>{
 for(const explicit of[false,true])for(const timeline of[false,true]){
  const callerClip={type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:300,y:0},{op:'L',x:300,y:200},{op:'L',x:0,y:200},{op:'Z'}]};
  const p=points(),q=p.editScale({id:'x',domain:[0,20],nice:false});
  const from=p.editGraphics({target:'points',property:'clip',value:callerClip}),to=q.editGraphics({target:'points',property:'clip',value:callerClip});
  const ordinary=planTransition({from,to,options:options(explicit)}),sampled=sampleTransition(ordinary,50),decision=sampled.decisions.find(d=>d.kernel==='cartesian-point');
  const plan=timeline?planTransition({from,to,options:{...options(explicit),tracks:[{target:{itemKey:decision.itemKey},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:'black'},{timeMs:50,value:'red'},{timeMs:100,value:'black'}]}]}}):ordinary;
  const frame=sampleTransition(plan,37),node=frame.scene.nodes[frame.decisions.findIndex(d=>d.kernel==='cartesian-point')],path=node.clips.find(clip=>!Array.isArray(clip));
  frozen(frame);assert.ok(isOwned(frame.scene.nodes));assert.ok(isOwned(node));assert.ok(isOwned(node.properties));assert.ok(isOwned(path));
  assert.throws(()=>{node.offset[0]=999;},TypeError);assert.throws(()=>{node.clip[0]=999;},TypeError);assert.throws(()=>{node.properties.x=999;},TypeError);assert.throws(()=>{path.commands[0].x=999;},TypeError);
  const bridge=createHitFrameBridge(prepareAnimationHitFrame(frame));
  try{assert.equal(bridge.hit({x:node.properties.x+node.offset[0],y:node.properties.y+node.offset[1]},{slop:0}).target.itemKey,decision.itemKey);}finally{bridge.dispose();}
  for(const fake of[Object.freeze({...frame}),cloneAndFreeze(structuredClone(frame))])assert.throws(()=>planTransition({from:fake,to,options:options(explicit)}));
  const before=JSON.stringify(frame);assert.equal(isOwned(callerClip),false);assert.equal(Object.isFrozen(callerClip),false);callerClip.commands[0].x=17;assert.equal(JSON.stringify(frame),before);
  replay(plan,37);const rebased=planTransition({from:frame,to,options:options(explicit)});assert.equal(sampleTransition(rebased,0),frame);replay(rebased,50);
 }
});

test('mixed point, geographic text and axis emissions finish as immutable owned hit nodes',()=>{
 for(const explicit of[false,true]){
  const p=points(40).createXAxis({title:false,ticksAndLabels:{values:[0,5,10]}}),q=p.editScale({id:'x',domain:[0,20],nice:false});
  const g=chart().createCanvas({width:300,height:200,margin:0}).createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{name:'Alpha'},geometry:{type:'Point',coordinates:[40,50]}}]}}).createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark'}).createMarkLabels({field:'name'});
  const compose=(point,geo)=>hconcat({id:'mixed',programs:[{id:'point',program:point},{id:'geo',program:geo}]}),from=compose(p,g),to=compose(q,g.editProjection({scalePx:2})),saved=JSON.stringify([from,to]);
  const plan=planTransition({from,to,options:options(explicit)}),frame=sampleTransition(plan,37);
  assert.ok(frame.decisions.some(d=>d.kernel==='cartesian-point'));assert.ok(frame.decisions.some(d=>d.kernel==='native-geo-text'));assert.ok(frame.scene.nodes.some(node=>node.type==='text'));
  frozen(frame);for(const node of frame.scene.nodes)assert.ok(isOwned(node));
  assert.throws(()=>{frame.scene.nodes[0].clip[0]=999;},TypeError);assert.throws(()=>{frame.scene.nodes.push(frame.scene.nodes[0]);},TypeError);
  replay(plan,37);const next=planTransition({from:frame,to,options:options(explicit)});replay(next,50);
  const proof=animationFrameProvenance(sampleTransition(next,50));assert.equal(Object.hasOwn(proof,'plan'),false);assert.equal(Object.hasOwn(proof,'previous'),false);
  assert.equal(JSON.stringify([from,to]),saved);
 }
});
