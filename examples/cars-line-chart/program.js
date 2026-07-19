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
    .createLinePlot({
      id: "trends",
      x: {
        field: "Year",
        fieldType: "temporal",
        scale: { nice: true }
      },
      y: {
        field: "Acceleration",
        aggregate: "mean",
        scale: { nice: true, zero: false }
      },
      color: { field: "Origin", scale: { palette: "tableau10" } },
      strokeDash: { field: "Origin" },
      guides: { axes: { y: { ticksAndLabels: { count: 6 } } } }
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

export function createCompositeLegendTopCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 520,
      margin: { top: 170, right: 40, bottom: 60, left: 80 }
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
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } },
      legend: false
    })
    .createLegend({
      position: "top",
      align: "center",
      direction: "vertical",
      columns: 2,
      offset: 10,
      titlePosition: "left",
      labels: { offset: 10 },
      itemGap: 18,
      border: {
        color: "#94a3b8",
        lineWidth: 1,
        padding: 10,
        background: "white"
      },
      symbol: {
        layers: [
          { type: "line", length: 36, lineWidth: 3 },
          {
            type: "point",
            shape: "circle",
            size: 5,
            stroke: "white",
            strokeWidth: 1
          }
        ]
      }
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}

export function createCompositeLegendBottomCarsLineChart(cars) {
  const rows = validRows(cars);

  return chart()
    .createCanvas({
      width: 720,
      height: 560,
      margin: { top: 80, right: 40, bottom: 160, left: 80 }
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
    .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
    .encodeStrokeDash({ field: "Origin" })
    .createGuides({
      axes: { y: { ticksAndLabels: { count: 6 } } },
      legend: false
    })
    .createLegend({
      position: "bottom",
      align: "right",
      direction: "horizontal",
      columns: 2,
      offset: 70,
      titlePosition: "top",
      labels: { offset: 10 },
      itemGap: 18,
      border: {
        color: "#94a3b8",
        lineWidth: 1,
        padding: 10,
        background: "#f8fafc"
      },
      symbol: {
        layers: [
          { type: "line", length: 36, lineWidth: 3 },
          {
            type: "point",
            shape: "circle",
            size: 5,
            stroke: "white",
            strokeWidth: 1
          }
        ]
      }
    })
    .createTitle({
      text: "The trend of acceleration by year",
      subtitle: "from 1970 to 1982"
    });
}
