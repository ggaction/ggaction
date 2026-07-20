import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { findTransformPolicy } from "../grammar/transforms.js";
import { findDataset, hasDataset } from "../selectors/datasets.js";
import { requireLayer } from "../selectors/layers.js";

function validateRevisionRole(value) {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(value)) {
    throw new TypeError(
      "Derived dataset revision role must be an alphanumeric identifier."
    );
  }
  return value;
}

function nextRevisionId(program, owner, role) {
  let revision = 1;
  const prefix = `${owner}${role}Revision`;
  while (hasDataset(program, `${prefix}${revision}`)) revision += 1;
  return `${prefix}${revision}`;
}

export function planDerivedDataRevision(program, options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("Derived dataset revision options must be a plain object.");
  }
  const owner = validateUserId(options.owner, "Derived dataset revision owner");
  const role = validateRevisionRole(options.role);
  const previous = options.previous === undefined
    ? undefined
    : validateUserId(options.previous, "Previous derived dataset id");
  if (previous !== undefined && !hasDataset(program, previous)) {
    throw new Error(`Unknown previous derived dataset "${previous}".`);
  }
  if (!Array.isArray(options.consumers)) {
    throw new TypeError("Derived dataset revision consumers must be an array.");
  }
  const consumers = options.consumers.map(id => {
    const validated = validateUserId(id, "Derived dataset consumer id");
    requireLayer(program, validated);
    return validated;
  });
  if (new Set(consumers).size !== consumers.length) {
    throw new Error("Derived dataset revision consumers must be unique.");
  }
  const id = nextRevisionId(program, owner, role);
  return cloneAndFreeze({
    id,
    ...(previous === undefined ? {} : { previous }),
    rebinds: consumers.map(consumer => ({ id: consumer, data: id })),
    ...(previous === undefined ? {} : { release: { id: previous } })
  });
}

export function findUpstreamTransform(program, dataset, type) {
  const visited = new Set();
  let current = dataset;
  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.transform?.length !== 1) return undefined;
    const transform = current.transform[0];
    if (transform.type === type) return transform;
    if (findTransformPolicy(transform.type)?.provenanceTransparent !== true) {
      return undefined;
    }
    current = findDataset(program, current.source);
  }
  return undefined;
}
