import { canvas, inputRows, colors, variantById } from "./fixture.js";
export function partitionProgramOptions(id = "icicle") {
  const variant = variantById(id);
  if (variant.kind === "bend") throw new Error("Animated partition frames are not a static plot variant.");
  const values = inputRows(variant), sector = variant.kind === "sector", mapping = variant.mapping ?? {};
  return {
    createCanvas: canvas,
    createData: { id: "hierarchy-source", values, keyField: "key" },
    createHierarchyData: { id: "hierarchy", key: "key", parent: "parentKey", value: "value", valueMode: variant.input === "inclusive" ? "inclusive" : "leaf-sum", forest: variant.input === "forest" },
    layoutHierarchy: { id: "partition-layout", method: "partition" },
    createCoordinate: { id: "partition-coordinate", type: sector ? "polar" : "cartesian" },
    ...(sector ? { editCoordinate: { target: "partition-coordinate", polarFrame: { center: { x: .5, y: 115 / 225 }, radius: { unit: "px", value: 120 }, overflow: "allow" } } } : {}),
    createPartitionPlot: {
      layout: "partition-layout", coordinate: "partition-coordinate",
      ...(variant.focus ? { focus: { key: variant.focus } } : {}), rootVisible: variant.rootVisible !== false,
      orientation: mapping.orientation ?? "horizontal", padding: sector ? [mapping.angularGap ?? 2, mapping.radialGap ?? 2] : [2, 2],
      ...(sector ? { innerRadius: 20, outerRadius: 120, startAngle: (mapping.startAngle ?? 0) * 180 / Math.PI,
        direction: mapping.direction ?? "clockwise", radiusPolicy: mapping.radiusPolicy ?? "equal-depth" } : {}),
      cells: { strokeWidth: 0, overrides: values.map(row => ({ key: row.key, fill: colors[row.key] })) },
      labels: { overrides: values.map(row => ({ key: row.key, text: `${row.key} ${row.value}` })) }
    },
    createTitle: { text: variant.title, subtitle: variant.note, align: "left", alongOffset: 24, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 18, fontFamily: "sans-serif", fontWeight: "normal" },
      subtitleStyle: { color: "#0f172a", fontSize: 11, fontFamily: "sans-serif", fontWeight: "normal" } }
  };
}
