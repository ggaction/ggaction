import { isPlainObject } from "../core/immutable.js";
import { drainStages, STAGE_ROWS } from "../core/stages.js";
import { encodeValue, invalidSnapshot } from "../core/valueEncoding.js";
export { encodeValue, invalidSnapshot } from "../core/valueEncoding.js";

export function encodeSharedValue(value) {
  const shared = { arrays: [], keys: new Map(), seen: new WeakMap() };
  const root = encodeValue(value, "payload", new WeakSet(), shared);
  return ["shared", shared.arrays, root];
}

export function decodeValue(value, path = "payload", references) {
  return drainStages(decodeValueStages(value, path, references));
}

const invalid = path => { throw invalidSnapshot(`Invalid encoded value at ${path}.`, path); };
const NONE = Symbol("pending container");
const childPath = (frame, segment) => frame.kind === "array" ? `${frame.path}[${segment}]`
  : frame.kind === "object" ? `${frame.path}.${segment}` : segment === undefined ? frame.path : `${frame.path}.arrays[${segment}]`;

// Decode in depth-first order with explicit container frames. Checks, error
// paths and reference visibility follow the recursive tagged format exactly.
export function* decodeValueStages(value, path = "payload", references) {
  const stack = [];
  let visited = 0;
  // Returns the decoded scalar, or NONE after pushing a container frame.
  const start = (node, nodePath, refs) => {
    if (node === null || typeof node === "string" || typeof node === "boolean") return node;
    if (typeof node === "number" && Number.isFinite(node) && !Object.is(node, -0)) return node;
    const at = () => typeof nodePath === "string" ? nodePath : childPath(...nodePath);
    if (!Array.isArray(node)) return invalid(at());
    const [tag, payload] = node;
    if (tag === "shared" && refs === undefined && node.length === 3 && Array.isArray(payload)) {
      stack.push({ kind: "shared", path: at(), node, payload, arrays: [], index: 0, root: false }); return NONE;
    }
    if (tag === "reference" && refs !== undefined && node.length === 2 &&
        Number.isInteger(payload) && payload >= 0 && payload < refs.length) return refs[payload];
    if (tag === "undefined" && node.length === 1) return undefined;
    if (node.length !== 2) return invalid(at());
    if (tag === "bigint" && typeof payload === "string" && /^(?:0|-?[1-9]\d*)$/.test(payload)) return BigInt(payload);
    if (tag === "number" && typeof payload === "string" && ["NaN", "Infinity", "-Infinity", "-0"].includes(payload)) {
      return payload === "-0" ? -0 : Number(payload);
    }
    if (tag === "array" && Array.isArray(payload)) {
      stack.push({ kind: "array", path: at(), payload, refs: refs ?? [], result: new Array(payload.length), index: 0 }); return NONE;
    }
    if (tag === "object" && Array.isArray(payload)) {
      stack.push({ kind: "object", path: at(), payload, refs: refs ?? [], result: {}, index: 0, key: undefined }); return NONE;
    }
    return invalid(at());
  };
  let output = start(value, path, references);
  while (true) {
    if (output !== NONE) {
      const frame = stack.at(-1);
      if (frame === undefined) return output;
      if (frame.kind === "array") frame.result[frame.index++] = output;
      else if (frame.kind === "object") {
        // Ordinary cells use a data assignment; inherited keys still require an
        // own definition so setters and read-only prototype properties cannot run.
        if (frame.key in Object.prototype) Object.defineProperty(frame.result, frame.key, {
          value: output, enumerable: true, writable: true, configurable: true
        });
        else frame.result[frame.key] = output;
        frame.index++;
      } else if (frame.root) { stack.pop(); continue; }
      else { frame.arrays.push(output); frame.index++; }
    }
    if (++visited % STAGE_ROWS === 0) yield;
    const frame = stack.at(-1);
    output = NONE;
    if (frame.kind === "array") {
      const { payload } = frame;
      // Encoded holes and absent payload cells both leave the decoded slot empty.
      while (frame.index < payload.length && (!(frame.index in payload) ||
          Array.isArray(payload[frame.index]) && payload[frame.index].length === 1 && payload[frame.index][0] === "hole")) frame.index++;
      if (frame.index === payload.length) { stack.pop(); output = frame.result; continue; }
      output = start(payload[frame.index], [frame, frame.index], frame.refs);
    } else if (frame.kind === "object") {
      if (frame.index === frame.payload.length) { stack.pop(); output = frame.result; continue; }
      const entry = frame.payload[frame.index];
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || Object.hasOwn(frame.result, entry[0])) invalid(frame.path);
      frame.key = entry[0];
      output = start(entry[1], [frame, entry[0]], frame.refs);
    } else if (frame.index < frame.payload.length) {
      const encoded = frame.payload[frame.index];
      if (!Array.isArray(encoded) || encoded[0] !== "array") invalid(frame.path);
      output = start(encoded, [frame, frame.index], frame.arrays);
    } else {
      frame.root = true;
      output = start(frame.node[2], [frame, undefined], frame.arrays);
    }
  }
}
