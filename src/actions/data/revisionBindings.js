import { collectDataOwnerReferences, collectMarkConfigReferences } from "../../core/resourceReferences.js";
import { datasetTransformOutputRoles } from "../../grammar/transforms.js";
import { requireLayer } from "../../selectors/layers.js";


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

function replaceAtPath(value, [key, ...rest], replacement) {
  const result = Array.isArray(value) ? [...value] : { ...value };
  Object.defineProperty(result, key, { value: rest.length === 0
    ? replacement : replaceAtPath(value[key], rest, replacement),
    enumerable: true, configurable: true, writable: true });
  return result;
}

export function rebindMaterializationDataReferences(program, replacements) {
  if (replacements.size === 0) return program;
  let next = program;
  for (const ref of [...collectMarkConfigReferences(program), ...collectDataOwnerReferences(program)]) {
    if (ref.kind !== "data" || !replacements.has(ref.id)) continue;
    const path = ref.ownerKind === "markConfig" ? ["marks", ref.ownerId, ...ref.path] : ref.path;
    const [root, ...rest] = path;
    next = next._withMaterializationConfig([root],
      replaceAtPath(next.materializationConfigs[root], rest, replacements.get(ref.id)));
  }
  return next;
}
