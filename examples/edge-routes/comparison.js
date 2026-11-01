import { chart, hconcat } from "../../src/index.js";
import { createEdgeRoutes } from "./program.js";
import { routeEdges } from "./data.js";

export function createEdgeRouteComparison(method = "edge-path") {
  const analysis = chart().createCanvas({ width: 480, height: 240, margin: { left: 40, right: 140, top: 20, bottom: 40 } })
    .createData({ id: "edges", keyField: "id", values: routeEdges })
    .createPointMark({ id: "values" })
    .encodeX({ field: "amount", scale: { id: "measure", domain: [0, 10], nice: false } })
    .encodeY({ field: "rank", scale: { domain: [0, 3], nice: false } }).encodeRadius({ value: 5 })
    .encodeColor({ field: "category", scale: { range: ["#dc2626", "#2563eb"] } })
    .createXAxis({ scale: "measure", title: false, ticksAndLabels: { values: [0, 5, 10] } })
    .createLegend({ target: "values" });
  return hconcat({ id: "comparison", gap: 24, programs: [
    { id: "routes", program: createEdgeRoutes(method) }, { id: "analysis", program: analysis }
  ] });
}

export function reviseEdgeRouteComparison(program) {
  return program.reviseData({ target: [{ childPath: ["routes"] }, { childPath: ["analysis"] }],
    source: "edges", id: "revised", values: routeEdges.map(row => ({ ...row, amount: row.amount * 2 })) });
}
