import { evaluateConditionalEncoding } from "../grammar/conditionalEncoding.js";
import { conditionalValues, validateStoredConditional } from "../grammar/conditionalState.js";
import { resolveConditionalEnvironment } from "./conditionalState.js";

export function uniqueConditionalItemField(item, field) {
  return Object.hasOwn(item.fields, field) || item.members.every(row => !Object.hasOwn(row, field));
}

// Choose a native binding without interpreting its field as a scalar value.
// Count, weighted sectors and source labels retain their owning value kernel.
export function selectConditionalBranches(program, layer, channel, items, membership) {
  const definition = layer.conditionals?.[channel];
  if (definition === undefined) return undefined;
  const environment = resolveConditionalEnvironment(program, layer, channel, definition);
  const fields = validateStoredConditional(channel, definition).fields;
  for (const item of items) for (const field of fields) {
    if (!uniqueConditionalItemField(item, field)) throw new Error(`Conditional predicate field "${field}" is not uniquely defined at the final item grain.`);
  }
  const { indices } = evaluateConditionalEncoding({ conditions: definition.conditions, otherwise: definition.otherwise }, items.map(item => item.fields), environment, membership);
  return { branches: conditionalValues(definition), indices };
}
