import { chart } from "../../src/index.js";

export function createCarsHistogram(cars) {
  const rows = cars.filter(
    car =>
      Number.isFinite(car.Displacement) &&
      typeof car.Origin === "string" &&
      car.Origin.length > 0
  );

  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values: rows })
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
    .createGuides()
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    });
}
