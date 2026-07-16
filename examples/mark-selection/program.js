import { chart } from "../../src/index.js";

function validCars(cars) {
  return cars.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
}

export function createGroupedMaximumPointHighlight(cars) {
  const rows = validCars(cars);
  return chart()
    .createCanvas({
      width: 760,
      height: 440,
      margin: { top: 90, right: 170, bottom: 60, left: 70 }
    })
    .createData({ id: "cars", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" })
    .encodeRadius({ value: 3 })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      },
      legend: { channels: ["color"] }
    })
    .createTitle({
      text: "Highest-Horsepower Car in Each Origin",
      subtitle: "Selected points are enlarged, offset, and drawn in front"
    })
    .highlightMarks({
      target: "points",
      select: {
        field: "Horsepower",
        op: "max",
        groupBy: "Origin"
      },
      color: "#dc2626",
      opacity: 1,
      stroke: "#ffffff",
      strokeWidth: 1.5,
      shape: "diamond",
      size: 5.5,
      offset: { x: 7, y: -7 },
      dimOthers: { opacity: 0.18 },
      bringToFront: true
    });
}

export function createTopmostHistogramSegmentHighlight(cars) {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .createBarMark({ id: "bars" })
    .encodeHistogram({
      field: "Displacement",
      maxBins: 10,
      xScale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .createGuides({ legend: { position: "bottom" } })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    })
    .highlightMarks({
      target: "bars",
      select: { channel: "y2", op: "max" },
      fill: "#facc15",
      stroke: "#713f12",
      strokeWidth: 2.5,
      opacity: 1,
      bringToFront: true
    });
}

export function createTallestHistogramStackHighlight(cars) {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .createBarMark({ id: "bars" })
    .encodeHistogram({
      field: "Displacement",
      maxBins: 10,
      xScale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .createGuides({ legend: { position: "bottom" } })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    })
    .highlightMarks({
      target: "bars",
      select: { grain: "stack", channel: "y2", op: "max" },
      fill: "#facc15",
      stroke: "#713f12",
      strokeWidth: 2.5,
      opacity: 1,
      bringToFront: true
    });
}
