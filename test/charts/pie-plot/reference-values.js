import { buildReferenceAnnularSectorCommands } from "../../charts/polar-arcs/reference-values.js";

import { layout, rows, targets } from "../../../examples/pie-plot/data.js";
export { layout, rows, targets };
export const palette = Object.freeze(["#4c78a8", "#f58518"]);
export const frame = Object.freeze({ centerX: 500, centerY: 350, availableRadius: 200 });

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
