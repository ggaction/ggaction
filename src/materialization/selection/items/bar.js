import { conditionalPositionTemplate } from "../../../core/encodingBindings.js";
import { resolveRowEncodingValues } from "../../rowEncoding.js";
import { conditionalBarStructure, hasConditionalBarPosition, BAR_POSITION_CHANNELS } from "../../conditionalBarStructure.js";
import { conditionalAggregateBarValues, conditionalHistogramBarValues } from "../../conditionalBarValues.js";
import { hasRectRadius } from "../../../grammar/roundedRect.js";
import { deriveSeriesBarCells } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import { numericExtent } from "../../../grammar/numeric.js";
import {
  readScaleField
} from "../../../grammar/scales/index.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { deriveHistogramSegments } from "../../bars/histogram.js";
import {
  channelMapFromRow,
  finalizeItems,
  reorderHighlightedItems,
  identifyItems,
  ownFields,
  uniqueFields
} from "./common.js";

function aggregateCellDefinitions(program, layer, dataset, suppliedSegments) {
  const channels = resolveBarChannels(layer);
  const categoryEncoding = layer.encoding[channels.category];
  const categoryScale = program.resolvedScales[categoryEncoding.scale];
  const colorEncoding = layer.encoding?.color;
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  const offsetChannel = resolveBarOffsetChannel(layer);
  const offsetScale = program.resolvedScales[layer.encoding?.[offsetChannel]?.scale];
  const layout = resolveBarColorLayout(layer);
  const stroke = layer.encoding?.stroke;

  function definition(cell, start, end) {
    const members = cell.sourceIndices.map(index => dataset.values[index]);
    const strokeValues = stroke === undefined ? undefined : readScaleField(
      members,
      stroke.field,
      stroke.fieldType,
      { temporalUnit: stroke.temporalUnit }
    );
    if (strokeValues !== undefined && new Set(strokeValues).size !== 1) {
      throw new Error("Bar stroke requires one value within each aggregate cell.");
    }
    return {
      semanticIdentity: ["cell", channels.category, cell[channels.category],
        cell.series ?? (["nominal", "ordinal"].includes(colorEncoding?.fieldType) ? cell.color : null),
        layer.encoding[channels.measure].field, layer.encoding[channels.measure].aggregate],
      fields: uniqueFields(members),
      channels: {
        [channels.category]: cell[channels.category],
        [channels.measure]: start,
        [`${channels.measure}2`]: end,
        ...(cell.color === undefined ? {} : { color: cell.color }),
        ...(strokeValues === undefined ? {} : { stroke: strokeValues[0] }),
        ...(layer.encoding?.[offsetChannel] === undefined
          ? {}
          : { [offsetChannel]: cell.series ?? cell.color })
      },
      members
    };
  }

  const categories = categoryScale.type === "time" ? undefined : categoryScale.domain;
  const series = layout === "group" ? offsetScale?.domain
    : layer.encoding.group === undefined && colorEncoding?.fieldType !== "quantitative" ? colorScale?.domain : undefined;
  return (suppliedSegments ?? deriveSeriesBarCells(dataset.values, layer, categories, series))
    .map(({ cell, start, end }) => definition(cell, start, end));
}

function histogramDefinitions(program, layer, dataset, suppliedSegments) {
  const xEncoding = layer.encoding.x;
  const colorEncoding = layer.encoding?.color;
  const segments = suppliedSegments ?? deriveHistogramSegments({
    dataset,
    layer,
    xEncoding,
    xScale: findSemanticScale(program, xEncoding.scale),
    resolvedScales: program.resolvedScales
  });
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  const stroke = layer.encoding?.stroke;
  return segments.map(segment => {
    const colorValue = segment.colorValue ?? colorScale?.domain[segment.category];
    const strokeValues = stroke === undefined ? undefined : readScaleField(
      segment.members,
      stroke.field,
      stroke.fieldType,
      { temporalUnit: stroke.temporalUnit }
    );
    if (strokeValues !== undefined && new Set(strokeValues).size !== 1) {
      throw new Error("Histogram stroke requires one value within each bin/series cell.");
    }
    return {
      semanticIdentity: ["bin", segment.start, segment.end, segment.series ?? colorValue],
      fields: uniqueFields(segment.members),
      channels: {
        x: segment.start,
        x2: segment.end,
        y: segment.stackStart,
        y2: segment.stackEnd,
        ...(colorValue === undefined ? {} : { color: colorValue }),
        ...(strokeValues === undefined ? {} : { stroke: strokeValues[0] })
      },
      members: segment.members
    };
  });
}

