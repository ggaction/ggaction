import {parseTimeValue,validateParseTimeFormat} from "./parseTime.js";
import { rejectUnknownProperties as rejectUnknownKeys } from "../core/validation.js";
import { requireStringValue as requireField } from "../core/validation.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const TRANSFORM_KEYS = Object.freeze(["type", "as", "expression"]);
const ARITHMETIC_BINARY = new Set(["add", "subtract", "multiply", "divide"]);
const COMPARISONS = new Set(["eq", "neq", "lt", "lte", "gt", "gte"]);
const NUMERIC_UNARY = new Set(["negate", "absolute", "log", "sqrt"]);
const BOOLEAN_UNARY = new Set(["not", "isNull"]);
const LOGICAL = new Set(["and", "or"]);
const VARIADIC = new Set(["coalesce", "concat"]);
const RESERVED_PATH_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_DEPTH = 16;
const MAX_NODES = 128;
const MAX_WORK = 10_000_000;



function validateConstant(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (!Number.isFinite(value)) {
    throw new TypeError(
      "Computed expression constant must be a finite number, string, boolean, or null."
    );
  }
}

function requireNode(expression, key, operation) {
  if (!Object.hasOwn(expression, key)) {
    const article = key === "operand" ? "an" : "a";
    throw new TypeError(`Computed ${operation} requires ${article} ${key} expression.`);
  }
}

function validateOperands(expression, minimum) {
  rejectUnknownKeys(expression, ["op", "operands"], "computed variadic expression");
  if (!Array.isArray(expression.operands) || expression.operands.length < minimum) {
    throw new TypeError(
      `Computed ${expression.op} requires at least ${minimum} operand expressions.`
    );
  }
}

