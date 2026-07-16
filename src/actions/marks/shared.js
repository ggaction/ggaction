import {
  resolveOptionalUserId,
  validateUserId
} from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";

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

export function resolveMarkId(program, requested, {
  defaultId,
  label,
  markType,
  operation
}) {
  const sameRoleExists = program.semanticSpec.layers.some(
    layer => layer.mark?.type === markType
  );
  const defaultUnavailable = hasLayer(program, defaultId) ||
    program.graphicSpec.objects[defaultId] !== undefined;
  return resolveOptionalUserId(requested, {
    defaultId,
    label,
    operation,
    ambiguous: sameRoleExists || defaultUnavailable
  });
}

export function assertMarkAvailable(program, id) {
  if (hasLayer(program, id)) {
    throw new Error(`Mark "${id}" already exists.`);
  }

  if (program.graphicSpec.objects[id] !== undefined) {
    throw new Error(`Graphic "${id}" already exists.`);
  }
}

function inheritedPositionEncoding(encoding) {
  if (encoding === undefined) return undefined;
  return Object.fromEntries(
    ["field", "datum", "fieldType", "scale", "title"]
      .filter(property => Object.hasOwn(encoding, property))
      .map(property => [property, encoding[property]])
  );
}

function eligibleLayeredSource(layer, requestedData) {
  if (layer?.data === undefined) return false;
  if (requestedData !== undefined && layer.data !== requestedData) return false;
  return layer.encoding?.x !== undefined || layer.encoding?.y !== undefined;
}

export function resolveLayeredMarkInheritance(program, requested = {}) {
  const requestedData = Object.hasOwn(requested, "data")
    ? validateUserId(requested.data, "Dataset id")
    : undefined;
  const eligible = program.semanticSpec.layers.filter(layer =>
    eligibleLayeredSource(layer, requestedData)
  );
  const current = findLayer(program, program.context.currentMark);
  const source = eligibleLayeredSource(current, requestedData)
    ? current
    : eligible.length === 1
      ? eligible[0]
      : undefined;

  if (source === undefined && eligible.length > 1) {
    throw new Error(
      "Layered mark inference is ambiguous; specify data and encode its position explicitly."
    );
  }
  if (source === undefined) return undefined;

  return {
    source: source.id,
    data: source.data,
    coordinate: source.coordinate,
    encoding: Object.fromEntries(
      ["x", "y"]
        .map(channel => [
          channel,
          inheritedPositionEncoding(source.encoding?.[channel])
        ])
        .filter(([, encoding]) => encoding !== undefined)
    )
  };
}
