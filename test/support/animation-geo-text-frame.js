import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

export const geoTextFrameVariants = ["collision", "hidden"];
export function animationGeoTextFrame(variant) {
  const hidden = variant === "hidden";
  const features = ["Alpha", "Beta"].map((name, id) => ({ type: "Feature", id, properties: { name }, geometry: { type: "Point", coordinates: hidden ? [0, 0] : [30, 35] } }));
  let from = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: hidden ? "geographic" : "planar", featureKey: "id", values: { type: "FeatureCollection", features } })
    .createProjection({ id: "map", ...(hidden ? { type: "orthographic", scalePx: 100, translatePx: [-200, 150], clipExtentPx: [[0, 0], [400, 300]] } : { type: "identity" }) })
    .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points", fill: "#1679c5", radiusPx: 5 })
    .createMarkLabels({ source: "points", id: "names", field: "name", fontSize: 18, dx: 12, dy: -12 })
    .layoutLabels({ target: "names", axis: "both", padding: 3, maxDisplacement: 30, leader: {} })
    .createGeoAnnotation({ id: "note", anchor: { type: "position", position: hidden ? [0, 0] : [45, 100] }, text: "Note", dx: 10, dy: 25, fontSize: 18 });
  const to = from.editProjection(hidden ? { translatePx: [600, 150] } : { scalePx: 4, translatePx: [40, 0] });
  const native = from.editProjection(hidden ? { translatePx: [200, 150] } : { scalePx: 2, translatePx: [20, 0] });
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  const frame = sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50);
  return { from, to, native, plan, frame };
}
