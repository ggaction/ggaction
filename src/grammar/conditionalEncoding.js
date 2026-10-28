import { cloneAndFreeze, isOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { validateUserId } from "../core/identifiers.js";
import { inspectPredicateExpression, normalizePredicateExpression } from "./expressionAst.js";
import { evaluateExpressionV2 } from "./expressionEvaluate.js";
import { array, EXPRESSION_LIMITS, limit, record } from "./expressionValues.js";

export const CONDITIONAL_BRANCH_LIMIT = 64;

function snapshotValue(value, state) {
  if (isOwned(value)) return value;
  const ancestors = new Set();
  function inspect(item, depth) {
    limit(depth, EXPRESSION_LIMITS.depth, "valueDepth");
    limit(++state.work, EXPRESSION_LIMITS.valueWork, "valueWork");
    if (item !== null && typeof item === "object") {
      if (ancestors.has(item)) throw new TypeError("Conditional values cannot contain cycles.");
      ancestors.add(item);
      if (Array.isArray(item)) array(item, EXPRESSION_LIMITS.array, "Conditional value");
      else ownRecord(item, "Conditional value");
      Object.values(item).forEach(child => inspect(child, depth + 1));
      ancestors.delete(item);
    }
  }
  inspect(value, 0);
  return cloneAndFreeze(value);
}

function normalize(definition, { environment, selections, normalizeValue = value => value } = {}) {
  record(definition, ["conditions", "otherwise"], [], "Conditional encoding");
  array(definition.conditions, CONDITIONAL_BRANCH_LIMIT, "conditions");
  if (definition.conditions.length === 0) throw new TypeError("Conditional encoding requires at least one condition.");
  const fields = new Set(), parameters = new Set(), selectionIds = new Set();
  let nodes = 0;
  const valueState = { work: 0 };
  const predicates = definition.conditions.map((condition, index) => {
    record(condition, ["when", "value"], [], "Encoding condition");
    ownRecord(condition.when, "Encoding predicate");
    let when;
    if (Object.hasOwn(condition.when, "selection")) {
      record(condition.when, ["selection"], [], "Selection predicate");
      const id = validateUserId(condition.when.selection, "Selection id");
      if (selections !== undefined && !selections.includes(id)) throw new Error(`Unknown conditional selection "${id}".`);
      selectionIds.add(id); nodes += 1;
      when = { selection: id };
    } else {
      const normalized = environment === undefined
        ? inspectPredicateExpression(condition.when)
        : normalizePredicateExpression(condition.when, environment);
      normalized.fields.forEach(field => fields.add(field));
      normalized.parameters.forEach(id => parameters.add(id));
      nodes += normalized.nodes;
      when = normalized.expression;
    }
    limit(nodes, EXPRESSION_LIMITS.nodes, "conditionalNodes");
    return { when, value: snapshotValue(normalizeValue(snapshotValue(condition.value, valueState), ["conditions", index, "value"]), valueState) };
  });
  const otherwise = snapshotValue(normalizeValue(snapshotValue(definition.otherwise, valueState), ["otherwise"]), valueState);
  return cloneAndFreeze({
    definition: { conditions: predicates, otherwise },
    fields: [...fields], parameters: [...parameters], selections: [...selectionIds], nodes
  });
}

// The channel owner validates every value payload, including inactive branches.
// The grammar owns predicate order, dependency extraction and evaluation only.
export function normalizeConditionalEncoding(definition, options = {}) {
  return normalize(definition, options);
}

export function evaluatePredicateExpression(expression, rows, environment = {}) {
  normalizePredicateExpression(expression, environment);
  const result = evaluateExpressionV2(expression, rows, environment);
  if (result.values.some(value => typeof value !== "boolean")) {
    throw new TypeError("Expression predicate must evaluate to boolean.");
  }
  return result;
}

// Return selected branch indexes; -1 is the required otherwise payload. Values
// remain with the channel owner so inactive scale/value expressions are not run.
export function evaluateConditionalEncoding(definition, rows, environment = {}, selectionMembership = {}) {
  ownRecord(selectionMembership, "Conditional selection membership");
  const normalized = normalize(definition, { environment, selections: Object.keys(selectionMembership) });
  array(rows, EXPRESSION_LIMITS.rowWork, "rows");
  limit(rows.length * normalized.nodes, EXPRESSION_LIMITS.rowWork, "rowWork");
  rows.forEach(row => ownRecord(row, "Conditional row"));
  for (const id of normalized.selections) {
    const membership = selectionMembership[id];
    array(membership, rows.length, "selection membership");
    if (membership.length !== rows.length || membership.some(value => typeof value !== "boolean")) {
      throw new TypeError("Conditional selection membership requires one boolean per row.");
    }
  }
  const indices = Array(rows.length).fill(-1);
  let pending = rows.map((_, index) => index), evaluatedPredicates = 0;
  const counts = { divideByZero: 0, domain: 0, nonFinite: 0, dateRange: 0, arrayBounds: 0 };
  normalized.definition.conditions.forEach(({ when }, branch) => {
    if (pending.length === 0) return;
    evaluatedPredicates += pending.length;
    let values;
    if (Object.hasOwn(when, "selection")) values = pending.map(index => selectionMembership[when.selection][index]);
    else {
      const evaluated = evaluatePredicateExpression(when, pending.map(index => rows[index]), environment);
      values = evaluated.values;
      for (const key of Object.keys(counts)) counts[key] += evaluated.report.counts[key];
    }
    pending = pending.filter((index, offset) => {
      if (!values[offset]) return true;
      indices[index] = branch;
      return false;
    });
  });
  return cloneAndFreeze({ indices, report: { algorithm: "conditional@1", evaluatedRows: rows.length, evaluatedPredicates, counts } });
}
