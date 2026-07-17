import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { deriveAreaSeries, deriveDensityAreaSeries } from "../../grammar/areaSeries.js";
import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { deriveLineSeries } from "../../grammar/lineSeries.js";
import { deriveRuleValues } from "../../grammar/rules.js";
import {
  MARK_GRAPHIC_PROPERTIES,
  selectMarkItemKeys
} from "../../grammar/markSelection.js";
import { layoutSeriesPartition } from "../../grammar/seriesLayout.js";
import {
  readNominalField,
  readTemporalField
} from "../../grammar/scales.js";
import { deriveHistogramSegments } from "../bars/histogram.js";
import { findUpstreamTransform } from "../dataProvenance.js";
import { unionConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { findSemanticScale } from "../../selectors/scales.js";

function itemKey(layer, grain, index) {
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

function channelMapFromRow(row, layer) {
  return Object.fromEntries(
    Object.entries(layer.encoding ?? {})
      .map(([channel, encoding]) => [channel, encodingValue(row, encoding)])
      .filter(([, value]) => value !== undefined)
  );
}

function ownFields(row) {
  return isPlainObject(row) ? { ...row } : {};
}

function uniqueFields(rows) {
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

function concreteProperties(properties) {
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

function finalizeItems(program, layer, grain, definitions, graphicType) {
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

export function resolvePointItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  const completePosition = (
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  ) || (
    layer.encoding?.theta?.scale !== undefined &&
    layer.encoding?.radius?.scale !== undefined
  );
  if (
    !Array.isArray(graphic?.items) ||
    !completePosition ||
    (
      layer.encoding?.size?.scale === undefined &&
      !Number.isFinite(program.markConfigs[layer.id]?.radius)
    )
  ) {
    throw new Error(`Point mark "${layer.id}" is incomplete for selection.`);
  }
  let definitions = dataset.values.map((row, index) => ({
    key: itemKey(layer, "point", index),
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    properties: concreteProperties(graphic.items[index]?.properties),
    members: [row]
  }));
  for (const config of Object.values(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (config.target !== layer.id || config.bringToFront !== true) continue;
    const selection = program.materializationConfigs.selections?.[config.selection];
    if (selection?.target !== layer.id) continue;
    const selected = new Set(selectMarkItemKeys(definitions, selection.selector));
    definitions = [
      ...definitions.filter(definition => !selected.has(definition.key)),
      ...definitions.filter(definition => selected.has(definition.key))
    ];
  }
  return finalizeItems(
    program,
    layer,
    "point",
    definitions,
    program.graphicSpec.objects[layer.id]?.type
  );
}

function categoryValues(rows, encoding) {
  return encoding.fieldType === "temporal"
    ? readTemporalField(rows, encoding.field)
    : readNominalField(rows, encoding.field);
}

function aggregateMembers(rows, layer, cell, channels) {
  const category = layer.encoding[channels.category];
  const categories = categoryValues(rows, category);
  const categoryValue = cell[channels.category];
  const color = layer.encoding?.color;
  const colors = color?.fieldType !== "nominal"
    ? undefined
    : readNominalField(rows, color.field);
  return rows.filter((_, index) =>
    categories[index] === categoryValue &&
    (colors === undefined || colors[index] === cell.color)
  );
}

function aggregateCellDefinitions(program, layer, dataset) {
  const channels = resolveBarChannels(layer);
  const derived = deriveBarAggregates(dataset.values, layer).values;
  const categoryEncoding = layer.encoding[channels.category];
  const categoryScale = program.resolvedScales[categoryEncoding.scale];
  const measureScale = program.resolvedScales[
    layer.encoding[channels.measure].scale
  ];
  const colorEncoding = layer.encoding?.color;
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  const offsetScale = program.resolvedScales[layer.encoding?.xOffset?.scale];
  const layout = resolveBarColorLayout(layer);

  function definition(cell, start, end) {
    const members = aggregateMembers(dataset.values, layer, cell, channels);
    return {
      fields: uniqueFields(members),
      channels: {
        [channels.category]: cell[channels.category],
        [channels.measure]: start,
        [`${channels.measure}2`]: end,
        ...(cell.color === undefined ? {} : { color: cell.color }),
        ...(layer.encoding?.xOffset === undefined
          ? {}
          : { xOffset: cell.color })
      },
      members
    };
  }

  if (colorEncoding?.fieldType === "quantitative") {
    const cells = new Map(derived.map(cell => [
      cell[channels.category],
      cell
    ]));
    const categories = ["ordinal", "band", "point"].includes(categoryScale.type)
      ? categoryScale.domain
      : [...new Set(derived.map(cell => cell[channels.category]))]
          .sort((left, right) => left - right);
    return categories.flatMap(category => {
      const cell = cells.get(category);
      return cell === undefined
        ? []
        : [definition(
            cell,
            measureScale.domain[0],
            cell[channels.measure]
          )];
    });
  }

  if (layout === "group" && offsetScale !== undefined) {
    const categoryIndex = new Map(
      categoryScale.domain.map((value, index) => [value, index])
    );
    const offsetIndex = new Map(
      offsetScale.domain.map((value, index) => [value, index])
    );
    const cells = [...derived].sort((left, right) =>
      categoryIndex.get(left[channels.category]) -
        categoryIndex.get(right[channels.category]) ||
      offsetIndex.get(left.color) - offsetIndex.get(right.color)
    );
    return cells.map(cell => definition(
      cell,
      measureScale.domain[0],
      cell[channels.measure]
    ));
  }

  const categories = ["ordinal", "band", "point"].includes(categoryScale.type)
    ? categoryScale.domain
    : [...new Set(derived.map(cell => cell[channels.category]))]
        .sort((left, right) => left - right);
  const series = colorScale?.domain ?? [undefined];
  const lookup = new Map(derived.map(cell => [
    JSON.stringify([cell[channels.category], cell.color]),
    cell
  ]));
  const baseline = layout === "overlay" ? measureScale.domain[0] : 0;
  return categories.flatMap(category => {
    const cells = series.map(color =>
      lookup.get(JSON.stringify([category, color]))
    );
    const values = cells.map(cell => cell?.[channels.measure] ?? 0);
    return layoutSeriesPartition(values, layout, { baseline }).flatMap(segment => {
      const cell = cells[segment.index];
      return cell === undefined
        ? []
        : [definition(cell, segment.start, segment.end)];
    });
  });
}

function histogramDefinitions(program, layer, dataset) {
  const xEncoding = layer.encoding.x;
  const colorEncoding = layer.encoding?.color;
  const segments = deriveHistogramSegments({
    dataset,
    layer,
    xEncoding,
    xScale: findSemanticScale(program, xEncoding.scale),
    resolvedScales: program.resolvedScales
  });
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  return segments.map(segment => {
    const colorValue = colorScale?.domain[segment.category];
    return {
      fields: uniqueFields(segment.members),
      channels: {
        x: segment.start,
        x2: segment.end,
        y: segment.stackStart,
        y2: segment.stackEnd,
        ...(colorValue === undefined ? {} : { color: colorValue })
      },
      members: segment.members
    };
  });
}

function rangedDefinitions(layer, dataset) {
  return dataset.values.map(row => ({
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    members: [row]
  }));
}

function sharedChannels(definitions) {
  if (definitions.length === 0) return {};
  const shared = { ...definitions[0].channels };
  for (const channel of Object.keys(shared)) {
    if (!definitions.every(definition =>
      definition.channels[channel] === shared[channel]
    )) delete shared[channel];
  }
  return shared;
}

function barStackDefinitions(layer, barGrain, definitions) {
  const layout = resolveBarColorLayout(layer);
  if (!["stack", "fill", "diverging"].includes(layout)) {
    throw new Error(
      `Bar mark "${layer.id}" does not define stacked items at its current "${layout}" layout.`
    );
  }
  if (barGrain === BAR_GRAINS.ranged) {
    throw new Error(`Ranged bar mark "${layer.id}" has no stack grain.`);
  }
  const channels = resolveBarChannels(layer);
  const categoryChannels = barGrain === BAR_GRAINS.histogram
    ? ["x", "x2"]
    : [channels.category];
  const measure = channels.measure;
  const secondary = `${measure}2`;
  const groups = new Map();
  definitions.forEach((definition, index) => {
    const key = JSON.stringify(categoryChannels.map(channel =>
      definition.channels[channel]
    ));
    const group = groups.get(key) ?? [];
    group.push({ definition, index });
    groups.set(key, group);
  });

  return [...groups.values()].map((entries, index) => {
    const grouped = entries.map(entry => entry.definition);
    const endpoints = grouped.flatMap(definition => [
      definition.channels[measure],
      definition.channels[secondary]
    ]).filter(Number.isFinite);
    if (endpoints.length === 0) {
      throw new Error(
        `Bar mark "${layer.id}" stack ${index} has no resolved semantic endpoints.`
      );
    }
    const members = grouped.flatMap(definition => definition.members);
    return {
      key: itemKey(layer, "stack", index),
      fields: uniqueFields(members),
      channels: {
        ...sharedChannels(grouped),
        [measure]: Math.min(...endpoints),
        [secondary]: Math.max(...endpoints)
      },
      members,
      graphicIndices: entries.map(entry => entry.index)
    };
  });
}

export function resolveBarItems(program, layer, dataset, selectionGrain) {
  const grain = resolveBarGrain(layer);
  const definitions = grain === BAR_GRAINS.histogram
    ? histogramDefinitions(program, layer, dataset)
    : grain === BAR_GRAINS.aggregate
      ? aggregateCellDefinitions(program, layer, dataset)
      : grain === BAR_GRAINS.ranged
        ? rangedDefinitions(layer, dataset)
        : undefined;
  if (definitions === undefined) {
    throw new Error(`Bar mark "${layer.id}" is incomplete for selection.`);
  }
  if (selectionGrain === "stack") {
    return finalizeItems(
      program,
      layer,
      "stack",
      barStackDefinitions(layer, grain, definitions),
      "rect"
    );
  }
  return finalizeItems(program, layer, grain, definitions, "rect");
}

function rowsForSeries(rows, key) {
  const entries = Object.entries(key);
  return entries.length === 0
    ? rows
    : rows.filter(row => entries.every(([field, value]) => row[field] === value));
}

function seriesDefinitions(layer, rows, series) {
  return series.map(item => {
    const members = rowsForSeries(rows, item.key);
    const fields = { ...uniqueFields(members), ...item.key };
    const channels = Object.fromEntries(
      Object.entries(layer.encoding ?? {}).flatMap(([channel, encoding]) => {
        if (encoding.field === undefined) {
          return Object.hasOwn(encoding, "datum")
            ? [[channel, encoding.datum]]
            : [];
        }
        return Object.hasOwn(fields, encoding.field)
          ? [[channel, fields[encoding.field]]]
          : [];
      })
    );
    return { fields, channels, members };
  });
}

export function resolveLineItems(program, layer, dataset) {
  const derived = deriveLineSeries(dataset.values, layer);
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset.values, derived.series),
    "path"
  );
}

export function resolveAreaItems(program, layer, dataset) {
  const transform = findUpstreamTransform(program, dataset, "density");
  const derived = transform === undefined
    ? deriveAreaSeries(dataset.values, layer)
    : deriveDensityAreaSeries(dataset.values, layer, transform);
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset.values, derived.series),
    "path"
  );
}

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
