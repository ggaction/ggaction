import { withActionArgumentSummary } from "../../core/action.js";

// The verified payload belongs to one exact child argument object. Speculative
// branches and nested actions cannot consume another invocation's preparation.
const prepared = new WeakMap();

export function preparedSourceUpdate(args) { return prepared.get(args); }

export function withPreparedSourceUpdate(args, value, operation) {
  const previous = prepared.get(args);
  prepared.set(args, value);
  try { return operation(args); }
  finally {
    if (previous === undefined) prepared.delete(args);
    else prepared.set(args, previous);
  }
}

function summarizeSourceText(value) {
  const { text, ...rest } = value;
  return text === undefined ? rest : { ...rest, textLength: text.length };
}

export function writeSourceReceipt(program, id, receipt) {
  const args = { property: `dataset[${id}].sourceReceipt`, value: receipt };
  return withActionArgumentSummary(args, { ...args,
    value: { ...receipt, original: summarizeSourceText(receipt.original) }
  }, input => program.editSemantic(input));
}

export function writeSourceResource(program, resource) {
  const args = { property: `resource[data-source:${resource.id}]`, value: resource };
  return withActionArgumentSummary(args, { ...args,
    value: { ...resource, options: { ...resource.options,
      source: summarizeSourceText(resource.options.source) } }
  }, input => program.editSemantic(input));
}
