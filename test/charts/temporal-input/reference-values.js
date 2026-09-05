import { layout, rows } from "./fixture.js";
export function referenceFor(variant) {
  const timestamps = rows.map(row => {
    if (variant.unit === "timestamp") return row.time;
    const date = new Date(0); date.setUTCFullYear(row.time, 0, 1); return date.getTime();
  });
  const plot = { x: layout.margin.left, y: layout.margin.top,
    width: layout.width - layout.margin.left - layout.margin.right,
    height: layout.height - layout.margin.top - layout.margin.bottom };
  return {
    timestamps, domain: [Math.min(...timestamps), Math.max(...timestamps)], plot,
    labels: variant.unit === "timestamp" ? ["00:00:01", "00:00:02"] : ["1000", "2000"],
    normalizedRows: rows.map((row, i) => ({ ...row, isoTime: new Date(timestamps[i]).toISOString() })),
    points: rows.map((row, i) => ({ x: plot.x + i * plot.width,
      y: plot.y + plot.height - row.value / 3 * plot.height }))
  };
}
