import { chart } from "../../src/index.js";

// Palmer penguins with both bill measurements recorded.
export function createPenguinDensityContours(penguins) {
  const measured = penguins.filter(row =>
    Number.isFinite(row.bill_length_mm) && Number.isFinite(row.bill_depth_mm));

  return chart()
    .createCanvas({
      width: 760,
      height: 520,
      margin: { top: 80, right: 170, bottom: 60, left: 70 }
    })
    .createData({ id: "penguins", values: measured })
    .createDensityContourData({
      id: "density",
      data: "penguins",
      x: "bill_length_mm",
      y: "bill_depth_mm",
      grid: { origin: [30, 12], dx: 0.5, dy: 0.25, width: 65, height: 49 },
      estimator: "kde",
      normalization: "count",
      bandwidth: [2, 1],
      kernel: "gaussian",
      thresholds: [0.1, 0.3, 0.6, 1, 2, 4, 8]
    })
    .createContourMark({
      id: "contours",
      geometry: "density",
      mode: "filled",
      color: { type: "sequential", palette: "blues" },
      x: { domain: [30, 62], nice: false, zero: false },
      y: { domain: [12, 24], nice: false, zero: false },
      stroke: "#ffffff",
      strokeWidth: 0.6
    })
    // Individual penguins share the contour scales and are colored by species.
    .createPointMark({ id: "penguins-points", data: "penguins", opacity: 0.8, stroke: "#ffffff", strokeWidth: 0.5 })
    .encodeX({ field: "bill_length_mm", scale: { id: "contours-x" } })
    .encodeY({ field: "bill_depth_mm", scale: { id: "contours-y" } })
    .encodeColor({
      field: "species",
      scale: { domain: ["Adelie", "Chinstrap", "Gentoo"], range: ["#f97316", "#a855f7", "#0d9488"] }
    })
    .encodeRadius({ value: 2.5 })
    .createXAxis({ scale: "contours-x", title: { text: "Bill length (mm)" } })
    .createYAxis({ scale: "contours-y", title: { text: "Bill depth (mm)" } })
    .createLegend({ target: "penguins-points", channels: ["color"], title: "Species" })
    .createTitle({
      text: "Penguin bill shapes cluster by species",
      subtitle: "Darker bands hold more penguins · Gaussian kernel density of 342 birds"
    });
}
