import { chart } from "../../src/index.js";
import { planTransition, sampleTransition } from "../../src/animation.js";
import { animationFrameProvenance, registerAnimationFrame } from "../../src/animation/frameProvenance.js";
import { cloneAndFreeze } from "../../src/core/immutable.js";

export const geo = () => chart().createCanvas({ width: 240, height: 180, margin: 0 })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: ["properties", "code"], values: {
    type: "FeatureCollection", features: [
      { type: "Feature", properties: { code: "front" }, geometry: { type: "Point", coordinates: [0, 0] } },
      { type: "Feature", properties: { code: "back" }, geometry: { type: "MultiPoint", coordinates: [[180, 0], [180, 0]] } }
    ] } })
  .createProjection({ id: "map", type: "orthographic", scalePx: 70, translatePx: [120, 90] })
  .createCoordinate({ id: "geo", type: "geo" }).createGeoPointMark({ id: "places", radiusPx: 10, strokeWidth: 0 });
const options = { durationMs: 100, easing: "linear" };
const ordinary = program => sampleTransition(planTransition({ from: program, to: program, options }), 0);

// Supply only the private closed association under test. Geometry, identities,
// source keys and scopes are produced by actual native Geo materialization.
export function dynamicFrame(native, picture, childPath = [], change = value => value, identityChange = value => value, authorities = [native]) {
  const plan = planTransition({ from: authorities[0], to: native, options });
  const visible = ordinary(picture), proof = animationFrameProvenance(visible);
  const base = animationFrameProvenance(sampleTransition(plan, 50));
  const nodes = proof.endpoint.identities.map((identity, index) => {
    if (identity === undefined) return base.native.nodes.find((_, i) => base.endpoint.identities[i] === undefined);
    const origin = change({ kind: "geo-feature", program: native, childPath, ownerId: "places", itemKey: identity.key });
    return Object.freeze({ origin, metrics: Object.freeze([origin]) });
  });
  const frame = cloneAndFreeze({ ...visible });
  registerAnimationFrame(frame, { plan, timeMs: 50, positions: proof.positions,
    meaning: { endpoint: { ...proof.endpoint, identities: proof.endpoint.identities.map(identityChange) }, native: Object.freeze({ owners: Object.freeze(authorities), placement: native, nodes: Object.freeze(nodes) }) } });
  return frame;
}
