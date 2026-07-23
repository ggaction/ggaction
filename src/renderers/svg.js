import {
  requireSingleOrderedGraphicByType,
  walkGraphicTreeEvents
} from "../grammar/schemas/graphicTree.js";
import {
  validateConcreteGraphicProperties
} from "../grammar/schemas/concreteGraphic.js";
import { resolvePathCommandBounds } from
  "../grammar/schemas/graphicBounds.js";
import {
  isLinearGradientPaint,
  resolveLinearGradientCoordinates,
  validateFillPaint
} from "../grammar/paint.js";
import {
  requireFiniteProperty,
  requireStringProperty
} from "./canvas/validation.js";
import { normalizeRendererFontWeight } from "./text.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_OPTIONS = new Set(["title", "description"]);
const TEXT_ANCHORS = Object.freeze({
  left: "start",
  start: "start",
  center: "middle",
  right: "end",
  end: "end"
});
const DOMINANT_BASELINES = Object.freeze({
  top: "text-before-edge",
  hanging: "hanging",
  middle: "middle",
  alphabetic: "alphabetic",
  ideographic: "ideographic",
  bottom: "text-after-edge"
});

function escapeText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(String(value))
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("SVG renderer requires finite numeric output.");
  }
  return Object.is(value, -0) ? "0" : String(value);
}

function attributes(entries) {
  return entries
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
}

function element(name, entries, content) {
  const serialized = attributes(entries);
  const opening = serialized.length === 0 ? `<${name}` : `<${name} ${serialized}`;
  if (content === undefined) return `${opening}/>`;
  return `${opening}>${content}</${name}>`;
}

function requireOpacity(properties, graphicId) {
  const opacity = properties.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }
  return opacity;
}

function requireStrokeDash(properties, graphicId) {
  const strokeDash = properties.strokeDash ?? [];
  if (
    !Array.isArray(strokeDash) ||
    !strokeDash.every(value => Number.isFinite(value) && value >= 0)
  ) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative finite strokeDash array.`
    );
  }
  return strokeDash;
}

function requireCanvasGeometry(id, canvas, { nested }) {
  const properties = canvas.properties ?? {};
  const width = requireFiniteProperty(properties, "width", id);
  const height = requireFiniteProperty(properties, "height", id);
  if (width < 0 || height < 0) {
    const label = nested ? `Nested Canvas "${id}"` : "Canvas";
    throw new Error(`${label} width and height must not be negative.`);
  }
  return {
    ...(nested ? {
      x: requireFiniteProperty(properties, "x", id),
      y: requireFiniteProperty(properties, "y", id)
    } : {}),
    width,
    height
  };
}

function requireCanvasBackground(id, canvas) {
  const background = canvas.properties?.background;
  if (background === undefined) return undefined;
  if (typeof background !== "string") {
    throw new Error(
      `Graphic "${id}" requires a string background property.`
    );
  }
  return background;
}

function addLinearGradient(state, fill, bounds, graphicId) {
  const coordinates = resolveLinearGradientCoordinates(fill, bounds);
  const id = `ggaction-gradient-${state.gradientCount}`;
  state.gradientCount += 1;
  const stops = fill.stops.map(stop => element("stop", [
    ["offset", formatNumber(stop.offset)],
    ["stop-color", stop.color]
  ])).join("");
  state.definitions.push(element("linearGradient", [
    ["id", id],
    ["gradientUnits", "userSpaceOnUse"],
    ["x1", formatNumber(coordinates.from.x)],
    ["y1", formatNumber(coordinates.from.y)],
    ["x2", formatNumber(coordinates.to.x)],
    ["y2", formatNumber(coordinates.to.y)]
  ], stops));
  return `url(#${id})`;
}

function serializeFill(state, fill, bounds, graphicId) {
  validateFillPaint(fill, `${graphicId}.fill`);
  if (!isLinearGradientPaint(fill)) return fill;
  return addLinearGradient(state, fill, bounds, graphicId);
}

function serializeCircle(state, graphicId, properties) {
  validateConcreteGraphicProperties("circle", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const radius = requireFiniteProperty(properties, "radius", graphicId);
  if (radius < 0) {
    throw new Error(`Graphic "${graphicId}" requires a non-negative radius.`);
  }
  if (typeof properties.fill !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string fill property.`);
  }
  let strokeWidth;
  if (properties.stroke !== undefined) {
    if (typeof properties.stroke !== "string") {
      throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
    }
    strokeWidth = requireFiniteProperty(properties, "strokeWidth", graphicId);
    if (strokeWidth < 0) {
      throw new Error(
        `Graphic "${graphicId}" requires a non-negative strokeWidth.`
      );
    }
  }
  return element("circle", [
    ["cx", formatNumber(x)],
    ["cy", formatNumber(y)],
    ["r", formatNumber(radius)],
    ["fill", properties.fill],
    ["stroke", properties.stroke],
    ["stroke-width", strokeWidth === undefined
      ? undefined
      : formatNumber(strokeWidth)],
    ["opacity", formatNumber(requireOpacity(properties, graphicId))]
  ]);
}

function serializeRect(state, graphicId, properties) {
  validateConcreteGraphicProperties("rect", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const width = requireFiniteProperty(properties, "width", graphicId);
  const height = requireFiniteProperty(properties, "height", graphicId);
  const strokeWidth = requireFiniteProperty(
    properties,
    "strokeWidth",
    graphicId
  );
  if (width < 0 || height < 0 || strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires non-negative rect dimensions and strokeWidth.`
    );
  }
  if (properties.fill === undefined) {
    throw new Error(`Graphic "${graphicId}" requires a fill property.`);
  }
  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }
  const fill = serializeFill(state, properties.fill, {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height
  }, graphicId);
  return element("rect", [
    ["x", formatNumber(x)],
    ["y", formatNumber(y)],
    ["width", formatNumber(width)],
    ["height", formatNumber(height)],
    ["fill", fill],
    ["stroke", properties.stroke],
    ["stroke-width", formatNumber(strokeWidth)],
    ["opacity", formatNumber(requireOpacity(properties, graphicId))]
  ]);
}

