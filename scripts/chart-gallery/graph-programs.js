import { chart, hconcat, vconcat } from "../../src/index.js";
import { encodeRowKey } from "../../src/core/itemIdentity.js";
import { requireStoredResource } from "../../src/selectors/resources.js";
import { source } from "./data.js";

export function* graphDataCharts() {
  const { rows, provenance } = source("tt-penguins", "Palmer Penguins · TidyTuesday 2020-07-28", "https://allisonhorst.github.io/palmerpenguins/");
  const records = rows.flatMap((row, index) => typeof row.island === "string" && typeof row.species === "string"
    ? [{ id: index, source: `island:${row.island}`, target: `species:${row.species}` }] : []);
  const nodes = [];
  for (const [field, role] of [["source", "island"], ["target", "species"]]) {
    const counts = new Map();
    for (const row of records) counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
    for (const [id, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) nodes.push({ id, role, count, label: `${id.slice(id.indexOf(":") + 1)} (${count})` });
  }
  const hierarchy = [{ id: "all", parent: null, value: 0 }, { id: "island", parent: "all", value: 0 }, { id: "species", parent: "all", value: 0 },
    ...nodes.map(node => ({ id: node.id, parent: node.role, value: node.count }))];
  let base = chart().createCanvas({ width: 600, height: 480, margin: { top: 85, bottom: 50, left: 70, right: 70 } })
    .createData({ id: "nodes", values: nodes, keyField: "id" })
    .createData({ id: "observations", values: records, keyField: "id" })
    .createSummaryData({ id: "pairs", source: "observations", groupBy: ["source", "target"], aggregates: [{ op: "count", as: "count" }] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "pairs", nodeKey: "id", edgeKey: ["source", "target"], source: "source", target: "target", weight: "count", directed: false })
    .createData({ id: "tree-rows", values: hierarchy, keyField: "id" })
    .createHierarchyData({ id: "tree", data: "tree-rows", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "anchors", hierarchy: "tree", method: "tree", options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 1, orientation: "radial", radius: 130, startAngle: -90, sweep: 360 } });
  const anchors = new Map(requireStoredResource(base, { kind: "layout", id: "anchors" }).result.nodes.map(node => [node.key, node]));
  base = base.layoutGraph({ id: "positions", graph: "network", method: "fixed", options: {
    positions: nodes.map(({ id }) => { const { x, y } = anchors.get(encodeRowKey(id)); return { key: id, x, y }; })
  } });
  const panels = ["hierarchical", "force-directed", "density", "edge-path"].map(method => {
    const options = method === "hierarchical" ? { hierarchy: "tree", hierarchyLayout: "anchors", mapping: nodes.map(({ id }) => ({ nodeKey: id, hierarchyKey: id })) } : {};
    return base.bundleGraphEdges({ id: "routes", method, options }).createGraphPlot({ id: "network-view", routes: "routes",
      nodes: { radius: 7, stroke: "white", strokeWidth: 1.5, overrides: nodes.map(node => ({ key: node.id, fill: node.role === "island" ? "#2563eb" : "#f97316" })) },
      edges: { stroke: "#64748b", strokeWidth: 2.5, arrows: false, opacity: 0.8 },
      labels: { fontSize: 12, offset: [0, 20], overrides: nodes.map(node => ({ key: node.id, text: node.label })) } })
      .createTitle({ text: method, subtitle: `${records.length} observations · blue: island · orange: species · labels: record counts`, align: "center", titleStyle: { fontSize: 21 }, subtitleStyle: { fontSize: 10 } });
  });
  const pairs = requireStoredResource(base, { kind: "graph", id: "network" }).result.model.edges;
  const pairRows = base.semanticSpec.datasets.find(dataset => dataset.id === "pairs").values.map(row => ({
    pair: `${row.source.slice(7)} / ${row.target.slice(8)}`, count: row.count
  }));
  const counts = chart().createCanvas({ width: 1220, height: 330, margin: { top: 65, bottom: 65, left: 75, right: 40 } })
    .createData({ values: pairRows }).createBarPlot({ x: { field: "pair", fieldType: "nominal" }, y: "count", bar: { fill: "#2563eb" },
      guides: { axes: { x: { title: { text: "Observed island / species pair" } }, y: { title: { text: "Penguin records" } } }, legend: false } })
    .createTitle({ text: "The same observations, counted by pair", align: "center", titleStyle: { fontSize: 18 } });
  yield { id: "native-penguin-graph-routes", title: "Graph · 펭귄 관측 관계와 네 가지 경로", tag: "신규 · Graph + 4 edge bundling methods", newType: true,
    description: "같은 관측 관계를 계층·힘·밀도·대체 경로 방식으로 비교합니다. 아래 막대는 간선이 나타내는 실제 관측 수입니다. 대체 경로가 없는 이 그래프에서 edge-path는 원래 연결을 유지합니다.",
    provenance: { ...provenance, usedRows: records.length, transformation: `섬·종이 모두 있는 ${records.length}행을 ${pairs.length}개 실제 관측 쌍으로 집계; 제외 ${rows.length - records.length}행. 노드 ${nodes.length}개의 괄호 값은 각 섬·종의 관측 수. 간선 두께는 고정이며 관측 수는 아래 막대로 표시. 계층 경로의 섬/종 분류 트리는 표시용으로 명시 구성; 이동·인과·분류학적 계통을 뜻하지 않음. 네 방식 모두 같은 노드·간선과 원래 관측 membership을 유지.` },
    program: vconcat({ programs: [
      { id: "upper", program: hconcat({ programs: [{ id: "hierarchical", program: panels[0] }, { id: "force", program: panels[1] }], gap: 20 }) },
      { id: "lower", program: hconcat({ programs: [{ id: "density", program: panels[2] }, { id: "paths", program: panels[3] }], gap: 20 }) },
      { id: "counts", program: counts }
    ], gap: 16 }) };
}
