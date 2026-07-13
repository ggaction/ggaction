import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { hasLayer } from "../../selectors/layers.js";

export function validateMarkOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

export function resolveMarkData(program, requested) {
  const data = Object.hasOwn(requested, "data")
    ? validateUserId(requested.data, "Dataset id")
    : program.context.currentData;

  if (data === undefined) {
    throw new Error("Mark creation requires data or a current dataset.");
  }

  const dataset = findDataset(program, data);

  if (dataset === undefined) {
    throw new Error(`Unknown dataset "${data}".`);
  }

  return { data, dataset };
}

export function assertMarkAvailable(program, id) {
  if (hasLayer(program, id)) {
    throw new Error(`Mark "${id}" already exists.`);
  }

  if (program.graphicSpec.objects[id] !== undefined) {
    throw new Error(`Graphic "${id}" already exists.`);
  }
}
