import assert from "node:assert/strict";
import test from "node:test";
import {chart,hconcat} from "../../../src/index.js";
import {planTransition,exportTransitionPlan,restoreTransitionPlan} from "../../../src/animation/planner.js";
import {sampleTransition,withSampleTime} from "../../../src/animation/sample.js";
import {animationFrameProvenance} from "../../../src/animation/frameProvenance.js";
import {validateGraphic} from "../../../src/persistence/validation.js";
import {projectAnimationEndpoint} from "../../../src/animation/endpoints.js";
import {validateAnimationGraphState} from "../../../src/materialization/animation/graph.js";

const positions=[{key:"a",x:0,y:0},{key:"b",x:100,y:0},{key:"c",x:100,y:100}];
const next=[{key:"a",x:50,y:50},{key:"b",x:200,y:100},{key:"c",x:300,y:100}];
const graph=()=>chart().createCanvas({width:450,height:350,margin:20})
  .createData({id:"nodes",keyField:"id",values:[{id:"a"},{id:"b"},{id:"c"}]})
  .createData({id:"edges",keyField:"id",values:[{id:"a",from:"a",to:"b"},{id:"ba",from:"b",to:"a"},{id:"loop",from:"a",to:"a"}]})
  .createGraphData({id:"graph",nodes:"nodes",edges:"edges",nodeKey:"id",edgeKey:"id",source:"from",target:"to",directed:true,selfLoops:true})
  .layoutGraph({id:"layout",method:"fixed",options:{positions}})
  .createGraphPlot({id:"plot",layout:"layout",origin:[10,20],nodes:{radius:2},edges:{arrowSize:8},labels:{offset:[0,10]}});
const options={durationMs:100,easing:"linear"};
const changed=p=>p.editLayout({options:{positions:next}}).editGraphPlot({origin:[30,40],nodes:{radius:6},edges:{arrowSize:12},labels:{offset:[4,20]}});

test("completed graph values drive nodes, labels, parallel edges, loops and arrows through native geometry",()=>{
  const from=graph(),to=changed(from),snapshot=JSON.stringify(from),plan=planTransition({from,to,options});
  assert.equal(plan.tracks.filter(track=>track.kind==="semantic-graph").length,12);
  const frame=sampleTransition(plan,50);validateGraphic(frame.graphicSpec);
  const a=frame.scene.nodes.find(node=>node.type==="circle");assert.deepEqual([a.properties.x,a.properties.y,a.properties.radius],[65,75,4]);
  const middle=from.editLayout({options:{positions:positions.map((node,index)=>({key:node.key,x:(node.x+next[index].x)/2,y:(node.y+next[index].y)/2}))}})
    .editGraphPlot({origin:[20,30],nodes:{radius:4},edges:{arrowSize:10},labels:{offset:[2,15]}});
  const expected=projectAnimationEndpoint(middle).scene;
  assert.deepEqual(frame.scene.nodes.map(node=>node.properties),expected.nodes.map(node=>node.properties));
  assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  assert.equal(JSON.stringify(from),snapshot);assert.deepEqual(sampleTransition(plan,50),frame);
  assert.ok(Object.isFrozen(animationFrameProvenance(frame).graphs.groups[0].nodes[0]));
});

test("graph samples rebase on current layout meaning in either direction and restore without a native program",()=>{
  const from=graph(),to=changed(from),plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
  const destination=to.editLayout({options:{positions:next.map(node=>({...node,x:node.x+100}))}});
  const rebased=planTransition({from:frame,to:destination,options});assert.equal(sampleTransition(rebased,0),frame);
  const midpoint=sampleTransition(rebased,50),point=midpoint.scene.nodes.find(node=>node.type==="circle");
  assert.deepEqual([point.properties.x,point.properties.y,point.properties.radius],[132.5,92.5,5]);
  const reverse=planTransition({from:destination,to:frame,options});assert.equal(sampleTransition(reverse,100),frame);
  assert.deepEqual(sampleTransition(reverse,50).scene.nodes.map(node=>node.properties),midpoint.scene.nodes.map(node=>node.properties));
  const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(rebased)));
  assert.deepEqual(sampleTransition(restored,50).scene,midpoint.scene);
  const timed=withSampleTime(frame,0,rebased);assert.ok(animationFrameProvenance(timed).graphs);
  assert.doesNotThrow(()=>planTransition({from:timed,to:destination,options}));
});

