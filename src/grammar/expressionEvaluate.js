import { ownRecord } from "../core/ownData.js";
import { normalizeExpressionV2 } from "./expressionAst.js";
import { evaluateFunction } from "./expressionFunctions.js";
import { array, checkType, EXPRESSION_LIMITS, limit, missing, numericResult, operand, scalar, valueType } from "./expressionValues.js";

function boolean(value) {
  if (typeof value !== "boolean") throw new TypeError("Expression condition requires boolean.");
  return value;
}

// Compare Unicode code points, not UTF-16 code units or locale collation.
function compare(left, right) {
  if (typeof left !== "string") return left < right ? -1 : left > right ? 1 : 0;
  const a = Array.from(left), b = Array.from(right);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const difference = a[i].codePointAt(0) - b[i].codePointAt(0);
    if (difference !== 0) return Math.sign(difference);
  }
  return Math.sign(a.length - b.length);
}

export function evaluateExpressionV2(expression, rows, environment = {}) {
  const normalized = normalizeExpressionV2(expression, environment);
  if (!Array.isArray(rows)) throw new TypeError("Expression rows must be an array.");
  limit(rows.length * normalized.nodes, EXPRESSION_LIMITS.rowWork, "rowWork");
  array(rows, EXPRESSION_LIMITS.rowWork, "rows");
  const state = { work: 0, counts: { divideByZero: 0, domain: 0, nonFinite: 0, dateRange: 0, arrayBounds: 0 } };
  function field(row, key) {
    if (!Object.hasOwn(row, key)) {
      if (!normalized.environment.fields[key].optional) throw new TypeError("Required expression field is absent.");
      return undefined;
    }
    const value = row[key];
    const type = normalized.environment.fields[key].type;
    if (!["unknown", "mixed"].includes(type)) checkType(valueType(value), [type], "Field value");
    return value;
  }
  function evaluate(node, row, output = false) {
    const leaf = value => output ? operand(value, state) : value;
    if (node.type === "literal") return leaf(node.value);
    if (node.type === "field") return leaf(field(row, node.name));
    if (node.type === "parameter") return leaf(normalized.environment.parameters[node.id].value);
    if (node.type === "fieldPath") {
      let value = field(row, node.root);
      for (const key of node.path) {
        if (value === null || value === undefined) return undefined;
        ownRecord(value, "fieldPath object");
        value = Object.hasOwn(value, key) ? value[key] : undefined;
      }
      return leaf(value);
    }
    if (node.type === "if") return evaluate(boolean(evaluate(node.condition, row)) ? node.then : node.else, row, output);
    if (node.type === "call") {
      if (node.name === "coalesce") {
        for (const arg of node.args) {
          const value = operand(evaluate(arg, row), state);
          scalar(value);
          if (value !== null && value !== undefined) return value;
        }
        return undefined;
      }
      return evaluateFunction(node, node.args.map(arg => evaluate(arg, row)), state);
    }
    const left = operand(evaluate(node.type === "unary" ? node.operand : node.left, row), state);
    if (node.type === "unary") {
      if (node.op === "not") return !boolean(left);
      checkType(valueType(left), ["number"], "negate");
      return left == null ? undefined : -left;
    }
    if (node.op === "and") return boolean(left) && boolean(evaluate(node.right, row));
    if (node.op === "or") return boolean(left) || boolean(evaluate(node.right, row));
    const right = operand(evaluate(node.right, row), state);
    if (["add", "subtract", "multiply", "divide"].includes(node.op)) {
      checkType(valueType(left), ["number"], node.op); checkType(valueType(right), ["number"], node.op);
      if (left == null || right == null) return undefined;
      if (node.op === "divide" && right === 0) return missing(state, "divideByZero");
      return numericResult(node.op === "add" ? left + right : node.op === "subtract" ? left - right : node.op === "multiply" ? left * right : left / right, state);
    }
    scalar(left); scalar(right);
    if (left == null || right == null) return false;
    if (node.op === "eq") return left === right;
    if (node.op === "neq") return left !== right;
    if (typeof left !== typeof right) throw new TypeError("Ordering requires matching scalar types.");
    const order = compare(left, right);
    return node.op === "lt" ? order < 0 : node.op === "lte" ? order <= 0 : node.op === "gt" ? order > 0 : order >= 0;
  }
  let outputType;
  const values = rows.map(row => {
    ownRecord(row, "Expression row");
    const value = scalar(evaluate(normalized.expression.root, row, true));
    if (value !== null && value !== undefined) {
      const type = valueType(value);
      if (outputType !== undefined && outputType !== type) throw new TypeError("Expression output types must be uniform.");
      outputType = type;
    }
    return value;
  });
  return Object.freeze({
    values: Object.freeze(values),
    report: Object.freeze({ algorithm: "expression@2", registry: "standard@1", evaluatedRows: rows.length,
      missingRows: values.filter(value => value === undefined).length, counts: Object.freeze(state.counts) }),
    fields: normalized.fields, parameters: normalized.parameters
  });
}
