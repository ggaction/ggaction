import assert from "node:assert/strict";
import test from "node:test";
import { createPartitionBendAdapter, samplePartitionBendPoint, partitionBendSegments } from "../../../src/grammar/hierarchy/partitionAdapter.js";
const rect={x:20,y:30,width:320,height:180,orientation:"horizontal",reverseU:false,reverseV:false};
const polar={centerX:240,centerY:200,innerRadius:20,outerRadius:120,startAngle:35,sweep:280,direction:"counterclockwise",reverseU:false,reverseV:false,radiusPolicy:"equal-depth"};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ~= ${b}`);
test("screen bend endpoints preserve every compatible orientation and explicitly reject reflections",()=>{
 let compatible=0,reflected=0;
 for(const orientation of ["horizontal","vertical"]) for(const reverseU of [false,true]) for(const reverseV of [false,true])
 for(const direction of ["clockwise","counterclockwise"]) for(const polarU of [false,true]) for(const polarV of [false,true]) {
  const r={...rect,orientation,reverseU,reverseV},p={...polar,direction,reverseU:polarU,reverseV:polarV},adapter=createPartitionBendAdapter(r,p);
  const a=(orientation==="horizontal"?1:-1)*(reverseU?-1:1)*(reverseV?-1:1),b=-(direction==="clockwise"?1:-1)*(polarU?-1:1)*(polarV?-1:1);
  assert.equal(adapter.compatible,a===b);
  if(!adapter.compatible){reflected++;assert.equal(adapter.reason,"handedness");continue;}compatible++;
  for(const u of [0,.3,1])for(const v of [0,.4,1]) {
   const zero=samplePartitionBendPoint(adapter,{u,v:polarV?1-v:v,bend:0});
   const uu=reverseU?1-u:u,vv=reverseV?1-v:v;
   close(zero.x,rect.x+rect.width*(orientation==="horizontal"?uu:vv));close(zero.y,rect.y+rect.height*(orientation==="horizontal"?vv:uu));
   const one=samplePartitionBendPoint(adapter,{u,v:polarV?1-v:v,bend:1}),angle=(p.startAngle+(direction==="clockwise"?1:-1)*p.sweep*(polarU?1-u:u))*Math.PI/180;
   const radius=20+100*(polarV?1-v:v);close(one.x,p.centerX+radius*Math.sin(angle));close(one.y,p.centerY-radius*Math.cos(angle));
  }
 }
 assert.equal(compatible,32);assert.equal(reflected,32);
});
test("small bends stay finite and chord bounds scale with visible curvature",()=>{
 const adapter=createPartitionBendAdapter(rect,polar);
 for(const bend of [0,Number.MIN_VALUE,1e-14,.5,1]) {
  assert.ok(Object.values(samplePartitionBendPoint(adapter,{u:.23,v:.8,bend})).every(Number.isFinite));
  const n=partitionBendSegments(adapter,bend);assert.ok(n>=1&&n<=4096);
 }
 assert.equal(partitionBendSegments(adapter,0),1);
 assert.ok(partitionBendSegments(adapter,.5,.01)>partitionBendSegments(adapter,.5,.2));
 const area=createPartitionBendAdapter(rect,{...polar,radiusPolicy:"equal-depth-area"});
 const point=samplePartitionBendPoint(area,{u:.5,v:.5,bend:1}),radius=Math.sqrt((20**2+120**2)/2);
 close(Math.hypot(point.x-240,point.y-200),radius);
});
test("invalid endpoint, coordinate and tessellation requests fail closed",()=>{
 for(const patch of [{width:0},{orientation:"diagonal"},{reverseV:1},{x:Infinity},{extra:1}]) assert.throws(()=>createPartitionBendAdapter({...rect,...patch},polar));
 for(const patch of [{sweep:361},{direction:"left"},{reverseU:1},{outerRadius:0},{radiusPolicy:"none"}]) assert.throws(()=>createPartitionBendAdapter(rect,{...polar,...patch}));
 assert.throws(()=>createPartitionBendAdapter({},polar));
 assert.throws(()=>samplePartitionBendPoint({compatible:false},{u:.5,v:.5,bend:1}));
 const adapter=createPartitionBendAdapter(rect,polar);
 assert.throws(()=>samplePartitionBendPoint(adapter,{u:0,v:0,bend:2}));
 assert.throws(()=>partitionBendSegments(adapter,.5,0));
 assert.throws(()=>partitionBendSegments(adapter,.5,1e-20));
 assert.throws(()=>samplePartitionBendPoint({...adapter,origin:[Number.MAX_VALUE,Number.MAX_VALUE],center:[Number.MAX_VALUE,Number.MAX_VALUE],kernel:{...adapter.kernel,width:Number.MAX_VALUE}},{u:1,v:0,bend:0}));
});
