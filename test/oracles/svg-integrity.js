import { DOMParser } from "@xmldom/xmldom";
import assert from "node:assert/strict";

const NUMERIC_ATTRIBUTES = new Set([
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "width", "height", "font-size", "opacity", "fill-opacity", "stroke-opacity",
  "stroke-width", "stroke-dasharray", "offset", "viewBox", "transform", "d",
  "points"
]);

export function assertSvgIntegrity(svg, label = "SVG") {
  assert.match(svg, /^<svg\b/u, label);
  const document = new DOMParser({ onError: (_level, message) => {
    throw new Error(`${label}: ${message}`);
  } }).parseFromString(svg, "image/svg+xml");
  assert.equal(document.documentElement?.localName, "svg", label);
  const ids = new Set();
  const references = [];
  const scalar = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:%|px|em|ex|pt|pc|cm|mm|in)?$/;
  for (const element of Array.from(document.getElementsByTagName("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      const { name, value } = attribute;
      if (name === "id") {
        assert.ok(!ids.has(value), `${label} repeats an SVG id.`);
        ids.add(value);
      }
      for (const match of value.matchAll(/url\(#([^\)]+)\)/gu)) references.push(match[1]);
      if (["href", "xlink:href"].includes(name) && value.startsWith("#")) references.push(value.slice(1));
      if (!NUMERIC_ATTRIBUTES.has(name)) continue;
      assert.doesNotMatch(value, /(?:NaN|[+-]?Infinity|undefined)/u, `${label} has an invalid ${name} attribute.`);
      if (!["viewBox", "transform", "d", "points", "stroke-dasharray"].includes(name)) {
        assert.match(value.trim(), scalar, `${label} has an invalid ${name} attribute.`);
        assert.ok(Number.isFinite(Number.parseFloat(value)), `${label} has a nonfinite ${name}.`);
      }
    }
  }
  for (const reference of references) assert.ok(ids.has(reference), `${label} has a dangling SVG resource or href.`);
}
