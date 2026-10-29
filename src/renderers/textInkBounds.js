import { ownRecord } from "../core/ownData.js";
import { preparedTextGlyphInput } from "./textGlyphInput.js";
import { readPreparedFonts } from "./fontRendering.js";
import { configureTextContext } from "./canvas/text.js";

// Renderer preparation measures actual ink only. It does not reflow text or
// change semantic layout, line origins, advances or the stored graphic.
export function measureTextInkBounds(program, text, options) {
  ownRecord(options, "Text ink measurement options");
  if (Object.keys(options).some(key => !["fonts", "createCanvas"].includes(key))) throw new TypeError("Text ink measurement options contain unsupported properties.");
  options = { __proto__: null, ...options };
  if (typeof options.createCanvas !== "function") throw new TypeError("Text ink measurement requires an explicit Canvas factory.");
  const { graphicSpec, properties, fontAliases } = preparedTextGlyphInput(program, text, options.fonts);
  const canvas = options.createCanvas(1, 1), context = canvas?.getContext?.("2d");
  if (canvas?.width !== 1 || canvas?.height !== 1 || typeof context?.measureText !== "function") {
    throw new TypeError("Text ink measurement requires a compatible measuring Canvas surface.");
  }
  readPreparedFonts(graphicSpec, options.fonts);
  const bounds = measureConcreteTextInkBounds(properties, context, { fontAliases });
  readPreparedFonts(graphicSpec, options.fonts);
  return bounds;
}

export function measureConcreteTextInkBounds(properties, context, options = {}) {
  configureTextContext(context, properties, options);
  const angle = properties.rotation ?? 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const outline = properties.outline?.width ?? 0;
  const padding = outline / 2 * ((properties.lineJoin ?? "miter") === "miter" ? properties.miterLimit ?? 10 : 1);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const line of properties.lines ?? [{ text: properties.text, x: 0, y: 0 }]) {
    const metrics = context.measureText(line.text);
    const values = [metrics?.actualBoundingBoxLeft, metrics?.actualBoundingBoxRight,
      metrics?.actualBoundingBoxAscent, metrics?.actualBoundingBoxDescent];
    if (!values.every(Number.isFinite)) throw new TypeError("Text shadow requires finite actual glyph ink metrics from its prepared font.");
    const [l, r, a, d] = values;
    // Empty strings and whitespace do not create an outline rectangle.
    if (l + r <= 0 || a + d <= 0) continue;
    for (const x of [line.x - l - padding, line.x + r + padding]) {
      for (const y of [line.y - a - padding, line.y + d + padding]) {
        const px = properties.x + x * cos - y * sin, py = properties.y + x * sin + y * cos;
        if (!Number.isFinite(px) || !Number.isFinite(py)) throw new RangeError("Text ink bounds exceed finite coordinates.");
        left = Math.min(left, px); right = Math.max(right, px);
        top = Math.min(top, py); bottom = Math.max(bottom, py);
      }
    }
  }
  return left === Infinity ? undefined : Object.freeze({ left, right, top, bottom });
}
