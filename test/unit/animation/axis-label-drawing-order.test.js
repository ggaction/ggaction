import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { canvasSceneSnapshot } from "../../../src/sceneSnapshot.js";
import { serializeProgram } from "../../../src/persistence.js";

const options={durationMs:100,easing:"linear"};
const plan=(from,to)=>planTransition({from,to,options});
const offline=value=>deserializeAnimation(serializeAnimation(value)).plan;
const labelMap=(a,b)=>[{value:0,label:a},{value:1,label:b}];
function mixed(hidden) {
  const features=["a","b"].map(id=>({type:"Feature",id,properties:{name:id},geometry:{type:"Point",coordinates:[0,0]}}));
  return chart().createCanvas({width:400,height:400,margin:80}).createData({values:[{x:0,y:0},{x:1,y:1}]})
    .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"})
    .createXAxis({title:false,ticksAndLabels:{values:[0,1],labels:{maxWidth:50,labelMap:labelMap("Alpha One","Beta Two")}}})
    .createGeometryData({id:"places",format:"geojson",coordinateKind:"geographic",featureKey:"id",values:{type:"FeatureCollection",features}})
    .createProjection({id:"map",type:"orthographic",scalePx:100,translatePx:[hidden?-400:50,100],clipExtentPx:[[0,0],[240,240]]})
    .createCoordinate({id:"geo",type:"geo",projection:"map"}).createGeoPointMark({id:"places-mark",coordinate:"geo"})
    .createMarkLabels({field:"name"}).layoutLabels({target:"places-mark-labels",leader:{}})
    .createYAxis({coordinate:"main",scale:"y",title:false,ticksAndLabels:{values:[0,1],labels:{maxWidth:50,labelMap:labelMap("Gamma One","Delta Two")}}});
}
function drawings(scene,backgrounds) {
  return scene.nodes.map(({key,topology,...node},index)=>backgrounds.has(index)?{role:"canvas-background"}:node.type!=="text"?node:{...node,properties:{...node.properties,fontWeight:node.properties.fontWeight==="normal"?400:node.properties.fontWeight}});
}
const sampledDrawings=frame=>drawings(frame.scene,new Set(animationFrameProvenance(frame).endpoint.backgrounds.map(value=>value.index)));
function nativeDrawings(program){const snapshot=canvasSceneSnapshot(program);return drawings(snapshot.scene,new Set(snapshot.sources.flatMap((source,index)=>snapshot.canvases.some(canvas=>`${canvas.graphicId}/background`===source.graphicId)?[index]:[])));}

test("dynamic axes preserve complete native drawing order with visible and middle-only Geo bodies, leaders and labels",()=>{
  for(const hidden of [false,true]) {
    const from=mixed(hidden),to=from.editCanvas({width:600}).editProjection({target:"map",translatePx:[hidden?600:150,100]});
    const before=serializeProgram(from),transition=plan(from,to),current=sampleTransition(transition,50);
    const native=from.editCanvas({width:500}).editProjection({target:"map",translatePx:[100,100]});
    assert.deepEqual(sampledDrawings(current),nativeDrawings(native));
    const proof=animationFrameProvenance(current);
    assert.equal(proof.axislabels.groups.length,2);assert.equal(proof.geotexts.order.length,3);
    assert.deepEqual(proof.axislabels.groups.map(group=>group.placement.geographicBefore),[3,3]);
    assert.equal(current.decisions.filter(d=>d.kind==="geographic").length,5);
    if(hidden)for(const time of [0,100])assert.equal(sampleTransition(transition,time).scene.nodes.filter(node=>node.type==="circle").length,2);
    for(const time of [0,25,50,100])assert.deepEqual(sampleTransition(offline(transition),time),sampleTransition(transition,time));
    for(const target of [from,to]) {
      const next=plan(current,target);assert.strictEqual(sampleTransition(next,0),current);
      for(const time of [0,25,50,100])assert.deepEqual(sampleTransition(offline(next),time),sampleTransition(next,time));
    }
    assert.equal(serializeProgram(from),before);
    const bad=structuredClone(exportTransitionPlan(plan(current,to)));
    bad.from.axislabels.groups[1].placement.geographicBefore=2;
    assert.throws(()=>restoreTransitionPlan(bad),/drawing order|current slot/);
  }
});

test("nested zero-line axes keep their place around changing geographic roles",()=>{
  const before=mixed(true).editXAxisLabels({target:"x",labelMap:labelMap("","")}).editYAxisLabels({target:"y",labelMap:labelMap("","")});
  const after=before.editCanvas({width:600}).editProjection({target:"map",translatePx:[600,100]});
  const stationary=mixed(false),wrap=p=>hconcat({id:"pair",programs:[{id:"first",program:p},{id:"second",program:stationary}]});
  const from=wrap(before),to=wrap(after),transition=plan(from,to),current=sampleTransition(transition,50),state=animationFrameProvenance(current).axislabels;
  assert.equal(state.groups.length,4);assert.equal(state.items.filter(item=>item!==null&&item.group<2).length,0);
  assert.deepEqual(state.groups.map(group=>group.placement.geographicBefore),[3,3,6,6]);
  assert.deepEqual(sampledDrawings(current),nativeDrawings(wrap(before.editCanvas({width:500}).editProjection({target:"map",translatePx:[100,100]}))));
  const next=plan(current,to);assert.strictEqual(sampleTransition(next,0),current);
  assert.deepEqual(sampleTransition(offline(next),50),sampleTransition(next,50));
  assert.deepEqual(sampleTransition(offline(transition),50),current);
});