test("stored route samples keep current center anchors and native radius inset with arrows",()=>{
  const from=graph().bundleGraphEdges({id:"route",method:"edge-path"}).editGraphPlot({routes:"route"}),to=changed(from);
  const plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
  const decisions=frame.decisions.filter(value=>value.kernel==="completed-graph");assert.ok(decisions.length>=6);
  const state=animationFrameProvenance(frame).graphs;
  for(const group of state.groups)if(group.route){
    const nodes=new Map(group.nodes.map(node=>[node.key,node]));
    for(const edge of group.edges){const a=nodes.get(edge.sourceKey),b=nodes.get(edge.targetKey);assert.deepEqual(edge.points[0],{x:a.x,y:a.y});assert.deepEqual(edge.points.at(-1),{x:b.x,y:b.y});}
  }
  const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(plan)));
  assert.deepEqual(sampleTransition(restored,50).scene,frame.scene);
  assert.doesNotThrow(()=>planTransition({from:frame,to,options}));
});

test("nested graph scopes stay independent and changing edge topology never reassigns an old edge",()=>{
  const p=graph(),q=changed(p),from=hconcat({id:"pair",programs:[{id:"left",program:p},{id:"right",program:q}]}),to=hconcat({id:"pair",programs:[{id:"left",program:q},{id:"right",program:q}]});
  const frame=sampleTransition(planTransition({from,to,options}),50),groups=animationFrameProvenance(frame).graphs.groups;
  assert.equal(new Set(groups.map(group=>group.key)).size,2);
  const changedEdge=p.reviseData({source:"edges",id:"edges2",values:[{id:"a",from:"a",to:"c"},{id:"ba",from:"b",to:"a"},{id:"loop",from:"a",to:"a"}]});
  const plan=planTransition({from:p,to:changedEdge,options});
  assert.ok(plan.tracks.some(track=>track.kind==="crossfade"&&track.reason==="topology"));
  assert.ok(plan.tracks.some(track=>track.kind==="semantic-graph"));
  validateGraphic(sampleTransition(plan,50).graphicSpec);
});

test("closed restored graph states reject changed geometry, unknown versions and forged anchors atomically",()=>{
  const p=graph(),plan=planTransition({from:p,to:changed(p),options}),payload=exportTransitionPlan(plan),snapshot=JSON.stringify(payload);
  for(const change of [
    value=>{value.kernels.graph="unknown";},
    value=>{value.from.graphs.groups[0].nodes[0].x+=1;},
    value=>{value.from.graphs.items.find(Boolean).group=9000;},
    value=>{value.from.graphs.groups[0].unexpected=true;},
    value=>{value.from.graphs.groups[0].edges[0].sourceKey="absent";},
    value=>{value.from.graphs.groups[0].nodes.push(value.from.graphs.groups[0].nodes[0]);}
  ]){const value=structuredClone(payload);change(value);assert.throws(()=>restoreTransitionPlan(value));}
  const getter=structuredClone(payload);Object.defineProperty(getter.from.graphs.groups[0],"origin",{enumerable:true,get(){throw new Error("invoked getter");}});
  assert.throws(()=>restoreTransitionPlan(getter),error=>!/invoked getter/.test(error.message));
  assert.equal(JSON.stringify(payload),snapshot);assert.doesNotThrow(()=>sampleTransition(plan,50));
  const native=projectAnimationEndpoint(p);assert.doesNotThrow(()=>validateAnimationGraphState(payload.from.graphs,native));
});

