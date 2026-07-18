import { chart } from "../../../src/index.js";

export function createGapminderRegressionFacet(rows, {
  xResolution = "shared"
} = {}) {
  return chart()
    .createCanvas({
      width: 280,
      height: 240,
      margin: { top: 36, right: 18, bottom: 50, left: 58 }
    })
    .createData({ values: rows })
    .createPointMark({ opacity: 0.35 })
    .encodeX({
      field: "fertility",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      field: "life_expect",
      scale: { nice: true, zero: false }
    })
    .encodeRadius({ value: 2.5 })
    .encodeColor({
      field: "pop",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    })
    .createRegression({
      band: { opacity: 0.14 },
      line: { strokeWidth: 2.5 }
    })
    .editLineMark({ target: "pointRegressionLines", stroke: "#111827" })
    .createGuides({
      axes: {
        x: {
          line: { color: "#64748b", lineWidth: 1.2 },
          ticksAndLabels: {
            ticks: { color: "#64748b", lineWidth: 1, length: 4 },
            labels: { offset: 9, fontSize: 9.5 }
          },
          title: {
            text: "Fertility",
            offset: 40,
            color: "#0f172a",
            fontSize: 11,
            fontWeight: 500
          }
        },
        y: {
          line: { color: "#64748b", lineWidth: 1.2 },
          ticksAndLabels: {
            ticks: { color: "#64748b", lineWidth: 1, length: 4 },
            labels: { offset: 8, fontSize: 9.5 }
          },
          title: {
            text: "Life expectancy",
            offset: 45,
            color: "#0f172a",
            fontSize: 11,
            fontWeight: 500
          }
        }
      },
      legend: false
    })
    .facet({
      field: "cluster",
      columns: 3,
      gap: 20,
      padding: { top: 25, right: 14, bottom: 14, left: 14 },
      ...(xResolution === "independent"
        ? { scales: { x: "independent", y: "shared", color: "shared" } }
        : {})
    })
    .editFacetHeaders({ fontSize: 12.5, fontWeight: 700 })
    .createTitle({
      text: "Fertility and Life Expectancy",
      subtitle: xResolution === "independent"
        ? "Regression recomputed by cluster · independent fertility scales"
        : "Regression recomputed by cluster · shared scales",
      align: "center",
      offset: 1.5,
      gap: 8.5,
      titleStyle: { fontSize: 19 },
      subtitleStyle: { fontSize: 12 }
    });
}

export function createGapminderOuterGuideFacet(rows) {
  return chart()
    .createCanvas({
      width: 280,
      height: 240,
      margin: { top: 36, right: 18, bottom: 50, left: 58 }
    })
    .createData({ values: rows })
    .filterData({
      id: "selectedClusters",
      field: "cluster",
      oneOf: [0, 3, 4, 1, 5]
    })
    .createPointMark({ opacity: 0.35 })
    .encodeX({
      field: "fertility",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      field: "life_expect",
      scale: { nice: true, zero: false }
    })
    .encodeRadius({ value: 2.5 })
    .encodeColor({
      field: "pop",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    })
    .createRegression({
      band: { opacity: 0.14 },
      line: { strokeWidth: 2.5 }
    })
    .editLineMark({ target: "pointRegressionLines", stroke: "#111827" })
    .createGuides({
      axes: {
        x: {
          line: { color: "#64748b", lineWidth: 1.2 },
          ticksAndLabels: {
            ticks: { color: "#64748b", lineWidth: 1, length: 4 },
            labels: { offset: 9, fontSize: 9.5 }
          },
          title: {
            text: "Fertility",
            offset: 40,
            color: "#0f172a",
            fontSize: 11,
            fontWeight: 500
          }
        },
        y: {
          line: { color: "#64748b", lineWidth: 1.2 },
          ticksAndLabels: {
            ticks: { color: "#64748b", lineWidth: 1, length: 4 },
            labels: { offset: 8, fontSize: 9.5 }
          },
          title: {
            text: "Life expectancy",
            offset: 45,
            color: "#0f172a",
            fontSize: 11,
            fontWeight: 500
          }
        }
      },
      legend: false
    })
    .facet({
      field: "cluster",
      columns: 3,
      gap: 20,
      padding: { top: 25, right: 14, bottom: 14, left: 14 },
      scales: { x: "independent", y: "shared", color: "shared" },
      guides: { axes: "outer", legend: "shared" }
    })
    .editFacetHeaders({ fontSize: 12.5, fontWeight: 700 })
    .createTitle({
      text: "Fertility and Life Expectancy",
      subtitle: "Regression by cluster · outer axes · shared population legend",
      align: "center",
      offset: 1.5,
      gap: 8.5,
      titleStyle: { fontSize: 19 },
      subtitleStyle: { fontSize: 12 }
    });
}
