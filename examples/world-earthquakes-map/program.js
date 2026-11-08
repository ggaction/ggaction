import { chart } from "../../src/index.js";

// USGS events of magnitude 5 or more in January 2024 over Natural Earth countries.
export function createWorldEarthquakesMap({ countries, earthquakes }) {
  const land = {
    type: "FeatureCollection",
    features: countries.features.filter(feature => feature.properties.CONTINENT !== "Antarctica")
  };
  const events = {
    type: "FeatureCollection",
    features: earthquakes.features
      .filter(feature => feature.properties.type === "earthquake")
      .map(feature => ({
        ...feature,
        properties: { ...feature.properties, depth: feature.geometry.coordinates[2] }
      }))
  };

  return chart()
    .createCanvas({
      width: 960,
      height: 540,
      margin: { top: 70, right: 30, bottom: 30, left: 30 }
    })
    .createGeometryData({
      id: "land",
      format: "geojson",
      coordinateKind: "geographic",
      polygonWinding: "left-hand",
      values: land
    })
    .createGeometryData({
      id: "events",
      format: "geojson",
      coordinateKind: "geographic",
      featureKey: "id",
      values: events
    })
    // Rotating by -150° centers the Pacific Ring of Fire.
    .createProjection({
      id: "pacific",
      type: "equal-earth",
      rotateDeg: [-150, 0],
      fit: { geometry: "land", width: 960, height: 540, padding: 50 }
    })
    .createCoordinate({ id: "map", type: "geo", projection: "pacific" })
    .createGraticule({
      coordinate: "map",
      extentDeg: [[-180, -60], [180, 85]],
      stepDeg: [30, 30],
      stroke: "#e2e8f0",
      strokeWidth: 0.6
    })
    .createGeoShapeMark({
      id: "land-shape",
      geometry: "land",
      coordinate: "map",
      fill: "#e2e8f0",
      stroke: "#ffffff",
      strokeWidth: 0.5,
      capacity: { maxProjectedPoints: 40000, maxPathCommands: 60000 }
    })
    .createGeoPointMark({
      id: "earthquakes",
      geometry: "events",
      coordinate: "map",
      opacity: 0.8,
      stroke: "#ffffff",
      strokeWidth: 0.7
    })
    .encodeSize({ target: "earthquakes", field: "mag", scale: { domain: [5, 7.5], range: [30, 600] } })
    .encodeColor({
      target: "earthquakes",
      field: "depth",
      fieldType: "quantitative",
      scale: { palette: "viridis", domain: [0, 650], reverse: true }
    })
    .createLegend({
      target: "earthquakes",
      channels: ["color"],
      title: "Depth (km)",
      position: "bottom-left"
    })
    .createTitle({
      text: "Earthquakes of magnitude 5 or more, January 2024",
      subtitle: "USGS event locations · point area: magnitude · color: depth"
    });
}