test("node and edge enter/exit keep their own meanings through a later graph rebase",()=>{
 const from=graph().reviseData({source:"nodes",id:"nodes2",values:[{id:"b"},{id:"a"}]}),to=from.reviseData({source:"nodes2",id:"nodes3",values:[{id:"b"},{id:"c"},{id:"a"}]});
 const plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
 assert.equal(frame.decisions.filter(decision=>decision.kind==="enter").length,2);
 const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(planTransition({from:frame,to,options}))));
 validateGraphic(sampleTransition(restored,50).graphicSpec);
 const reverse=sampleTransition(planTransition({from:to,to:from,options}),50);
 assert.equal(reverse.decisions.filter(decision=>decision.kind==="exit").length,2);
 assert.doesNotThrow(()=>restoreTransitionPlan(structuredClone(exportTransitionPlan(planTransition({from:reverse,to:from,options})))));
});

test("completed force and density routes use typed anchors without rerunning their solvers",()=>{
 for(const method of ["force-directed","density"]){
  const from=graph().bundleGraphEdges({id:"routes",method}).editGraphPlot({routes:"routes"}),to=changed(from),snapshot=JSON.stringify([from,to]);
  const plan=planTransition({from,to,options}),frame=sampleTransition(plan,37);
  validateGraphic(frame.graphicSpec);assert.ok(frame.decisions.some(decision=>decision.kernel==="completed-graph"));
  assert.equal(JSON.stringify([from,to]),snapshot);
  assert.deepEqual(sampleTransition(restoreTransitionPlan(structuredClone(exportTransitionPlan(plan))),37).scene,frame.scene);
 }
});

test("screen routes, paint changes, direct geometry edits and primitive changes remain explicit",()=>{
 const p=graph(),screen=p.bundleGraphEdges({id:"r",method:"edge-path",coordinateSpace:"screen"}).editGraphPlot({routes:"r"});
 assert.doesNotThrow(()=>sampleTransition(planTransition({from:screen,to:changed(screen),options}),50));
 const paint=p.editGraphPlot({nodes:{fill:"orange"}}),paintPlan=planTransition({from:p,to:paint,options});
 assert.equal(paintPlan.tracks.filter(track=>track.reason==="appearance").length,3);
 const label=p.editGraphPlot({labels:{overrides:[{key:"a",text:"Changed"}]}});
 assert.ok(planTransition({from:p,to:label,options}).tracks.some(track=>track.reason==="appearance"));
 const changedGraphic=structuredClone(p.graphicSpec),body=changedGraphic.objects.plot.items.find(item=>item.type==="circle");body.properties.x+=30;
 const edited=p._clone({graphicSpec:changedGraphic}),editedPlan=planTransition({from:edited,to:changed(p),options});
 assert.ok(editedPlan.tracks.some(track=>track.reason==="edited-graph-geometry"));
 assert.doesNotThrow(()=>restoreTransitionPlan(structuredClone(exportTransitionPlan(editedPlan))));
 const frame=sampleTransition(paintPlan,50);assert.ok(frame.scene.nodes.some(node=>node.type==="weighted-blend"));
 assert.doesNotThrow(()=>planTransition({from:frame,to:paint,options}));
});

test("native graph clipping and primitive replacement produce explicit per-item crossfades",()=>{
 const p=graph(),clipped=p.editGraphics({target:"plot",property:"clip",value:{x:0,y:0,width:80,height:80}});
 const clips=planTransition({from:p,to:clipped,options});assert.ok(clips.tracks.every(track=>track.reason==="clip-topology"));
 const altered=structuredClone(p.graphicSpec),body=altered.objects.plot.items.find(item=>item.type==="circle");
 body.type="rect";const {radius,...properties}=body.properties;body.properties={...properties,width:radius*2,height:radius*2};
 const primitive=planTransition({from:p,to:p._clone({graphicSpec:altered}),options});assert.ok(primitive.tracks.some(track=>track.reason==="primitive-kind"));
 validateGraphic(sampleTransition(primitive,50).graphicSpec);
 const payload=structuredClone(exportTransitionPlan(planTransition({from:p,to:p,options})));
 payload.from.graphs.items.find(Boolean).kind="node";assert.throws(()=>restoreTransitionPlan(payload),/resource identity/);
});

