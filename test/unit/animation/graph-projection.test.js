import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGraphAnimationState, animationGraphItemGeometry, animationGraphGeometryMatches } from "../../../src/materialization/animation/graph.js";

const graph = () => chart().createCanvas({width:400,height:300,margin:20})
  .createData({id:"nodes",keyField:"id",values:[{id:"a"},{id:"b"},{id:"c"}]})
  .createData({id:"edges",keyField:"id",values:[{id:"ab",from:"a",to:"b"},{id:"ba",from:"b",to:"a"},{id:"loop",from:"a",to:"a"}]})
  .createGraphData({id:"graph",nodes:"nodes",edges:"edges",nodeKey:"id",edgeKey:"id",source:"from",target:"to",directed:true,selfLoops:true})
  .layoutGraph({id:"layout",method:"circular",options:{radius:50}})
  .createGraphPlot({id:"graphPlot",layout:"layout",labels:{}});

test("graph animation preparation reads exact completed layout values and native role geometry",()=>{
  const program=graph(),snapshot=JSON.stringify(program),endpoint=projectAnimationEndpoint(program),state=projectGraphAnimationState(program,endpoint);
  assert.equal(state.groups.length,1);assert.equal(state.items.length,endpoint.scene.nodes.length);
  const group=state.groups[0],layout=program.semanticSpec.resources.find(r=>r.kind==="layout");
  assert.deepEqual(group.nodes.map(({key,x,y})=>({key,x,y})),layout.result.nodes);
  assert.deepEqual(group.layout,{kind:"layout",id:"layout",revision:0});
  assert.equal(group.edges.length,3);assert.equal(group.edgeStyle.arrows,true);
  const roles=state.items.filter(Boolean).map(item=>[item.kind,item.role]);
  assert.equal(roles.filter(([kind,role])=>kind==="node"&&role==="body").length,3);
  assert.equal(roles.filter(([,role])=>role==="arrow").length,3);
  for(const [index,item]of state.items.entries())if(item)assert.ok(animationGraphGeometryMatches(endpoint.scene.nodes[index],animationGraphItemGeometry(state.groups[item.group],item)));
  assert.ok(Object.isFrozen(group.nodes[0]));assert.equal(JSON.stringify(program),snapshot);
});

test("nested graph owners retain distinct scopes and a single shared prepared group per owner",()=>{
  const p=graph(),q=p.editLayout({options:{radius:100}});
  const program=hconcat({id:"pair",programs:[{id:"left",program:p},{id:"right",program:q}]}),state=projectGraphAnimationState(program,projectAnimationEndpoint(program));
  assert.equal(state.groups.length,2);assert.notEqual(state.groups[0].key,state.groups[1].key);
  assert.equal(state.groups[0].layout.revision,0);assert.equal(state.groups[1].layout.revision,1);
  assert.deepEqual([...new Set(state.items.filter(Boolean).map(item=>item.group))],[0,1]);
  assert.notDeepEqual(state.groups[0].nodes,state.groups[1].nodes);
});

test("malformed graph role and stale lineage fail without changing prior state",()=>{
  const p=graph(),snapshot=JSON.stringify(p),graphicSpec=structuredClone(p.graphicSpec);
  graphicSpec.objects.graphPlot.items[0].identity.lineage.resource.revision=9;
  const stale=p._clone({graphicSpec});assert.throws(()=>projectGraphAnimationState(stale,projectAnimationEndpoint(stale)),/revision|stale/);
  const altered=structuredClone(p.graphicSpec);altered.objects.graphPlot.items[0].identity.role="unknown";
  assert.throws(()=>projectGraphAnimationState(p._clone({graphicSpec:altered}),projectAnimationEndpoint(p._clone({graphicSpec:altered}))),/exact native item grain/);
  assert.equal(JSON.stringify(p),snapshot);
  const empty=chart().createCanvas({width:20,height:20,margin:0});assert.deepEqual(projectGraphAnimationState(empty,projectAnimationEndpoint(empty)).groups,[]);
});
