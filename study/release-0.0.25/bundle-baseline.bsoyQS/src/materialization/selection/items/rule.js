import { deriveRuleValues } from "../../../grammar/rules.js";
import { finalizeItems, ownFields, uniqueFields } from "./common.js";

export function resolveRuleItems(program, layer, dataset) {
  const derived = deriveRuleValues(dataset.values, layer);
  const hasField = Object.values(layer.encoding ?? {}).some(encoding =>
    Object.hasOwn(encoding, "field")
  );
  const definitions = Array.from({ length: derived.length }, (_, index) => {
    const members = hasField ? [dataset.values[index]] : dataset.values;
    return {
      fields: hasField
        ? ownFields(dataset.values[index])
        : uniqueFields(dataset.values),
      channels: Object.fromEntries(
        Object.entries(derived.values).map(([channel, values]) => [
          channel,
          values[index]
        ])
      ),
      members
    };
  });
  return finalizeItems(program, layer, "rule", definitions, "line");
}
