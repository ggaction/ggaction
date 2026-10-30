import assert from "node:assert/strict";
import test from "node:test";
import { prepareCartesianInterpolation as prepare, sampleCartesianInterpolation as sample, normalizeCartesianAnimationState as normalize,
  validateCartesianAnimationState, resolveCartesianAnimationGeometry as geometry } from "../../../src/grammar/animation/cartesianState.js";
const pos=(value,scale={})=>({value,scale:{type:"linear",domain:[0,10],range:[0,100],...scale}});
const point=(x,y)=>({x:pos(x),y:pos(y)});
const rect=(a,b,kind="rect-range",policy={})=>({kind,policy,grid:[],points:[a,b]});
const line=(ys,curve="linear")=>({kind:"line",policy:{curve},points:ys.map((y,i)=>point(i,y)),grid:ys.map((_,i)=>[`row:${i}`])});

test("rule and rectangle samples map changing semantic values before computing extents",()=>{
  const a=rect(point(2,2),point(4,6)),b=rect(point(4,4),point(8,8));
  assert.deepEqual(sample(prepare(a,b),.5).properties,{x:30,y:30,width:30,height:40});
  const rule=sample(prepare({...a,kind:"rule"},{...b,kind:"rule"}),.5);
  assert.deepEqual(rule.properties,{x1:30,y1:30,x2:60,y2:70});
  const log=ys=>rect({x:pos(1),y:pos(ys[0],{type:"log",domain:[1,100]})},{x:pos(5),y:pos(ys[1],{type:"log",domain:[1,100]})});
  const middle=sample(prepare(log([1,10]),log([10,100])),.5);
  assert.ok(Math.abs(middle.properties.y-50*Math.log10(5.5))<1e-10);
  assert.ok(Math.abs(middle.properties.height-50)<1e-10);
});

test("native step and smooth geometry keeps its exact ordered sample grid",()=>{
  const source=line([1,3,2],"step"),target=line([3,5,4],"step");
  const mid=sample(prepare(source,target),.5);
  assert.deepEqual(mid.properties.commands,[{op:"M",x:0,y:20},{op:"L",x:5,y:20},{op:"L",x:5,y:40},{op:"L",x:10,y:40},{op:"L",x:15,y:40},{op:"L",x:15,y:30},{op:"L",x:20,y:30}]);
  for(const curve of ["step-before","step-after","basis","cardinal","monotone","monotone-steffen","natural"]) {
    const current=sample(prepare(line([1,3,2],curve),line([3,5,4],curve)),.5);
    assert.equal(current.kind,"cartesian");assert.equal(current.properties.commands[0].op,"M");
    assert.ok(current.properties.commands.every(command=>Object.entries(command).every(([key,value])=>key==="op"||Number.isFinite(value))));
    assert.deepEqual(current.state.grid,source.grid);
  }
  assert.equal(prepare(source,line([1,3,2],"basis")).reason,"geometry-policy");
  assert.equal(prepare(source,{...source,grid:[["row:2"],["row:1"],["row:0"]]}).reason,"series-grid");
});

test("area endpoints preserve closure and rectangle corner policy uses the shared native geometry",()=>{
  const lower=line([1,2,1]),upper=line([4,5,4]);
  const area={kind:"area",policy:{orientation:"vertical",curve:"linear",layout:"stack"},points:[...lower.points,...upper.points],grid:[...lower.grid,...upper.grid]};
  const result=sample(prepare(area,area),.5);
  assert.deepEqual(result.properties.commands,[{op:"M",x:0,y:10},{op:"L",x:10,y:20},{op:"L",x:20,y:10},{op:"L",x:20,y:40},{op:"L",x:10,y:50},{op:"L",x:0,y:40},{op:"Z"}]);
  const rounded={...rect(point(1,1),point(5,6)),radius:{cornerRadius:4}};
  assert.equal(geometry(rounded).type,"path");assert.equal(geometry(rounded).properties.commands.length,10);
  assert.equal(sample(prepare(rounded,rounded),.5).type,"path");
});

test("Cartesian state boundaries reject malformed topology, foreign lineage and accessor payloads",()=>{
  const source=line([1,2]);let reads=0;
  const getter={...source,get points(){reads++;return source.points;}};
  assert.throws(()=>normalize(getter),/accessors/);assert.equal(reads,0);
  for(const value of [null,{...source,kind:"other"},{...source,extra:true},{...source,points:[]},{...source,grid:[]},{...source,grid:[[],[]]},
    {...source,points:[{...source.points[0],z:1},source.points[1]]},{...source,policy:{curve:"bad"}},
    {...source,policy:{curve:"linear",tension:.5}},{...source,radius:{cornerRadius:2}},{...source,offset:pos(1)}])assert.throws(()=>normalize(value));
  const rectState=rect(point(1,1),point(2,2));
  assert.throws(()=>normalize({...rectState,radius:{cornerRadius:-1}}));
  assert.throws(()=>normalize({...rectState,radius:{extra:1}}));
  assert.throws(()=>normalize({...rectState,points:Array(10001).fill(point(1,1))}),/10000/);
  assert.throws(()=>sample({...prepare(source,source),version:"future"},.5),/kernel/);
  assert.throws(()=>sample({...prepare(source,source),points:[]},.5),/Invalid/);
  assert.throws(()=>sample(prepare(source,source),2));
  const node=geometry(source);
  assert.throws(()=>validateCartesianAnimationState(source,{role:"body",lineage:{rowKeys:["foreign"]}},node),/differs/);
});
