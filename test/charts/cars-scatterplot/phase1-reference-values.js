import { createCarsScatterplotPrimitiveValues } from "./primitive.program.js";

export const POINT_SHAPES = Object.freeze([
  "circle",
  "square",
  "diamond",
  "triangle-up",
  "triangle-down",
  "triangle-left",
  "triangle-right",
  "plus",
  "cross",
  "star",
  "hexagon",
  "wye"
]);

export const SET2_COLORS = Object.freeze([
  "#66c2a5",
  "#fc8d62",
  "#8da0cb",
  "#e78ac3",
  "#a6d854",
  "#ffd92f",
  "#e5c494",
  "#b3b3b3"
]);

const SET2_ORIGIN_COLORS = Object.freeze({
  USA: SET2_COLORS[0],
  Japan: SET2_COLORS[1],
  Europe: SET2_COLORS[2]
});

const DEFAULT_COLORS = Object.freeze([
  "#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
  "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac"
]);

function polygonArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

function rotate(points, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return points.map(point => ({
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine
  }));
}

function regularPolygon(count, rotation = -Math.PI / 2) {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + index * Math.PI * 2 / count;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

function alternatingPolygon(count, innerRadius, rotation = -Math.PI / 2) {
  return Array.from({ length: count * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? 1 : innerRadius;
    const angle = rotation + index * Math.PI / count;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

function shapePolygon(shape) {
  const arm = 0.32;
  const plus = [
    { x: -arm, y: -1 }, { x: arm, y: -1 },
    { x: arm, y: -arm }, { x: 1, y: -arm },
    { x: 1, y: arm }, { x: arm, y: arm },
    { x: arm, y: 1 }, { x: -arm, y: 1 },
    { x: -arm, y: arm }, { x: -1, y: arm },
    { x: -1, y: -arm }, { x: -arm, y: -arm }
  ];
  const polygons = {
    diamond: [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ],
    "triangle-up": regularPolygon(3, -Math.PI / 2),
    "triangle-down": regularPolygon(3, Math.PI / 2),
    "triangle-left": regularPolygon(3, Math.PI),
    "triangle-right": regularPolygon(3, 0),
    plus,
    cross: rotate(plus, Math.PI / 4),
    star: alternatingPolygon(5, 0.45),
    hexagon: regularPolygon(6),
    wye: alternatingPolygon(3, 0.28)
  };
  return polygons[shape];
}

function normalizePolygon(points, x, y, area) {
  const scale = Math.sqrt(area / polygonArea(points));
  return points.map(point => ({
    x: x + point.x * scale,
    y: y + point.y * scale
  }));
}

export function createShapeGraphic(
  shape,
  { x, y, area, fill, stroke, strokeWidth }
) {
  if (!POINT_SHAPES.includes(shape)) {
    throw new Error(`Unknown reference point shape "${shape}".`);
  }
  if (shape === "circle") {
    return {
      type: "circle",
      properties: {
        x,
        y,
        radius: Math.sqrt(area / Math.PI),
        fill,
        ...(stroke === undefined ? {} : { stroke }),
        ...(strokeWidth === undefined ? {} : { strokeWidth })
      }
    };
  }
  if (shape === "square") {
    const side = Math.sqrt(area);
    return {
      type: "rect",
      properties: {
        x: x - side / 2,
        y: y - side / 2,
        width: side,
        height: side,
        fill,
        stroke: stroke ?? fill,
        strokeWidth: strokeWidth ?? 0
      }
    };
  }
  return {
    type: "path",
    properties: {
      points: normalizePolygon(shapePolygon(shape), x, y, area),
      fill,
      ...(stroke === undefined ? {} : { stroke }),
      ...(strokeWidth === undefined ? {} : { strokeWidth }),
      closed: true
    }
  };
}

export function createScaleReversePrimitiveValues(cars) {
  const baseline = createCarsScatterplotPrimitiveValues(cars);
  const { left, right } = baseline.bounds;
  const horsepower = baseline.validCars.map(row => row.Horsepower);
  const domain = [Math.min(...horsepower), Math.max(...horsepower)];
  const map = value => {
    const ratio = (value - domain[0]) / (domain[1] - domain[0]);
    return right + ratio * (left - right);
  };
  return Object.freeze({
    baseline,
    x: Object.freeze(horsepower.map(map)),
    xTicks: Object.freeze(baseline.xTicks.values.map(map))
  });
}

export function createDiamondPrimitiveValues(cars) {
  const baseline = createCarsScatterplotPrimitiveValues(cars);
  const area = Math.PI * 3 ** 2;
  return Object.freeze({
    baseline,
    children: Object.freeze(baseline.x.map((x, index) =>
      createShapeGraphic("diamond", {
        x,
        y: baseline.y[index],
        area,
        fill: baseline.fill[index]
      })
    ))
  });
}

function selectShapeRows(baseline) {
  const sorted = baseline.validCars.map((row, index) => ({ row, index }))
    .sort((left, right) =>
      left.row.Horsepower - right.row.Horsepower ||
      left.row.Miles_per_Gallon - right.row.Miles_per_Gallon ||
      left.index - right.index
    );
  return POINT_SHAPES.map((shape, shapeIndex) => {
    const sortedIndex = Math.round(
      shapeIndex * (sorted.length - 1) / (POINT_SHAPES.length - 1)
    );
    const selected = sorted[sortedIndex];
    return {
      index: selected.index,
      row: { ...selected.row, ShapeCategory: shape },
      shape
    };
  });
}

export function createShapeVocabularyPrimitiveValues(cars) {
  const baseline = createCarsScatterplotPrimitiveValues(cars);
  const selected = selectShapeRows(baseline);
  const pointArea = Math.PI * 7 ** 2;
  const legendArea = Math.PI * 5 ** 2;
  const legendX = 645;
  const legendStartY = 82;
  const legendGap = 24;
  return Object.freeze({
    baseline,
    rows: Object.freeze(selected.map(item => item.row)),
    shapes: POINT_SHAPES,
    children: Object.freeze(selected.map(item =>
      createShapeGraphic(item.shape, {
        x: baseline.x[item.index],
        y: baseline.y[item.index],
        area: pointArea,
        fill: "#4c78a8"
      })
    )),
    legend: Object.freeze({
      title: Object.freeze({ x: 640, y: 50, text: "Shape" }),
      symbols: Object.freeze(POINT_SHAPES.map((shape, index) =>
        createShapeGraphic(shape, {
          x: legendX,
          y: legendStartY + index * legendGap,
          area: legendArea,
          fill: "#4c78a8",
          stroke: "white",
          strokeWidth: 0
        })
      )),
      labels: Object.freeze(POINT_SHAPES.map((shape, index) => ({
        x: 660,
        y: legendStartY + index * legendGap,
        text: shape
      })))
    })
  });
}

export function createCategoricalPalettePrimitiveValues(cars) {
  const baseline = createCarsScatterplotPrimitiveValues(cars);
  const domain = Object.freeze(["USA", "Japan", "Europe"]);
  const range = Object.freeze(SET2_COLORS.slice(0, domain.length));
  const itemStartY = 76;
  const itemGap = 28;
  return Object.freeze({
    baseline,
    domain,
    range,
    fill: Object.freeze(
      baseline.validCars.map(row => SET2_ORIGIN_COLORS[row.Origin])
    ),
    legend: Object.freeze({
      title: Object.freeze({ x: 640, y: 50, text: "Origin" }),
      symbols: Object.freeze(domain.map((value, index) => ({
        x: 640,
        y: itemStartY + index * itemGap,
        width: 14,
        height: 12,
        fill: range[index],
        stroke: "white",
        strokeWidth: 0.5
      }))),
      labels: Object.freeze(domain.map((value, index) => ({
        x: 662,
        y: itemStartY + 6 + index * itemGap,
        text: value
      })))
    })
  });
}

function firstAppearance(values) {
  return [...new Set(values)];
}

function mapLinear(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

export function createEncodingReassignmentPrimitiveValues(cars) {
  const baseline = createCarsScatterplotPrimitiveValues(cars);
  const rows = baseline.validCars;
  const xDomain = [
    Math.min(...rows.map(row => row.Displacement)),
    Math.max(...rows.map(row => row.Displacement))
  ];
  const yDomain = [
    Math.min(...rows.map(row => row.Acceleration)),
    Math.max(...rows.map(row => row.Acceleration))
  ];
  const sizeDomain = [
    Math.min(...rows.map(row => row.Weight_in_lbs)),
    Math.max(...rows.map(row => row.Weight_in_lbs))
  ];
  const colorDomain = firstAppearance(rows.map(row => row.Cylinders));
  const shapeDomain = firstAppearance(rows.map(row => row.Origin));
  const colorByValue = new Map(colorDomain.map(
    (value, index) => [value, DEFAULT_COLORS[index]]
  ));
  const shapeByValue = new Map(shapeDomain.map(
    (value, index) => [value, POINT_SHAPES[index]]
  ));
  const xTickValues = [100, 200, 300, 400];
  const yTickValues = [10, 15, 20];
  const x = rows.map(row => mapLinear(
    row.Displacement,
    xDomain,
    [baseline.bounds.left, baseline.bounds.right]
  ));
  const y = rows.map(row => mapLinear(
    row.Acceleration,
    yDomain,
    [baseline.bounds.bottom, baseline.bounds.top]
  ));

  return Object.freeze({
    baseline,
    rows,
    xDomain: Object.freeze(xDomain),
    yDomain: Object.freeze(yDomain),
    sizeDomain: Object.freeze(sizeDomain),
    colorDomain: Object.freeze(colorDomain),
    shapeDomain: Object.freeze(shapeDomain),
    xTicks: Object.freeze({
      values: Object.freeze(xTickValues),
      positions: Object.freeze(xTickValues.map(value => mapLinear(
        value,
        xDomain,
        [baseline.bounds.left, baseline.bounds.right]
      )))
    }),
    yTicks: Object.freeze({
      values: Object.freeze(yTickValues),
      positions: Object.freeze(yTickValues.map(value => mapLinear(
        value,
        yDomain,
        [baseline.bounds.bottom, baseline.bounds.top]
      )))
    }),
    children: Object.freeze(rows.map((row, index) =>
      createShapeGraphic(shapeByValue.get(row.Origin), {
        x: x[index],
        y: y[index],
        area: mapLinear(row.Weight_in_lbs, sizeDomain, [24, 196]),
        fill: colorByValue.get(row.Cylinders)
      })
    ))
  });
}
