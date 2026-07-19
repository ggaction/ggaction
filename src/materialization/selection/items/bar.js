import { deriveBarAggregates } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import { layoutSeriesPartition } from "../../../grammar/seriesLayout.js";
import {
  readNominalField,
  readTemporalField
} from "../../../grammar/scales/index.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { deriveHistogramSegments } from "../../bars/histogram.js";
import {
  channelMapFromRow,
  finalizeItems,
  itemKey,
  ownFields,
  uniqueFields
} from "./common.js";

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
  const colors = !["nominal", "ordinal"].includes(color?.fieldType)
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
  const offsetChannel = resolveBarOffsetChannel(layer);
  const offsetScale = program.resolvedScales[layer.encoding?.[offsetChannel]?.scale];
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
        ...(layer.encoding?.[offsetChannel] === undefined
          ? {}
          : { [offsetChannel]: cell.color })
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
        : [definition(cell, measureScale.domain[0], cell[channels.measure])];
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