function inspectExpression(expression, depth, state, optionalPathRoot = false) {
  if (!isPlainObject(expression)) {
    throw new TypeError("Computed expression nodes must be plain objects.");
  }
  if (state.ancestors.has(expression)) {
    throw new RangeError("Computed expression cannot contain cycles.");
  }
  state.nodes += 1;
  if (state.nodes > MAX_NODES) {
    throw new RangeError(`Computed expression cannot exceed ${MAX_NODES} nodes.`);
  }
  if (depth > MAX_DEPTH) {
    throw new RangeError(`Computed expression cannot exceed depth ${MAX_DEPTH}.`);
  }
  state.ancestors.add(expression);
  try {
    const kinds = ["field", "constant", "op"].filter(key => Object.hasOwn(expression, key));
    if (kinds.length !== 1) {
      throw new Error("Computed expression requires exactly one of field, constant, or op.");
    }
    if (kinds[0] === "field") {
      rejectUnknownKeys(expression, ["field"], "computed field expression");
      const field = requireField(expression.field, "Computed expression field");
      state.fields.add(field);
      if (!optionalPathRoot) state.requiredFields.add(field);
      return;
    }
    if (kinds[0] === "constant") {
      rejectUnknownKeys(expression, ["constant"], "computed constant expression");
      validateConstant(expression.constant);
      return;
    }
    if (ARITHMETIC_BINARY.has(expression.op) || COMPARISONS.has(expression.op)) {
      rejectUnknownKeys(expression, ["op", "left", "right"], "computed binary expression");
      requireNode(expression, "left", expression.op);
      requireNode(expression, "right", expression.op);
      inspectExpression(expression.left, depth + 1, state);
      inspectExpression(expression.right, depth + 1, state);
      return;
    }
    if (expression.op === "getPath") {
      rejectUnknownKeys(expression, ["op", "operand", "path"], "computed path expression");
      if (!isPlainObject(expression.operand) ||
          Object.keys(expression.operand).length !== 1 ||
          !Object.hasOwn(expression.operand, "field")) {
        throw new TypeError("Computed getPath operand must be a literal field reference.");
      }
      if (!Array.isArray(expression.path) || expression.path.length < 1 ||
          expression.path.length > 8 || !Array.from(expression.path).every(key =>
            typeof key === "string" && key.length > 0 && !RESERVED_PATH_KEYS.has(key))) {
        throw new TypeError("Computed getPath path must contain 1 to 8 nonempty, nonreserved string keys.");
      }
      inspectExpression(expression.operand, depth + 1, state, true);
      return;
    }
    if (expression.op === "replaceLiteral") {
      rejectUnknownKeys(expression, ["op", "operand", "search", "replacement"], "computed literal replacement");
      requireNode(expression, "operand", expression.op);
      if (typeof expression.search !== "string" || expression.search.length === 0 ||
          typeof expression.replacement !== "string") {
        throw new TypeError("Computed replaceLiteral requires a nonempty string search and string replacement.");
      }
      inspectExpression(expression.operand, depth + 1, state);
      return;
    }
    if (expression.op === "parseTime") {
      rejectUnknownKeys(expression, ["op", "operand", "format"], "computed time expression");
      requireNode(expression, "operand", expression.op);
      validateParseTimeFormat(expression.format);
      inspectExpression(expression.operand, depth + 1, state);
      return;
    }
    if (NUMERIC_UNARY.has(expression.op) || BOOLEAN_UNARY.has(expression.op) || expression.op === "toNumber") {
      rejectUnknownKeys(expression, ["op", "operand"], "computed unary expression");
      requireNode(expression, "operand", expression.op);
      inspectExpression(expression.operand, depth + 1, state);
      return;
    }
    if (LOGICAL.has(expression.op)) {
      validateOperands(expression, 2);
      expression.operands.forEach(operand => inspectExpression(operand, depth + 1, state));
      return;
    }
    if (VARIADIC.has(expression.op)) {
      validateOperands(expression, expression.op === "concat" ? 1 : 2);
      expression.operands.forEach(operand => inspectExpression(operand, depth + 1, state));
      return;
    }
    if (expression.op === "if") {
      rejectUnknownKeys(
        expression,
        ["op", "condition", "then", "else"],
        "computed conditional expression"
      );
      for (const key of ["condition", "then", "else"]) {
        requireNode(expression, key, expression.op);
        inspectExpression(expression[key], depth + 1, state);
      }
      return;
    }
    throw new Error(`Unsupported computed operation "${expression.op}".`);
  } finally {
    state.ancestors.delete(expression);
  }
}

function inspectComputedTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Computed transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "computed transform");
  if (transform.type !== "computed") {
    throw new Error(`Unsupported computed transform "${transform.type}".`);
  }
  requireField(transform.as, "Computed output field");
  const state = { nodes: 0, fields: new Set(), requiredFields: new Set(), ancestors: new WeakSet() };
  inspectExpression(transform.expression, 1, state);
  return state;
}

function normalizeExpression(expression) {
  if (!isPlainObject(expression)) return expression;
  if (Object.hasOwn(expression, "left") || Object.hasOwn(expression, "right")) {
    return {
      ...expression,
      left: normalizeExpression(expression.left),
      right: normalizeExpression(expression.right)
    };
  }
  if (Object.hasOwn(expression, "operand")) {
    return { ...expression, operand: normalizeExpression(expression.operand) };
  }
  if (Array.isArray(expression.operands)) {
    return { ...expression, operands: expression.operands.map(normalizeExpression) };
  }
  if (expression.op === "if") {
    return {
      ...expression,
      condition: normalizeExpression(expression.condition),
      then: normalizeExpression(expression.then),
      else: normalizeExpression(expression.else)
    };
  }
  return { ...expression };
}

export function normalizeComputedTransform({ as, expression } = {}) {
  const requested = { type: "computed", as, expression };
  inspectComputedTransform(requested);
  return cloneAndFreeze({
    ...requested,
    expression: normalizeExpression(expression)
  });
}

export function validateComputedTransform(transform) {
  return inspectComputedTransform(transform).nodes;
}

