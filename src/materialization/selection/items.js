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
  readNominalField,
  readTemporalField
} from "../../grammar/scales.js";
import { deriveHistogramSegments } from "../bars/histogram.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";

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
  if (graphic?.type !== type || !Array.isArray(graphic.children)) {
    throw new Error(
      `Mark "${layer.id}" requires a materialized ${type} collection for selection.`
    );
  }
  return graphic;
}

function finalizeItems(program, layer, grain, definitions, graphicType) {
  const graphic = requireResolvedGraphic(program, layer, graphicType);
  if (graphic.children.length !== definitions.length) {
    throw new Error(
      `Mark "${layer.id}" item count does not match its materialized graphics.`
    );
  }
  return cloneAndFreeze(definitions.map((definition, index) => ({
    key: itemKey(layer, grain, index),
    layer: layer.id,
    markType: layer.mark.type,
    fields: definition.fields,
    channels: definition.channels,
    members: definition.members,
    graphicId: graphic.children[index]?.id ?? graphicId(layer, index)
  })));
}

function resolvePointItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  if (
    !Array.isArray(graphic?.children) ||
    graphic.children.some(child => {
      const type = child.type ?? graphic.type;
      const properties = child.properties ?? {};
      if (!Number.isFinite(properties.x) || !Number.isFinite(properties.y)) return true;
      if (type === "circle") return !Number.isFinite(properties.radius);
      if (type === "rect") {
        return !Number.isFinite(properties.width) || !Number.isFinite(properties.height);
      }
      return type === "path" && !Array.isArray(properties.commands);
    })
  ) {
    throw new Error(`Point mark "${layer.id}" is incomplete for selection.`);
  }
  return finalizeItems(
    program,
    layer,
    "point",
    dataset.values.map(row => ({
      fields: ownFields(row),
      channels: channelMapFromRow(row, layer),
      members: [row]
    })),
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
  const colors = color === undefined
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
  const measureEncoding = layer.encoding[channels.measure];
  const categoryScale = program.resolvedScales[categoryEncoding.scale];
  const colorEncoding = layer.encoding?.color;
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  const offsetScale = program.resolvedScales[layer.encoding?.xOffset?.scale];
  const layout = resolveBarColorLayout(layer);
  let cells;

  if (layout === "group" && offsetScale !== undefined) {
    const categoryIndex = new Map(
      categoryScale.domain.map((value, index) => [value, index])
    );
    const offsetIndex = new Map(
      offsetScale.domain.map((value, index) => [value, index])
    );
    cells = [...derived].sort((left, right) =>
      categoryIndex.get(left[channels.category]) -
        categoryIndex.get(right[channels.category]) ||
      offsetIndex.get(left.color) - offsetIndex.get(right.color)
    );
  } else {
    const categories = categoryScale.type === "ordinal"
      ? categoryScale.domain
      : [...new Set(derived.map(cell => cell[channels.category]))]
          .sort((left, right) => left - right);
    const series = colorScale?.domain ?? [undefined];
    const lookup = new Map(derived.map(cell => [
      JSON.stringify([cell[channels.category], cell.color]),
      cell
    ]));
    cells = categories.flatMap(category =>
      series.flatMap(color => {
        const cell = lookup.get(JSON.stringify([category, color]));
        return cell === undefined ? [] : [cell];
      })
    );
  }

  return cells.map(cell => {
    const members = aggregateMembers(dataset.values, layer, cell, channels);
    const categoryValue = cell[channels.category];
    const measureValue = cell[channels.measure];
    return {
      fields: {
        ...uniqueFields(members),
        [categoryEncoding.field]: categoryValue,
        [measureEncoding.field]: measureValue,
        ...(colorEncoding === undefined
          ? {}
          : { [colorEncoding.field]: cell.color })
      },
      channels: {
        [channels.category]: categoryValue,
        [channels.measure]: measureValue,
        ...(cell.color === undefined ? {} : { color: cell.color }),
        ...(layer.encoding?.xOffset === undefined
          ? {}
          : { xOffset: cell.color })
      },
      members
    };
  });
}

function histogramDefinitions(program, layer, dataset) {
  const xEncoding = layer.encoding.x;
  const yEncoding = layer.encoding.y;
  const colorEncoding = layer.encoding?.color;
  const segments = deriveHistogramSegments({
    dataset,
    layer,
    xEncoding,
    xScale: program.semanticSpec.scales.find(scale =>
      scale.id === xEncoding.scale
    ),
    resolvedScales: program.resolvedScales
  });
  const colorScale = program.resolvedScales[colorEncoding?.scale];
  return segments.map(segment => {
    const count = segment.stackEnd - segment.stackStart;
    const colorValue = colorScale?.domain[segment.category];
    return {
      fields: {
        ...uniqueFields(segment.members),
        [yEncoding.field]: count,
        ...(colorEncoding === undefined
          ? {}
          : { [colorEncoding.field]: colorValue })
      },
      channels: {
        x: [segment.start, segment.end],
        y: count,
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

function resolveBarItems(program, layer, dataset) {
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

function resolveLineItems(program, layer, dataset) {
  const derived = deriveLineSeries(dataset.values, layer);
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset.values, derived.series),
    "path"
  );
}

function resolveAreaItems(program, layer, dataset) {
  const transform = dataset.transform?.length === 1 &&
    dataset.transform[0].type === "density"
    ? dataset.transform[0]
    : undefined;
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

function resolveRuleItems(program, layer, dataset) {
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

export function resolveMarkItems(program, target) {
  const layer = findLayer(program, target);
  if (layer === undefined) throw new Error(`Unknown mark target "${target}".`);
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Mark "${target}" requires an existing dataset for selection.`);
  }
  if (layer.mark?.type === "point") return resolvePointItems(program, layer, dataset);
  if (layer.mark?.type === "bar") return resolveBarItems(program, layer, dataset);
  if (layer.mark?.type === "line") return resolveLineItems(program, layer, dataset);
  if (layer.mark?.type === "area") return resolveAreaItems(program, layer, dataset);
  if (layer.mark?.type === "rule") return resolveRuleItems(program, layer, dataset);
  throw new Error(`Mark "${target}" has no selectable item resolver.`);
}
