import { drawCircleGraphic } from "./circle.js";
import { drawLineGraphic } from "./line.js";
import { drawPathGraphic } from "./path.js";
import { drawRectGraphic } from "./rect.js";
import { drawTextGraphic } from "./text.js";
import { requireFiniteProperty } from "./validation.js";
import {
  preflightCanvasGraphicSpec,
  requireCanvasNativeValue
} from "./native.js";
import {
  requireSingleOrderedGraphicByType,
  walkGraphicTreeEvents
} from "../../grammar/schemas/graphicTree.js";

const DRAWERS = Object.freeze({
  circle: drawCircleGraphic,
  rect: drawRectGraphic,
  line: drawLineGraphic,
  text: drawTextGraphic,
  path: drawPathGraphic
});

const DRAWING_CONTEXT_METHODS = Object.freeze([
  "save",
  "restore",
  "fillRect",
  "beginPath",
  "closePath",
  "arc",
  "fill",
  "moveTo",
  "lineTo",
  "bezierCurveTo",
  "setLineDash",
  "stroke",
  "translate",
  "rotate",
  "fillText"
]);
const MAX_RASTER_DIMENSION = 32_767;
const MAX_RASTER_PIXELS = 16_777_216;

function requireDrawingContext(context) {
  if (context === null || typeof context !== "object") {
    throw new TypeError("Canvas drawing requires a 2D context.");
  }

  for (const method of DRAWING_CONTEXT_METHODS) {
    if (typeof context[method] !== "function") {
      throw new TypeError(`Canvas context is missing ${method}().`);
    }
  }
}

function requireCanvasContext(context) {
  if (context === null || typeof context !== "object" || !context.canvas) {
    throw new TypeError("render requires a Canvas 2D context.");
  }

  requireDrawingContext(context);
  for (const method of ["clearRect", "scale"]) {
    if (typeof context[method] !== "function") {
      throw new TypeError(`Canvas context is missing ${method}().`);
    }
  }
}

function requireContextMethod(context, method, label) {
  if (typeof context[method] !== "function") {
    throw new TypeError(`${label} requires Canvas context ${method}().`);
  }
}

function fillCanvasBackground(context, id, canvas, width, height) {
  if (canvas.properties.background === undefined) return;
  if (typeof canvas.properties.background !== "string") {
    throw new Error(
      `Graphic "${id}" requires a string background property.`
    );
  }
  context.globalAlpha = 1;
  context.fillStyle = canvas.properties.background;
  context.fillRect(0, 0, width, height);
}

function enterNestedCanvas(context, id, canvas) {
  const properties = canvas.properties ?? {};
  const x = requireFiniteProperty(properties, "x", id);
  const y = requireFiniteProperty(properties, "y", id);
  const width = requireFiniteProperty(properties, "width", id);
  const height = requireFiniteProperty(properties, "height", id);
  if (width < 0 || height < 0) {
    throw new Error(`Nested Canvas "${id}" width and height must not be negative.`);
  }
  requireContextMethod(context, "rect", `Nested Canvas "${id}"`);
  requireContextMethod(context, "clip", `Nested Canvas "${id}"`);
  context.save();
  context.translate(x, y);
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  fillCanvasBackground(context, id, canvas, width, height);
}

export function requireProgramGraphicSpec(program) {
  const graphicSpec = program?.graphicSpec;

  if (
    graphicSpec === null ||
    typeof graphicSpec !== "object" ||
    graphicSpec.objects === null ||
    typeof graphicSpec.objects !== "object" ||
    !Array.isArray(graphicSpec.order)
  ) {
    throw new TypeError("render requires a program with a graphicSpec.");
  }

  return graphicSpec;
}

export function resolveGraphicRenderTarget(graphicSpec) {
  const { id: canvasId, object: canvas } =
    requireSingleOrderedGraphicByType(graphicSpec, "canvas");
  const width = requireFiniteProperty(canvas.properties ?? {}, "width", canvasId);
  const height = requireFiniteProperty(
    canvas.properties ?? {},
    "height",
    canvasId
  );

  if (width < 0 || height < 0) {
    throw new Error("Canvas width and height must not be negative.");
  }

  return Object.freeze({
    graphicSpec,
    canvasId,
    canvas,
    width,
    height
  });
}

export function drawResolvedGraphicSpec(target, context) {
  requireDrawingContext(context);
  const { graphicSpec, canvasId, canvas, width, height } = target;

  fillCanvasBackground(context, canvasId, canvas, width, height);

  walkGraphicTreeEvents(graphicSpec, {
    enter({ id, object }) {
      if (id === canvasId) return;
      if (object.type === "canvas") {
        enterNestedCanvas(context, id, object);
        return;
      }
      if (object.type === "collection") {
        context.save();
        return;
      }
      if (!Array.isArray(object.items)) {
        drawConcreteGraphic(context, id, object);
      }
    },
    item({ id, object, owner }) {
      drawConcreteGraphic(context, id, {
        ...object,
        type: object.type ?? owner.type
      });
    },
    exit({ id, object }) {
      if (
        id !== canvasId &&
        (object.type === "collection" || object.type === "canvas")
      ) {
        context.restore();
      }
    }
  });
}

export function render(program, context, { pixelRatio = 1 } = {}) {
  const graphicSpec = requireProgramGraphicSpec(program);

  requireCanvasContext(context);

  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("render pixelRatio must be a positive finite number.");
  }
  requireCanvasNativeValue(pixelRatio, "render Canvas pixelRatio");
  if (Math.fround(pixelRatio) === 0) {
    throw new RangeError(
      "render Canvas pixelRatio must remain positive at native precision."
    );
  }

  const target = resolveGraphicRenderTarget(graphicSpec);
  const { width, height } = target;
  const physicalWidth = Math.max(1, Math.round(width * pixelRatio));
  const physicalHeight = Math.max(1, Math.round(height * pixelRatio));
  if (![physicalWidth, physicalHeight].every(Number.isSafeInteger)) {
    throw new RangeError(
      "render physical Canvas dimensions must be finite safe integers."
    );
  }
  if (
    physicalWidth > MAX_RASTER_DIMENSION ||
    physicalHeight > MAX_RASTER_DIMENSION
  ) {
    throw new RangeError(
      `render physical Canvas dimensions must not exceed ${MAX_RASTER_DIMENSION}.`
    );
  }
  if (physicalWidth * physicalHeight > MAX_RASTER_PIXELS) {
    throw new RangeError(
      `render physical Canvas pixel count must not exceed ${MAX_RASTER_PIXELS}.`
    );
  }
  preflightCanvasGraphicSpec(target, pixelRatio);

  context.canvas.width = physicalWidth;
  context.canvas.height = physicalHeight;
  if (
    context.canvas.style !== null &&
    typeof context.canvas.style === "object"
  ) {
    context.canvas.style.width = `${width}px`;
    context.canvas.style.height = `${height}px`;
  }
  context.save();

  try {
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);
    drawResolvedGraphicSpec(target, context);
  } finally {
    context.restore();
  }
}

function drawConcreteGraphic(context, id, graphic) {
  if (graphic.type === "collection") {
    for (const item of graphic.items ?? []) {
      drawConcreteGraphic(context, item.id ?? id, item);
    }
    return;
  }
  const draw = DRAWERS[graphic.type];
  if (draw === undefined) {
    throw new Error(`Canvas renderer does not support "${graphic.type}" yet.`);
  }
  draw(context, id, graphic);
}
