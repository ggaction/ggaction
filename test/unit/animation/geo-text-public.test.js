import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { serializeProgram } from "../../../src/persistence.js";
import { canvasSceneSnapshot } from "../../../src/sceneSnapshot.js";

const feature = (id, name, coordinates) => ({ type: "Feature", id, properties: { name }, geometry: coordinates === null ? null : { type: "Point", coordinates } });
function base(features = [feature("a", "Alpha", [40, 50]), feature("b", "Beta", [40, 50])], camera = { type: "identity" }) {
  return chart().createCanvas({ width: 400, height: 300, margin: 0 }).createGeometryData({ id: "places", format: "geojson", coordinateKind: camera.type === "identity" ? "planar" : "geographic", featureKey: "id", values: { type: "FeatureCollection", features } })
    .createProjection({ id: "map", ...camera }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places-mark" });
}
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const copy = value => JSON.parse(JSON.stringify(value));
const texts = frame => frame.scene.nodes.filter(node => ["text", "line"].includes(node.type));
const scene = program => canvasSceneSnapshot(program).scene;
const close = (a, b) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);
function parity(actual, expected) {
  const nodes = expected.nodes;
  assert.equal(actual.nodes.length, nodes.length);
  actual.nodes.forEach((node, index) => {
    assert.equal(node.type, nodes[index].type);
    for (const key of new Set([...Object.keys(node.properties), ...Object.keys(nodes[index].properties)])) {
      const a=node.properties[key], b=nodes[index].properties[key];
      if (typeof a === "number") close(a,b); else if (key === "commands") {assert.equal(a.length,b.length);a.forEach((command,i)=>{assert.deepEqual(Object.keys(command),Object.keys(b[i]));for(const field of Object.keys(command)){if(typeof command[field]==="number")close(command[field],b[i][field]);else assert.equal(command[field],b[i][field]);}});} else assert.deepEqual(a,b);
    }
    assert.deepEqual(node.offset,nodes[index].offset);assert.deepEqual(node.clip,nodes[index].clip);assert.deepEqual(node.clips,nodes[index].clips);
  });
}

test("public camera frames rematerialize geographic labels, collision leaders and annotations", () => {
  const from = base().createMarkLabels({ field: "name", dx: 4, dy: -3 }).layoutLabels({ target: "places-mark-labels", leader: {} })
    .createGeoAnnotation({ id: "note", anchor: { type: "position", position: [20, 30] }, text: "Note" });
  const to = from.editProjection({ scalePx: 4, translatePx: [20, 30] }), transition = plan(from,to), before = serializeProgram(from);
  assert.equal(sampleTransition(transition,0).graphicSpec,from.graphicSpec);
  assert.equal(sampleTransition(transition,100).graphicSpec,to.graphicSpec);
  const middle = sampleTransition(transition,50);
  parity(middle.scene, scene(from.editProjection({ scalePx: 2, translatePx: [10,15] })));
  assert.equal(middle.decisions.filter(value => value.kernel === "native-geo-text").length, 4);
  assert.equal(serializeProgram(from),before);
  assert.deepEqual(sampleTransition(transition,50),middle);
});

test("hidden geographic Text is emitted at its current camera without endpoint indices", () => {
  const from = base([feature("a","Middle",[0,0]),feature("empty","Empty",null)], {type:"orthographic",scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[400,300]]})
    .createMarkLabels({field:"name"}).createGeoAnnotation({id:"note",anchor:{type:"position",position:[0,0]},text:"Note"});
  const to=from.editProjection({translatePx:[600,150]}), transition=plan(from,to);
  assert.equal(texts(sampleTransition(transition,0)).length,0);assert.equal(texts(sampleTransition(transition,100)).length,0);
  const middle=sampleTransition(transition,50);
  assert.deepEqual(texts(middle).map(node=>node.properties.text),["Middle","Note"]);
  parity(middle.scene,scene(from.editProjection({translatePx:[200,150]})));
  for(const decision of middle.decisions.filter(value=>value.kernel==="native-geo-text")) {assert.equal(Object.hasOwn(decision,"targetIndex"),false);assert.equal(Object.hasOwn(decision,"sourceIndex"),false);}
  const restored=deserializeAnimation(serializeAnimation(transition)).plan;
  assert.deepEqual(sampleTransition(restored,50).scene,middle.scene);
});