function serializeLine(state, graphicId, properties) {
  validateConcreteGraphicProperties("line", properties);
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
  const strokeDash = requireStrokeDash(properties, graphicId);
  return element("line", [
    ["x1", formatNumber(requireFiniteProperty(properties, "x1", graphicId))],
    ["y1", formatNumber(requireFiniteProperty(properties, "y1", graphicId))],
    ["x2", formatNumber(requireFiniteProperty(properties, "x2", graphicId))],
    ["y2", formatNumber(requireFiniteProperty(properties, "y2", graphicId))],
    ["fill", "none"],
    ["stroke", properties.stroke],
    ["stroke-width", formatNumber(strokeWidth)],
    ["stroke-dasharray", strokeDash.length === 0
      ? undefined
      : strokeDash.map(formatNumber).join(" ")],
    ["opacity", formatNumber(requireOpacity(properties, graphicId))]
  ]);
}

function serializePathData(commands) {
  return commands.map(command => {
    if (command.op === "M" || command.op === "L") {
      return `${command.op}${formatNumber(command.x)} ${formatNumber(command.y)}`;
    }
    if (command.op === "C") {
      return `C${formatNumber(command.x1)} ${formatNumber(command.y1)} ` +
        `${formatNumber(command.x2)} ${formatNumber(command.y2)} ` +
        `${formatNumber(command.x)} ${formatNumber(command.y)}`;
    }
    return "Z";
  }).join(" ");
}