function scalar(value, label, rowIndex) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
  } else if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  throw new TypeError(`${label} must contain a scalar value at row ${rowIndex}.`);
}

function number(value, operation, rowIndex) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Computed ${operation} requires finite numbers at row ${rowIndex}.`);
  }
  return value;
}

function boolean(value, operation, rowIndex) {
  if (typeof value !== "boolean") {
    throw new TypeError(`Computed ${operation} requires booleans at row ${rowIndex}.`);
  }
  return value;
}

function compareStrings(left, right) {
  const a = Array.from(left, character => character.codePointAt(0));
  const b = Array.from(right, character => character.codePointAt(0));
  const count = Math.min(a.length, b.length);
  for (let index = 0; index < count; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function compare(left, right, operation, rowIndex) {
  if (left === null || right === null) {
    if (operation === "eq") return left === right;
    if (operation === "neq") return left !== right;
    throw new TypeError(`Computed ${operation} cannot order null at row ${rowIndex}.`);
  }
  if (typeof left !== typeof right) {
    throw new TypeError(
      `Computed ${operation} requires matching primitive types at row ${rowIndex}.`
    );
  }
  if (operation === "eq") return left === right;
  if (operation === "neq") return left !== right;
  let order;
  if (typeof left === "string") order = compareStrings(left, right);
  else if (typeof left === "number") order = left === right ? 0 : left < right ? -1 : 1;
  else if (typeof left === "boolean") order = left === right ? 0 : left ? 1 : -1;
  else throw new TypeError(`Computed ${operation} cannot order values at row ${rowIndex}.`);
  return operation === "lt" ? order < 0
    : operation === "lte" ? order <= 0
      : operation === "gt" ? order > 0
        : order >= 0;
}

function ownDataProperty(record, key, rowIndex) {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!Object.hasOwn(descriptor, "value")) {
    throw new TypeError(`Computed getPath cannot read an accessor at row ${rowIndex}.`);
  }
  return descriptor.value;
}

function nestedScalar(expression, row, rowIndex) {
  let value = ownDataProperty(row, expression.operand.field, rowIndex);
  for (const key of expression.path) {
    if (value === undefined || value === null) return null;
    if (!isPlainObject(value)) {
      throw new TypeError(`Computed getPath requires plain records at row ${rowIndex}.`);
    }
    value = ownDataProperty(value, key, rowIndex);
  }
  return scalar(value, "Computed getPath result", rowIndex);
}

function evaluate(expression, row, rowIndex) {
  if (Object.hasOwn(expression, "field")) {
    return scalar(
      row[expression.field],
      `Computed field "${expression.field}"`,
      rowIndex
    );
  }
  if (Object.hasOwn(expression, "constant")) return expression.constant;
  const operation = expression.op;
  if (operation === "getPath") return nestedScalar(expression, row, rowIndex);
  if (operation === "replaceLiteral") {
    const value = evaluate(expression.operand, row, rowIndex);
    if (typeof value !== "string") {
      throw new TypeError(`Computed replaceLiteral requires a string at row ${rowIndex}.`);
    }
    const index = value.indexOf(expression.search);
    return index < 0 ? value
      : value.slice(0, index) + expression.replacement + value.slice(index + expression.search.length);
  }
  if (operation === "if") {
    return boolean(evaluate(expression.condition, row, rowIndex), operation, rowIndex)
      ? evaluate(expression.then, row, rowIndex)
      : evaluate(expression.else, row, rowIndex);
  }
  if (operation === "and") {
    for (const operand of expression.operands) {
      if (!boolean(evaluate(operand, row, rowIndex), operation, rowIndex)) return false;
    }
    return true;
  }
  if (operation === "or") {
    for (const operand of expression.operands) {
      if (boolean(evaluate(operand, row, rowIndex), operation, rowIndex)) return true;
    }
    return false;
  }
  if (operation === "coalesce") {
    for (const operand of expression.operands) {
      const value = evaluate(operand, row, rowIndex);
      if (value !== null) return value;
    }
    return null;
  }
  if (operation === "concat") {
    return expression.operands.map(operand => {
      const value = evaluate(operand, row, rowIndex);
      if (typeof value !== "string") {
        throw new TypeError(`Computed concat requires strings at row ${rowIndex}.`);
      }
      return value;
    }).join("");
  }
  if (BOOLEAN_UNARY.has(operation)) {
    const value = evaluate(expression.operand, row, rowIndex);
    return operation === "isNull"
      ? value === null
      : !boolean(value, operation, rowIndex);
  }
  if (operation === "parseTime") {
    return parseTimeValue(evaluate(expression.operand, row, rowIndex), expression.format);
  }
  if (operation === "toNumber") {
    const value = evaluate(expression.operand, row, rowIndex);
    if (typeof value === "number") return number(value, operation, rowIndex);
    if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) {
      throw new TypeError(`Computed toNumber requires a finite number or decimal string at row ${rowIndex}.`);
    }
    return number(Number(value.trim()), operation, rowIndex);
  }
  if (NUMERIC_UNARY.has(operation)) {
    const value = number(evaluate(expression.operand, row, rowIndex), operation, rowIndex);
    if (operation === "log" && value <= 0) {
      throw new RangeError(`Computed log requires a positive value at row ${rowIndex}.`);
    }
    if (operation === "sqrt" && value < 0) {
      throw new RangeError(`Computed sqrt requires a non-negative value at row ${rowIndex}.`);
    }
    const result = operation === "negate" ? -value
      : operation === "absolute" ? Math.abs(value)
        : operation === "log" ? Math.log(value)
          : Math.sqrt(value);
    if (!Number.isFinite(result)) {
      throw new RangeError(`Computed ${operation} result is not finite at row ${rowIndex}.`);
    }
    return result;
  }
  const left = evaluate(expression.left, row, rowIndex);
  const right = evaluate(expression.right, row, rowIndex);
  if (COMPARISONS.has(operation)) return compare(left, right, operation, rowIndex);
  const leftNumber = number(left, operation, rowIndex);
  const rightNumber = number(right, operation, rowIndex);
  if (operation === "divide" && rightNumber === 0) {
    throw new RangeError(`Computed divide by zero at row ${rowIndex}.`);
  }
  const result = operation === "add" ? leftNumber + rightNumber
    : operation === "subtract" ? leftNumber - rightNumber
      : operation === "multiply" ? leftNumber * rightNumber
        : leftNumber / rightNumber;
  if (!Number.isFinite(result)) {
    throw new RangeError(`Computed ${operation} result is not finite at row ${rowIndex}.`);
  }
  return result;
}

export function deriveComputedRows(rows, transform) {
  const { nodes, fields, requiredFields } = inspectComputedTransform(transform);
  if (rows.length * nodes > MAX_WORK) {
    throw new RangeError(`Computed work cannot exceed ${MAX_WORK} row-nodes.`);
  }
  if (rows.some(row => Object.hasOwn(row, transform.as))) {
    throw new Error(`Computed output field "${transform.as}" already exists.`);
  }
  if (rows.length > 0) {
    for (const field of fields) {
      const knownOptional = !requiredFields.has(field) && rows.some(row => Object.hasOwn(row, field));
      rows.forEach((row, index) => {
        if (!knownOptional && !Object.hasOwn(row, field)) {
          throw new Error(`Computed source does not contain field "${field}" at row ${index}.`);
        }
      });
    }
  }
  let outputType;
  return rows.map((row, index) => {
    const value = evaluate(transform.expression, row, index);
    if (value !== null) {
      const type = typeof value;
      if (outputType === undefined) outputType = type;
      else if (outputType !== type) {
        throw new TypeError("Computed output must have one non-null primitive type.");
      }
    }
    return { ...row, [transform.as]: value };
  });
}
