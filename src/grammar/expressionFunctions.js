import { parseIsoOffsetValue, parseTimeValue } from "./parseTime.js";
import { bucketTime, calendarParts, validateTimeZone } from "./timeUnit.js";
import { array, checkType, charge, EXPRESSION_LIMITS, limit, missing, numericResult, operand, record, scalar, valueType } from "./expressionValues.js";

const descriptors = [
  ...["abs", "sqrt", "log", "exp", "round", "floor", "ceil"].map(name => ({ name, min: 1, max: 1, inputs: ["number"], output: "number" })),
  ...["min", "max"].map(name => ({ name, min: 1, max: 64, inputs: ["number"], output: "number" })),
  { name: "pow", min: 2, max: 2, inputs: ["number"], output: "number" },
  { name: "toNumber", min: 1, max: 1, inputs: ["number", "string"], output: "number" },
  ...["sin", "cos", "tan", "atan2"].map(name => ({ name, min: name === "atan2" ? 2 : 1, max: name === "atan2" ? 2 : 1, inputs: ["number"], output: "number", options: "angle" })),
  ...["lower", "upper", "length"].map(name => ({ name, min: 1, max: 1, inputs: ["string"], output: name === "length" ? "number" : "string" })),
  { name: "substring", min: 3, max: 3, inputs: ["string"], output: "string" },
  { name: "replace", min: 3, max: 3, inputs: ["string"], output: "string" },
  { name: "concat", min: 1, max: 64, inputs: ["string"], output: "string" },
  ...["isNull", "isMissing", "isFinite"].map(name => ({ name, min: 1, max: 1, inputs: ["number", "string", "boolean", "array"], output: "boolean" })),
  { name: "coalesce", min: 2, max: 64, inputs: ["number", "string", "boolean"], output: "unknown", lazy: true },
  { name: "arrayLength", min: 1, max: 1, inputs: ["array"], output: "number" },
  { name: "at", min: 2, max: 2, inputs: ["array"], output: "unknown" },
  { name: "parseTime", min: 1, max: 1, inputs: ["string"], output: "number", options: "parse" },
  { name: "datePart", min: 1, max: 1, inputs: ["number"], output: "number", options: "part" },
  { name: "timeFloor", min: 1, max: 1, inputs: ["number"], output: "number", options: "floor" }
];

// Closed descriptors are shared by evaluation and read-only inspection.
export const EXPRESSION_FUNCTIONS = Object.freeze(descriptors.map(descriptor => Object.freeze({
  ...descriptor, inputs: Object.freeze(descriptor.inputs)
})));
const functions = new Map(EXPRESSION_FUNCTIONS.map(descriptor => [descriptor.name, descriptor]));
const formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "iso-offset"];
const parts = ["year", "quarter", "month", "day", "weekday", "hour", "minute", "second", "millisecond"];
const units = ["year", "quarter", "month", "week", "day", "hour", "minute", "second"];

export function functionDescriptor(name) {
  const descriptor = functions.get(name);
  if (descriptor === undefined) throw new TypeError("Unknown expression function.");
  return descriptor;
}

export function functionOptions(descriptor, options) {
  if (descriptor.options === undefined) {
    if (options !== undefined) throw new TypeError("Expression function does not accept options.");
    return undefined;
  }
  if (descriptor.options === "angle") {
    record(options, ["angleUnit"]);
    if (!["radians", "degrees"].includes(options.angleUnit)) throw new TypeError("Invalid angleUnit.");
  } else if (descriptor.options === "parse") {
    record(options, ["format"]);
    if (!formats.includes(options.format)) throw new TypeError("Invalid parseTime format.");
  } else {
    const key = descriptor.options === "part" ? "part" : "unit";
    record(options, [key, "timeZone"], key === "unit" ? ["weekStartsOn"] : []);
    if (!(key === "part" ? parts : units).includes(options[key])) throw new TypeError("Invalid calendar component.");
    if (typeof options.timeZone === "string") {
      limit(options.timeZone.length, EXPRESSION_LIMITS.string, "string");
      if (/^[+-]/.test(options.timeZone)) throw new TypeError("Calendar timeZone requires UTC or an IANA name.");
    }
    validateTimeZone(options.timeZone);
    if (options.unit === "week") {
      if (!Number.isInteger(options.weekStartsOn) || options.weekStartsOn < 0 || options.weekStartsOn > 6) throw new TypeError("Week requires weekStartsOn from 0 to 6.");
    } else if (Object.hasOwn(options, "weekStartsOn")) throw new TypeError("weekStartsOn requires week.");
  }
  return Object.freeze({ ...options });
}

