export const RECT_MODES = Object.freeze({
  discrete: "discrete",
  ranged: "ranged",
  xSpan: "x-span",
  ySpan: "y-span"
});

function categorical(encoding) {
  return ["nominal", "ordinal"].includes(encoding?.fieldType) &&
    encoding.scale !== undefined;
}

function ranged(primary, secondary) {
  return primary?.scale !== undefined &&
    secondary?.scale === primary.scale &&
    ["quantitative", "temporal"].includes(primary.fieldType) &&
    secondary.fieldType === primary.fieldType;
}

export function resolveRectMode(layer) {
  if (layer?.mark?.type !== "rect") return undefined;
  const { x, y, x2, y2 } = layer.encoding ?? {};
  if (x2 === undefined && y2 === undefined && categorical(x) && categorical(y)) {
    return RECT_MODES.discrete;
  }
  if (ranged(x, x2) && ranged(y, y2)) return RECT_MODES.ranged;
  if (ranged(x, x2) && y === undefined && y2 === undefined) return RECT_MODES.xSpan;
  if (ranged(y, y2) && x === undefined && x2 === undefined) return RECT_MODES.ySpan;
  return undefined;
}

export function rectUsesFields(layer) {
  return ["x", "y", "x2", "y2", "color"].some(channel => Object.hasOwn(layer.encoding?.[channel] ?? {}, "field"));
}
