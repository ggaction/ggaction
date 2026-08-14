function codePointWidth(codePoint) {
  if (/\s/u.test(codePoint)) return 0.28;
  if (/[iIl.,:;!'|]/u.test(codePoint)) return 0.27;
  if (/[mwMW@#%&]/u.test(codePoint)) return 0.82;
  if (/[A-Z0-9]/u.test(codePoint)) return 0.61;
  if (/[-_]/u.test(codePoint)) return 0.34;
  if (codePoint.codePointAt(0) > 0x7f) return 1;
  return 0.47;
}

export function formatVisibleText(value) {
  return String(value) || "(empty)";
}

export function textBoundsIntersect(first, second) {
  return first.left < second.right && first.right > second.left &&
    first.top < second.bottom && first.bottom > second.top;
}

export function textBoundsFitCanvas(bounds, canvas) {
  const epsilon = 1e-9;
  return bounds.left >= -epsilon && bounds.right <= canvas.width + epsilon &&
    bounds.top >= -epsilon && bounds.bottom <= canvas.height + epsilon;
}

export function measureTextWidth(
  text,
  { fontSize, fontFamily, fontWeight } = {}
) {
  if (typeof text !== "string") {
    throw new TypeError("Text measurement requires a string.");
  }
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    throw new RangeError("Text measurement requires a positive fontSize.");
  }
  let joined = false;
  let width = 0;
  for (const codePoint of text) {
    if (codePoint === "\u200d") {
      joined = true;
    } else if (!/\p{Mark}|\p{Format}|\p{Emoji_Modifier}/u.test(codePoint)) {
      if (joined) joined = false;
      else width += codePointWidth(codePoint) * fontSize;
    }
  }
  const family = typeof fontFamily === "string" ? fontFamily.toLowerCase() : "";
  const familyFactor = /mono/u.test(family)
    ? 1.08
    : /serif/u.test(family) && !/sans-serif/u.test(family) ? 1.03 : 1;
  const weight = Number(fontWeight);
  width *= familyFactor * ((
    Number.isFinite(weight)
      ? weight >= 600
      : /bold|black|heavy/iu.test(fontWeight ?? "")
  ) ? 1.04 : 1);
  if (!Number.isFinite(width)) {
    throw new RangeError("Text measurement exceeds the finite numeric range.");
  }
  return width;
}

export function requireFiniteBounds(bounds, label = "Graphic") {
  if (bounds !== undefined && !Object.values(bounds).every(Number.isFinite)) {
    throw new RangeError(`${label} bounds exceed the finite numeric range.`);
  }
  return bounds;
}

export function resolveTextBounds({
  x,
  y,
  text,
  fontSize,
  fontFamily,
  fontWeight,
  textAlign = "left",
  textBaseline = "alphabetic",
  rotation = 0
} = {}) {
  if (![x, y, rotation].every(Number.isFinite)) {
    throw new TypeError("Text bounds require finite x, y, and rotation values.");
  }
  const width = measureTextWidth(text, { fontSize, fontFamily, fontWeight });
  const [left, right] = textAlign === "center"
    ? [-width / 2, width / 2]
    : ["right", "end"].includes(textAlign) ? [-width, 0] : [0, width];
  const [top, bottom] = textBaseline === "middle"
    ? [-fontSize / 2, fontSize / 2]
    : ["top", "hanging"].includes(textBaseline)
      ? [0, fontSize]
      : ["bottom", "ideographic"].includes(textBaseline)
        ? [-fontSize, 0]
        : [-fontSize * 0.8, fontSize * 0.2];
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const bounds = {
    left: x + Math.min(left * cosine, right * cosine) -
      Math.max(top * sine, bottom * sine),
    right: x + Math.max(left * cosine, right * cosine) -
      Math.min(top * sine, bottom * sine),
    top: y + Math.min(left * sine, right * sine) +
      Math.min(top * cosine, bottom * cosine),
    bottom: y + Math.max(left * sine, right * sine) +
      Math.max(top * cosine, bottom * cosine)
  };
  return Object.freeze(requireFiniteBounds(bounds, "Text"));
}