test("Text keeps logarithmic camera meaning through repeated current-frame and offline rebasing", () => {
  const from=base().createMarkLabels({field:"name"}),to=from.editProjection({scalePx:16});let frame=sampleTransition(plan(from,to),50);
  assert.equal(texts(frame)[0].properties.x,160);
  for(let index=0;index<10;index++) {
    const target=index%2?from:to, transition=plan(frame,target);
    assert.equal(sampleTransition(transition,0),frame);
    const actual=sampleTransition(transition,40);
    const restored=deserializeAnimation(serializeAnimation(transition)).plan;
    assert.deepEqual(sampleTransition(restored,40).scene,actual.scene);
    const proof=animationFrameProvenance(actual);assert.equal(Object.hasOwn(proof,"plan"),false);assert.ok(proof.geotexts.groups.length);
    frame=actual;
  }
  const exported=exportAnimationFrames(plan(frame,to),{timesMs:[0,50,100]});
  assert.equal(sampleTransition(plan(exported[1],from),0),exported[1]);
});

test("body appearance fallback cannot freeze compatible geographic Text camera motion", () => {
  const from=base([feature("a","A",[10,20])]).createMarkLabels({field:"name"});
  const to=from.editGeoPointMark({target:"places-mark",fill:{type:"linear-gradient",from:{x:0,y:0},to:{x:1,y:0},stops:[{offset:0,color:"red"},{offset:1,color:"blue"}]}}).editProjection({scalePx:4});
  const transition=plan(from,to),frame=sampleTransition(transition,50);
  assert.ok(frame.decisions.some(value=>value.kind==="crossfade"));
  assert.equal(texts(frame)[0].properties.x,20);
  assert.ok(frame.decisions.some(value=>value.kernel==="native-geo-text"));
  const rebased=plan(frame,from), offline=deserializeAnimation(serializeAnimation(rebased)).plan;
  assert.deepEqual(sampleTransition(offline,50).scene,sampleTransition(rebased,50).scene);
});

test("conditional content and appearance resolve through native Text and use explicit fallback", () => {
  const ast=value=>({version:2,registry:"standard@1",root:{type:"literal",value}});
  const from=base().createMarkLabels({field:"name"}).editTextMark({target:"places-mark-labels",opacity:0}).encodeColor({target:"places-mark-labels",conditions:[{when:ast(true),value:{value:"red"}}],otherwise:{value:"blue"}});
  const transition=plan(from,from.editProjection({scalePx:4}));
  assert.ok(texts(sampleTransition(transition,50)).every(node=>node.properties.opacity===0));
  const text=from.editTextMark({target:"places-mark-labels",textOverrides:[{match:{fields:{name:"Alpha"}},occurrence:0,text:"Changed"}]}).editProjection({scalePx:4});
  const changed=plan(from,text);
  assert.ok(changed.tracks.some(track=>track.kind==="crossfade"&&track.reason==="appearance"));
});

test("closed Text transport rejects anchor, digest, binding, camera and decision contamination", () => {
  const from=base().createMarkLabels({field:"name"}),to=from.editProjection({scalePx:4}), original=exportTransitionPlan(plan(from,to));
  for(const mutate of [
    p=>p.from.geotexts.groups[0].presentation.entries[0].anchor[0]++,
    p=>p.from.geotexts.groups[0].presentation.entries[0].source.digest="0".repeat(64),
    p=>p.from.geotexts.groups[0].presentation.entries[0].identity.lineage.resource.revision++,
    p=>p.from.geotexts.groups[0].presentation.parameters.scalePx=3,
    p=>p.from.geotexts.groups[0].presentation.extra=true,
    p=>p.kernels.geoText="native-geo-text@0",
    p=>p.from.geotexts.order.push(p.from.geotexts.order[0]),
    p=>p.from.geotexts.items[p.from.geotexts.items.findIndex(Boolean)].role="leader"
  ]) {const payload=copy(original);mutate(payload);assert.throws(()=>restoreTransitionPlan(payload));}
  let reads=0;const payload=copy(original);Object.defineProperty(payload.from.geotexts.groups[0].presentation,"parameters",{enumerable:true,get(){reads++;return {};}});
  assert.throws(()=>restoreTransitionPlan(payload));assert.equal(reads,0);
  const current=sampleTransition(plan(from,to),50), sampled=exportTransitionPlan(plan(current,to));
  const corrupted=copy(sampled);corrupted.from.view.decisions.find(value=>value.kernel==="native-geo-text").role="leader";
  assert.throws(()=>restoreTransitionPlan(corrupted));
});

