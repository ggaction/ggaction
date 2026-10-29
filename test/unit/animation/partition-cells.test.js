import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionBendCellGeometry as geometry} from '../../../src/grammar/hierarchy/partitionCell.js';
import {createPartitionAnimationState as create} from '../../../src/grammar/animation/partitionState.js';
import {mapPartitionBendPoint} from '../../../src/grammar/hierarchy/partitionAdapter.js';
const kernel={width:300,height:100,innerRadius:20,outerRadius:100,radiusPolicy:'equal-depth',sweep:2*Math.PI};
const frame={origin:[240,180],angle:0,handedness:1,kernel,gap:[0,0]},cell={u0:0,u1:1,v0:0,v1:1};
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9,`${a} != ${b}`);
test('the shared builder retains exact rectangular corners and bounded current curved cells',()=>{
 const saved=structuredClone([frame,cell]),rect=geometry(cell,frame,0,1);
 assert.deepEqual(rect.commands,[{op:'M',x:90,y:180},{op:'L',x:390,y:180},{op:'L',x:390,y:280},{op:'L',x:90,y:280},{op:'Z'}]);
 assert.deepEqual(rect.anchor,{x:240,y:230});
 for(const bend of [Number.MIN_VALUE,.25,.5,.75,1]){
  const out=geometry(cell,{...frame,gap:[4,6]},bend);assert.ok(out.commands.length<=8195);assert.ok(Object.isFrozen(out.commands));
  assert.ok(out.commands.slice(0,-1).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
 assert.deepEqual([frame,cell],saved);assert.equal(geometry({...cell,u1:0},frame,.5),null);
});
test('native angle normalization agrees with stored projection for very large authored angles',()=>{
 const mapping={orientation:'horizontal',reverseU:false,reverseV:false,padding:[0,0],innerRadius:20,outerRadius:100,startAngle:1e18,sweep:280,direction:'clockwise',radiusPolicy:'equal-depth'};
 const meaning=create({nodes:[{key:'root',parentKey:null,...cell,visible:true}],focusKey:'root',frame:{x:0,y:0,width:300,height:200},mapping,polar:{centerX:150,centerY:100,outerRadius:100}});
 const {gap,...basis}=meaning.state.frame,start=(mapping.startAngle*Math.PI/180)%(2*Math.PI);
 for(const u of [0,.25,.5,1]){
  const p=mapPartitionBendPoint(basis,{u,v:.5,bend:1}),angle=start+280*Math.PI/180*u;
  close(p.x,150+60*Math.sin(angle));close(p.y,100-60*Math.cos(angle));
 }
});
test('invalid frames and tessellation requests fail before allocating cell paths',()=>{
 for(const count of [null,0,-1,1.1,4097,Infinity])assert.throws(()=>geometry(cell,frame,.5,count));
 for(const value of [null,{...frame,extra:1},{...frame,origin:[0]},{...frame,handedness:0},{...frame,gap:[-1,0]}])assert.throws(()=>geometry(cell,value,.5));
 assert.throws(()=>geometry({...cell,u1:0},{...frame,angle:NaN},.5));
 assert.throws(()=>geometry(cell,frame,2));
 let calls=0;const bad={...frame};Object.defineProperty(bad,'angle',{enumerable:true,get(){calls++;return 0;}});assert.throws(()=>geometry(cell,bad,.5),/accessors/);assert.equal(calls,0);
});
