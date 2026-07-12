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

function drawLine(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  const x1 = requireFiniteProperty(properties, "x1", graphicId);
  const y1 = requireFiniteProperty(properties, "y1", graphicId);
  const x2 = requireFiniteProperty(properties, "x2", graphicId);
  const y2 = requireFiniteProperty(properties, "y2", graphicId);
  const strokeWidth = requireFiniteProperty(
    properties,
    "strokeWidth",
    graphicId
  );

  if (strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative strokeWidth.`
    );
  }

  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const opacity = properties.opacity ?? 1;

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.strokeStyle = properties.stroke;
  context.lineWidth = strokeWidth;
  context.globalAlpha = opacity;
  context.setLineDash(properties.strokeDash ?? []);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function drawLineGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawLine(context, child, id);
    }
    return;
  }

  drawLine(context, { id, properties: graphic.properties }, id);
}

function drawPath(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  const points = properties.points;

  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new Error(
      `Graphic "${graphicId}" requires at least two finite path points.`
    );
  }

  const strokeWidth = requireFiniteProperty(
    properties,
    "strokeWidth",
    graphicId
  );

  if (strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative strokeWidth.`
    );
  }

  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const strokeDash = properties.strokeDash ?? [];
  if (
    !Array.isArray(strokeDash) ||
    !strokeDash.every(value => Number.isFinite(value) && value >= 0)
  ) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative finite strokeDash array.`
    );
  }

  const opacity = properties.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.strokeStyle = properties.stroke;
  context.lineWidth = strokeWidth;
  context.globalAlpha = opacity;
  context.setLineDash(strokeDash);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function drawPathGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawPath(context, child, id);
    }
    return;
  }

  drawPath(context, { id, properties: graphic.properties }, id);
}

function requireStringProperty(properties, property, graphicId) {
  const value = properties[property];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-empty ${property} property.`
    );
  }

  return value;
}

function drawText(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const fontSize = requireFiniteProperty(properties, "fontSize", graphicId);
  const rotation = properties.rotation ?? 0;
  const opacity = properties.opacity ?? 1;
  const text = requireStringProperty(properties, "text", graphicId);
  const fill = requireStringProperty(properties, "fill", graphicId);
  const fontFamily = requireStringProperty(
    properties,
    "fontFamily",
    graphicId
  );
  const textAlign = requireStringProperty(
    properties,
    "textAlign",
    graphicId
  );
  const textBaseline = requireStringProperty(
    properties,
    "textBaseline",
    graphicId
  );
  const fontWeight = properties.fontWeight ?? "normal";

  if (fontSize <= 0) {
    throw new Error(`Graphic "${graphicId}" requires a positive fontSize.`);
  }

  if (!Number.isFinite(rotation)) {
    throw new Error(`Graphic "${graphicId}" requires a finite rotation.`);
  }

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  if (
    !(
      (typeof fontWeight === "string" && fontWeight.length > 0) ||
      Number.isFinite(fontWeight)
    )
  ) {
    throw new Error(`Graphic "${graphicId}" requires a valid fontWeight.`);
  }

  if (!["left", "right", "center", "start", "end"].includes(textAlign)) {
    throw new Error(`Graphic "${graphicId}" has invalid textAlign.`);
  }

  if (
    ![
      "top",
      "hanging",
      "middle",
      "alphabetic",
      "ideographic",
      "bottom"
    ].includes(textBaseline)
  ) {
    throw new Error(`Graphic "${graphicId}" has invalid textBaseline.`);
  }

  context.save();

  try {
    context.fillStyle = fill;
    context.globalAlpha = opacity;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;
    context.translate(x, y);
    context.rotate(rotation);
    context.fillText(text, 0, 0);
  } finally {
    context.restore();
  }
}

function drawTextGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawText(context, child, id);
    }
    return;
  }

  drawText(context, { id, properties: graphic.properties }, id);
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
      } else if (graphic.type === "line") {
        drawLineGraphic(context, id, graphic);
      } else if (graphic.type === "text") {
        drawTextGraphic(context, id, graphic);
      } else if (graphic.type === "path") {
        drawPathGraphic(context, id, graphic);
      } else {
        throw new Error(`Canvas renderer does not support "${graphic.type}" yet.`);
      }
    }
  } finally {
    context.restore();
  }
}
