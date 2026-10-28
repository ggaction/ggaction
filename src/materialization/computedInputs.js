import { isExpressionV2, normalizeComputedTransform, validateComputedTransform } from "../grammar/computed.js";
import { parameterEnvironment } from "../grammar/parameter.js";
import { requireStoredResource } from "../selectors/resources.js";

export function computedFieldEnvironment(source) {
  return Object.fromEntries((source.schema?.fields ?? []).filter(field => field.name !== "").map(field => [
    field.name, { type: field.storageType, optional: field.optional }
  ]));
}

// Restore and materialization resolve the exact stored inputs without evaluating.
export function resolveComputedEnvironment(program, source, transform) {
  validateComputedTransform(transform);
  if (!isExpressionV2(transform.expression)) return undefined;
  const resources = transform.parameterInputs.map(input => requireStoredResource(program, input));
  const environment = {
    fields: computedFieldEnvironment(source),
    parameters: parameterEnvironment(resources)
  };
  normalizeComputedTransform({ as: transform.as, expression: transform.expression }, environment);
  return environment;
}
