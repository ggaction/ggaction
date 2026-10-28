import { isExpressionV2, normalizeComputedTransform, validateComputedTransform } from "../grammar/computed.js";
import { normalizeFilterTransform, validateFilterTransform } from "../grammar/filter.js";
import { parameterEnvironment } from "../grammar/parameter.js";
import { requireStoredResource } from "../selectors/resources.js";

export function expressionFieldEnvironment(source) {
  return Object.fromEntries((source.schema?.fields ?? []).filter(field => field.name !== "").map(field => [
    field.name, { type: field.storageType, optional: field.optional }
  ]));
}

export function expressionEnvironment(program, source, inputs) {
  const resources = inputs.map(input => requireStoredResource(program, input));
  return { fields: expressionFieldEnvironment(source), parameters: parameterEnvironment(resources) };
}

// These validators bind exact stored inputs without evaluating the expression.
export function resolveComputedEnvironment(program, source, transform) {
  validateComputedTransform(transform);
  if (!isExpressionV2(transform.expression)) return undefined;
  const environment = expressionEnvironment(program, source, transform.parameterInputs);
  normalizeComputedTransform({ as: transform.as, expression: transform.expression }, environment);
  return environment;
}

export function resolveFilterEnvironment(program, source, transform) {
  validateFilterTransform(transform);
  if (transform.where === undefined) return undefined;
  const environment = expressionEnvironment(program, source, transform.parameterInputs);
  normalizeFilterTransform({ where: transform.where }, environment);
  return environment;
}
