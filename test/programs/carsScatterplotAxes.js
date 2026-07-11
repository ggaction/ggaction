import { chart, render } from "../../src/index.js";

const ORIGIN_COLORS = Object.freeze({
  USA: "#4c78a8",
  Europe: "#f58518",
  Japan: "#54a24b"
});

const PLOT_BOUNDS = Object.freeze({
  left: 70,
  right: 610,
  top: 30,
  bottom: 340
});

function selectValidCars(cars) {
  if (!Array.isArray(cars)) {
    throw new TypeError("cars must be an array.");
  }

  return cars.filter(
    car =>
      Number.isFinite(car.Horsepower) &&
      Number.isFinite(car.Miles_per_Gallon)
  );
}

function mapDomain(values, [domainStart, domainEnd], [rangeStart, rangeEnd]) {
  if (domainStart === domainEnd) {
    return values.map(() => (rangeStart + rangeEnd) / 2);
  }

  return values.map(value => {
    const ratio = (value - domainStart) / (domainEnd - domainStart);
    return rangeStart + ratio * (rangeEnd - rangeStart);
  });
}

function extent(values) {
  return [Math.min(...values), Math.max(...values)];
}

export function createCarsScatterplotAxesValues(cars) {
  const validCars = selectValidCars(cars);
  const horsepower = validCars.map(car => car.Horsepower);
  const mileage = validCars.map(car => car.Miles_per_Gallon);
  const xDomain = extent(horsepower);
  const yDomain = extent(mileage);
  const xTickValues = [50, 100, 150, 200];
  const yTickValues = [10, 20, 30, 40];

  return {
    validCars,
    bounds: PLOT_BOUNDS,
    x: mapDomain(horsepower, xDomain, [PLOT_BOUNDS.left, PLOT_BOUNDS.right]),
    y: mapDomain(mileage, yDomain, [PLOT_BOUNDS.bottom, PLOT_BOUNDS.top]),
    fill: validCars.map(car => ORIGIN_COLORS[car.Origin]),
    xTicks: {
      values: xTickValues,
      positions: mapDomain(
        xTickValues,
        xDomain,
        [PLOT_BOUNDS.left, PLOT_BOUNDS.right]
      ),
      labels: xTickValues.map(String)
    },
    yTicks: {
      values: yTickValues,
      positions: mapDomain(
        yTickValues,
        yDomain,
        [PLOT_BOUNDS.bottom, PLOT_BOUNDS.top]
      ),
      labels: yTickValues.map(String)
    }
  };
}

