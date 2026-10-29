import { selectProgramItemKeys } from "../expression.js";
import { memberRowReferences } from "../rows.js";
import { normalizeTemporalValue } from "../../../grammar/scales/fields.js";
import { cloneAndFreeze, isPlainObject } from "../../../core/immutable.js";
import {
  MARK_GRAPHIC_PROPERTIES
} from "../../../grammar/markSelection.js";
import { unionConcreteGraphicBounds } from
  "../../../grammar/schemas/graphicBounds.js";
import { readRectItemGeometry } from "../../../grammar/roundedRect.js";
import { selectionPredicate } from "../predicate.js";
import { requireDataset } from "../../../selectors/datasets.js";
import { canonicalJSON, contentDigest } from "../../../core/contentDigest.js";
import { encodeValue } from "../../../core/valueEncoding.js";

const rowKeySets = new WeakMap();
function itemNamespace(program, dataset, keys) {
  let current = dataset;
  while (current.source !== undefined) {
    const source = requireDataset(program, current.source);
    let sourceKeys = rowKeySets.get(source);
    if (sourceKeys === undefined) { sourceKeys = new Set(source.rowKeys); rowKeySets.set(source, sourceKeys); }
    if (!keys.every(key => sourceKeys.has(key))) break;
    current = source;
  }
  return current.logicalId;
}

export function identifyItems(program, layer, grain, definitions) {
  const dataset = requireDataset(program, layer.data);
  const keysByRow = new Map();
  dataset.values.forEach((row, index) => keysByRow.set(row, [...(keysByRow.get(row) ?? []), dataset.rowKeys[index]]));
  return definitions.map(definition => {
    const memberKeys = definition.memberKeys ?? (definition.rowKey ? [definition.rowKey]
      : [...new Set(definition.members.flatMap(row => keysByRow.get(row) ?? []))]);
    const identity = definition.semanticIdentity ?? (definition.rowKey === undefined
      ? ["members", [...memberKeys].sort()] : ["row", definition.rowKey]);
    const key = JSON.stringify([[], layer.id, grain, [itemNamespace(program, dataset, memberKeys), canonicalJSON(encodeValue(identity))]]);
    return { ...definition, key, memberKeys,
      topology: ["line", "area"].includes(layer.mark.type) ? contentDigest(JSON.stringify(definition.topologyKeys ?? memberKeys)) : "" };
  });
}

function graphicId(layer, index) {
  return `${layer.id}:${index}`;
}

function encodingValue(row, encoding) {
  if (encoding === undefined) return undefined;
  const value = Object.hasOwn(encoding, "field") ? row?.[encoding.field] : encoding.datum;
  if (encoding.fieldType !== "temporal") return value;
  try {
    return normalizeTemporalValue(value, encoding.field, 0, encoding.temporalUnit);
  } catch {
    return undefined;
  }
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
  const types = Array.isArray(type) ? type : [type];
  const compatibleCollection = graphic?.type === "collection" &&
    graphic.items?.every(child => types.includes(child.type));
  if (
    (!types.includes(graphic?.type) && !compatibleCollection) ||
    !Array.isArray(graphic.items)
  ) {
    throw new Error(
      `Mark "${layer.id}" requires a materialized ${types.join("/")} collection for selection.`
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

function selectableGraphicProperties(item) {
  return {
    ...concreteProperties(item?.properties),
    ...(readRectItemGeometry(item) ?? {})
  };
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
  , program.materializationConfigs.textMetrics, {includeOwnerClips: false, includeEffects: false});
  if (bounds === undefined) return {};
  const { left, top, right, bottom } = bounds;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function finalizeItems(program, layer, grain, definitions, graphicType, { reorder = true, selectionResolvers } = {}) {
  if (selectionResolvers?.sourceOnly) return identifyItems(program, layer, grain, definitions);
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
  definitions = identifyItems(program, layer, grain, definitions);
  if (reorder) {
    definitions = reorderHighlightedItems(program, layer, definitions, {}, selectionResolvers);
    if (definitions.some(definition => definition.graphicIndices !== undefined)) {
      // A selected series moves all its concrete segments together. Rebind the
      // semantic definitions to the resulting draw order, including broken paths.
      let offset = 0;
      definitions = definitions.map(definition => {
        const graphicIndices = definition.graphicIndices.map(() => offset++);
        return { ...definition, graphicIndices };
      });
    }
  }
  const positions = selectionResolvers?.identityOnly
    ? new Map(requireDataset(program, layer.data).rowKeys.map((key, index) => [key, index]))
    : undefined;
  return Object.freeze(definitions.map((definition, index) => {
    const indices = definition.graphicIndices ?? [index];
    const items = indices.map(childIndex => graphic.items[childIndex]);
    if (positions !== undefined) return Object.freeze({
      key: definition.key,
      topology: definition.topology,
      graphicRoles: Object.freeze(definition.graphicRoles ?? ["body"]),
      rowKeys: Object.freeze([...new Set(definition.memberKeys)].sort((a, b) => positions.get(a) - positions.get(b))),
      graphicIds: Object.freeze(items.map((child, offset) => child.id ?? graphicId(layer, indices[offset])))
    });
    const properties = definition.properties === undefined ? (
      items.length === 1
        ? selectableGraphicProperties({
            type: items[0].type ?? graphic.type,
            properties: items[0].properties
          })
        : {
            ...sharedConcreteProperties(items),
            ...collectionBounds(program, items)
          }
    ) : { ...definition.properties, ...concreteProperties(items[0]?.properties) };
    return Object.freeze({
      key: definition.key,
      topology: definition.topology,
      graphicRoles: Object.freeze(definition.graphicRoles ?? ["body"]),
      layer: layer.id,
      markType: layer.mark.type,
      fields: cloneAndFreeze(definition.fields),
      channels: cloneAndFreeze(definition.channels),
      properties: cloneAndFreeze(properties),
      ...(definition.geometry === undefined
        ? {}
        : { geometry: cloneAndFreeze(definition.geometry) }),
      members: Object.freeze([...definition.members]),
      rows: Object.freeze(memberRowReferences(program, definition.members, layer.data, definition.memberKeys)),
      graphicIds: Object.freeze(items.map((child, childOffset) =>
        child.id ?? graphicId(layer, indices[childOffset])
      ))
    });
  }));
}

export function reorderHighlightedItems(program, layer, definitions, groups = {}, selectionResolvers) {
  let ordered = definitions;
  for (const config of Object.values(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (config.target !== layer.id || config.bringToFront !== true) continue;
    const selection = program.materializationConfigs.selections?.[config.selection];
    if (selection?.target !== layer.id) continue;
    const predicate = selectionPredicate(program, selection, selectionResolvers);
    const grouped = groups[predicate.grain];
    const candidates = (grouped ?? ordered).map(item => ({ ...item, properties: item.properties ?? {}, ...(predicate.rows ? { rows: memberRowReferences(program, item.members, layer.data, item.memberKeys) } : {}) }));
    let selected = new Set(selectProgramItemKeys(program, candidates, predicate));
    if (grouped) {
      const members = new Set(grouped.filter(item => selected.has(item.key)).flatMap(item => item.members));
      selected = new Set(ordered.filter(item => item.members.some(row => members.has(row))).map(item => item.key));
    }
    ordered = [
      ...ordered.filter(definition => !selected.has(definition.key)),
      ...ordered.filter(definition => selected.has(definition.key))
    ];
  }
  return ordered;
}
