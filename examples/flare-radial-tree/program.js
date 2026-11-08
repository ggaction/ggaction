import { chart } from "../../src/index.js";

// Class hierarchy of the Flare visualization toolkit; leaves carry source size in bytes.
export function createFlareRadialTree(flare) {
  const classes = flare.map(row => ({ id: String(row.id), parent: row.parent === undefined ? null : String(row.parent),
    name: row.name, size: row.size ?? 0 }));

  return chart()
    .createCanvas({ width: 760, height: 760, margin: { top: 70, right: 20, bottom: 20, left: 20 } })
    .createData({ id: "classes", keyField: "id", values: classes })
    .createHierarchyData({ id: "flare", data: "classes", key: "id", parent: "parent", value: "size" })
    .layoutHierarchy({
      id: "radial",
      method: "tree",
      options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 1, orientation: "radial", radius: 300, startAngle: 0, sweep: 360 }
    })
    .createTreePlot({
      nodes: { radius: 2.5, fill: "#2563eb" },
      links: { stroke: "#94a3b8", strokeWidth: 0.8 },
      labels: false
    })
    .createTitle({
      text: "Flare toolkit class hierarchy",
      subtitle: "252 packages and classes · radial tree layout"
    });
}
