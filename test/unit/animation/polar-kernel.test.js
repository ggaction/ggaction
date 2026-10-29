import assert from "node:assert/strict";
import test from "node:test";
import { normalizePolarAnimationState, preparePolarInterpolation, samplePolarInterpolation, resolvePolarAnimationGeometry, interpolatePolarAngle, validatePolarAnimationState, unavailablePolarAnimation } from "../../../src/grammar/animation/polarState.js";
const mapping="a".repeat(64),frame={centerX:100,centerY:100,availableRadius:100};
const point=(theta=350,radius=40)=>({kind:"point",frame,mapping,points:[{theta,radius}],grid:[["a"]],policy:{}});
const arc=(theta,endTheta)=>({kind:"arc",frame,mapping,points:[{theta,endTheta,innerRadius:20,radius:80}],grid:[["a"]],policy:{padAngle:0}});
const at=(a,b,t)=>samplePolarInterpolation(preparePolarInterpolation(a,b),t);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test("polar angles take the shortest seam with a positive half-turn tie and exact endpoints",()=>{
  assert.equal(interpolatePolarAngle(350,10,.5),360);
  assert.equal(interpolatePolarAngle(10,350,.5),0);
  assert.equal(interpolatePolarAngle(0,-180,.5),90);
  assert.equal(interpolatePolarAngle(720,900,.5),810);
  assert.equal(interpolatePolarAngle(350,10,0),350);assert.equal(interpolatePolarAngle(350,10,1),10);
  const source=point(),target=point(10,80),before=structuredClone(source),mid=at(source,target,.5);
  assert.deepEqual(mid.state.points,[{theta:360,radius:60}]);near(mid.properties.x,100);near(mid.properties.y,40);
  assert.deepEqual(source,before);assert.ok(Object.isFrozen(mid.state.points));
  for(let i=0;i<=20;i++){const sampled=at(source,target,i/20);near(Math.hypot(sampled.properties.x-100,sampled.properties.y-100),40+2*i);}
});

test("native polar lines preserve member order and sectors preserve full turns, padding and annular radii",()=>{
  const line={...point(),kind:"line",points:[{theta:0,radius:40},{theta:90,radius:40}],grid:[["a"],["b"]],policy:{closed:true}};
  assert.deepEqual(resolvePolarAnimationGeometry(line).properties.commands,[{op:"M",x:100,y:60},{op:"L",x:140,y:100},{op:"Z"}]);
  const sector=at(arc(350,710),arc(10,370),.5);
  assert.deepEqual(sector.state.points,[{theta:360,endTheta:720,innerRadius:20,radius:80}]);
  assert.equal(sector.properties.commands.filter(c=>c.op==="C").length,8);
  const quarter=resolvePolarAnimationGeometry(arc(0,90)).properties.commands;
  assert.deepEqual(quarter[0],{op:"M",x:100,y:20});
  near(quarter[1].x,180);near(quarter[1].y,100);
  assert.equal(preparePolarInterpolation(arc(0,90),arc(0,-90)).reason,"polar-direction");
  assert.equal(preparePolarInterpolation(line,{...line,grid:[["b"],["a"]]}).reason,"series-grid");
  assert.equal(preparePolarInterpolation(line,{...line,policy:{closed:false}}).reason,"geometry-policy");
  assert.equal(preparePolarInterpolation(point(),{...point(),mapping:"b".repeat(64)}).reason,"polar-mapping");
  assert.equal(preparePolarInterpolation(point(),{reason:"edited-position"}).reason,"edited-position");
});

test("polar kernels reject unknown, unsafe or inconsistent state before native geometry",()=>{
  const mutations=[s=>s.kind="rule",s=>s.extra=1,s=>delete s.frame,s=>s.frame.centerX=NaN,s=>s.frame.availableRadius=-1,
    s=>s.mapping="bad",s=>s.points=[],s=>s.points[0].radius=-1,s=>s.points[0].radius=101,s=>s.grid=[],s=>s.grid=[[]],s=>s.grid=[[3]],
    s=>s.policy={extra:true},s=>s.points[0].theta=Infinity];
  for(const mutate of mutations){const s=structuredClone(point());mutate(s);assert.throws(()=>normalizePolarAnimationState(s));}
  for(const p of [arc(0,0),arc(0,361),{...arc(0,90),policy:{padAngle:90}},{...arc(0,90),points:[{...arc(0,90).points[0],innerRadius:80}]}])assert.throws(()=>normalizePolarAnimationState(p));
  assert.throws(()=>normalizePolarAnimationState({...point(),kind:"line",points:[...point().points,...point().points],grid:[["a"],["b"]],policy:{closed:1}}));
  assert.throws(()=>normalizePolarAnimationState({...point(),points:Array(10001).fill(point().points[0])}));
  assert.throws(()=>unavailablePolarAnimation("future"));assert.throws(()=>resolvePolarAnimationGeometry({reason:"anonymous"}));
  assert.throws(()=>samplePolarInterpolation({...preparePolarInterpolation(point(),point(10)),version:"future"},.5));
  assert.throws(()=>samplePolarInterpolation({kind:"polar",version:"native-polar-coordinates@1",from:point(),to:{...point(),mapping:"b".repeat(64)}},.5));
  const identity={lineage:{rowKeys:["a"]}},node=resolvePolarAnimationGeometry(point());
  validatePolarAnimationState(point(),identity,node);validatePolarAnimationState({reason:"anonymous"},undefined,{});
  assert.throws(()=>validatePolarAnimationState(point(),{lineage:{rowKeys:["b"]}},node));
  assert.throws(()=>validatePolarAnimationState({reason:"anonymous"},identity,node));
});

test("polar sampling rejects a nonfinite interior even when both endpoint coordinates are finite",()=>{
  const wide={centerX:Number.MAX_VALUE*.8,centerY:0,availableRadius:Number.MAX_VALUE*.6};
  const a={...point(0,wide.availableRadius),frame:wide},b={...a,points:[{theta:180,radius:wide.availableRadius}]};
  assert.ok(Object.values(resolvePolarAnimationGeometry(a).properties).every(Number.isFinite));
  assert.ok(Object.values(resolvePolarAnimationGeometry(b).properties).every(Number.isFinite));
  assert.equal(at(a,b,.5).reason,"nonfinite-geometry");
});
