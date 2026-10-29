import { bindTextFontProperties } from "./textFont.js";
import { requestedStrokeDetails } from "../grammar/strokeStyle.js";
import { resolveTextLines } from "../core/textMetrics.js";

export function concreteTextItem(program, config, position, text, { offsets = true } = {}) {
  const x = position.x;
  const y = position.y;
  if (text === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  const lines = resolveTextLines(text, config);
  return {
    type: "text",
    properties: bindTextFontProperties(program, {
      x: x + (offsets ? config.dx : 0),
      y: y + (offsets ? config.dy : 0),
      text,
      ...requestedStrokeDetails(config),
      ...(lines === undefined ? {} : { lines }),
      fill: config.fill,
      opacity: config.opacity,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: config.align,
      textBaseline: config.baseline,
      rotation: config.rotation
    })
  };
}

