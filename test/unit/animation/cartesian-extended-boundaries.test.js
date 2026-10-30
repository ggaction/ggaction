import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCartesianAnimationState as normalize, prepareCartesianInterpolation as prepare, sampleCartesianInterpolation as sample,
  resolveCartesianAnimationGeometry as geometry } from "../../../src/grammar/animation/cartesianState.js";
import { normalizeCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "../../../src/grammar/animation/cartesianPosition.js";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
const position=(value,scale={})=>({value,scale:{type:"linear",domain:[0,10],range:[0,100],...scale}});
const xy=(x,y)=>({x:position(x),y:position(y)});
const point=()=>({kind:"point",policy:{},points:[xy(2,3)],grid:[]});
const span=()=>({kind:"rule",policy:{},points:[xy(2,3)],grid:[],span:{kind:"fixed",orientation:"horizontal",size:10}});
const overlay=()=>({kind:"overlay-line",policy:{curve:"linear",closed:false},points:[],grid:[["a"]],anchors:[{role:"point",state:point()}]});
const density=()=>({kind:"area-category-density",policy:{channel:"x",side:"both",widthBand:1,widthResolve:"shared",curve:"linear"},
  points:[{x:position("A",{type:"band",domain:["A"],range:[0,100]}),y:position(1)},
    {x:position("A",{type:"band",domain:["A"],range:[0,100]}),y:position(2)}],grid:[["a"],["b"]],density:{values:[1,2],maximum:2}});

test("native span and slot interpolation keep literal geometric sizes and changed unit policy explicit",()=>{
  const a=span(),b={...a,span:{...a.span,size:30}};
  assert.deepEqual(sample(prepare(a,b),.5).properties,{x1:10,y1:30,x2:30,y2:30});
  const band={type:"band",domain:["A"],range:[0,100]};
  const box={...a,points:[{x:position("A",band),y:position(3)}],span:{kind:"box",orientation:"horizontal",width:{band:.4},slotBand:.1,pixels:10}};
  assert.deepEqual(geometry(box).properties,{x1:55,y1:30,x2:65,y2:30});
  const moved={...box,span:{...box.span,width:{band:.8},slotBand:.3,pixels:20}};
  assert.deepEqual(sample(prepare(box,moved),.5).properties,{x1:62.5,y1:30,x2:77.5,y2:30});
  assert.equal(prepare(box,{...box,span:{...box.span,width:{pixels:40}}}).reason,"geometry-policy");
  assert.equal(prepare(a,{...a,span:{...a.span,orientation:"vertical"}}).reason,"geometry-policy");
  const slotted={...point(),points:[{x:position("A",band),y:position(3)}],slot:{channel:"x",band:-.2}};
  assert.equal(sample(prepare(slotted,{...slotted,slot:{channel:"x",band:.2}}),.5).properties.x,50);
  assert.equal(prepare(slotted,point()).reason,"geometry-policy");
});

test("extended meanings reject malformed density, recursive anchors and explicit undefined",()=>{
  const invalid=[{...span(),span:{kind:"box",orientation:"horizontal",width:{pixels:undefined}}},
    {...span(),span:{kind:"fixed",orientation:"horizontal",size:0}}, {...point(),slot:{channel:"z",band:0}},
    {...point(),slot:{channel:"x",band:.6}}, {...point(),span:span().span}, {...point(),anchors:[]},
    {...density(),density:undefined}, {...density(),density:{values:[1],maximum:2}},
    {...density(),density:{values:[1,3],maximum:2}}, {...point(),density:{values:[],maximum:1}},
    {...overlay(),anchors:[]}, {...overlay(),anchors:[{role:"point",state:overlay()}]},
    {...overlay(),anchors:[{role:"x-end",state:point()}]}, {...overlay(),anchors:[{state:point()}]},
    {...overlay(),policy:{curve:"linear"}}, {...overlay(),points:[xy(1,2)]},
    {...overlay(),kind:"overlay-point",anchors:[...overlay().anchors,...overlay().anchors],grid:[["a"],["b"]]}];
  for(const input of invalid)assert.throws(()=>normalize(input),JSON.stringify(input));
  assert.throws(()=>normalize({...overlay(),anchors:Array(10001).fill(overlay().anchors[0])}),/10000/);
  assert.throws(()=>normalize({...overlay(),grid:[Array(10001).fill("a")]}),/10000/);
  const a=overlay(),b={...a,policy:{...a.policy,closed:true}};
  assert.equal(prepare(a,b).reason,"geometry-policy");
  assert.deepEqual(geometry(b).properties.commands,[{op:"M",x:20,y:30},{op:"Z"}]);
  assert.throws(()=>sample({...prepare(a,a),anchors:[]},.5),/Invalid/);
});

test("inherited required fields and omitted optional meanings never execute host accessors",()=>{
  const probes=[];
  for(const key of ["kind","policy","points","grid"]) {const input=point();delete input[key];probes.push([key,()=>normalize(input),true]);}
  for(const key of ["value","scale"]) {const input=position(1);delete input[key];probes.push([key,()=>normalizeCartesianPosition(input),true]);}
  for(const key of ["type","domain","range"]) {const input=position(1);delete input.scale[key];probes.push([key,()=>normalizeCartesianPosition(input),true]);}
  for(const key of ["span","slot","offset","radius","anchors","density"])probes.push([key,()=>normalize(point()),false]);
  for(const key of ["kind","orientation","size"]) {const input=span();delete input.span[key];probes.push([key,()=>normalize(input),true]);}
  for(const [key,run,reject] of probes) {
    let reads=0;Object.defineProperty(Object.prototype,key,{configurable:true,get(){reads++;throw new Error("inherited getter executed");}});
    let error;try {try{run();}catch(caught){error=caught;}}finally{delete Object.prototype[key];}
    assert.equal(reads,0,key);assert.equal(error!==undefined,reject,key);
  }
  let reads=0;const input=overlay();Object.defineProperty(input.anchors[0],"state",{enumerable:true,get(){reads++;return point();}});
  assert.throws(()=>normalize(input),/accessors/);assert.equal(reads,0);
});

test("offset meaning requires its native discrete mapping and closed prepared state",()=>{
  const offset={value:"u",scale:{type:"ordinal-offset",domain:["u","v"],range:[0,80],paddingInner:0,paddingOuter:0,align:.5}};
  const p={...position("A",{type:"band",domain:["A","B"],range:[0,200]}),offset};
  const plan=prepareCartesianPosition(p,p);assert.equal(sampleCartesianPosition(plan,.5).position,30);
  assert.equal(prepareCartesianPosition(p,position("A",{type:"band",domain:["A","B"],range:[0,200]})).reason,"geometry-policy");
  assert.throws(()=>normalizeCartesianPosition({...p,offset:position(1)}),/ordinal offset/);
  assert.throws(()=>sampleCartesianPosition({...plan,offset:{}},.5),/Invalid/);
  assert.throws(()=>normalizeCartesianPosition({...p,offset:{scale:offset.scale}}),/own value/);
});

test("public restore checks overlay anchors, new kernel version and density forwarding atomically",()=>{
  const native=chart().createCanvas({width:400,height:300}).createData({id:"d",keyField:"id",values:[{id:"a",x:1,y:2},{id:"b",x:2,y:4}]})
    .createLineMark({id:"m"}).encodeX({field:"x"}).encodeY({field:"y"}).createOverlay({id:"o",source:"m"});
  const plan=planTransition({from:native,to:native.editCanvas({width:600}),options:{durationMs:100}}),payload=exportTransitionPlan(plan),before=sampleTransition(plan,50);
  const index=payload.from.cartesian.findIndex(state=>state.kind==="overlay-line");
  for(const change of [p=>{p.kernels.cartesian="semantic-cartesian-geometry@1";},p=>{p.from.cartesian[index].anchors[0].state.points[0].y.value++;},
    p=>{p.from.cartesian[index].grid[0]=["foreign"];},p=>{p.from.cartesian[index].anchors[0].role="invalid";},p=>{p.from.cartesian[index].anchors[0].state=overlay();}]) {
    const altered=structuredClone(payload);change(altered);assert.throws(()=>restoreTransitionPlan(altered));
  }
  let reads=0;const altered=structuredClone(payload);Object.defineProperty(altered.from.cartesian[index].anchors[0].state.points[0].x,"value",{enumerable:true,get(){reads++;return 1;}});
  assert.throws(()=>restoreTransitionPlan(altered),/accessors/);assert.equal(reads,0);
  assert.deepEqual(sampleTransition(plan,50),before);assert.deepEqual(sampleTransition(restoreTransitionPlan(payload),50),before);
});
