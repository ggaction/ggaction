import assert from "node:assert/strict";import test from "node:test";
import {bendPartitionPoint} from "../../../src/grammar/hierarchy/partitionBend.js";
import {bendReference} from "../../oracles/partition-mapping.js";
const options={width:2*Math.PI,height:1,innerRadius:0,outerRadius:1,sweep:2*Math.PI},close=(a,b,tolerance=1e-11)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test("anchors canonical bend center and exact endpoint branches",()=>{
 for(const bend of[0,Number.MIN_VALUE,1e-16,1e-8,.25,.5,.9,1])assert.deepEqual(bendPartitionPoint({u:.5,v:.5,bend},options),{x:0,y:.5});
 assert.deepEqual(bendPartitionPoint({u:.75,v:1,bend:0},options),{x:Math.PI/2,y:1});const end=bendPartitionPoint({u:.75,v:1,bend:1},options);close(end.x,1);close(end.y,0);
 assert.deepEqual(bendPartitionPoint({u:0,v:0,bend:0},{...options,height:0}),{x:-Math.PI,y:0});
});
test("agrees with an independent direct circle formula away from cancellation",()=>{
 for(const radiusPolicy of["equal-depth","equal-depth-area"])for(const sweep of[Math.PI/4,Math.PI,Math.PI*2])for(const bend of[.01,.1,.4,.8,1])for(const u of[0,.2,.5,.8,1])for(const v of[0,.2,.75,1]){
  const config={...options,width:50,height:30,innerRadius:5,outerRadius:40,sweep,radiusPolicy},actual=bendPartitionPoint({u,v,bend},config),expected=bendReference(u,v,bend,config);close(actual.x,expected.x);close(actual.y,expected.y);
 }
});
test("has a finite small-b limit even where direct radius would overflow",()=>{
 for(const bend of[Number.MIN_VALUE,1e-300,1e-20,1e-12])for(const u of[0,.25,.75,1]){
  const actual=bendPartitionPoint({u,v:.3,bend},options);close(actual.x,options.width*(u-.5),1e-10);close(actual.y,.3,1e-10);
 }
 const extreme=bendPartitionPoint({u:1,v:1,bend:Number.MIN_VALUE},{width:1e300,height:1e300,innerRadius:0,outerRadius:1e300});assert.ok(Number.isFinite(extreme.x)&&Number.isFinite(extreme.y));
 assert.throws(()=>bendPartitionPoint({u:1,v:1,bend:.5},{width:Number.MAX_VALUE,height:Number.MAX_VALUE,innerRadius:0,outerRadius:Number.MAX_VALUE}),/finite coordinates/);
});
test("validates all bend fields without invoking descriptors",()=>{
 const point={u:.5,v:.5,bend:.5};for(const key of["u","v","bend"])for(const value of[-1,2,NaN])assert.throws(()=>bendPartitionPoint({...point,[key]:value},options));
 assert.throws(()=>bendPartitionPoint({...point,other:1},options));for(const patch of[{width:0},{width:Infinity},{height:-1},{height:NaN},{sweep:0},{sweep:7},{other:true}])assert.throws(()=>bendPartitionPoint(point,{...options,...patch}));
 let calls=0;assert.throws(()=>bendPartitionPoint(point,{...options,get width(){calls++;return 1;}}));assert.equal(calls,0);
});