test("restored current-frame decisions require their corresponding retained typed meaning",()=>{
 const p=graph(),q=changed(p),frame=sampleTransition(planTransition({from:p,to:q,options}),50);
 const payload=exportTransitionPlan(planTransition({from:frame,to:q,options}));
 for(const change of [
  value=>{value.from.view.decisions.find(decision=>decision.kernel==="completed-graph").kernel="cartesian-point";},
  value=>{value.from.graphs.items.fill(null);value.from.graphs.groups=[];},
  value=>{delete value.from.graphs;}
 ]){const value=structuredClone(payload);change(value);assert.throws(()=>restoreTransitionPlan(value));}
});

test("current graph node and edge hit shapes follow sampled geometry rather than endpoint coordinates",async()=>{
 const {animationGraphFrame}=await import("../../support/animation-graph-frame.js");
 const {prepareConcreteHitShape}=await import("../../../src/interaction/hitConcrete.js");
 const {hitShape}=await import("../../../src/grammar/hitShapes.js");
 const {frame}=animationGraphFrame(false,true),node=frame.scene.nodes.find(value=>value.type==="circle"),edge=frame.scene.nodes.find(value=>value.type==="path");
 assert.equal(hitShape(prepareConcreteHitShape(node),{x:50,y:80},{slop:0}).hit,true);
 assert.equal(hitShape(prepareConcreteHitShape(node),{x:40,y:60},{slop:0}).hit,false);
 assert.equal(hitShape(prepareConcreteHitShape(edge),{x:130,y:80},{slop:0}).hit,true);
 assert.equal(hitShape(prepareConcreteHitShape(edge),{x:130,y:60},{slop:0}).hit,false);
});


test("stationary completed routes preserve native nonuniform path geometry",()=>{
 const p=graph().bundleGraphEdges({id:"r",method:"density"}).editGraphPlot({routes:"r"});
 const plan=planTransition({from:p,to:p,options});
 assert.deepEqual(sampleTransition(plan,50).scene,projectAnimationEndpoint(p).scene);
});

test("stationary route centers retain native corners while origin and radius change",()=>{
 const p=graph().reviseData({source:"edges",id:"edges2",values:[{id:"a",from:"a",to:"b"},{id:"ba",from:"b",to:"a"}]})
  .bundleGraphEdges({id:"r",method:"density"}).editGraphPlot({routes:"r"});
 const to=p.editGraphPlot({origin:[30,40],nodes:{radius:6}}),middle=p.editGraphPlot({origin:[20,30],nodes:{radius:4}});
 const frame=sampleTransition(planTransition({from:p,to,options}),50);
 assert.ok(frame.decisions.some(decision=>decision.kernel==="completed-graph"));
 assert.ok(frame.decisions.every(decision=>decision.kind!=="crossfade"));
 assert.deepEqual(frame.scene.nodes.map(node=>node.properties),projectAnimationEndpoint(middle).scene.nodes.map(node=>node.properties));
});

test("equal graph pixels do not erase different raw layout and origin meanings",()=>{
 const p=graph(),to=p.editLayout({options:{positions:positions.map(node=>({...node,x:node.x+100}))}}).editGraphPlot({origin:[-90,20]});
 const plan=planTransition({from:p,to,options});
 assert.ok(plan.tracks.every(track=>track.kind==="semantic-graph"));
 const frame=sampleTransition(plan,50),group=animationFrameProvenance(frame).graphs.groups[0];
 assert.equal(group.nodes[0].x,50);assert.equal(group.origin[0],-20);
 assert.deepEqual(frame.scene.nodes.map(node=>node.properties),projectAnimationEndpoint(p).scene.nodes.map(node=>node.properties));
});
