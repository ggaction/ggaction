import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const TRANSFORM_KEYS = Object.freeze(["type", "as", "expression"]);
const BINARY_OPERATIONS = new Set(["add", "subtract", "multiply", "divide"]);
const UNARY_OPERATIONS = new Set(["negate", "absolute"]);
const MAX_DEPTH = 16;
const MAX_NODES = 128;
const MAX_WORK = 10_000_000;

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} property "${unknown}".`);
  }
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function validateExpression(expression, depth = 1, state = { nodes: 0 }) {
  if (!isPlainObject(expression)) {
    throw new TypeError("Computed expression nodes must be plain objects.");
  }
  state.nodes += 1;
  if (state.nodes > MAX_NODES) {
    throw new RangeError(`Computed expression cannot exceed ${MAX_NODES} nodes.`);
  }
  if (depth > MAX_DEPTH) {
    throw new RangeError(`Computed expression cannot exceed depth ${MAX_DEPTH}.`);
  }
  const kinds = ["field", "constant", "op"].filter(key => Object.hasOwn(expression, key));
  if (kinds.length !== 1) {
    throw new Error("Computed expression requires exactly one of field, constant, or op.");
  }
  if (kinds[0] === "field") {
    rejectUnknownKeys(expression, ["field"], "computed field expression");
    requireField(expression.field, "Computed expression field");
  } else if (kinds[0] === "constant") {
    rejectUnknownKeys(expression, ["constant"], "computed constant expression");
    if (!Number.isFinite(expression.constant)) {
      throw new TypeError("Computed expression constant must be a finite number.");
    }
  } else if (BINARY_OPERATIONS.has(expression.op)) {
    rejectUnknownKeys(expression, ["op", "left", "right"], "computed binary expression");
    if (!Object.hasOwn(expression, "left") || !Object.hasOwn(expression, "right")) {
      throw new TypeError(`Computed ${expression.op} requires left and right expressions.`);
    }
    validateExpression(expression.left, depth + 1, state);
    validateExpression(expression.right, depth + 1, state);
  } else if (UNARY_OPERATIONS.has(expression.op)) {
    rejectUnknownKeys(expression, ["op", "operand"], "computed unary expression");
    if (!Object.hasOwn(expression, "operand")) {
      throw new TypeError(`Computed ${expression.op} requires an operand expression.`);
    }
    validateExpression(expression.operand, depth + 1, state);
  } else {
    throw new Error(`Unsupported computed operation "${expression.op}".`);
  }
  return state.nodes;
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
  return { ...expression };
}

export function normalizeComputedTransform({ as, expression } = {}) {
  const transform = {
    type: "computed",
    as,
    expression: normalizeExpression(expression)
  };
  validateComputedTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateComputedTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Computed transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "computed transform");
  if (transform.type !== "computed") {
    throw new Error(`Unsupported computed transform "${transform.type}".`);
  }
  requireField(transform.as, "Computed output field");
  return validateExpression(transform.expression);
}

function evaluate(expression, row, rowIndex) {
  if (Object.hasOwn(expression, "field")) {
    if (!Object.hasOwn(row, expression.field)) {
      throw new Error(
        `Computed source does not contain field "${expression.field}" at row ${rowIndex}.`
      );
    }
    const value = row[expression.field];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Computed field "${expression.field}" must contain a finite number at row ${rowIndex}.`
      );
    }
    return value;
  }
  if (Object.hasOwn(expression, "constant")) return expression.constant;
  if (UNARY_OPERATIONS.has(expression.op)) {
    const value = evaluate(expression.operand, row, rowIndex);
    return expression.op === "negate" ? -value : Math.abs(value);
  }
  const left = evaluate(expression.left, row, rowIndex);
  const right = evaluate(expression.right, row, rowIndex);
  if (expression.op === "divide" && right === 0) {
    throw new RangeError(`Computed divide by zero at row ${rowIndex}.`);
  }
  const result = expression.op === "add" ? left + right
    : expression.op === "subtract" ? left - right
      : expression.op === "multiply" ? left * right
        : left / right;
  if (!Number.isFinite(result)) {
    throw new RangeError(`Computed ${expression.op} result is not finite at row ${rowIndex}.`);
  }
  return result;
}

export function deriveComputedRows(rows, transform) {
  const nodes = validateComputedTransform(transform);
  if (rows.length * nodes > MAX_WORK) {
    throw new RangeError(`Computed work cannot exceed ${MAX_WORK} row-nodes.`);
  }
  if (rows.some(row => Object.hasOwn(row, transform.as))) {
    throw new Error(`Computed output field "${transform.as}" already exists.`);
  }
  return rows.map((row, index) => ({
    ...row,
    [transform.as]: evaluate(transform.expression, row, index)
  }));
}
