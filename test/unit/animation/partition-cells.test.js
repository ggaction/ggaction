import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionBendCellGeometry as geometry} from '../../../src/grammar/hierarchy/partitionCell.js';
import {createPartitionAnimationState as create} from '../../../src/grammar/animation/partitionState.js';
import {resolvePartitionAnimationGeometry} from '../../../src/materialization/animation/partitionGeometry.js';
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

test('group geometry retains aggregate work rejection and does not admit hidden cell frames',()=>{
 const hidden={key:'hidden',visible:false};
 const group=nodes=>({meaning:{state:{frame:{...frame,angle:NaN},bend:0,nodes}}});
 assert.throws(()=>resolvePartitionAnimationGeometry(group(Array(51021).fill(hidden))),/Partition animation geometry work/);
 assert.deepEqual([...resolvePartitionAnimationGeometry(group([hidden]))],[['hidden',null]]);
 assert.throws(()=>resolvePartitionAnimationGeometry(group([{...hidden,...cell,visible:true}])) ,/finite origin, angle and handedness/);
});
test('one prepared frame builds the same validated cells while each cell interval and literal range stays checked',async()=>{
 const {preparePartitionBendCells}=await import('../../../src/grammar/hierarchy/partitionCell.js');
 const {preparePartitionBendMapping}=await import('../../../src/grammar/hierarchy/partitionAdapter.js');
 const {validatePathCommands}=await import('../../../src/grammar/pathCommands.js');
 const {isOwned}=await import('../../../src/core/immutable.js');
 const {freezeOwned}=await import('../../../src/core/immutable.js');
 const cells=preparePartitionBendCells({...frame,gap:[4,6]},.5,8);
 for(const value of [cell,{u0:.1,u1:.4,v0:.2,v1:.9}]){
  const out=cells.cell(value);
  assert.deepEqual(cells.node(freezeOwned({key:'k',parentKey:null,...value,visible:true})),out);
  assert.deepEqual(cells.node({key:'k',...value}),out);assert.deepEqual(out,geometry(value,{...frame,gap:[4,6]},.5,8));
  assert.ok(isOwned(out)&&isOwned(out.commands)&&isOwned(out.anchor)&&isOwned(out.interval));
  assert.equal(validatePathCommands(out.commands),out.commands);
 }
 assert.equal(cells.cell({...cell,u1:0}),null);
 for(const value of [null,{...cell,extra:1},{...cell,u1:2},{...cell,u0:.8,u1:.2}])assert.throws(()=>cells.cell(value));
 for(const value of [{...cell,u1:2},{...cell,u0:.8,u1:.2},{...cell,v0:Number.NaN}])assert.throws(()=>cells.node(freezeOwned({key:'k',...value})),/zero through one|ordered|finite/);
 let reads=0;const loose={key:'k',...cell};Object.defineProperty(loose,'u0',{enumerable:true,get(){reads++;return 2;}});
 assert.throws(()=>cells.node(loose),/zero through one/);assert.equal(reads,1);
 const badGap=preparePartitionBendCells({...frame,gap:[-1,0]},.5,8);
 assert.throws(()=>badGap.node(freezeOwned({...cell,u1:2})),/u1 must lie/);assert.throws(()=>badGap.node(freezeOwned({...cell})),/gap/);
 const {gap,...basis}=frame,mapping=preparePartitionBendMapping(basis,{u:.5,v:.5,bend:.5});
 assert.deepEqual(mapping.mapLiteral({u:.3,v:.6,bend:.5}),mapping.map({u:.3,v:.6,bend:.5}));
 for(const key of ['u','v','bend'])for(const bad of [NaN,-1e-9,1+1e-9])assert.throws(()=>mapping.mapLiteral({u:.5,v:.5,bend:.5,[key]:bad}),/must lie from zero through one/);
 assert.throws(()=>mapping.map({u:.5,v:.5,bend:.5,extra:1}));
});
