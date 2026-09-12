import { isPlainObject } from "../../core/immutable.js";
import { datasetTransformOutputRoles } from "../../grammar/transforms.js";
import { requireLayer } from "../../selectors/layers.js";

const DATA_REFERENCE_KEYS = new Set([
  "data", "dataset", "dataId", "filteredData", "originalData",
  "outlierDataId", "profileId", "source", "summaryId"
]);

export function outputFieldChanges(previous, next) {
  const before = datasetTransformOutputRoles(previous);
  const after = datasetTransformOutputRoles(next);
  const family = previous.type === "bin2d" ? "2D bin " : "";
  const counts = new Map();
  const retainedFields = new Set(Object.values(after));
  for (const field of Object.values(before)) {
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  return new Map(Object.entries(before).flatMap(([role, field]) => {
    if (field === after[role] || retainedFields.has(field)) return [];
    if (counts.get(field) !== 1) {
      throw new Error(
        `Cannot rebind ambiguous derived output field "${field}".`
      );
    }
    return [[field, { role, next: after[role], family }]];
  }));
}

function changedConsumerField(field, changes) {
  const change = changes.get(field);
  if (change === undefined) return field;
  if (change.next === undefined) {
    throw new Error(
      `Cannot remove referenced ${change.family}${change.role} output field "${field}".`
    );
  }
  return change.next;
}

export function rebindLayerOutputFields(program, id, changes) {
  const layer = requireLayer(program, id);
  let next = program;
  const changed = field => changedConsumerField(field, changes);
  const editField = (property, field) => {
    if (field === undefined) return;
    const value = changed(field);
    if (value !== field) next = next.editSemantic({ property, value });
  };
  for (const [channel, encoding] of Object.entries(layer.encoding ?? {})) {
    editField(`layer[${id}].encoding.${channel}.field`, encoding?.field);
    const summary = encoding?.categoryOrder?.by;
    if (summary?.field !== undefined) {
      const field = changed(summary.field);
      if (field !== summary.field) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.${channel}.categoryOrder`,
          value: { ...encoding.categoryOrder, by: { ...summary, field } }
        });
      }
    }
  }
  editField(
    `layer[${id}].encoding.theta.weight`,
    layer.encoding?.theta?.weight
  );

  const parallel = layer.encoding?.parallel;
  if (parallel?.dimensions !== undefined) {
    const dimensions = parallel.dimensions.map(dimension => ({
      ...dimension,
      field: changed(dimension.field)
    }));
    if (dimensions.some((dimension, index) =>
      dimension.field !== parallel.dimensions[index].field
    )) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.parallel.dimensions`,
        value: dimensions
      });
    }
  }
  editField(`layer[${id}].encoding.parallel.key`, parallel?.key);

  for (const [selectionId, config] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    if (config.target !== id) continue;
    const selector = { ...config.selector };
    if (selector.field !== undefined) selector.field = changed(selector.field);
    if (selector.groupBy !== undefined) {
      selector.groupBy = selector.groupBy.map(changed);
    }
    if (JSON.stringify(selector) !== JSON.stringify(config.selector)) {
      next = next._withSelectionConfig(selectionId, { ...config, selector });
    }
  }

  const jitter = program.materializationConfigs.jitters?.[id];
  const key = jitter?.key === undefined ? undefined : changed(jitter.key);
  if (key !== undefined && key !== jitter.key) {
    next = next._withMaterializationConfig(
      ["jitters", id],
      { ...jitter, key }
    );
  }
  return next;
}

function replaceReferences(value, replacements, key) {
  if (Array.isArray(value)) {
    let changed = false;
    const items = value.map(item => {
      const next = replaceReferences(item, replacements);
      changed ||= next !== item;
      return next;
    });
    return changed ? items : value;
  }
  if (!isPlainObject(value)) {
    return DATA_REFERENCE_KEYS.has(key) && replacements.has(value)
      ? replacements.get(value)
      : value;
  }
  let changed = false;
  const result = {};
  for (const [childKey, child] of Object.entries(value)) {
    const next = replaceReferences(child, replacements, childKey);
    changed ||= next !== child;
    result[childKey] = next;
  }
  return changed ? result : value;
}

export function rebindMaterializationDataReferences(program, replacements) {
  if (replacements.size === 0) return program;
  let next = program;
  for (const [key, config] of Object.entries(program.materializationConfigs)) {
    const replaced = replaceReferences(config, replacements, key);
    if (replaced !== config) {
      next = next._withMaterializationConfig([key], replaced);
    }
  }
  return next;
}
