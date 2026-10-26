import { cloneAndFreeze } from "../core/immutable.js";
import { buildLinearPathCommands } from "./pathCommands.js";
import { requestedStrokeDetails } from "./strokeStyle.js";
import { normalizePointPolygon, pointPolygonArea } from "./pointPolygon.js";

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
  "wye",
  "wedge",
  "arrow"
]);

// Recover the anchor from concrete geometry, including jitter, packing and rotation.
// Path glyphs can be asymmetric, so their bounding-box center is not their anchor.
export function pointGraphicAnchor(graphic, shape = "circle", angle) {
  const p = graphic?.properties ?? {};
  if (graphic?.type === "circle") return { x: p.x, y: p.y };
  if (graphic?.type === "rect") return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
  const template = createPointShapeGraphic({ shape, angle, x: 0, y: 0, area: 1, fill: "black" });
  const points = p.commands?.filter(command => Number.isFinite(command.x) && Number.isFinite(command.y));
  const origin = template.properties.commands?.filter(command => Number.isFinite(command.x) && Number.isFinite(command.y));
  if (!points?.length || points.length !== origin?.length) throw new Error("Point glyph does not match its shape geometry.");
  const bounds = values => ({ left: Math.min(...values.map(p => p.x)), right: Math.max(...values.map(p => p.x)),
    top: Math.min(...values.map(p => p.y)), bottom: Math.max(...values.map(p => p.y)) });
  const actual = bounds(points), unit = bounds(origin);
  const factor = unit.right !== unit.left ? (actual.right - actual.left) / (unit.right - unit.left)
    : (actual.bottom - actual.top) / (unit.bottom - unit.top);
  return { x: actual.left - factor * unit.left, y: actual.top - factor * unit.top };
}

const SHAPE_SET = new Set(POINT_SHAPES);

export function validatePointShape(shape) {
  if (shape !== null && typeof shape === "object") return normalizePointPolygon(shape);
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
  if (typeof shape === "object") return shape.polygon;
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
    square: [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 }
    ],
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
    wye: alternatingPolygon(3, 0.28),
    wedge: [
      { x: 0, y: -2 / Math.sqrt(3) },
      { x: -1 / 4, y: 1 / Math.sqrt(3) },
      { x: 1 / 4, y: 1 / Math.sqrt(3) }
    ],
    // The directional arrow is anchored at its bounding-box center, not its centroid.
    arrow: [
      { x: -1 / 7, y: 1 }, { x: 1 / 7, y: 1 },
      { x: 1 / 7, y: -1 / 8 }, { x: 2 / 5, y: -1 / 8 },
      { x: 0, y: -1 }, { x: -2 / 5, y: -1 / 8 },
      { x: -1 / 7, y: -1 / 8 }
    ]
  }[shape];
}

function normalizePolygon(points, x, y, area, normalization = "area") {
  const scale = Math.sqrt(area / (normalization === "radius" ? Math.PI : pointPolygonArea(points)));
  if (!Number.isFinite(scale)) throw new RangeError("Point polygon normalization exceeds finite geometry.");
  const normalized = points.map(point => ({
    x: x + point.x * scale,
    y: y + point.y * scale
  }));
  if (normalized.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new RangeError("Point polygon normalization exceeds finite geometry.");
  }
  return normalized;
}

function appearance(fill, stroke, strokeWidth, opacity, strokeDetails) {
  return {
    fill,
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(opacity === undefined ? {} : { opacity }),
    ...requestedStrokeDetails(strokeDetails, "Point shape")
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
  opacity,
  angle,
  lineCap,
  lineJoin,
  miterLimit
}) {
  const validated = validatePointShape(shape);
  if (![x, y, area].every(Number.isFinite) || area < 0) {
    throw new TypeError("Point shape x, y, and non-negative area must be finite.");
  }
  if (typeof fill !== "string" || fill.length === 0) {
    throw new TypeError("Point shape fill must be a non-empty string.");
  }
  const shared = appearance(fill, stroke, strokeWidth, opacity, {
    ...(lineCap === undefined ? {} : { lineCap }),
    ...(lineJoin === undefined ? {} : { lineJoin }),
    ...(miterLimit === undefined ? {} : { miterLimit })
  });
  if (angle !== undefined && !Number.isFinite(angle)) {
    throw new TypeError("Point shape angle must be finite degrees.");
  }
  if (validated === "circle") {
    return {
      type: "circle",
      properties: { x, y, radius: Math.sqrt(area / Math.PI), ...shared }
    };
  }
  if (validated === "square" && angle === undefined) {
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
      commands: buildLinearPathCommands(
        normalizePolygon(
          rotate(shapePolygon(validated), (angle ?? 0) * Math.PI / 180),
          x,
          y,
          area,
          validated.normalization
        ),
        { close: true }
      ),
      ...shared
    }
  };
}

export function resolvePointShapeExtent({
  shape,
  area,
  strokeWidth = 0,
  angle
}) {
  const validated = validatePointShape(shape);
  if (!Number.isFinite(area) || area < 0) {
    throw new TypeError("Point shape area must be finite and non-negative.");
  }
  if (!Number.isFinite(strokeWidth) || strokeWidth < 0) {
    throw new TypeError("Point shape strokeWidth must be finite and non-negative.");
  }
  const strokeExtent = strokeWidth / 2;
  if (validated === "circle") {
    const radius = Math.sqrt(area / Math.PI) + strokeExtent;
    return cloneAndFreeze({ x: radius, y: radius });
  }
  if (angle !== undefined && !Number.isFinite(angle)) {
    throw new TypeError("Point shape angle must be finite degrees.");
  }
  if (validated === "square" && angle === undefined) {
    const halfSide = Math.sqrt(area) / 2 + strokeExtent;
    return cloneAndFreeze({ x: halfSide, y: halfSide });
  }
  const points = normalizePolygon(
    rotate(shapePolygon(validated), (angle ?? 0) * Math.PI / 180),
    0,
    0,
    area,
    validated.normalization
  );
  return cloneAndFreeze({
    x: Math.max(0, ...points.map(point => Math.abs(point.x))) + strokeExtent,
    y: Math.max(0, ...points.map(point => Math.abs(point.y))) + strokeExtent
  });
}