function serializePath(state, graphicId, properties) {
  validateConcreteGraphicProperties("path", properties);
  const commands = properties.commands;
  if (!Array.isArray(commands)) {
    throw new Error(
      `Graphic "${graphicId}" requires concrete path commands.`
    );
  }
  const hasFill = properties.fill !== undefined;
  const hasStroke = properties.stroke !== undefined;
  if (!hasFill && !hasStroke) {
    throw new Error(`Graphic "${graphicId}" requires a fill or stroke property.`);
  }
  if (hasFill && commands.at(-1).op !== "Z") {
    throw new Error(`Graphic "${graphicId}" requires a final Z command when filled.`);
  }
  if (hasStroke && typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }
  const strokeWidth = hasStroke
    ? requireFiniteProperty(properties, "strokeWidth", graphicId)
    : undefined;
  if (hasStroke && strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative strokeWidth.`
    );
  }
  const strokeDash = requireStrokeDash(properties, graphicId);
  let fill = "none";
  if (hasFill) {
    const bounds = resolvePathCommandBounds(commands);
    if (bounds === undefined) {
      throw new Error(`Graphic "${graphicId}" requires finite path fill bounds.`);
    }
    fill = serializeFill(state, properties.fill, bounds, graphicId);
  }
  return element("path", [
    ["d", serializePathData(commands)],
    ["fill", fill],
    ["stroke", properties.stroke],
    ["stroke-width", strokeWidth === undefined
      ? undefined
      : formatNumber(strokeWidth)],
    ["stroke-dasharray", strokeDash.length === 0
      ? undefined
      : strokeDash.map(formatNumber).join(" ")],
    ["opacity", formatNumber(requireOpacity(properties, graphicId))]
  ]);
}

function serializeText(state, graphicId, properties) {
  validateConcreteGraphicProperties("text", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const fontSize = requireFiniteProperty(properties, "fontSize", graphicId);
  const rotation = properties.rotation ?? 0;
  const opacity = requireOpacity(properties, graphicId);
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
  if (
    !(
      (typeof fontWeight === "string" && fontWeight.length > 0) ||
      Number.isFinite(fontWeight)
    )
  ) {
    throw new Error(`Graphic "${graphicId}" requires a valid fontWeight.`);
  }
  if (TEXT_ANCHORS[textAlign] === undefined) {
    throw new Error(`Graphic "${graphicId}" has invalid textAlign.`);
  }
  if (DOMINANT_BASELINES[textBaseline] === undefined) {
    throw new Error(`Graphic "${graphicId}" has invalid textBaseline.`);
  }
  const rotationDegrees = rotation * 180 / Math.PI;
  return element("text", [
    ["x", formatNumber(x)],
    ["y", formatNumber(y)],
    ["fill", fill],
    ["font-family", fontFamily],
    ["font-size", formatNumber(fontSize)],
    ["font-weight", normalizeRendererFontWeight(fontWeight)],
    ["text-anchor", TEXT_ANCHORS[textAlign]],
    ["dominant-baseline", DOMINANT_BASELINES[textBaseline]],
    ["opacity", formatNumber(opacity)],
    ["transform", rotation === 0
      ? undefined
      : `rotate(${formatNumber(rotationDegrees)} ${formatNumber(x)} ${formatNumber(y)})`]
  ], escapeText(text));
}

function serializeConcreteGraphic(state, id, graphic) {
  if (graphic.type === "collection") {
    const items = (graphic.items ?? []).map(item =>
      serializeConcreteGraphic(state, item.id ?? id, item)
    ).join("");
    return element("g", [], items);
  }
  const properties = graphic.properties ?? {};
  if (graphic.type === "circle") {
    return serializeCircle(state, id, properties);
  }
  if (graphic.type === "rect") {
    return serializeRect(state, id, properties);
  }
  if (graphic.type === "line") {
    return serializeLine(state, id, properties);
  }
  if (graphic.type === "path") {
    return serializePath(state, id, properties);
  }
  if (graphic.type === "text") {
    return serializeText(state, id, properties);
  }
  throw new Error(`SVG renderer does not support "${graphic.type}" yet.`);
}

function openNestedCanvas(state, id, canvas) {
  const { x, y, width, height } = requireCanvasGeometry(
    id,
    canvas,
    { nested: true }
  );
  const clipId = `ggaction-clip-${state.clipCount}`;
  state.clipCount += 1;
  state.definitions.push(element("clipPath", [["id", clipId]], element(
    "rect",
    [
      ["x", "0"],
      ["y", "0"],
      ["width", formatNumber(width)],
      ["height", formatNumber(height)]
    ]
  )));
  const background = requireCanvasBackground(id, canvas);
  const backgroundRect = background === undefined
    ? ""
    : element("rect", [
      ["x", "0"],
      ["y", "0"],
      ["width", formatNumber(width)],
      ["height", formatNumber(height)],
      ["fill", background]
    ]);
  return `<g ${attributes([
    ["transform", `translate(${formatNumber(x)} ${formatNumber(y)})`],
    ["clip-path", `url(#${clipId})`]
  ])}>${backgroundRect}`;
}

function serializeBody(graphicSpec, rootId, rootCanvas, width, height, state) {
  const output = [];
  const background = requireCanvasBackground(rootId, rootCanvas);
  if (background !== undefined) {
    output.push(element("rect", [
      ["x", "0"],
      ["y", "0"],
      ["width", formatNumber(width)],
      ["height", formatNumber(height)],
      ["fill", background]
    ]));
  }
  walkGraphicTreeEvents(graphicSpec, {
    enter({ id, object }) {
      if (id === rootId) return;
      if (object.type === "canvas") {
        output.push(openNestedCanvas(state, id, object));
        return;
      }
      if (object.type === "collection") {
        output.push("<g>");
        return;
      }
      if (!Array.isArray(object.items)) {
        output.push(serializeConcreteGraphic(state, id, object));
      }
    },
    item({ id, object, owner }) {
      output.push(serializeConcreteGraphic(state, id, {
        ...object,
        type: object.type ?? owner.type
      }));
    },
    exit({ id, object }) {
      if (
        id !== rootId &&
        (object.type === "collection" || object.type === "canvas")
      ) {
        output.push("</g>");
      }
    }
  });
  return output.join("");
}

function requireSVGOptions(options) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    throw new TypeError("renderToSVG options must be a plain object.");
  }
  for (const key of Object.keys(options)) {
    if (!SVG_OPTIONS.has(key)) {
      throw new TypeError(`renderToSVG does not support option "${key}".`);
    }
  }
  for (const key of SVG_OPTIONS) {
    if (
      options[key] !== undefined &&
      (typeof options[key] !== "string" || options[key].length === 0)
    ) {
      throw new TypeError(`renderToSVG ${key} must be a non-empty string.`);
    }
  }
  return options;
}

export function renderToSVG(program, options = {}) {
  const resolvedOptions = requireSVGOptions(options);
  const graphicSpec = program?.graphicSpec;
  if (
    graphicSpec === null ||
    typeof graphicSpec !== "object" ||
    graphicSpec.objects === null ||
    typeof graphicSpec.objects !== "object" ||
    !Array.isArray(graphicSpec.order)
  ) {
    throw new TypeError("renderToSVG requires a program with a graphicSpec.");
  }
  const { id: rootId, object: rootCanvas } =
    requireSingleOrderedGraphicByType(graphicSpec, "canvas");
  const { width, height } = requireCanvasGeometry(
    rootId,
    rootCanvas,
    { nested: false }
  );
  const state = {
    clipCount: 1,
    definitions: [],
    gradientCount: 1
  };
  const body = serializeBody(
    graphicSpec,
    rootId,
    rootCanvas,
    width,
    height,
    state
  );
  const accessible = [
    resolvedOptions.title === undefined
      ? ""
      : element("title", [], escapeText(resolvedOptions.title)),
    resolvedOptions.description === undefined
      ? ""
      : element("desc", [], escapeText(resolvedOptions.description))
  ].join("");
  const definitions = state.definitions.length === 0
    ? ""
    : element("defs", [], state.definitions.join(""));
  return element("svg", [
    ["xmlns", SVG_NAMESPACE],
    ["width", formatNumber(width)],
    ["height", formatNumber(height)],
    ["viewBox", `0 0 ${formatNumber(width)} ${formatNumber(height)}`]
  ], `${accessible}${definitions}${body}`);
}
