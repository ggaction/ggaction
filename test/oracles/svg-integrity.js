import assert from "node:assert/strict";

const NUMERIC_ATTRIBUTES = new Set([
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "width", "height", "font-size", "opacity", "fill-opacity", "stroke-opacity",
  "stroke-width", "stroke-dasharray", "offset", "viewBox", "transform", "d",
  "points"
]);

export function assertSvgIntegrity(svg, label = "SVG") {
  assert.match(svg, /^<svg\b/u, label);
  assert.match(svg, /<\/svg>$/u, `${label} must close its SVG root.`);
  // User-authored text and ids may legitimately spell these tokens. Restrict
  // this check to attributes that encode numeric geometry or transforms.
  for (const match of svg.matchAll(/\s([\w:-]+)="([^"]*)"/gu)) {
    if (!NUMERIC_ATTRIBUTES.has(match[1])) continue;
    assert.doesNotMatch(
      match[2],
      /(?:NaN|[+-]?Infinity|undefined)/u,
      `${label} has an invalid ${match[1]} attribute.`
    );
  }
  const ids = [...svg.matchAll(/\bid="([^"]+)"/gu)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${label} repeats an SVG id.`);
  for (const match of svg.matchAll(/url\(#([^\)]+)\)/gu)) {
    assert.equal(ids.includes(match[1]), true, `${label} has a dangling SVG resource.`);
  }
  for (const match of svg.matchAll(/\b(?:href|xlink:href)="#([^"]+)"/gu)) {
    assert.equal(ids.includes(match[1]), true, `${label} has a dangling SVG href.`);
  }
}
