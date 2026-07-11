function requireFiniteProperty(properties, property, graphicId) {
  const value = properties[property];

  if (!Number.isFinite(value)) {
    throw new Error(
      `Graphic "${graphicId}" requires a finite ${property} property.`
    );
  }

  return value;
}

function requireCanvasContext(context) {
  const methods = [
    "save",
    "restore",
    "clearRect",
    "fillRect",
    "beginPath",
    "arc",
    "fill",
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

function drawCircle(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const radius = requireFiniteProperty(properties, "radius", graphicId);

  if (radius < 0) {
    throw new Error(`Graphic "${graphicId}" requires a non-negative radius.`);
  }

  if (typeof properties.fill !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string fill property.`);
  }

  const opacity = properties.opacity ?? 1;

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.fillStyle = properties.fill;
  context.globalAlpha = opacity;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawCircleGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawCircle(context, child, id);
    }
    return;
  }

  drawCircle(context, { id, properties: graphic.properties }, id);
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

      if (graphic.type === "circle") {
        drawCircleGraphic(context, id, graphic);
      } else {
        throw new Error(`Canvas renderer does not support "${graphic.type}" yet.`);
      }
    }
  } finally {
    context.restore();
  }
}
