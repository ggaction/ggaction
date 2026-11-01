import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectAxisLabelGroups } from "../../../src/materialization/animation/axisLabelGroups.js";
import { prepareAxisLabelTracks, sampleAxisLabelTracks } from "../../../src/animation/axisLabelTracks.js";
import { axisLabelFrameCollector } from "../../../src/animation/axisLabelFrames.js";

const native = () => chart().createCanvas({width:400,height:300,margin:60})
  .createData({values:[{x:"AAAA BBBB",y:1},{x:"CCCC DDDD",y:2}]}).createBarPlot({x:"x",y:"y",guides:{axes:{x:{title:false,ticksAndLabels:{labels:{maxWidth:35}}},y:false},legend:false}});
const state = program => projectAxisLabelGroups(program,projectAnimationEndpoint(program));

test("prepared axis tracks keep authentic native ownership and explicit missing or incompatible fallback",()=>{
  const program=native(),from=state(program),to=state(program.editCanvas({width:600}));
  const pair=prepareAxisLabelTracks(from,to),output=sampleAxisLabelTracks(pair.state,.5);
  assert.equal(output.length,1);assert.deepEqual(output[0].graphics.map(node=>node.properties.text),["AAAA","BBBB","CCCC","DDDD"]);
  assert.throws(()=>sampleAxisLabelTracks(structuredClone(pair.state),.5),/authentic/);
  let work=0;assert.deepEqual(sampleAxisLabelTracks(pair.state,.5,n=>work+=n,{progress:()=>undefined}),output);assert.ok(work>0);
  const simple=state(program.editXAxisLabels({maxWidth:false}));
  assert.equal(prepareAxisLabelTracks(simple,to).state.groups.length,0);
  const sourceIndex=from.items.findIndex(Boolean),targetIndex=simple.items.findIndex(item=>item===null);
  assert.equal(prepareAxisLabelTracks(from,simple).fallbackTrack({sourceIndex,targetIndex}).reason,"guide-layout");
  const clip=state(program.editGraphics({target:"xAxisLabels",property:"clip",value:{type:"path",commands:[{op:"M",x:0,y:0},{op:"L",x:400,y:0},{op:"L",x:400,y:300},{op:"Z"}]}}));
  const clipped=prepareAxisLabelTracks(from,clip);assert.equal(clipped.state.groups.length,0);
  assert.equal(clipped.fallbackTrack({sourceIndex,targetIndex:clip.items.findIndex(Boolean)}).reason,"clip-topology");
  const changed=state(program.editXAxisLabels({wrap:"character"}));assert.equal(prepareAxisLabelTracks(from,changed).state.groups.length,0);
});

test("dependent guides read the same final line styles before drawing without another native layout or clock",()=>{
  const from=state(native()),to=state(native().editCanvas({width:600})),pair=prepareAxisLabelTracks(from,to);
  let clocks=0,paints=0;
  const timeline={progress(){clocks++;return .25;},node(node){paints++;return{...node,properties:{...node.properties,fill:"red"}};}};
  const sampled=sampleAxisLabelTracks(pair.state,.5,undefined,timeline),collector=axisLabelFrameCollector(sampled,to,timeline),key=JSON.stringify([[],"x"]);
  const first=collector.current(key);assert.ok(Object.isFrozen(first.graphics));assert.ok(first.graphics.every(node=>node.properties.fill==="red"));
  assert.strictEqual(collector.current(key),first);assert.equal(collector.current("missing"),undefined);
  const [slot,groupKey]=collector.slots[0],emitted=collector.at(slot,0,groupKey,0);
  assert.deepEqual(first.graphics.map(value=>value.properties),emitted.map(value=>value.node.properties));
  emitted.forEach(value=>collector.append(value.item));collector.finish();
  assert.equal(clocks,1);assert.equal(paints,4);assert.equal(first.labelBounds.length,4);
  assert.deepEqual(first.metrics,sampled[0].group.layout.metrics);assert.ok(Object.isFrozen(first.metrics));
  assert.equal(Object.hasOwn(first,"group"),false);assert.equal(Object.hasOwn(first,"placement"),false);
});


test("dependent guides cannot retain conflicting line styles as a complete raw label meaning",()=>{
  const from=state(native()),to=state(native().editCanvas({width:600})),pair=prepareAxisLabelTracks(from,to);
  const samples=sampleAxisLabelTracks(pair.state,.5);let index=0;
  const collector=axisLabelFrameCollector(samples,to,{node(node){return{...node,properties:{...node.properties,fill:index++===0?"red":"blue"}};}});
  assert.equal(collector.current(JSON.stringify([[],"x"])),undefined);
  const [slot,key]=collector.slots[0],drawn=collector.at(slot,0,key,0);
  assert.deepEqual(drawn.map(value=>value.node.properties.fill),["red","blue","blue","blue"]);
  drawn.forEach(value=>collector.append(value.item));assert.equal(collector.finish().groups[0].reason,"guide-edited");
});