export function functionArguments(descriptor, args) {
  if (!Array.isArray(args)) throw new TypeError("Expression args must be an array.");
  if (args.length < descriptor.min || args.length > descriptor.max) throw new TypeError("Invalid expression function arity.");
  array(args, EXPRESSION_LIMITS.args, "args");
}

export function functionTypes(descriptor, types, nodes) {
  types.forEach((type, index) => checkType(type,
    (descriptor.name === "substring" && index > 0) || (descriptor.name === "at" && index === 1)
      ? ["number"] : descriptor.inputs, descriptor.name));
  if (descriptor.name === "replace" && (!nodes.slice(1).every(node => node.type === "literal" && typeof node.value === "string") || nodes[1].value.length === 0)) {
    throw new TypeError("replace requires a nonempty literal search and a literal replacement.");
  }
}

function index(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Expression index must be a nonnegative safe integer.");
  return value;
}


function timeResult(name, value, options, state) {
  if (name === "parseTime") {
    const timestamp = options.format === "iso-offset" ? parseIsoOffsetValue(value) : parseTimeValue(value, options.format);
    return timestamp === null ? missing(state, "dateRange") : timestamp;
  }
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return missing(state, "dateRange");
  if (name === "datePart") {
    const result = calendarParts(timestamp, options.timeZone);
    const component = options.part === "quarter" ? Math.ceil(result.month / 3) : result[options.part];
    return Number.isFinite(component) ? component : missing(state, "dateRange");
  }
  try { return bucketTime(timestamp, options); }
  catch (error) {
    if (error instanceof RangeError) return missing(state, "dateRange");
    throw error;
  }
}

export function evaluateFunction(node, values, state) {
  const { name, options } = node;
  const descriptor = functionDescriptor(name);
  // Validate every executed operand before null propagation.
  values.forEach(value => operand(value, state));
  functionTypes(descriptor, values.map(valueType), node.args);
  const [a, b, c] = values;
  if (name === "isNull") return a === null;
  if (name === "isMissing") return a === undefined;
  if (name === "isFinite") return Number.isFinite(a);
  if (values.some(value => value === null || value === undefined)) return undefined;
  let result;
  if (["parseTime", "datePart", "timeFloor"].includes(name)) return timeResult(name, a, options, state);
  if (name === "arrayLength") return a.length;
  if (name === "at") {
    index(b);
    if (b >= a.length) return missing(state, "arrayBounds");
    return operand(scalar(Object.hasOwn(a, b) ? a[b] : undefined), state);
  }
  if (name === "lower") result = a.toLowerCase();
  else if (name === "upper") result = a.toUpperCase();
  else if (name === "length") return Array.from(a).length;
  else if (name === "substring") {
    index(b); index(c);
    const points = Array.from(a);
    if (b > c || c > points.length) throw new RangeError("Invalid substring range.");
    result = points.slice(b, c).join("");
  } else if (name === "replace") {
    const position = a.indexOf(b);
    const size = position < 0 ? a.length : a.length - b.length + c.length;
    limit(size, EXPRESSION_LIMITS.string, "string");
    result = position < 0 ? a : a.slice(0, position) + c + a.slice(position + b.length);
  } else if (name === "concat") {
    limit(values.reduce((size, value) => size + value.length, 0), EXPRESSION_LIMITS.string, "string");
    result = values.join("");
  } else if (name === "toNumber") {
    if (typeof a === "number") return a;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(a.trim())) throw new TypeError("toNumber requires a decimal string.");
    return numericResult(Number(a.trim()), state);
  } else if (["sin", "cos", "tan"].includes(name)) {
    result = Math[name](options.angleUnit === "degrees" ? a * (Math.PI / 180) : a);
  } else if (name === "atan2") {
    result = Math.atan2(a, b) * (options.angleUnit === "degrees" ? 180 / Math.PI : 1);
  } else {
    if ((name === "sqrt" && a < 0) || (name === "log" && a <= 0)) return missing(state, "domain");
    result = Math[name](...values);
    if (Number.isNaN(result)) return missing(state, "domain");
  }
  if (typeof result === "string") {
    scalar(result);
    charge(state, result.length);
    return result;
  }
  return numericResult(result, state);
}
