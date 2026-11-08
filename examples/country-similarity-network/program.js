import { chart } from "../../src/index.js";

// Gapminder's six regional clusters, in cluster-number order.
const REGIONS = ["South Asia", "Europe & Central Asia", "Sub-Saharan Africa", "Americas",
  "East Asia & Pacific", "Middle East & North Africa"];
const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

// Each country links to its three nearest neighbors in standardized
// (life expectancy, fertility) space for 2005.
export function createCountrySimilarityNetwork(gapminder) {
  const countries = gapminder
    .filter(row => row.year === 2005)
    .map(row => ({
      country: row.country,
      region: REGIONS[row.cluster],
      lifeExpectancy: row.life_expect,
      fertility: row.fertility
    }));

  return chart()
    .createCanvas({ width: 900, height: 640, margin: { top: 80, right: 200, bottom: 20, left: 20 } })
    .createData({ id: "countries", keyField: "country", values: countries })
    .createInferredGraphData({
      id: "similar",
      data: "countries",
      nodeKey: "country",
      ruleId: "three-nearest",
      rule: "knn",
      features: ["lifeExpectancy", "fertility"],
      metric: "euclidean",
      preprocess: "standardize",
      attributes: ["region"],
      options: { k: 3, symmetrize: "union" }
    })
    .layoutGraph({ id: "placement", graph: "similar", method: "force", options: { seed: 7, iterations: 400, linkDistance: 70, collisionRadius: 14 } })
    .createGraphPlot({
      nodes: {
        radius: 6,
        stroke: "#ffffff",
        strokeWidth: 1,
        overrides: countries.map(row => ({ key: row.country, fill: COLORS[REGIONS.indexOf(row.region)] }))
      },
      edges: { stroke: "#cbd5e1", strokeWidth: 1 },
      labels: { fontSize: 9, fill: "#334155" }
    })
    .createTitle({
      text: "Countries with similar health and family size, 2005",
      subtitle: "Each country links to its 3 nearest neighbors in life expectancy and fertility · color: region"
    });
}
