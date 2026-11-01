import { chart, hconcat } from "../../src/index.js";

export const resourceComparisonFamilies = Object.freeze([
  "tree", "treemap", "partition-cartesian", "partition-polar", "graph-nodes", "sankey-dag", "sankey-cyclic"
]);

export function resourceComparisonRows(family = "tree") {
  if (!resourceComparisonFamilies.includes(family)) throw new Error(`Unknown resource comparison family: ${family}`);
  if (family.startsWith("sankey-")) return [
    { id: 1, source: "s", target: "a", amount: 3, rank: 0, category: "A", alternative: "B" },
    { id: "1", source: "s", target: "b", amount: 1, rank: 1, category: "B", alternative: "A" },
    ...(family === "sankey-cyclic" ? [{ id: "return", source: "a", target: "s", amount: 2, rank: 2, category: "A", alternative: "A" }] : [])
  ];
  return [
    { id: "root", parent: null, amount: 4, rank: 0, category: "A", alternative: "B" },
    { id: 1, parent: "root", amount: 3, rank: 1, category: "A", alternative: "A" },
    { id: "1", parent: "root", amount: 1, rank: 2, category: "B", alternative: "A" }
  ];
}

function structure(family, rows) {
  let program = chart().createCanvas({ width: 320, height: 240, margin: 20 })
    .createData({ id: "data", keyField: "id", values: rows });
  if (family === "graph-nodes") return program
    .createData({ id: "edges", keyField: "id", values: [{ id: "left", source: "root", target: 1 }, { id: "right", source: "root", target: "1" }] })
    .createGraphData({ id: "model", nodes: "data", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target", attributes: ["amount", "category"] })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "root", x: 120, y: 30 }, { key: 1, x: 40, y: 140 }, { key: "1", x: 200, y: 140 }] } })
    .createGraphPlot({ id: "plot", origin: [0, 0], labels: false });
  if (family.startsWith("sankey-")) return program
    .createData({ id: "nodes", keyField: "id", values: [{ id: "s" }, { id: "a" }, { id: "b" }] })
    .createFlowData({ id: "model", nodes: "nodes", edges: "data", nodeKey: "id", edgeKey: "id", source: "source", target: "target", value: "amount" })
    .layoutFlow({ id: "layout", method: family === "sankey-dag" ? "dag" : "cyclic", options: { width: 240, height: 160, nodeWidth: 16, nodePadding: 12, iterations: 0 } })
    .createFlowLinks({ id: "plot" }).createFlowNodes({ id: "nodesPlot", labels: false });
  program = program.createHierarchyData({ id: "model", key: "id", parent: "parent", value: "amount", valueMode: "inclusive" });
  if (family === "tree") return program
    .layoutHierarchy({ id: "layout", method: "tree", options: { nodeSize: [10, 10], siblingGap: 40, depthGap: 50, orientation: "vertical" } })
    .createTreePlot({ id: "plot", labels: false });
  if (family === "treemap") return program
    .layoutHierarchy({ id: "layout", method: "treemap", options: { size: [240, 160], padding: 6, method: "slice-dice" } })
    .createTreemapPlot({ id: "plot", labels: false });
  return program.layoutHierarchy({ id: "layout", method: "partition" })
    .createCoordinate({ id: "main", type: family === "partition-polar" ? "polar" : "cartesian" })
    .createPartitionPlot({ id: "plot", labels: false });
}

function analysis(rows) {
  return chart().createCanvas({ width: 480, height: 240, margin: { top: 20, right: 140, bottom: 40, left: 40 } })
    .createData({ id: "data", keyField: "id", values: rows })
    .createPointMark({ id: "values" })
    .encodeX({ field: "amount", scale: { id: "measure", domain: [0, 10], nice: false } })
    .encodeY({ field: "rank", scale: { id: "rank", domain: [0, 3], nice: false } })
    .encodeRadius({ value: 5 })
    .encodeColor({ field: "category", scale: { id: "category", range: ["#dc2626", "#2563eb", "#16a34a"] } })
    .createXAxis({ scale: "measure", title: false, ticksAndLabels: { values: [0, 5, 10] } })
    .createLegend({ target: "values" });
}

export function createResourceComparison(family = "tree") {
  const rows = resourceComparisonRows(family);
  return hconcat({ id: "comparison", programs: [
    { id: "structure", program: structure(family, rows) },
    { id: "analysis", program: analysis(rows) }
  ], gap: 24 });
}

export function reviseResourceComparison(program, family = "tree") {
  const values = resourceComparisonRows(family).map((row, index, rows) => ({ ...row, amount: row.amount * 2,
    alternative: index === rows.length - 1 ? "C" : row.alternative }));
  return program.reviseData({ target: [{ childPath: ["structure"] }, { childPath: ["analysis"] }],
    source: "data", id: "updated", values });
}
