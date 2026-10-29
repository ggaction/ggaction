import assert from "node:assert/strict";
import test from "node:test";
import {prepareGraphInterpolation,sampleGraphInterpolation,validateAnimationGraphGroup} from "../../../src/grammar/animation/graphState.js";

const group=()=>({key:'[[],"graph"]',graph:{kind:"graph",id:"g",revision:0},layout:{kind:"layout",id:"l",revision:0},origin:[10,20],labelOffset:[0,14],
 nodes:[{key:"a",x:0,y:0,radius:2},{key:"b",x:100,y:0,radius:4}],edges:[{key:"ab",sourceKey:"a",targetKey:"b"}],edgeStyle:{arrows:true,arrowSize:8,parallelGap:14,loopRadius:24}});
const routed=()=>({...group(),route:{kind:"edge-route",id:"r",revision:0},coordinateSpace:"world",edges:[{key:"ab",sourceKey:"a",targetKey:"b",points:[{x:0,y:0},{x:50,y:50},{x:100,y:0}]}]});

test("graph numeric tracks preserve endpoint objects, typed keys and finite current anchors",()=>{
 const from=group(),to=group();to.nodes.reverse();to.nodes.find(node=>node.key==="a").x=40;to.nodes.find(node=>node.key==="b").x=200;to.origin=[30,40];to.labelOffset=[4,24];
 const snapshot=JSON.stringify([from,to]),plan=prepareGraphInterpolation(from,to),middle=sampleGraphInterpolation(plan,.5);
 assert.equal(sampleGraphInterpolation(plan,0).group,plan.from);assert.equal(sampleGraphInterpolation(plan,1).group,plan.to);
 assert.deepEqual(middle.group.nodes.map(node=>[node.key,node.x,node.radius]),[["b",150,4],["a",20,2]]);assert.deepEqual(middle.group.origin,[20,30]);assert.deepEqual(middle.group.labelOffset,[2,19]);
 assert.ok(Object.isFrozen(middle.group.nodes));assert.equal(JSON.stringify([from,to]),snapshot);
 assert.throws(()=>sampleGraphInterpolation(structuredClone(plan),.5),/prepared/);assert.throws(()=>sampleGraphInterpolation(plan,NaN));
 const added=group();added.nodes.push({key:"c",x:250,y:50,radius:3});assert.equal(sampleGraphInterpolation(prepareGraphInterpolation(group(),added),.5).group.nodes[2].x,250);
});

test("edge identity, parallel order, route kind and coordinate space have explicit incompatibility reasons",()=>{
 const a=group(),b=group();b.graph.id="other";assert.equal(prepareGraphInterpolation(a,b).reason,"graph-identity");
 const changed=group();changed.edges[0].sourceKey="b";assert.equal(prepareGraphInterpolation(a,changed).routes[0].reason,"graph-edge-topology");
 const extra=group();extra.edges.push({key:"ba",sourceKey:"b",targetKey:"a"});const parallel=prepareGraphInterpolation(a,extra);
 assert.equal(parallel.routes[0].reason,"graph-parallel-order");assert.equal(parallel.routes[1].reason,"graph-edge-topology");assert.equal(sampleGraphInterpolation(parallel,.5).failures.length,2);
 assert.equal(prepareGraphInterpolation(a,routed()).routes[0].reason,"graph-route-kind");
 const screen=routed();screen.coordinateSpace="screen";assert.equal(prepareGraphInterpolation(routed(),screen).routes[0].reason,"graph-coordinate-space");
});

test("route collapse is reported while current node movement remains available",()=>{
 const a=routed(),b=routed();b.nodes[0].x=100;b.nodes[1].x=0;b.edges[0].points=[{x:100,y:0},{x:50,y:-50},{x:0,y:0}];
 const result=sampleGraphInterpolation(prepareGraphInterpolation(a,b),.5);
 assert.deepEqual(result.group.nodes.map(node=>node.x),[50,50]);assert.deepEqual(result.failures,[{key:"ab",reason:"collapsed-route"}]);assert.equal(result.group.edges.length,0);
 const collapsed=routed();collapsed.nodes[1].x=0;collapsed.edges[0].points=[{x:0,y:0},{x:0,y:0}];
 assert.equal(prepareGraphInterpolation(collapsed,a).routes[0].reason,"collapsed-route");
 assert.equal(sampleGraphInterpolation(prepareGraphInterpolation(collapsed,a),.5).group.edges.length,0);
});

test("graph state rejects malformed references, duplicate keys, unknown fields, nonfinite values and noncanonical anchors",()=>{
 const changes=[
  g=>{g.key="";},g=>{g.layout.kind="graph";},g=>{g.origin=[1];},g=>{g.labelOffset=[0,Infinity];},
  g=>{g.nodes[0].key="";},g=>{g.nodes[0].x=NaN;},g=>{g.nodes[0].radius=-1;},g=>{g.nodes.push(g.nodes[0]);},
  g=>{g.edges.push(g.edges[0]);},g=>{g.edges[0].targetKey="missing";},g=>{g.edgeStyle.arrows="auto";},
  g=>{g.edgeStyle.arrowSize=undefined;},g=>{g.edges[0].extra=1;},g=>{g.nodes[0].x=undefined;}
 ];
 for(const change of changes){const value=group();change(value);assert.throws(()=>validateAnimationGraphGroup(value));}
 const a=routed();a.edges[0].points[0].x=1;assert.throws(()=>validateAnimationGraphGroup(a),/anchors/);
 const b=routed();b.coordinateSpace="invalid";assert.throws(()=>validateAnimationGraphGroup(b),/coordinate space/);
 const c=group();Object.defineProperty(c.nodes[0],"x",{enumerable:true,get(){throw new Error("getter invoked");}});assert.throws(()=>validateAnimationGraphGroup(c),error=>!/getter invoked/.test(error.message));
});