test("native graticule and inset labels retain their own current projections", () => {
  const grid=chart().createCanvas({width:400,height:300,margin:0}).createProjection({id:"map",type:"equirectangular",scalePx:100,translatePx:[200,150]}).createCoordinate({type:"geo"})
    .createGraticule({id:"grid",stepDeg:[30,30],extentDeg:[[-30,-30],[30,30]]}).createMarkLabels({field:"value",format:".0f",select:{field:"axis",op:"eq",value:"longitude"}});
  parity(sampleTransition(plan(grid,grid.editProjection({scalePx:400})),50).scene,scene(grid.editProjection({scalePx:200})));
  const inset=base([feature("main","Main",[-100,40]),feature("north","North",[-150,64]),feature("island","Island",[-157,20]),feature("out","Out",[0,0])],{type:"albers-usa",scalePx:300,translatePx:[200,150]}).createMarkLabels({field:"name"});
  parity(sampleTransition(plan(inset,inset.editProjection({scalePx:1200})),50).scene,scene(inset.editProjection({scalePx:600})));
});

test("nested Text collection clips and explicit drawing order survive current sampling", () => {
  const unit=base([feature("a","A",[40,50])]).createMarkLabels({field:"name"}).editGraphics({target:"places-mark-labels",property:"clip",value:{x:10,y:10,width:250,height:180}});
  const wrap=value=>hconcat({id:"pair",programs:[{id:"left",program:value},{id:"right",program:unit}],gap:5});
  const from=wrap(unit),to=wrap(unit.editProjection({scalePx:4}));
  const frame=sampleTransition(plan(from,to),50);
  const expected=wrap(unit.editProjection({scalePx:2}));
  parity(frame.scene,scene(expected));
  assert.ok(frame.decisions.filter(value=>value.kernel==="native-geo-text").every(value=>JSON.parse(value.itemKey)[0].length===1));
});


test("empty labels and stationary narrow cameras preserve exact native meaning", () => {
  const empty = base([feature("empty", "", [0, 0]), feature("null", "Null", null)]).createMarkLabels({ field: "name" });
  const changed = empty.editProjection({ scalePx: 4 });
  const frame = sampleTransition(plan(empty, changed), 50);
  assert.deepEqual(texts(frame), []);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(empty, changed))).plan, 50).scene, frame.scene);
  const stationary = base([feature("a", "A", [0, 0])], { type: "identity", scalePx: 150 }).createMarkLabels({ field: "name" });
  const middle = sampleTransition(plan(stationary, stationary), 50);
  assert.equal(animationFrameProvenance(middle).geotexts.groups[0].presentation.parameters.scalePx, 150);
  parity(middle.scene, scene(stationary));
});

test("geographic Text rejects reordered drawing slots and contradictory sampled anchors", () => {
  const from = base().createMarkLabels({ field: "name" }), to = from.editProjection({ scalePx: 4 });
  const payload = copy(exportTransitionPlan(plan(from, to)));
  payload.from.geotexts.order.reverse();
  assert.throws(() => restoreTransitionPlan(payload), /drawing order/);
  const frame = sampleTransition(plan(from, to), 50), duplicate = copy(exportTransitionPlan(plan(frame, frame)));
  duplicate.to.geotexts.groups[0].presentation.entries[0].anchor[0]++;
  assert.throws(() => restoreTransitionPlan(duplicate));
});

test("static camera policy changes have explicit geographic Text fallback", () => {
  const from = base().createMarkLabels({ field: "name" });
  const clip = from.editProjection({ clipExtentPx: [[0, 0], [390, 290]] });
  const result = plan(from, clip);
  assert.ok(result.tracks.some(track => track.kind === "crossfade" && track.reason === "projection-parameters"));
});


test("middle-only geographic labels share the final node limit with their source bodies", () => {
  const features = Array.from({ length: 5001 }, (_, id) => feature(String(id), `Name ${id}`, [0, 0]));
  const from = base(features, { type: "orthographic", scalePx: 100, translatePx: [-200, 150], clipExtentPx: [[0, 0], [400, 300]] }).createMarkLabels({ field: "name" });
  const to = from.editProjection({ translatePx: [600, 150] }), transition = plan(from, to);
  assert.equal(sampleTransition(transition, 0).scene.nodes.length, 1);
  assert.equal(sampleTransition(transition, 100).scene.nodes.length, 1);
  assert.throws(() => sampleTransition(transition, 50), /Animation sampled nodes must not exceed 10000/);
  assert.throws(() => exportAnimationFrames(transition, { timesMs: [0, 50, 100] }), /Animation sampled nodes must not exceed 10000/);
  assert.equal(sampleTransition(transition, 0).graphicSpec, from.graphicSpec);
});
