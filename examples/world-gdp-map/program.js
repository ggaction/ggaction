import { chart } from "../../src/index.js";

// Natural Earth 1:110m countries carry 2019 population and GDP estimates.
// Antarctica has no resident population, so it is left out of the map.
export function createWorldGdpMap(countries) {
  const inhabited = {
    type: "FeatureCollection",
    features: countries.features.filter(feature => feature.properties.CONTINENT !== "Antarctica")
  };
  const economy = inhabited.features.map(feature => {
    const { ADM0_A3, NAME, POP_EST, GDP_MD } = feature.properties;
    return {
      code: ADM0_A3,
      name: NAME,
      gdpPerPerson: POP_EST > 0 && GDP_MD > 0 ? (GDP_MD * 1e6) / POP_EST : null
    };
  });

  return chart()
    .createCanvas({
      width: 960,
      height: 540,
      margin: { top: 70, right: 30, bottom: 30, left: 30 }
    })
    .createGeometryData({
      id: "countries",
      format: "geojson",
      coordinateKind: "geographic",
      polygonWinding: "left-hand",
      values: inhabited
    })
    .createData({ id: "economy", keyField: "code", values: economy })
    .createGeoJoinData({
      id: "country-economy",
      geometry: "countries",
      data: "economy",
      geometryKey: ["properties", "ADM0_A3"],
      dataKey: "code"
    })
    // Projected coordinates are Canvas pixels, so fit the whole Canvas and pad it.
    .createProjection({
      id: "world",
      type: "equal-earth",
      fit: { geometry: "countries", width: 960, height: 540, padding: 50 }
    })
    .createCoordinate({ id: "map", type: "geo", projection: "world" })
    .createGraticule({
      coordinate: "map",
      extentDeg: [[-180, -60], [180, 85]],
      stepDeg: [30, 30],
      stroke: "#e2e8f0",
      strokeWidth: 0.6
    })
    .createGeoShapeMark({
      id: "countries-shape",
      geometry: "country-economy",
      coordinate: "map",
      stroke: "#ffffff",
      strokeWidth: 0.5,
      // A whole-world outline exceeds the default 10,000 projected points.
      capacity: { maxProjectedPoints: 40000, maxPathCommands: 60000 }
    })
    .encodeColor({
      target: "countries-shape",
      field: "gdpPerPerson",
      fieldType: "quantitative",
      scale: {
        type: "threshold",
        domain: [2000, 5000, 10000, 25000, 50000],
        range: ["#fde68a", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#78350f"]
      }
    })
    .createLegend({
      target: "countries-shape",
      channels: ["color"],
      title: "GDP per person (USD)",
      position: "bottom-left"
    })
    .createTitle({
      text: "GDP per person, 2019",
      subtitle: "Natural Earth country estimates · equal-earth projection"
    });
}
