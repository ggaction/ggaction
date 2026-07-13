import { drawCircleGraphic } from "./circle.js";
import { drawLineGraphic } from "./line.js";
import { drawPathGraphic } from "./path.js";
import { drawRectGraphic } from "./rect.js";
import { drawTextGraphic } from "./text.js";
import { requireFiniteProperty } from "./validation.js";

const DRAWERS = Object.freeze({
  circle: drawCircleGraphic,
  rect: drawRectGraphic,
  line: drawLineGraphic,
  text: drawTextGraphic,
  path: drawPathGraphic
});

function requireCanvasContext(context) {
  const methods = [
    "save",
    "restore",
    "clearRect",
    "fillRect",
    "beginPath",
    "closePath",
    "arc",
    "fill",
    "moveTo",
    "lineTo",
    "setLineDash",
    "stroke",
    "translate",
    "rotate",
    "fillText",
    "scale"
  ];

  if (context === null || typeof context !== "object" || !context.canvas) {
    throw new TypeError("render requires a Canvas 2D context.");
  }

  for (const method of methods) {
    if (typeof context[method] !== "function") {
      throw new TypeError(`Canvas context is missing ${method}().`);
    }
  }
}

function findCanvas(graphicSpec) {
  const canvasIds = graphicSpec.order.filter(
    id => graphicSpec.objects[id]?.type === "canvas"
  );

  if (canvasIds.length !== 1) {
    throw new Error("graphicSpec must contain exactly one ordered canvas.");
  }

  return { id: canvasIds[0], graphic: graphicSpec.objects[canvasIds[0]] };
}

export function render(program, context, { pixelRatio = 1 } = {}) {
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

  requireCanvasContext(context);

  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("render pixelRatio must be a positive finite number.");
  }

  const { id: canvasId, graphic: canvas } = findCanvas(graphicSpec);
  const width = requireFiniteProperty(canvas.properties ?? {}, "width", canvasId);
  const height = requireFiniteProperty(
    canvas.properties ?? {},
    "height",
    canvasId
  );

  if (width < 0 || height < 0) {
    throw new Error("Canvas width and height must not be negative.");
  }

  context.canvas.width = Math.round(width * pixelRatio);
  context.canvas.height = Math.round(height * pixelRatio);
  context.save();

  try {
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);

    if (canvas.properties.background !== undefined) {
      if (typeof canvas.properties.background !== "string") {
        throw new Error(
          `Graphic "${canvasId}" requires a string background property.`
        );
      }

      context.globalAlpha = 1;
      context.fillStyle = canvas.properties.background;
      context.fillRect(0, 0, width, height);
    }

    for (const id of graphicSpec.order) {
      if (id === canvasId) {
        continue;
      }

      const graphic = graphicSpec.objects[id];

      if (graphic === undefined) {
        throw new Error(`Unknown ordered graphic "${id}".`);
      }

      drawConcreteGraphic(context, id, graphic);
    }
  } finally {
    context.restore();
  }
}

function drawConcreteGraphic(context, id, graphic) {
  if (graphic.type === "collection") {
    for (const child of graphic.children ?? []) {
      drawConcreteGraphic(context, child.id ?? id, child);
    }
    return;
  }
  const draw = DRAWERS[graphic.type];
  if (draw === undefined) {
    throw new Error(`Canvas renderer does not support "${graphic.type}" yet.`);
  }
  draw(context, id, graphic);
}
