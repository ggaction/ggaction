import { cloneAndFreeze } from "../core/immutable.js";

export const POINT_SHAPES = cloneAndFreeze([
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

const SHAPE_SET = new Set(POINT_SHAPES);

export function validatePointShape(shape) {
  if (typeof shape !== "string" || !SHAPE_SET.has(shape)) {
    throw new Error(`Unsupported point shape "${shape}".`);
  }
  return shape;
}

export function getPointGraphicType(shape) {
  const validated = validatePointShape(shape);
  if (validated === "circle") return "circle";
  if (validated === "square") return "rect";
  return "path";
}

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
  return {
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
  }[shape];
}

function normalizePolygon(points, x, y, area) {
  const scale = Math.sqrt(area / polygonArea(points));
  return points.map(point => ({
    x: x + point.x * scale,
    y: y + point.y * scale
  }));
}

function appearance(fill, stroke, strokeWidth, opacity) {
  return {
    fill,
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(opacity === undefined ? {} : { opacity })
  };
}

export function createPointShapeGraphic({
  shape,
  x,
  y,
  area,
  fill,
  stroke,
  strokeWidth,
  opacity
}) {
  const validated = validatePointShape(shape);
  if (![x, y, area].every(Number.isFinite) || area < 0) {
    throw new TypeError("Point shape x, y, and non-negative area must be finite.");
  }
  if (typeof fill !== "string" || fill.length === 0) {
    throw new TypeError("Point shape fill must be a non-empty string.");
  }
  const shared = appearance(fill, stroke, strokeWidth, opacity);
  if (validated === "circle") {
    return {
      type: "circle",
      properties: { x, y, radius: Math.sqrt(area / Math.PI), ...shared }
    };
  }
  if (validated === "square") {
    const side = Math.sqrt(area);
    return {
      type: "rect",
      properties: {
        x: x - side / 2,
        y: y - side / 2,
        width: side,
        height: side,
        ...shared,
        stroke: stroke ?? fill,
        strokeWidth: strokeWidth ?? 0
      }
    };
  }
  return {
    type: "path",
    properties: {
      points: normalizePolygon(shapePolygon(validated), x, y, area),
      ...shared,
      closed: true
    }
  };
}
