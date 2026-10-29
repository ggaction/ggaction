import {
  geoMercator, geoMercatorRaw, geoEquirectangular, geoEquirectangularRaw,
  geoEqualEarth, geoEqualEarthRaw, geoNaturalEarth1, geoNaturalEarth1Raw,
  geoOrthographic, geoOrthographicRaw, geoStereographic, geoStereographicRaw,
  geoGnomonic, geoGnomonicRaw, geoAzimuthalEqualArea, geoAzimuthalEqualAreaRaw,
  geoAzimuthalEquidistant, geoAzimuthalEquidistantRaw,
  geoConicEqualArea, geoConicEqualAreaRaw, geoConicConformal, geoConicConformalRaw,
  geoConicEquidistant, geoConicEquidistantRaw, geoTransverseMercator,
  geoIdentity, geoAlbers, geoRotation, geoStream, geoInterpolate, geoCircle, geoCentroid, geoPath
} from "geographic-math";

const FACTORIES = {
  mercator: geoMercator, equirectangular: geoEquirectangular, "equal-earth": geoEqualEarth,
  "natural-earth": geoNaturalEarth1, orthographic: geoOrthographic, stereographic: geoStereographic,
  gnomonic: geoGnomonic, "azimuthal-equal-area": geoAzimuthalEqualArea,
  "azimuthal-equidistant": geoAzimuthalEquidistant, "conic-equal-area": geoConicEqualArea,
  "conic-conformal": geoConicConformal, "conic-equidistant": geoConicEquidistant,
  "transverse-mercator": geoTransverseMercator, identity: geoIdentity
};
const RAW = {
  mercator: geoMercatorRaw, equirectangular: geoEquirectangularRaw, "equal-earth": geoEqualEarthRaw,
  "natural-earth": geoNaturalEarth1Raw, orthographic: geoOrthographicRaw, stereographic: geoStereographicRaw,
  gnomonic: geoGnomonicRaw, "azimuthal-equal-area": geoAzimuthalEqualAreaRaw,
  "azimuthal-equidistant": geoAzimuthalEquidistantRaw
};
const CONIC_RAW = { "conic-equal-area": geoConicEqualAreaRaw, "conic-conformal": geoConicConformalRaw, "conic-equidistant": geoConicEquidistantRaw };
const RADIANS = Math.PI / 180;

// The inset constants and algorithm signature are pinned in the dependency manifest.
function compositeParts(options) {
  const k = options.scalePx, [x, y] = options.translatePx;
  const definitions = [
    ["lower48", geoAlbers(), 1, [0, 0], [-0.455, -0.238, 0.455, 0.238]],
    ["alaska", geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), 0.35, [-0.307, 0.201], [-0.425, 0.120, -0.214, 0.234]],
    ["hawaii", geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), 1, [-0.205, 0.212], [-0.214, 0.166, -0.115, 0.234]]
  ];
  return definitions.map(([id, projection, factor, offset, box]) => {
    const extent = [[x + box[0] * k, y + box[1] * k], [x + box[2] * k, y + box[3] * k]];
    projection.scale(k * factor).translate([x + offset[0] * k, y + offset[1] * k]).precision(options.precisionPx).clipExtent(extent);
    return { id, projection, extent };
  });
}

export function buildProjectionMath(options) {
  if (options.type === "albers-usa") return { parts: compositeParts(options) };
  const projection = FACTORIES[options.type]().scale(options.scalePx).translate(options.translatePx);
  if (options.reflectX !== undefined) projection.reflectX(options.reflectX).reflectY(options.reflectY).clipExtent(options.clipExtentPx);
  if (options.precisionPx !== undefined) projection.precision(options.precisionPx);
  if (options.centerDeg) {
    projection.center(options.centerDeg).rotate(options.rotateDeg);
    // Include the exact limb; forward validation rejects points beyond the hemisphere.
    projection.clipAngle(options.type === "orthographic" && options.clipAngleDeg === 90 ? 90 + 1e-6 : options.clipAngleDeg);
  }
  if (options.parallelsDeg) projection.parallels(options.parallelsDeg);
  return { parts: [{ id: null, projection }], ...(options.rotateDeg ? { rotate: geoRotation(options.rotateDeg) } : {}) };
}

export function rawProjectionMath(options) {
  if (options.type === "identity") return (x, y) => [x, y];
  if (options.type === "transverse-mercator") {
    const projection = geoTransverseMercator().scale(1).translate([0, 0]);
    return (longitude, latitude) => {
      const point = projection([longitude / RADIANS, latitude / RADIANS]);
      return [point[0], -point[1]];
    };
  }
  if (options.parallelsDeg) return CONIC_RAW[options.type](...options.parallelsDeg.map(value => value * RADIANS));
  return RAW[options.type];
}

export function streamGeometryMath(geometry, projection, sink) {
  geoStream(geometry, projection.stream(sink));
}

export function sphericalMidpoint(a, b) {
  return geoInterpolate(a, b)(0.5);
}

export function circleGeometryMath(center, radius, precision) {
  const circle = geoCircle().center(center).radius(radius).precision(precision)();
  // Generated circles use geographic source winding and exact ring closure.
  const ring = circle.coordinates[0].reverse();
  ring[ring.length - 1] = [...ring[0]];
  return circle;
}


// Centroids share the stream's source winding convention. The caller supplies
// bounded, normalized geometry; only the private mathematical adapter sees it.
export function centroidGeometryMath(geometry, spherical) {
  function rings(coordinates) {
    return coordinates.map((ring, index) => {
      if (spherical) return [...ring].reverse();
      const [x, y] = ring[0];
      let area = 0;
      for (let i = 1; i < ring.length; i++) area += (ring[i - 1][0] - x) * (ring[i][1] - y) - (ring[i][0] - x) * (ring[i - 1][1] - y);
      if (!Number.isFinite(area)) throw new RangeError("Geometry has no finite centroid area.");
      // Planar fill uses ring roles, independent of authored winding.
      return (area < 0) === (index === 0) ? [...ring].reverse() : ring;
    });
  }
  function oriented(value) {
    if (value === null) return null;
    if (value.type === "GeometryCollection") return { type: value.type, geometries: value.geometries.map(oriented) };
    if (value.type === "Polygon") return { type: value.type, coordinates: rings(value.coordinates) };
    if (value.type === "MultiPolygon") return { type: value.type, coordinates: value.coordinates.map(rings) };
    return value;
  }
  return spherical ? geoCentroid(oriented(geometry)) : geoPath().centroid(oriented(geometry));
}
