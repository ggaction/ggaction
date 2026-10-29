import { selectionExpressionInputs } from "../../materialization/selection/expression.js";
import { findStoredResource, dataInputReference } from "../../selectors/resources.js";
import { requireDataset } from "../../selectors/datasets.js";
import { prepareResourceResult, validatePreparedResource } from "../../materialization/resourceState.js";

export function prepareSelectionState(program, id, target, selector) {
  const previous = findStoredResource(program, "persistent-selection", id);
  const { grain, ...predicate } = selector;
  const dataset = selector.rows === undefined ? undefined : requireDataset(program, selector.rows.data);
  const resource = {
    kind: "persistent-selection", id, revision: previous === undefined ? 0 : previous.revision + 1,
    algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: dataset === undefined ? selectionExpressionInputs(program, selector) : [dataInputReference(dataset)],
    options: selector.items !== undefined ? { mode: "item-keys", itemKeys: selector.items, empty: selector.empty, ...(Object.hasOwn(selector, "screenPolygon") ? { screenPolygon: selector.screenPolygon } : {}), ...(Object.hasOwn(selector, "screenAngles") ? { screenAngles: selector.screenAngles } : {}) } : dataset === undefined ? { mode: "predicate", predicate }
      : { mode: "row-keys", logicalDataId: dataset.logicalId, rowKeys: selector.rows.indices.map(index => dataset.rowKeys[index]) },
    result: {}, provenance: { origin: "authored" }
  };
  return {
    resource,
    definition: { target, grain, resource: { kind: resource.kind, id, revision: resource.revision }, projection: dataset === undefined ? {} : { data: dataset.id } }
  };
}

export function writeSelectionState(program, id, target, selector) {
  const { resource, definition } = prepareSelectionState(program, id, target, selector);
  const prepared = prepareResourceResult(program, resource);
  const next = program.editSemantic({ property: `resource[persistent-selection:${id}]`, value: validatePreparedResource(program, prepared) });
  return next._withSelectionConfig(id, definition);
}

export function linkSelectionOwner(program, id, sourceSelection) {
  const definition = program.materializationConfigs.selections[id];
  const owner = program.materializationConfigs.selections[sourceSelection];
  const previous = definition.resource;
  let next = program._withSelectionConfig(id, { ...definition, resource: owner.resource, sourceSelection });
  if (previous.id !== owner.resource.id) next = next.editSemantic({ property: `resource[${previous.kind}:${previous.id}]`, remove: true });
  return next;
}
