import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { prepareAnimationColumnsV2, restoreAnimationColumnsV2 } from "../../../src/animation/columnCodec.js";
import { createOfflineResourceScope } from "../../../src/animation/resources.js";
import { encodeAnimationEnvelope, decodeAnimationEnvelope } from "../../../src/animation/envelopeCodec.js";

test("private numeric columns carry native and sampled geographic commands without regeneration", () => {
  const coordinates = Array.from({length:1000}, (_,i) => [-30+60*i/999,(i%2?1:-1)*5]);
  const from = chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
    .createGeometryData({id:"world",format:"geojson",coordinateKind:"geographic",values:{type:"FeatureCollection",features:[{type:"Feature",id:"line",properties:{},geometry:{type:"LineString",coordinates}}]}})
    .createProjection({id:"map",type:"equirectangular",scalePx:100,translatePx:[200,200],precisionPx:.5})
    .createCoordinate({type:"geo"}).createGeoLineMark({id:"coast",stroke:"#2563eb",strokeWidth:2});
  const to = from.editProjection({scalePx:200});
  const options = {durationMs:100,easing:"linear"};
  const native = planTransition({from,to,options});
  assert.equal(sampleTransition(native,50).decisions[1].kernel,"native-geo");
  const rebased = planTransition({from:sampleTransition(native,37),to,options});
  for (const plan of [native,rebased]) {
    const raw = exportTransitionPlan(plan), scope = createOfflineResourceScope({maxOutputNodes:10000});
    const packed = prepareAnimationColumnsV2(raw,scope);
    assert.ok(packed.compact.vectors.some(vector=>vector.kind==="float64-le"&&vector.length===1999));
    const restoredRaw = restoreAnimationColumnsV2(decodeAnimationEnvelope(encodeAnimationEnvelope(packed.compact)),scope);
    assert.deepEqual(restoredRaw,raw);
    assert.equal(packed.metrics.logicalValues,packed.metrics.validatedLogicalValues);
    const restored = restoreTransitionPlan(restoredRaw);
    for (const time of [0,19,50,100]) assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));
    const changed = structuredClone(restoredRaw);
    changed.from.geos.groups[0].presentation.geometry.parameters.scalePx *= 2;
    assert.throws(()=>restoreTransitionPlan(changed),/differs|geometry|projection|camera|Geographic/);
  }
});
