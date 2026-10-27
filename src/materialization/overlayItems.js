import { findCoordinate } from "../selectors/coordinates.js";
import { requireLayer } from "../selectors/layers.js";
import { requireMaterializedDataset } from "../selectors/datasets.js";
import { resolveBarItems, resolveBarItemDefinitions } from "./selection/items/bar.js";
import { resolvePointItems } from "./selection/items/point.js";
import { applyItemMissingPolicy } from "../grammar/itemMissing.js";
import { resolveBarChannels, resolveBarColorLayout } from "../grammar/bars/policy.js";
import { overlayGroupFields, overlayPositionEncoding, overlaySourceReason } from "../grammar/overlay.js";
import { mapContinuousScaleValues, mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { deriveLineSeries, resolveLineBins } from "../grammar/lineSeries.js";
import { deriveAreaSeries, deriveCenteredAreaSeries, deriveDensityAreaSeries, layoutDensityAreaSeries } from "../grammar/areaSeries.js";
import { findUpstreamTransform } from "./dataProvenance.js";
import { requireSemanticScale } from "../selectors/scales.js";
import { uniqueFields, ownFields, channelMapFromRow } from "./selection/items/common.js";
import { pointGraphicAnchor } from "../grammar/pointShapes.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveDirectionValues } from "../grammar/direction.js";

export function overlaySegments(group, binding) {
  const segments = [[]];
  for (const point of group.points) {
    const before = segments.at(-1).at(-1);
    if (binding.missing === "break" && ((before?.bin && point.bin &&
        Math.abs(before.bin[1] - point.bin[0]) > 1e-10) ||
        (Number.isFinite(before?.categoryIndex) && Number.isFinite(point.categoryIndex) &&
          Math.abs(point.categoryIndex - before.categoryIndex) > 1))) segments.push([]);
    segments.at(-1).push(point);
  }
  return segments.filter(points => points.length);
}

function sourcePointAnchor(program, source, item, graphics) {
  const owner = program.graphicSpec.objects[source.id];
  const graphic = graphics.get(item.graphicIds[0]);
  const encoding = source.encoding.shape;
  const shape = encoding?.scale ? mapScaleConsumerValues([item.fields[encoding.field]], program.resolvedScales[encoding.scale], "shape")[0]
    : program.markConfigs[source.id].shape ?? "circle";
  const angle = resolveDirectionValues(item.members, source.encoding.angle)?.[0];
  return pointGraphicAnchor({ ...graphic, type: graphic.type ?? owner.type }, shape, angle);
}

function mapPosition(program, source, channel, value) {
  const encoding = source.encoding[channel];
  const scale = program.resolvedScales[encoding.scale];
  const map = ["nominal", "ordinal"].includes(encoding.fieldType)
    ? mapOrdinalPositionValues : mapContinuousScaleValues;
  return map([value], scale)[0];
}

function itemGroups(items, source, binding) {
  const fields = overlayGroupFields(source);
  const groups = new Map();
  for (const item of items) {
    const tuple = fields.map(field => item.fields[field] ?? item.members[0]?.[field]);
    const key = binding.series === "total" ? "total" : JSON.stringify(tuple);
    if (!groups.has(key)) groups.set(key, { key, members: [], points: [] });
    const group = groups.get(key);
    group.members.push(...item.members);
    group.points.push(item);
  }
  return [...groups.values()];
}

export function resolveOverlaySeries(program, binding, { geometry = true } = {}) {
  const source = requireLayer(program, binding.source);
  const dataset = applyItemMissingPolicy(source, requireMaterializedDataset(program, source.data));
  const density = findUpstreamTransform(program, dataset, 'density');
  const unsupported = overlaySourceReason(source, findCoordinate(program, source.coordinate)?.type, density);
  if (unsupported) throw new Error(unsupported);
  if (["bar", "point"].includes(source.mark.type)) {
    const bar = source.mark.type === "bar";
    if (!bar && !binding.orderBy) throw new Error("Connecting point results requires explicit orderBy x or y.");
    const channels = bar ? resolveBarChannels(source) : { category: binding.orderBy, measure: binding.orderBy === "y" ? "x" : "y" };
    // Scale domains need the new final item grain before source graphics have
    // been rebuilt (for example, after facet filtering). Geometry consumers
    // still resolve and validate the fully materialized source collections.
    const items = geometry
      ? bar ? resolveBarItems(program, source, dataset, "item") : resolvePointItems(program, source, dataset)
      : bar ? resolveBarItemDefinitions(program, source, dataset)
        : dataset.values.map(row => ({ fields: ownFields(row), channels: channelMapFromRow(row, source), members: [row] }));
    const graphics = bar || !geometry ? undefined : new Map(program.graphicSpec.objects[source.id].items.map(item => [item.id, item]));
    const anchors = items.map(item => {
      const p = item.properties;
      const measure = item.channels[`${channels.measure}2`] ?? item.channels[channels.measure];
      const point = !geometry ? item.channels : bar ? p : sourcePointAnchor(program, source, item, graphics);
      const endpoint = bar && geometry ? mapPosition(program, source, channels.measure, measure) : point[channels.measure];
      const x = geometry && bar && channels.category === "x" ? p.x + p.width / 2 : channels.measure === "x" ? endpoint : point.x;
      const y = geometry && bar && channels.category === "y" ? p.y + p.height / 2 : channels.measure === "y" ? endpoint : point.y;
      const category = item.channels[channels.category];
      const categoryEnd = item.channels[`${channels.category}2`];
      const categoryScale = program.resolvedScales[source.encoding[channels.category].scale];
      const categoryValue = bar && source.encoding[channels.category].bin ? (category + categoryEnd) / 2 : category;
      return { ...item, x, y, measure, category,
        fields: { ...item.fields, ...(bar ? { [source.encoding[channels.measure].field]: measure,
          [source.encoding[channels.category].field]: categoryValue } : {}) },
        channels: { ...item.channels, ...(bar ? { [channels.measure]: measure, [channels.category]: categoryValue } : {}) },
        ...(["point", "band", "ordinal"].includes(categoryScale.type) ? { categoryIndex: categoryScale.domain.indexOf(category) } : {}),
        ...(bar && channels.category === "x" && source.encoding.x.bin ? { bin: [category, categoryEnd] } : {}) };
    }).filter(item => !geometry || Number.isFinite(item.x) && Number.isFinite(item.y));
    let groups = itemGroups(anchors, source, binding);
    if (bar && binding.series === "total") {
      if (overlayGroupFields(source).length && !["stack", "fill", "diverging"].includes(resolveBarColorLayout(source))) {
        throw new Error("A total overlay requires stacked source series; grouped and overlapping bars have separate endpoints.");
      }
      const cells = new Map();
      for (const item of anchors) {
        const key = JSON.stringify([item.category, item.bin, item.measure < 0 ? "negative" : "positive"]);
        const previous = cells.get(key);
        if (!previous || Math.abs(item.measure) > Math.abs(previous.measure)) cells.set(key, item);
      }
      groups = [false, true].map(negative => ({ key: negative ? "negative-total" : "positive-total",
        points: [...cells.values()].filter(item => (item.measure < 0) === negative), members: anchors.flatMap(item => item.members) }))
        .filter(group => group.points.length);
    }
    const direction = binding.orderBy ?? channels.category;
    for (const group of groups) {
      // Y categories run upward in data space. Preserve the source scale's order.
      const sign = direction === "y" ? -1 : 1;
      group.points.sort((a, b) => sign * (a[direction] - b[direction]));
    }
    return groups;
  }
  const x = source.encoding.x;
  const derived = source.mark.type === "line"
    ? deriveLineSeries(dataset.values, source, { scales: program.semanticSpec.scales,
      xDomain: program.resolvedScales[x.scale]?.domain,
      yDomain: program.resolvedScales[source.encoding.y.scale]?.domain,
      ...(x.bin ? { xBinBoundaries: resolveLineBins(dataset.values, source, requireSemanticScale(program, x.scale)).boundaries } : {}) })
    : density ? layoutDensityAreaSeries(deriveDensityAreaSeries(dataset.values, source, density), source.layout?.mode ?? source.encoding.color?.layout ?? "overlay")
      : source.encoding.y?.stack === "center" ? deriveCenteredAreaSeries(dataset.values, source)
        : deriveAreaSeries(dataset.values, source, { xDomain: program.resolvedScales[x.scale]?.domain,
          yDomain: program.resolvedScales[source.encoding.y.scale]?.domain });
  if (binding.series === "total" && derived.series.length > 1) {
    throw new Error("Total overlays currently require stacked bars; use source series for line or area results.");
  }
  function endpoint(point, channel) {
    if (channel === "y" && point.upper !== undefined) return point.upper;
    if (source.mark.type === "area" && (source.layout?.mode ?? "overlay") === "overlay" &&
      Object.hasOwn(source.encoding[`${channel}2`] ?? {}, "datum")) return point[channel];
    return point[`${channel}2`] ?? point[channel];
  }
  return derived.series.map(series => {
    const members = series.sourceIndices ? series.sourceIndices.map(i => dataset.values[i])
      : dataset.values.filter(row => Object.entries(series.key).every(([field, value]) => row[field] === value));
    return { key: JSON.stringify(series.key), members,
      points: series.values.map((point, i) => ({ key: JSON.stringify([series.key, endpoint(point, "x"), endpoint(point, "y")]), members,
        fields: { ...uniqueFields(members), ...series.key,
          [overlayPositionEncoding(source, "x").field]: endpoint(point, "x"),
          [overlayPositionEncoding(source, "y").field]: endpoint(point, "y") },
        x: mapPosition(program, source, "x", endpoint(point, "x")),
        y: mapPosition(program, source, "y", endpoint(point, "y")),
        channels: { x: endpoint(point, "x"), y: endpoint(point, "y") } })) };
  });
}
