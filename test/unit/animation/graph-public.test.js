import test from 'node:test';
import {cases} from '../../../scripts/consumers/fixtures/node/animation-graph.mjs';
for(const entry of cases)test(entry.id,entry.run);

import assert from 'node:assert/strict';
import {hconcat} from '../../../src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../../src/animation.js';
import {animationGraphFrame} from '../../support/animation-graph-frame.js';
import {animationFrameProvenance} from '../../../src/animation/frameProvenance.js';
import {prepareAnimationHitFrame,requireAnimationFrameProgram} from '../../../src/interaction/hitProgram.js';
import {createHitFrameBridge} from '../../../src/interaction/hitFrame.js';

const options={durationMs:100,easing:'linear'};
const hit=(frame,point)=>{const bridge=createHitFrameBridge(prepareAnimationHitFrame(frame));try{return bridge.hit(point,{slop:0});}finally{bridge.dispose();}};

test('native graph hit and flat proof use the current route geometry after repeated rebases',()=>{
 const {from,to}=animationGraphFrame(false,true);let current=sampleTransition(planTransition({from,to,options}),50);
 for(let index=0;index<40;index++){
  const target=index%2?from:to;current=sampleTransition(planTransition({from:current,to:target,options}),50);
  const proof=animationFrameProvenance(current);assert.equal(Object.hasOwn(proof,'plan'),false);
  assert.equal(proof.graphs.groups.length,1);assert.equal(proof.graphs.items.length,current.scene.nodes.length);
  assert.ok(proof.native.owners.length<=2);requireAnimationFrameProgram(current,target);
 }
 const node=current.scene.nodes.find(value=>value.type==='circle'),result=hit(current,{x:node.properties.x,y:node.properties.y});
 assert.equal(result.target.ownerId,'plot');assert.ok(result.target.resourceRefs.some(ref=>ref.kind==='layout'));
 const edge=hit(current,{x:node.properties.x+80,y:node.properties.y});
 assert.equal(edge.target.ownerId,'plot');assert.ok(edge.target.resourceRefs.some(ref=>ref.kind==='edge-route'));
 const offline=sampleTransition(deserializeAnimation(serializeAnimation(planTransition({from:current,to,options}))).plan,50);
 assert.throws(()=>prepareAnimationHitFrame(offline),/native endpoint metadata/);
});

test('native graph hit preserves child scopes when the same endpoint is placed twice',()=>{
 const {from,to}=animationGraphFrame(false,true),compose=program=>hconcat({id:'pair',programs:[{id:'left',program},{id:'right',program}]});
 const frame=sampleTransition(planTransition({from:compose(from),to:compose(to),options}),50);
 const nodes=frame.scene.nodes.filter(value=>value.type==='circle');
 assert.deepEqual(nodes.map(node=>hit(frame,{x:node.properties.x+node.offset[0],y:node.properties.y+node.offset[1]}).target.childPath),[['left'],['left'],['right'],['right']]);
});
