import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

export const geoFrameVariants = ["point", "line", "shape", "graticule"];
export function animationGeoFrame(variant) {
  let from = chart().createCanvas({ width: 400, height: 300, margin: 0 });
  if (variant !== "graticule") {
    const geometry = variant === "point" ? { type: "Point", coordinates: [0, 0] }
      : variant === "line" ? { type: "LineString", coordinates: [[-30, 0], [30, 0]] }
      : { type: "Polygon", coordinates: [[[-30, -30], [30, -30], [30, 30], [-30, 30], [-30, -30]]] };
    from = from.createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: ["properties", "id"], values: {
      type: "FeatureCollection", features: [{ type: "Feature", properties: { id: "feature" }, geometry }]
    } });
  }
  from = from.createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [-200, 150], clipExtentPx: [[0, 0], [400, 300]] }).createCoordinate({ type: "geo" });
  from = variant === "graticule" ? from.createGraticule({ id: "places", stepDeg: [90, 45], stroke: "red", strokeWidth: 8 })
    : variant === "point" ? from.createGeoPointMark({ id: "places", radiusPx: 12, fill: "red", strokeWidth: 0 })
    : variant === "line" ? from.createGeoLineMark({ id: "places", stroke: "red", strokeWidth: 8 })
    : from.createGeoShapeMark({ id: "places", fill: "red", strokeWidth: 0 });
  const to = from.editProjection({ translatePx: [600, 150] }), native = from.editProjection({ translatePx: [200, 150] });
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  const frame = sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50);
  return { from, to, plan, frame, native, checks: [{ point: [200, 150], rgba: [255, 0, 0, 255] }, { point: [350, 250], rgba: [255, 255, 255, 255] }] };
}
