import { requireSemanticScale } from "../selectors/scales.js";
import { evaluateConditionalEncoding } from "../grammar/conditionalEncoding.js";
import { conditionalValues, validateStoredConditional } from "../grammar/conditionalState.js";
import { aggregateRows } from "../grammar/aggregate.js";
import { readScaleField } from "../grammar/scales/index.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveConditionalEnvironment } from "./conditionalState.js";

function uniqueItemField(item, field) {
  // A uniformly missing optional source field is a valid missing value. A
  // field that differs within one aggregate/path item has no scalar meaning.
  return Object.hasOwn(item.fields, field) || item.members.every(row => !Object.hasOwn(row, field));
}

export function conditionalFieldRows(items, encoding) {
  return items.map(item => {
    if (encoding.aggregate !== undefined) return { [encoding.field]: aggregateRows(item.members, encoding.field, encoding.aggregate) };
    if (!uniqueItemField(item, encoding.field)) throw new Error(`Conditional field "${encoding.field}" is not uniquely defined at the final item grain.`);
    return item.fields;
  });
}

export function mapConditionalValues(program, layer, channel, items, membership, { mapped = true } = {}) {
  const definition = layer.conditionals?.[channel];
  if (definition === undefined) return undefined;
  const environment = resolveConditionalEnvironment(program, layer, channel, definition);
  const branches = conditionalValues(definition);
  // Validation remains eager. Mapping only runs for chosen branch rows.
  for (const branch of branches) if (branch.field !== undefined) {
    const scale = branch.scale === undefined ? {} : (program.resolvedScales[branch.scale] ?? (!mapped ? requireSemanticScale(program, branch.scale) : undefined));
    if (scale === undefined) throw new Error(`Conditional encoding requires resolved scale "${branch.scale}".`);
    readScaleField(conditionalFieldRows(items, branch), branch.field, branch.fieldType, {
      allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: branch.temporalUnit
    });
  }
  const fields = validateStoredConditional(channel, definition).fields;
  for (const item of items) for (const field of fields) {
    if (!uniqueItemField(item, field)) throw new Error(`Conditional predicate field "${field}" is not uniquely defined at the final item grain.`);
  }
  const rows = items.map(item => item.fields);
  const evaluated = evaluateConditionalEncoding({ conditions: definition.conditions, otherwise: definition.otherwise }, rows, environment, membership);
  const values = Array(items.length);
  branches.forEach((branch, index) => {
    const indexes = evaluated.indices.flatMap((selected, row) => (selected === index || (selected === -1 && index === branches.length - 1)) ? [row] : []);
    if (!indexes.length) return;
    if (Object.hasOwn(branch, "value")) indexes.forEach(row => { values[row] = branch.value; });
    else {
      const raw = readScaleField(conditionalFieldRows(indexes.map(row => items[row]), branch), branch.field, branch.fieldType, {
        allowUnknown: branch.scale !== undefined && Object.hasOwn(program.resolvedScales[branch.scale] ?? requireSemanticScale(program, branch.scale), "unknown"), temporalUnit: branch.temporalUnit
      });
      const output = !mapped || branch.scale === undefined ? raw : mapScaleConsumerValues(raw, program.resolvedScales[branch.scale], channel);
      indexes.forEach((row, offset) => { values[row] = output[offset]; });
    }
  });
  return values;
}