function rangedDefinitions(program, layer, dataset, storedLayer, resolvers) {
  const measure = resolveBarGrain(layer) === BAR_GRAINS.centered ? resolveBarChannels(layer).measure : undefined;
  const selected = storedLayer === undefined ? {} : Object.fromEntries(BAR_POSITION_CHANNELS.map(channel => [channel,
    resolveRowEncodingValues(program, storedLayer, dataset, channel, resolvers, { mapped: false })]).filter(([, values]) => values !== undefined));
  return dataset.values.map((row, index) => ({
    rowKey: dataset.rowKeys[index],
    fields: ownFields(row),
    channels: { ...channelMapFromRow(row, layer), ...Object.fromEntries(Object.entries(selected).map(([channel, values]) => [channel, values[index]])),
      ...(measure !== undefined && layer.encoding[`${measure}2`] === undefined
        ? { [measure]: 0, [`${measure}2`]: selected[measure]?.[index] ?? row[layer.encoding[measure].field] } : {}) },
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
  if (hasConditionalBarPosition(layer)) layer = conditionalPositionTemplate(layer, BAR_POSITION_CHANNELS);
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
    const [minimum, maximum] = numericExtent(endpoints);
    const members = grouped.flatMap(definition => definition.members);
    return {
      semanticIdentity: ["stack", categoryChannels.map(channel => grouped[0].channels[channel])],
      fields: uniqueFields(members),
      channels: {
        ...sharedChannels(grouped),
        [measure]: minimum,
        [secondary]: maximum
      },
      members,
      graphicIndices: entries.map(entry => entry.index)
    };
  });
}

export function resolveBarItemDefinitions(program, layer, dataset, { sourceOnly = false, resolvers } = {}) {
  const storedLayer = layer;
  let segments;
  if (hasConditionalBarPosition(layer)) {
    const structure = conditionalBarStructure(program, layer, dataset);
    if (structure.grain === BAR_GRAINS.aggregate) segments = sourceOnly
      ? structure.derived.values.map(cell => ({ cell, start: 0, end: cell[structure.channels.measure] }))
      : conditionalAggregateBarValues(program, layer, dataset, resolvers).segments;
    if (structure.grain === BAR_GRAINS.histogram) segments = sourceOnly
      ? structure.derived.values.filter(cell => cell.members.length > 0).map(cell => ({ ...cell, stackStart: 0, stackEnd: cell.mass }))
      : conditionalHistogramBarValues(program, layer, dataset, resolvers).segments;
    layer = structure.template;
  }
  const grain = resolveBarGrain(layer);
  const definitions = grain === BAR_GRAINS.histogram
    ? histogramDefinitions(program, layer, dataset, segments)
    : grain === BAR_GRAINS.aggregate
      ? aggregateCellDefinitions(program, layer, dataset, segments)
      : [BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(grain)
        ? rangedDefinitions(program, layer, dataset, sourceOnly ? undefined : storedLayer, resolvers)
        : undefined;
  if (definitions === undefined) {
    throw new Error(`Bar mark "${layer.id}" is incomplete for selection.`);
  }
  return definitions;
}

export function resolveBarItems(program, layer, dataset, selectionGrain, resolveItems, selectionResolvers) {
  const grain = resolveBarGrain(layer);
  const definitions = identifyItems(program, layer, grain, resolveBarItemDefinitions(program, layer, dataset, { resolvers: selectionResolvers }));
  const needsStacks = selectionGrain === 'stack' || Object.values(program.materializationConfigs.highlights ?? {}).some(config =>
    config.target === layer.id && program.materializationConfigs.selections?.[config.selection]?.grain === 'stack');
  const stacks = needsStacks ? identifyItems(program, layer, "stack", barStackDefinitions(layer, grain, definitions)) : undefined;
  const ordered = reorderHighlightedItems(program, layer, definitions, { stack: stacks }, selectionResolvers);
  const graphicTypes = hasRectRadius(program.markConfigs[layer.id]?.barAppearance) ? ["rect", "path"] : "rect";
  if (selectionGrain === "stack") {
    return finalizeItems(
      program,
      layer,
      "stack",
      stacks.map(stack => ({ ...stack, graphicIndices: stack.graphicIndices.map(index => ordered.indexOf(definitions[index])) })),
      graphicTypes, { reorder: false, selectionResolvers }
    );
  }
  return finalizeItems(program, layer, grain, ordered, graphicTypes, { reorder: false, selectionResolvers });
}

export function resolveBarSourceItems(program, layer, dataset, selectionGrain, { selected = false, resolvers } = {}) {
  const definitions = resolveBarItemDefinitions(program, layer, dataset, { sourceOnly: !selected, resolvers });
  return identifyItems(program, layer, selectionGrain === 'stack' ? 'stack' : resolveBarGrain(layer),
    selectionGrain === 'stack' ? barStackDefinitions(layer, resolveBarGrain(layer), definitions) : definitions);
}
