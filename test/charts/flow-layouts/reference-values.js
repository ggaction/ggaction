import { canvas, variants, colors } from "../../../examples/flow-layouts/fixture.js";
export { canvas, variants, colors };
// Independent literal solutions: DAG k=(240-20)/(6+4)=22; cyclic k=(240-160)/4=20.
const dag = {
  bounds: [0, 0, 400, 240], nodes: [[0, 0, 20, 132], [0, 152, 20, 88], [380, 10, 20, 220]], labels: ["6", "4", "10"],
  ribbons: [
    [{ op: "M", x: 20, y: 0 }, { op: "C", x1: 200, y1: 0, x2: 200, y2: 10, x: 380, y: 10 }, { op: "L", x: 380, y: 142 }, { op: "C", x1: 200, y1: 142, x2: 200, y2: 132, x: 20, y: 132 }, { op: "Z" }],
    [{ op: "M", x: 20, y: 152 }, { op: "C", x1: 200, y1: 152, x2: 200, y2: 142, x: 380, y: 142 }, { op: "L", x: 380, y: 230 }, { op: "C", x1: 200, y1: 230, x2: 200, y2: 240, x: 20, y: 240 }, { op: "Z" }]
  ]
};
const cyclic = {
  bounds: [0, -50, 400, 290], nodes: [[190, 0, 20, 40], [190, 200, 20, 40]], labels: ["2", "2"],
  // Two 40-wide orthogonal ribbons occupy distinct top/bottom lanes.
  ribbons: [
    [[210, 0], [220, 0], [220, -10], [180, -10], [180, 200], [190, 200], [190, 240], [140, 240], [140, -50], [260, -50], [260, 40], [210, 40]],
    [[210, 200], [260, 200], [260, 290], [140, 290], [140, 0], [190, 0], [190, 40], [180, 40], [180, 250], [220, 250], [220, 240], [210, 240]]
  ].map(points => [...points.map(([x, y], i) => ({ op: i === 0 ? "M" : "L", x, y })), { op: "Z" }])
};
export function flowReference(id) {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown flow reference ${id}.`);
  const source = variant.method === "dag" ? dag : cyclic, vertical = variant.orientation === "vertical";
  const [l, t, r, b] = source.bounds, bounds = vertical ? [t, l, b, r] : source.bounds;
  const scale = Math.min(560 / (bounds[2] - bounds[0]), 380 / (bounds[3] - bounds[1]));
  const origin = [40 + (560 - (bounds[2] - bounds[0]) * scale) / 2 - bounds[0] * scale,
    80 + (380 - (bounds[3] - bounds[1]) * scale) / 2 - bounds[1] * scale];
  const point = (x, y) => ({ x: origin[0] + (vertical ? y : x) * scale, y: origin[1] + (vertical ? x : y) * scale });
  const nodes = source.nodes.flatMap(([x, y, width, height], i) => [
    { type: "rect", properties: { ...point(x, y), width: (vertical ? height : width) * scale, height: (vertical ? width : height) * scale,
      fill: colors[i], stroke: "#ffffff", strokeWidth: 1, opacity: 1 } },
    { type: "text", properties: { ...point(x + width / 2, y + height / 2), text: source.labels[i],
      fill: "#ffffff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, textAlign: "center", textBaseline: "middle" } }
  ]);
  const links = source.ribbons.map((commands, i) => ({ type: "path", properties: {
    commands: commands.map(c => {
      if (c.op === "Z") return c;
      const value = { op: c.op, ...point(c.x, c.y) };
      if (c.op === "C") { const a = point(c.x1, c.y1), b = point(c.x2, c.y2); Object.assign(value, { x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
      return value;
    }), fillRule: "nonzero", fill: colors[i], stroke: "none", strokeWidth: 0, opacity: .55
  } }));
  return { nodes, links, title: variant.title, clip: { x: 40, y: 80, width: 560, height: 380 } };
}
