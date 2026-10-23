import { DOMParser } from "@xmldom/xmldom";
import assert from "node:assert/strict";

const NUMERIC_ATTRIBUTES = new Set([
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "width", "height", "font-size", "opacity", "fill-opacity", "stroke-opacity",
  "stroke-width", "stroke-dasharray", "offset", "viewBox", "transform", "d",
  "points"
]);

const NUMBER = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g;
function numericList(value, label) {
  const tokens = value.match(NUMBER) ?? [];
  assert.equal(tokens.join(""), value.replace(/[\s,]+/g, ""), `${label} has invalid numeric syntax`);
  const values = tokens.map(Number);
  assert.ok(values.every(Number.isFinite), `${label} has nonfinite numbers`);
  return values;
}
function validatePath(value, label) {
  if (!value.trim()) return; // SVG permits an empty path; visibility is a separate contract.
  const tokens = value.match(/[A-Za-z]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  assert.equal(tokens.join(""), value.replace(/[\s,]+/g, ""), label);
  assert.match(tokens[0] ?? "", /^[Mm]$/, label);
  const arities = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index++].toUpperCase();
    assert.ok(Object.hasOwn(arities, command), `${label} has unknown path command`);
    const arity = arities[command];
    if (arity === 0) continue;
    let groups = 0;
    while (index < tokens.length && !/^[A-Za-z]$/.test(tokens[index])) {
      const values = tokens.slice(index, index + arity).map(Number);
      assert.ok(values.length === arity && values.every(Number.isFinite), `${label} has incomplete path coordinates`);
      if (command === "A") assert.ok(values[0] >= 0 && values[1] >= 0 && [0, 1].includes(values[3]) && [0, 1].includes(values[4]), `${label} has invalid arc values`);
      index += arity;
      groups++;
    }
    assert.ok(groups > 0, `${label} path command requires coordinates`);
  }
}
function validateTransform(value, label) {
  const matches = [...value.matchAll(/([A-Za-z]+)\s*\(([^()]*)\)/g)];
  assert.equal(matches.map(match => match[0]).join("").replace(/\s/g, ""), value.replace(/[\s,]+(?=[A-Za-z]|$)/g, "").replace(/\s/g, ""), label);
  const counts = { matrix: [6], translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1], skewY: [1] };
  for (const [, name, args] of matches) assert.ok(counts[name]?.includes(numericList(args, label).length), `${label} has invalid transform arguments`);
}

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
      if (name === "d") validatePath(value, label);
      if (name === "transform") validateTransform(value, label);
      if (name === "viewBox") {
        const box = numericList(value, label);
        assert.ok(box.length === 4 && box[2] >= 0 && box[3] >= 0, label);
      }
      if (name === "points") assert.equal(numericList(value, label).length % 2, 0, label);
      if (name === "stroke-dasharray" && value !== "none") {
        const values = value.trim().split(/[\s,]+/);
        assert.ok(values.length > 0 && values.every(token => scalar.test(token) && Number.parseFloat(token) >= 0 && Number.isFinite(Number.parseFloat(token))), label);
      }
      if (!["viewBox", "transform", "d", "points", "stroke-dasharray"].includes(name)) {
        assert.match(value.trim(), scalar, `${label} has an invalid ${name} attribute.`);
        assert.ok(Number.isFinite(Number.parseFloat(value)), `${label} has a nonfinite ${name}.`);
      }
    }
  }
  for (const reference of references) assert.ok(ids.has(reference), `${label} has a dangling SVG resource or href.`);
}
