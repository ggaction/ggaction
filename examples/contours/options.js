import { canvas, variants, hill, hole, pointSource, colors } from "./fixture.js";
export function contourOptions(id = "line") {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown contour variant ${id}.`);
  const density = ["histogram", "kde"].includes(id), maximum = id === "holes" ? 4 : 2;
  const thresholds = id === "line" ? [1] : id === "holes" ? [0, 1] : [0, 1, 2];
  return { variant, canvas, data: pointSource, density,
    geometry: density ? { id: "surface", data: "samples", x: "x", y: "y", weight: "weight",
      grid: { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 3 }, estimator: id,
      normalization: "count", ...(id === "kde" ? { bandwidth: [1, 1], kernel: "triangular" } : {}), thresholds }
      : { id: "surface", grid: id === "holes" ? hole : hill, thresholds },
    mark: { mode: id === "line" ? "line" : "filled", geometry: "surface",
      x: { domain: [0, maximum], zero: false, nice: false }, y: { domain: [0, maximum], zero: false, nice: false },
      color: ["line", "holes"].includes(id) ? false : { type: "quantize", domain: [0, 2], range: colors },
      stroke: "#1d4ed8", strokeWidth: 2 },
    title: { text: variant.title, subtitle: variant.subtitle, align: "left", alongOffset: 0, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600 },
      subtitleStyle: { color: "#64748b", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400 } }
  };
}
