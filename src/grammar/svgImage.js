import { copyContentBytes } from "../core/contentDigest.js";

const NS = "http://www.w3.org/2000/svg";
const MAX_BYTES = 1024 * 1024, MAX_NODES = 10000, MAX_DEPTH = 128;
const SHAPES = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const GRADIENTS = new Set(["linearGradient", "radialGradient"]);
const COMMON = ["id", "fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "transform", "clip-path"];
const ATTRIBUTES = {
  svg: ["xmlns", "width", "height", "viewBox", "preserveAspectRatio", ...COMMON],
  g: COMMON, path: ["d", ...COMMON], rect: ["x", "y", "width", "height", "rx", "ry", ...COMMON],
  circle: ["cx", "cy", "r", ...COMMON], ellipse: ["cx", "cy", "rx", "ry", ...COMMON],
  line: ["x1", "y1", "x2", "y2", ...COMMON], polyline: ["points", ...COMMON], polygon: ["points", ...COMMON],
  defs: ["id"], clipPath: ["id", "clipPathUnits", "transform"],
  linearGradient: ["id", "x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform", "spreadMethod"],
  radialGradient: ["id", "cx", "cy", "r", "fx", "fy", "fr", "gradientUnits", "gradientTransform", "spreadMethod"],
  stop: ["offset", "stop-color", "stop-opacity"], title: [], desc: []
};
const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function invalid(reason) { throw new TypeError(`Unsafe or unsupported SVG image: ${reason}.`); }
function entities(value) {
  return value.replace(/&([^;]*);|&/g, (match, entity) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (Object.hasOwn(named, entity)) return named[entity];
    if (!/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(entity ?? "")) invalid("entity");
    const n = Number.parseInt(entity.slice(entity[1] === "x" ? 2 : 1), entity[1] === "x" ? 16 : 10);
    if (![9, 10, 13].includes(n) && !(n >= 32 && n <= 0xD7FF || n >= 0xE000 && n <= 0xFFFD || n >= 0x10000 && n <= 0x10FFFF)) invalid("character reference");
    return String.fromCodePoint(n);
  });
}
function parentAllows(parent, tag) {
  if (!parent) return tag === "svg";
  if (tag === "title" || tag === "desc") return parent === "svg" || parent === "g";
  if (parent === "svg" || parent === "g") return SHAPES.has(tag) || tag === "g" || tag === "defs";
  if (parent === "defs") return GRADIENTS.has(tag) || tag === "clipPath";
  if (parent === "clipPath") return SHAPES.has(tag) || tag === "g";
  return GRADIENTS.has(parent) && tag === "stop";
}
function attribute(name, value, tag, inClip, references) {
  if (name === "xmlns" && value !== NS) invalid("namespace");
  if (name === "id" && !NAME.test(value)) invalid("id");
  if (name === "clip-path" || name === "fill" || name === "stroke") {
    const ref = /^url\(#([A-Za-z_][A-Za-z0-9_.-]*)\)$/.exec(value);
    if (ref) {
      if (inClip) invalid("resource reference inside clip geometry");
      references.push({ id: ref[1], kind: name === "clip-path" ? "clipPath" : "gradient" });
    } else if (name === "clip-path" ? value !== "none" : !/^(?:none|transparent|[a-zA-Z]+|#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.,%+\-\s]+\))$/.test(value)) invalid("paint or clip reference");
  } else if (name === "stop-color" && !/^(?:transparent|[a-zA-Z]+|#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.,%+\-\s]+\))$/.test(value)) invalid("stop color");
  // No CSS declarations, escapes, URIs or markup can enter presentation values.
  if (name !== "xmlns" && /[<>\\;:]|(?:url|var|env)\s*\(/i.test(value) &&
    !/^(?:fill|stroke|clip-path)$/.test(name)) invalid("attribute value");
  if (tag !== "svg" && name === "xmlns") invalid("nested namespace");
}

// Private, deliberately closed static-image subset. Validate before any host decoder.
// Original bytes are retained; no DOM, CSS, scripts, font or external-resource loading.
export function validateSvgImage(input) {
  const bytes = copyContentBytes(input, MAX_BYTES);
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { invalid("UTF-8"); }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(source)) invalid("control character");
  let offset = 0, nodes = 0, rootSeen = false;
  const stack = [], ids = new Map(), references = [];
  const token = /([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/y;
  if (source.startsWith("<?xml")) {
    const declaration = /^<\?xml\s+version=(["'])1\.0\1(?:\s+encoding=(["'])UTF-8\2)?\s*\?>/i.exec(source);
    if (!declaration) invalid("XML declaration");
    offset = declaration[0].length;
  }
  while (offset < source.length) {
    if (source.startsWith("<!--", offset)) {
      const end = source.indexOf("-->", offset + 4);
      if (end < 0 || (source.slice(offset + 4, end).includes("--") || source.slice(offset + 4, end).endsWith("-"))) invalid("comment");
      offset = end + 3; continue;
    }
    if (source[offset] !== "<") {
      const next = source.indexOf("<", offset), end = next < 0 ? source.length : next;
      const text = entities(source.slice(offset, end));
      if (text.trim() && !["title", "desc"].includes(stack.at(-1))) invalid("text content");
      if (source.slice(offset, end).includes("]]>")) invalid("CDATA delimiter");
      offset = end; continue;
    }
    const opening = /^<(\/?)([A-Za-z][A-Za-z0-9]*)/.exec(source.slice(offset));
    if (!opening) invalid("markup declaration or qualified element");
    const [, closing, tag] = opening;
    offset += opening[0].length;
    if (closing) {
      const end = /^\s*>/.exec(source.slice(offset));
      if (!end || stack.pop() !== tag) invalid("closing tag");
      offset += end[0].length; continue;
    }
    if (!Object.hasOwn(ATTRIBUTES, tag) || !parentAllows(stack.at(-1), tag)) invalid("element or parent");
    if (!stack.length) { if (rootSeen) invalid("multiple roots"); rootSeen = true; }
    if (++nodes > MAX_NODES || stack.length >= MAX_DEPTH) invalid("node or depth budget");
    const seen = new Set();
    let selfClosing = false;
    while (true) {
      const whitespace = /^\s*/.exec(source.slice(offset))[0]; offset += whitespace.length;
      if (source.startsWith("/>", offset)) { offset += 2; selfClosing = true; break; }
      if (source[offset] === ">") { offset++; break; }
      if (!whitespace) invalid("attribute separator");
      token.lastIndex = offset; const match = token.exec(source);
      if (!match) invalid("attribute syntax");
      const name = match[1], value = entities(match[2] ?? match[3]);
      if (seen.has(name) || !ATTRIBUTES[tag].includes(name)) invalid("attribute allowlist or duplicate");
      seen.add(name); offset = token.lastIndex;
      attribute(name, value, tag, stack.includes("clipPath"), references);
      if (name === "id") { if (ids.has(value)) invalid("duplicate id"); ids.set(value, tag); }
    }
    if (tag === "svg" && !seen.has("xmlns")) invalid("missing SVG namespace");
    if (!selfClosing) stack.push(tag);
  }
  if (!rootSeen || stack.length) invalid("incomplete document");
  for (const ref of references) {
    const tag = ids.get(ref.id);
    if (ref.kind === "gradient" ? !GRADIENTS.has(tag) : tag !== "clipPath") invalid("unresolved or wrong-kind local reference");
  }
  return Object.freeze({ nodes, references: references.length });
}
