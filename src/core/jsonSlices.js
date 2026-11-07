import { STAGE_ROWS } from "./stages.js";

// Parse one JSON text in resumable pieces. Every value text of at most
// `chunk` characters, every string and every primitive token is parsed by the
// host JSON.parse; only the separators between pieces of a larger array or
// object are read here, with the exact JSON whitespace and punctuation rules.
// The result and the accept/reject decision equal JSON.parse(text).
export const JSON_SLICE_CHARS = 1 << 16;
const SPACE = new Set([0x20, 0x09, 0x0a, 0x0d]);
const fail = () => { throw new SyntaxError("Invalid JSON text."); };

function skip(text, index) {
  while (index < text.length && SPACE.has(text.charCodeAt(index))) index++;
  return index;
}
function stringEnd(text, index) {
  for (let at = index + 1; at < text.length; at++) {
    const code = text.charCodeAt(at);
    if (code === 0x5c) at++;
    else if (code === 0x22) return at + 1;
  }
  return fail();
}
// The end of a container no longer than `limit`, or -1 when it is longer.
function containerEnd(text, index, limit) {
  let depth = 0;
  const last = Math.min(text.length, index + limit);
  for (let at = index; at < last; at++) {
    const code = text.charCodeAt(at);
    if (code === 0x22) { at = stringEnd(text, at) - 1; continue; }
    if (code === 0x5b || code === 0x7b) depth++;
    else if ((code === 0x5d || code === 0x7d) && --depth === 0) return at + 1;
  }
  return last === text.length && last - index < limit ? fail() : -1;
}
function tokenEnd(text, index) {
  let at = index;
  while (at < text.length) {
    const code = text.charCodeAt(at);
    if (code === 0x2c || code === 0x5d || code === 0x7d || SPACE.has(code)) break;
    at++;
  }
  return at;
}
function assign(object, key, value) {
  // JSON.parse defines every member as an own data property.
  if (key === "__proto__") Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
  else object[key] = value;
}

export function* parseJSONStages(text, chunk = JSON_SLICE_CHARS) {
  if (typeof text !== "string") fail();
  if (text.length <= chunk) return JSON.parse(text);
  const stack = [];
  let index = skip(text, 0), pieces = 0, mark = 0, output, ready = false;
  const startValue = () => {
    const code = text.charCodeAt(index);
    if (code === 0x5b || code === 0x7b) {
      const end = containerEnd(text, index, chunk + 1);
      if (end !== -1) { output = JSON.parse(text.slice(index, end)); index = end; ready = true; return; }
      const array = code === 0x5b;
      stack.push({ array, result: array ? [] : {}, key: undefined });
      index = skip(text, index + 1);
      const close = array ? 0x5d : 0x7d;
      if (text.charCodeAt(index) === close) { index++; output = stack.pop().result; ready = true; return; }
      if (!array) readKey();
      return;
    }
    const end = code === 0x22 ? stringEnd(text, index) : tokenEnd(text, index);
    if (end === index) fail();
    output = JSON.parse(text.slice(index, end)); index = end; ready = true;
  };
  const readKey = () => {
    if (text.charCodeAt(index) !== 0x22) fail();
    const end = stringEnd(text, index);
    stack.at(-1).key = JSON.parse(text.slice(index, end));
    index = skip(text, end);
    if (text.charCodeAt(index) !== 0x3a) fail();
    index = skip(text, index + 1);
  };
  if (index === text.length) fail();
  startValue();
  while (true) {
    // Yield after a bounded number of pieces or characters, whichever comes first.
    if (++pieces % STAGE_ROWS === 0 || index - mark > 4 * chunk) { mark = index; yield; }
    if (!ready) { if (index >= text.length) fail(); startValue(); continue; }
    const frame = stack.at(-1);
    if (frame === undefined) {
      if (skip(text, index) !== text.length) fail();
      return output;
    }
    ready = false;
    if (frame.array) frame.result.push(output); else assign(frame.result, frame.key, output);
    index = skip(text, index);
    const code = text.charCodeAt(index);
    if (code === 0x2c) {
      index = skip(text, index + 1);
      if (!frame.array) readKey();
    } else if (code === (frame.array ? 0x5d : 0x7d)) {
      index++; stack.pop(); output = frame.result; ready = true;
    } else fail();
  }
}
