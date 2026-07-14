import { chart } from "../../src/index.js";

function validRows(cars) {
  return cars.filter(
    car =>
      typeof car.Year === "string" &&
      Number.isFinite(Date.parse(car.Year)) &&
      Number.isFinite(car.Acceleration) &&
      typeof car.Origin === "string" &&
      car.Origin.length > 0
  );
}

export function createCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } }
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createStepCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends", curve: "step" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } }
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createMonotoneEditCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } }
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    })
    .editLineMark({
      target: "trends",
      curve: "monotone",
      strokeWidth: 4
    });
}

export function createMedianCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "median",
      scale: { nice: true, zero: false }
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createDispersionCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "stdev",
      scale: { nice: true, zero: false }
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createQuantileCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: { op: "quantile", probability: 0.75 },
      scale: { nice: true, zero: false }
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createOrderedCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: { op: "first", orderBy: "Horsepower" },
      scale: { nice: true, zero: false }
    })
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

function validDashRows(cars) {
  return validRows(cars).filter(car => Number.isFinite(car.Cylinders));
}

export function createNamedDashVocabularyCarsLineChart(cars) {
  const rows = validDashRows(cars).filter(
    car => [8, 4, 6, 3].includes(car.Cylinders)
  );

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeStrokeDash({
      field: "Cylinders",
      scale: {
        range: ["solid", "dashed", "dotted", "dashdot"]
      }
    })
    .createLegend();
}

export function createConstantDashCarsLineChart(cars) {
  const rows = validDashRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeStrokeDash({
      field: "Origin",
      scale: { id: "originDash" }
    })
    .createLegend()
    .encodeStrokeDash({ value: "dotted" });
}

export function createGroupReassignmentCarsLineChart(cars) {
  const rows = validDashRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeGroup({ field: "Origin" })
    .encodeGroup({ field: "Cylinders" });
}

export function createDashReassignmentCarsLineChart(cars) {
  const rows = validDashRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    })
    .encodeY({
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeStrokeDash({
      field: "Origin",
      scale: { id: "originDash" }
    })
    .createLegend()
    .encodeStrokeDash({ field: "Cylinders" });
}
