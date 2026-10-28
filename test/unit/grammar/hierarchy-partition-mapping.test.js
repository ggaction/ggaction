import assert from "node:assert/strict";import test from "node:test";
import {mapPartitionRectangle,mapPartitionSector,partitionRadius} from "../../../src/grammar/hierarchy/partitionMapping.js";
import {rectangleReference,radialReference} from "../../oracles/partition-mapping.js";
const cell={u0:0,u1:.6,v0:1/3,v1:2/3},frame={x:10,y:20,width:1000,height:300};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test("maps canonical intervals to rectangles without altering their values",()=>{
 const source=structuredClone(cell);assert.deepEqual(mapPartitionRectangle(cell,frame),{x:10,y:120,width:600,height:100,visible:true});assert.deepEqual(cell,source);
 for(const orientation of["horizontal","vertical"])for(const reverseU of[false,true])for(const reverseV of[false,true]){
  const options={...frame,orientation,reverseU,reverseV},actual=mapPartitionRectangle(cell,options),expected=rectangleReference(cell,options);for(const name of["x","y","width","height"])close(actual[name],expected[name]);
 }
 const padded=mapPartitionRectangle(cell,{...frame,gapX:10,gapY:4});assert.deepEqual(padded,{x:15,y:122,width:590,height:96,visible:true});
 assert.equal(mapPartitionRectangle(cell,{...frame,gapX:600}).visible,false);assert.equal(mapPartitionRectangle(cell,{...frame,gapY:101}).height,0);
 assert.equal(mapPartitionRectangle({...cell,u1:0},frame).width,0);assert.equal(mapPartitionRectangle(cell,{...frame,width:0,height:0}).visible,false);
});
test("shares radial band policy and applies pixel gaps after normalized geometry",()=>{
 const sector=mapPartitionSector(cell,{innerRadius:0,outerRadius:300});close(sector.endAngle-sector.startAngle,Math.PI*1.2);assert.equal(sector.innerRadius,100);assert.equal(sector.outerRadius,200);
 const reversed=mapPartitionSector(cell,{innerRadius:0,outerRadius:300,startAngle:Math.PI,direction:"counterclockwise"});close(reversed.startAngle,Math.PI);close(reversed.endAngle,Math.PI-Math.PI*1.2);
 const padded=mapPartitionSector(cell,{innerRadius:0,outerRadius:300,angularGap:30,radialGap:10});close(padded.startAngle,.1);close(padded.endAngle,Math.PI*1.2-.1);assert.equal(padded.innerRadius,105);assert.equal(padded.outerRadius,195);
 assert.equal(mapPartitionSector(cell,{innerRadius:0,outerRadius:300,angularGap:10000}).visible,false);assert.equal(mapPartitionSector(cell,{innerRadius:0,outerRadius:300,radialGap:101}).visible,false);
 assert.equal(mapPartitionSector({u0:0,u1:1,v0:0,v1:0},{innerRadius:0,outerRadius:1,angularGap:1}).visible,false);
 assert.equal(mapPartitionSector({...cell,u1:0},{innerRadius:0,outerRadius:1}).visible,false);
 const tiny=mapPartitionSector({u0:0,u1:1,v0:0,v1:1},{innerRadius:0,outerRadius:Number.MIN_VALUE,angularGap:1});assert.ok(Object.values(tiny).every(v=>typeof v!=="number"||Number.isFinite(v)));
});
test("matches radial-area literals, monotonicity and finite extreme radii",()=>{
 close(partitionRadius(.5,{innerRadius:0,outerRadius:100,radiusPolicy:"equal-depth-area"}),Math.sqrt(5000));
 for(const radiusPolicy of["equal-depth","equal-depth-area"]){let previous=0;for(let i=0;i<=40;i++){const v=i/40,actual=partitionRadius(v,{innerRadius:10,outerRadius:100,radiusPolicy});close(actual,radialReference(v,10,100,radiusPolicy));assert.ok(actual>=previous);previous=actual;}}
 const radii=Array.from({length:5},(_,i)=>partitionRadius(i/4,{innerRadius:20,outerRadius:100,radiusPolicy:"equal-depth-area"}));for(let i=1;i<radii.length;i++)close(radii[i]**2-radii[i-1]**2,2400);
 const maximum=Number.MAX_VALUE;for(const v of[0,.25,.5,1])assert.ok(Number.isFinite(partitionRadius(v,{innerRadius:maximum/2,outerRadius:maximum,radiusPolicy:"equal-depth-area"})));
});
test("rejects invalid ranges, shapes, getters and nonfinite output boundaries",()=>{
 for(const property of["u0","u1","v0","v1"])for(const value of[-1,2,NaN])assert.throws(()=>mapPartitionRectangle({...cell,[property]:value},frame));
 assert.throws(()=>mapPartitionRectangle({...cell,u0:.8},frame));assert.throws(()=>mapPartitionRectangle({...cell,v0:.9},frame));assert.throws(()=>mapPartitionRectangle({...cell,other:1},frame));
 for(const patch of[{orientation:"other"},{reverseU:1},{reverseV:null},{gapX:-1},{gapY:Infinity},{width:-1},{height:-1},{x:NaN},{y:Infinity},{x:Number.MAX_VALUE,width:Number.MAX_VALUE},{y:Number.MAX_VALUE,height:Number.MAX_VALUE},{other:1}])assert.throws(()=>mapPartitionRectangle(cell,{...frame,...patch}));
 for(const patch of[{innerRadius:-1},{innerRadius:1},{outerRadius:Infinity},{radiusPolicy:"other"},{sweep:0},{sweep:7},{startAngle:NaN},{direction:"other"},{angularGap:-1},{radialGap:Infinity},{other:1}])assert.throws(()=>mapPartitionSector(cell,{innerRadius:0,outerRadius:1,...patch}));
 assert.throws(()=>partitionRadius(-1,{innerRadius:0,outerRadius:1}));assert.throws(()=>partitionRadius(.5,{innerRadius:0,outerRadius:1,other:1}));
 let calls=0;const options={get innerRadius(){calls++;return 0;},outerRadius:1};assert.throws(()=>mapPartitionSector(cell,options));assert.throws(()=>partitionRadius(.5,options));assert.equal(calls,0);
});
