import { cloneAndFreeze, isPlainObject } from "../../../core/immutable.js";
import {
  MARK_GRAPHIC_PROPERTIES,
  selectMarkItemKeys
} from "../../../grammar/markSelection.js";
import { unionConcreteGraphicBounds } from
  "../../../grammar/schemas/graphicBounds.js";

export function itemKey(layer, grain, index) {
  return `${layer.id}/${grain}/${index}`;
}

function graphicId(layer, index) {
  return `${layer.id}:${index}`;
}

function encodingValue(row, encoding) {
  if (encoding === undefined) return undefined;
  if (Object.hasOwn(encoding, "field")) return row?.[encoding.field];
  return encoding.datum;
}

export function channelMapFromRow(row, layer) {
  return Object.fromEntries(
    Object.entries(layer.encoding ?? {})
      .map(([channel, encoding]) => [channel, encodingValue(row, encoding)])
      .filter(([, value]) => value !== undefined)
  );
}

export function ownFields(row) {
  return isPlainObject(row) ? { ...row } : {};
}

export function uniqueFields(rows) {
  if (rows.length === 0) return {};
  const fields = new Set(rows.flatMap(row =>
    isPlainObject(row) ? Object.keys(row) : []
  ));
  return Object.fromEntries([...fields].flatMap(field => {
    if (!rows.every(row => isPlainObject(row) && Object.hasOwn(row, field))) {
      return [];
    }
    const value = rows[0][field];
    return rows.every(row => row[field] === value) ? [[field, value]] : [];
  }));
}

function requireResolvedGraphic(program, layer, type) {
  const graphic = program.graphicSpec.objects[layer.id];
  const compatibleCollection = graphic?.type === "collection" &&
    graphic.items?.every(child => child.type === type);
  if (
    (graphic?.type !== type && !compatibleCollection) ||
    !Array.isArray(graphic.items)
  ) {
    throw new Error(
      `Mark "${layer.id}" requires a materialized ${type} collection for selection.`
    );
  }
  return graphic;
}

const SELECTABLE_GRAPHIC_PROPERTIES = new Set(MARK_GRAPHIC_PROPERTIES);

export function concreteProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties ?? {}).filter(([key, value]) =>
      SELECTABLE_GRAPHIC_PROPERTIES.has(key) &&
      (Number.isFinite(value) || typeof value === "string")
    )
  );
}

function sharedConcreteProperties(items) {
  if (items.length === 0) return {};
  const shared = concreteProperties(items[0].properties);
  for (const key of Object.keys(shared)) {
    if (!items.every(child => child.properties?.[key] === shared[key])) {
      delete shared[key];
    }
  }
  return shared;
}

function collectionBounds(program, items) {
  const bounds = unionConcreteGraphicBounds(
    program.graphicSpec,
    items.map(item => item.id)
  );
  if (bounds === undefined) return {};
  const { left, top, right, bottom } = bounds;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function finalizeItems(program, layer, grain, definitions, graphicType) {
  const graphic = requireResolvedGraphic(program, layer, graphicType);
  const referenced = definitions.flatMap((definition, index) =>
    definition.graphicIndices ?? [index]
  );
  if (
    referenced.some(index => graphic.items[index] === undefined) ||
    (definitions.every(definition => definition.graphicIndices === undefined) &&
      graphic.items.length !== definitions.length)
  ) {
    throw new Error(
      `Mark "${layer.id}" item count does not match its materialized graphics.`
    );
  }
  return Object.freeze(definitions.map((definition, index) => {
    const indices = definition.graphicIndices ?? [index];
    const items = indices.map(childIndex => graphic.items[childIndex]);
    const properties = definition.properties ?? (
      items.length === 1
        ? concreteProperties(items[0].properties)
        : {
            ...sharedConcreteProperties(items),
            ...collectionBounds(program, items)
          }
    );
    return Object.freeze({
      key: definition.key ?? itemKey(layer, grain, index),
      layer: layer.id,
      markType: layer.mark.type,
      fields: cloneAndFreeze(definition.fields),
      channels: cloneAndFreeze(definition.channels),
      properties: cloneAndFreeze(properties),
      members: Object.freeze([...definition.members]),
      graphicIds: Object.freeze(items.map((child, childOffset) =>
        child.id ?? graphicId(layer, indices[childOffset])
      ))
    });
  }));
}

export function reorderHighlightedItems(program, layer, definitions) {
  let ordered = definitions;
  for (const config of Object.values(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (config.target !== layer.id || config.bringToFront !== true) continue;
    const selection = program.materializationConfigs.selections?.[config.selection];
    if (selection?.target !== layer.id) continue;
    const selected = new Set(selectMarkItemKeys(ordered, selection.selector));
    ordered = [
      ...ordered.filter(definition => !selected.has(definition.key)),
      ...ordered.filter(definition => selected.has(definition.key))
    ];
  }
  return ordered;
}