export function createCarsScatterplotAxes(cars) {
  const { validCars, bounds, x, y, fill, xTicks, yTicks } =
    createCarsScatterplotAxesValues(cars);

  return chart()
    .editSemantic({ property: "dataset[cars].values", value: validCars })
    .editSemantic({ property: "layer[points].mark.type", value: "point" })
    .editSemantic({ property: "layer[points].data", value: "cars" })
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 640 })
    .editGraphics({ target: "canvas", property: "height", value: 400 })
    .editGraphics({
      target: "canvas",
      property: "background",
      value: "white"
    })
    .createGraphics({ id: "xAxis", type: "line" })
    .editGraphics({ target: "xAxis", property: "x1", value: bounds.left })
    .editGraphics({ target: "xAxis", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xAxis", property: "x2", value: bounds.right })
    .editGraphics({ target: "xAxis", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "xAxis", property: "stroke", value: "#334155" })
    .editGraphics({ target: "xAxis", property: "strokeWidth", value: 1 })
    .createGraphics({ id: "yAxis", type: "line" })
    .editGraphics({ target: "yAxis", property: "x1", value: bounds.left })
    .editGraphics({ target: "yAxis", property: "y1", value: bounds.top })
    .editGraphics({ target: "yAxis", property: "x2", value: bounds.left })
    .editGraphics({ target: "yAxis", property: "y2", value: bounds.bottom })
    .editGraphics({ target: "yAxis", property: "stroke", value: "#334155" })
    .editGraphics({ target: "yAxis", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "xTicks",
      type: "line",
      length: xTicks.positions.length
    })
    .editGraphics({ target: "xTicks", property: "x1", value: xTicks.positions })
    .editGraphics({ target: "xTicks", property: "y1", value: bounds.bottom })
    .editGraphics({ target: "xTicks", property: "x2", value: xTicks.positions })
    .editGraphics({
      target: "xTicks",
      property: "y2",
      value: bounds.bottom + 6
    })
    .editGraphics({ target: "xTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "xTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "yTicks",
      type: "line",
      length: yTicks.positions.length
    })
    .editGraphics({
      target: "yTicks",
      property: "x1",
      value: bounds.left - 6
    })
    .editGraphics({ target: "yTicks", property: "y1", value: yTicks.positions })
    .editGraphics({ target: "yTicks", property: "x2", value: bounds.left })
    .editGraphics({ target: "yTicks", property: "y2", value: yTicks.positions })
    .editGraphics({ target: "yTicks", property: "stroke", value: "#64748b" })
    .editGraphics({ target: "yTicks", property: "strokeWidth", value: 1 })
    .createGraphics({
      id: "points",
      type: "circle",
      length: validCars.length
    })
    .editGraphics({ target: "points", property: "x", value: x })
    .editGraphics({ target: "points", property: "y", value: y })
    .editGraphics({ target: "points", property: "fill", value: fill })
    .editGraphics({ target: "points", property: "radius", value: 3 })
    .createGraphics({
      id: "xLabels",
      type: "text",
      length: xTicks.positions.length
    })
    .editGraphics({ target: "xLabels", property: "x", value: xTicks.positions })
    .editGraphics({
      target: "xLabels",
      property: "y",
      value: bounds.bottom + 18
    })
    .editGraphics({ target: "xLabels", property: "text", value: xTicks.labels })
    .editGraphics({ target: "xLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "xLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "xLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "xLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "xLabels", property: "textAlign", value: "center" })
    .editGraphics({ target: "xLabels", property: "textBaseline", value: "top" })
    .createGraphics({
      id: "yLabels",
      type: "text",
      length: yTicks.positions.length
    })
    .editGraphics({
      target: "yLabels",
      property: "x",
      value: bounds.left - 12
    })
    .editGraphics({ target: "yLabels", property: "y", value: yTicks.positions })
    .editGraphics({ target: "yLabels", property: "text", value: yTicks.labels })
    .editGraphics({ target: "yLabels", property: "fill", value: "#334155" })
    .editGraphics({ target: "yLabels", property: "fontSize", value: 12 })
    .editGraphics({
      target: "yLabels",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "yLabels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "yLabels", property: "textAlign", value: "right" })
    .editGraphics({
      target: "yLabels",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "xTitle", type: "text" })
    .editGraphics({
      target: "xTitle",
      property: "x",
      value: (bounds.left + bounds.right) / 2
    })
    .editGraphics({ target: "xTitle", property: "y", value: 382 })
    .editGraphics({ target: "xTitle", property: "text", value: "Horsepower" })
    .editGraphics({ target: "xTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "xTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "xTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "xTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "xTitle", property: "textAlign", value: "center" })
    .editGraphics({
      target: "xTitle",
      property: "textBaseline",
      value: "middle"
    })
    .createGraphics({ id: "yTitle", type: "text" })
    .editGraphics({ target: "yTitle", property: "x", value: 18 })
    .editGraphics({
      target: "yTitle",
      property: "y",
      value: (bounds.top + bounds.bottom) / 2
    })
    .editGraphics({
      target: "yTitle",
      property: "text",
      value: "Miles per Gallon"
    })
    .editGraphics({ target: "yTitle", property: "fill", value: "#334155" })
    .editGraphics({ target: "yTitle", property: "fontSize", value: 13 })
    .editGraphics({
      target: "yTitle",
      property: "fontFamily",
      value: "sans-serif"
    })
    .editGraphics({ target: "yTitle", property: "fontWeight", value: 600 })
    .editGraphics({ target: "yTitle", property: "textAlign", value: "center" })
    .editGraphics({
      target: "yTitle",
      property: "textBaseline",
      value: "middle"
    })
    .editGraphics({
      target: "yTitle",
      property: "rotation",
      value: -Math.PI / 2
    });
}

export function renderCarsScatterplotAxes(program, canvasContext) {
  render(program, canvasContext);
}
