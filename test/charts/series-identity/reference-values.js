import { layout } from "./fixture.js";

// Independent tuple equality: neither delimiter concatenation nor string coercion.
export function partitionRows(rows, fields) {
  const groups = [];
  rows.forEach((row, index) => {
    const key = fields.map(field => row[field]);
    let group = groups.find(item => item.key.every((value, i) => Object.is(value, key[i])));
    if (group === undefined) { group = { key, indices: [], rows: [] }; groups.push(group); }
    group.indices.push(index); group.rows.push(row);
  });
  return groups;
}
export function uniqueSeriesValue(group, field) {
  const values = [...new Set(group.rows.map(row => row[field]))];
  if (values.length !== 1) throw new Error(`Ambiguous ${field} in series ${JSON.stringify(group.key)}.`);
  return values[0];
}
export function referenceFor(variant) {
  const plot = { x: layout.margin.left, y: layout.margin.top,
    width: layout.width - layout.margin.left - layout.margin.right,
    height: layout.height - layout.margin.top - layout.margin.bottom };
  const groups = partitionRows(variant.rows, variant.fields);
  const paths = groups.map(group => {
    const color = layout.colors[layout.continents.indexOf(uniqueSeriesValue(group, "continent"))];
    const ordered = [...group.rows].sort((a, b) => a.period - b.period);
    return {
      key: group.key, indices: group.indices, color,
      width: variant.id === "series-appearance" ? 2 * uniqueSeriesValue(group, "weight") : 3,
      opacity: variant.id === "series-appearance" ? uniqueSeriesValue(group, "quality") / 4 : undefined,
      dash: variant.id === "tuple-color-dash" && uniqueSeriesValue(group, "scenario") === "projection" ? [6, 4] : [],
      commands: ordered.map((row, index) => ({ op: index === 0 ? "M" : "L",
        x: plot.x + (row.period - 1) / 3 * plot.width,
        y: plot.y + plot.height - row.value / 28 * plot.height }))
    };
  });
  return { plot, paths };
}
