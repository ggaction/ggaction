import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";

const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0;

// Pure concrete placement; domain actions will explicitly invoke this owner.
export function imagePlacement(image, viewport, options = {}) {
  ownRecord(image, "Image dimensions");
  ownRecord(viewport, "Image viewport");
  ownRecord(options, "Image placement options");
  for (const [record, keys] of [[image, ["width", "height"]], [viewport, ["x", "y", "width", "height"]], [options, ["fit", "align"]]]) {
    if (Object.keys(record).some(key => !keys.includes(key))) throw new TypeError("Image placement contains unsupported properties.");
  }
  if (![image.width, image.height, viewport.width, viewport.height].every(positive) ||
      ![viewport.x, viewport.y].every(value => typeof value === "number" && Number.isFinite(value))) {
    throw new TypeError("Image dimensions and viewport must be finite with positive sizes.");
  }
  const fit = options.fit === undefined ? "contain" : options.fit, align = options.align === undefined ? [0.5, 0.5] : options.align;
  if (!["contain", "cover", "fill"].includes(fit)) throw new TypeError("Image fit must be contain, cover, or fill.");
  ownArray(align, "Image alignment");
  if (align.length !== 2 || align.some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new TypeError("Image alignment requires two numbers in [0, 1].");
  }
  const factor = fit === "contain" ? Math.min(viewport.width / image.width, viewport.height / image.height)
    : Math.max(viewport.width / image.width, viewport.height / image.height);
  const width = fit === "fill" ? viewport.width : image.width * factor;
  const height = fit === "fill" ? viewport.height : image.height * factor;
  const x = viewport.x + (viewport.width - width) * align[0];
  const y = viewport.y + (viewport.height - height) * align[1];
  if (![width, height].every(positive) || ![x, y, x + width, y + height, viewport.x + viewport.width, viewport.y + viewport.height].every(Number.isFinite)) {
    throw new RangeError("Image placement exceeds finite geometry limits.");
  }
  return cloneAndFreeze({ x, y, width, height, clip: viewport, fit, align });
}
