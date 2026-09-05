import { buildReferenceAnnularSectorCommands } from "../../charts/polar-arcs/reference-values.js";

export const layout = Object.freeze({ width: 1000, height: 700, margin: 150 });
export const rows = Object.freeze([
  Object.freeze({ category: "A", value: 2 }),
  Object.freeze({ category: "A", value: 3 }),
  Object.freeze({ category: "B", value: 5 })
]);
export const palette = Object.freeze(["#4c78a8", "#f58518"]);
export const frame = Object.freeze({ centerX: 500, centerY: 350, availableRadius: 200 });
export const targets = Object.freeze({
  count: Object.freeze({ id: "pie", category: "category" }),
  weighted: Object.freeze({ id: "pie", category: "category", value: "value", aggregate: "sum" }),
  donut: Object.freeze({ id: "pie", category: "category", value: "value", aggregate: "sum",
    arc: Object.freeze({ innerRadius: 0.55, padAngle: 2 }) })
});

export function referenceSectors(variant) {
  const options = targets[variant];
  const categories = [...new Set(rows.map(row => row.category))];
  const weights = categories.map(category => rows.filter(row => row.category === category)
    .reduce((sum, row) => sum + (options.aggregate === "sum" ? row.value : 1), 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let startTheta = 0;
  return categories.map((category, index) => {
    const endTheta = startTheta + 360 * weights[index] / total;
    const geometry = { frame, startTheta, endTheta,
      innerRadius: 200 * (options.arc?.innerRadius ?? 0), outerRadius: 200,
      padAngle: options.arc?.padAngle ?? 0 };
    const result = { category, weight: weights[index], share: weights[index] / total,
      ...geometry, fill: palette[index], commands: buildReferenceAnnularSectorCommands(geometry) };
    startTheta = endTheta;
    return result;
  });
}
