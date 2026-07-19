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
    .createHistogram({
      id: "bars",
      field: "Displacement",
      maxBins: 10,
      xScale: { nice: true, zero: false },
      color: { field: "Origin", scale: { palette: "tableau10" } },
      guides: { legend: { position: "bottom" } }
    })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    });
}

export function createNormalizedStackCarsHistogram(cars) {
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
      layout: "fill",
      scale: { palette: "tableau10" }
    })
    .createGuides({ legend: { position: "bottom" } })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    });
}

export function createBinStepCarsHistogram(cars) {
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
      binStep: 60,
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
    });
}

export function createBinBoundariesCarsHistogram(cars) {
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
      binBoundaries: [50, 100, 150, 225, 300, 400, 500],
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
    });
}

export function createFieldReassignmentCarsHistogram(cars) {
  const rows = cars.filter(
    car =>
      Number.isFinite(car.Displacement) &&
      Number.isFinite(car.Horsepower) &&
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
    .createGuides({ legend: { position: "bottom" } })
    .createTitle({
      text: "Displacement distribution",
      subtitle: "by country",
      align: "center"
    })
    .encodeHistogram({
      field: "Horsepower",
      maxBins: 8,
      xScale: { nice: true, zero: false }
    });
}
