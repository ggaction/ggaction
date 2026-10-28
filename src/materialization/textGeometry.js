import { requestedStrokeDetails } from "../grammar/strokeStyle.js";
import { bindTextFontProperties } from "./textFont.js";
import { hasPositionBinding } from "../core/encodingBindings.js";
import { contentValue, resolveTextSourceBindings } from "./textContent.js";
export { sourceValue } from "./textContent.js";
import { mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { identifyItems } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";
import { conditionalPositionUsesRows } from "../grammar/conditionalPosition.js";
import { selectionPredicate } from "./selection/predicate.js";
import { DEFAULT_TEXT_MARK, conditionalTextUsesRows, resolveTextOverrides, textIdentity, textIdentityOccurrences } from "../grammar/text.js";
import { resolveBarChannels } from "../grammar/bars/policy.js";
import {
  assertMarkLabelPlacementSupport,
  normalizeMarkLabelPlacement,
  resolveMarkLabelPlacement
} from "../layout/labels.js";
import { resolveMarkLabelValues } from "../grammar/markLabels.js";
import { formatTextValue, resolveTextLines, resolveTextOffsetDataset, textOffsetValue } from "../grammar/text.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { findDataset } from "../selectors/datasets.js";
import { findCoordinate } from "../selectors/coordinates.js";
import { findLayer } from "../selectors/layers.js";
import { unionConcreteGraphicBounds } from
  "../grammar/schemas/graphicBounds.js";
import { findGraphic } from "../grammar/schemas/graphicTree.js";
import { polarDirection } from "../grammar/polar.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../grammar/markSelection.js";

import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveRowEncodingValues } from "./rowEncoding.js";

function barAnchor(program, source, item) {
  const channels = resolveBarChannels(source);
  const measure = channels.measure;
  const endpoint = item.channels[`${measure}2`];
  const scale = program.resolvedScales[source.encoding[measure].scale];
  const mapped = endpoint === undefined || scale === undefined
    ? undefined
    : mapScaleConsumerValues([endpoint], scale, measure)[0];
  return measure === "x"
    ? {
        x: mapped ?? item.properties.x + item.properties.width,
        y: item.properties.y + item.properties.height / 2
      }
    : {
        x: item.properties.x + item.properties.width / 2,
        y: mapped ?? item.properties.y
      };
}

function sourceAnchor(program, source, item) {
  if (source.mark.type === "bar") return barAnchor(program, source, item);
  if (source.mark.type === "rect") {
    return {
      x: item.properties.x + item.properties.width / 2,
      y: item.properties.y + item.properties.height / 2
    };
  }
  if (source.mark.type === "rule") {
    return {
      x: item.properties.x2,
      y: item.properties.y2
    };
  }
  if (source.mark.type === "line") {
    const graphicId = item.graphicIds?.[0];
    const graphic = findGraphic(program.graphicSpec, graphicId)?.object;
    const commands = graphic?.properties?.commands;
    const endpoint = Array.isArray(commands)
      ? commands.findLast(command => Number.isFinite(command.x) && Number.isFinite(command.y))
      : undefined;
    return { x: endpoint?.x, y: endpoint?.y };
  }
  return { x: item.properties.x, y: item.properties.y };
}

function explicitIntervalAxis(source) {
  const axes = ["x", "y"].filter(axis =>
    hasPositionBinding(source, axis) &&
    hasPositionBinding(source, `${axis}2`)
  );
  return axes.length === 1 ? axes[0] : undefined;
}

function sourcePlacementContext(program, source) {
  const coordinateType = findCoordinate(program, source.coordinate)?.type;
  return {
    markType: source.mark.type,
    coordinateType,
    intervalAxis: source.mark.type === "bar"
      ? resolveBarChannels(source).measure
      : source.mark.type === "rect"
        ? explicitIntervalAxis(source)
        : undefined
  };
}

export function validateSourceMarkLabelPlacement(program, sourceId, value) {
  const source = findLayer(program, sourceId);
  if (source === undefined) {
    throw new Error(`Unknown mark label placement source "${sourceId}".`);
  }
  const placement = normalizeMarkLabelPlacement(value);
  assertMarkLabelPlacementSupport(sourcePlacementContext(program, source), placement);
  return placement;
}

function rectangleBounds(item) {
  const { x, y, width, height } = item.properties;
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new TypeError("Interval mark label placement requires finite rectangle geometry.");
  }
  return {
    left: Math.min(x, x + width),
    right: Math.max(x, x + width),
    top: Math.min(y, y + height),
    bottom: Math.max(y, y + height)
  };
}

function mappedChannel(program, source, item, channel) {
  const value = item.channels[channel];
  const primary = channel === "x2" ? "x" : channel === "y2" ? "y" : channel;
  const scale = program.resolvedScales[
    source.encoding?.[channel]?.scale ?? source.encoding?.[primary]?.scale
  ];
  return value === undefined || scale === undefined
    ? undefined
    : mapScaleConsumerValues([value], scale, channel)[0];
}

function scaleIncreaseDirection(program, source, axis) {
  const scale = program.resolvedScales[source.encoding?.[axis]?.scale];
  const domain = scale?.domain;
  if (!Array.isArray(domain) || domain.length < 2) {
    return axis === "x" ? { x: 1, y: 0 } : { x: 0, y: -1 };
  }
  const mapped = mapScaleConsumerValues(
    [domain[0], domain.at(-1)],
    scale,
    axis
  );
  const delta = mapped[1] - mapped[0];
  if (!Number.isFinite(delta) || delta === 0) {
    return axis === "x" ? { x: 1, y: 0 } : { x: 0, y: -1 };
  }
  return axis === "x"
    ? { x: Math.sign(delta), y: 0 }
    : { x: 0, y: Math.sign(delta) };
}

function intervalPlacementGeometry(program, source, item, axis) {
  const bounds = rectangleBounds(item);
  const primary = mappedChannel(program, source, item, axis);
  const secondary = mappedChannel(program, source, item, `${axis}2`);
  if (![primary, secondary].every(Number.isFinite)) {
    throw new TypeError(
      `${source.mark.type === "bar" ? "Bar" : "Rect"} semantic label placement requires resolved ${axis}/${axis}2 endpoints.`
    );
  }
  const cross = axis === "x"
    ? (bounds.top + bounds.bottom) / 2
    : (bounds.left + bounds.right) / 2;
  const start = axis === "x" ? { x: primary, y: cross } : { x: cross, y: primary };
  const end = axis === "x" ? { x: secondary, y: cross } : { x: cross, y: secondary };
  const delta = { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(delta.x, delta.y);
  const endOutward = length > 0
    ? { x: delta.x / length, y: delta.y / length }
    : scaleIncreaseDirection(program, source, axis);
  return {
    kind: "interval",
    center: {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    },
    start: {
      point: start,
      outward: { x: -endOutward.x, y: -endOutward.y }
    },
    end: { point: end, outward: endOutward },
    bounds
  };
}

function pointPlacementGeometry(program, source, item) {
  const center = { x: item.properties.x, y: item.properties.y };
  const coordinateType = findCoordinate(program, source.coordinate)?.type;
  if (coordinateType !== "polar") return { kind: "point", center };
  const thetaScale = program.resolvedScales[source.encoding?.theta?.scale];
  const thetaValue = item.channels.theta ?? (source.encoding?.theta?.field === undefined ? source.encoding?.theta?.datum : item.fields[source.encoding.theta.field]);
  const theta = thetaValue === undefined || thetaScale === undefined
    ? undefined
    : mapScaleConsumerValues([thetaValue], thetaScale, "theta")[0];
  const outward = Number.isFinite(theta) ? polarDirection(theta) : { x: 0, y: -1 };
  const objectBounds = unionConcreteGraphicBounds(
    program.graphicSpec,
    item.graphicIds
  , program.materializationConfigs.textMetrics);
  const corners = objectBounds === undefined ? [] : [
    { x: objectBounds.left, y: objectBounds.top },
    { x: objectBounds.right, y: objectBounds.top },
    { x: objectBounds.right, y: objectBounds.bottom },
    { x: objectBounds.left, y: objectBounds.bottom }
  ];
  const support = Math.max(0, ...corners.map(point =>
    (point.x - center.x) * outward.x + (point.y - center.y) * outward.y
  ));
  return {
    kind: "point",
    center,
    end: {
      point: {
        x: center.x + outward.x * support,
        y: center.y + outward.y * support
      },
      outward
    }
  };
}

function sourcePlacementGeometry(program, source, item) {
  if (source.mark.type === "bar") {
    return intervalPlacementGeometry(
      program,
      source,
      item,
      resolveBarChannels(source).measure
    );
  }
  if (source.mark.type === "rect") {
    const axis = explicitIntervalAxis(source);
    return axis === undefined
      ? { kind: "point", center: sourceAnchor(program, source, item) }
      : intervalPlacementGeometry(program, source, item, axis);
  }
  if (source.mark.type === "arc") return item.geometry;
  if (source.mark.type === "point") {
    return pointPlacementGeometry(program, source, item);
  }
  return { kind: "point", center: sourceAnchor(program, source, item) };
}

function concreteTextItem(program, config, position, text, { offsets = true } = {}) {
  const x = position.x;
  const y = position.y;
  if (text === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  const lines = resolveTextLines(text, config);
  return {
    type: "text",
    properties: bindTextFontProperties(program, {
      x: x + (offsets ? config.dx : 0),
      y: y + (offsets ? config.dy : 0),
      text,
      ...requestedStrokeDetails(config),
      ...(lines === undefined ? {} : { lines }),
      fill: config.fill,
      opacity: config.opacity,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: config.align,
      textBaseline: config.baseline,
      rotation: config.rotation
    })
  };
}

function relativeLuminance(color) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
    return undefined;
  }
  const channels = [1, 3, 5].map(offset =>
    Number.parseInt(color.slice(offset, offset + 2), 16) / 255
  ).map(value => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function sourceTextConfig(program, config, source, item) {
  if (config.inheritColor && config.fillExplicit !== true) {
    let fill = item.properties[config.inheritColor];
    if (fill === undefined && config.inheritColor === "fill") {
      const fills = item.graphicIds.map(id => findGraphic(program.graphicSpec, id)?.object.properties?.fill);
      if (fills.length > 0 && fills.every(value => value !== undefined && JSON.stringify(value) === JSON.stringify(fills[0]))) fill = fills[0];
    }
    if (fill === undefined || config.inheritColor === "stroke" && typeof fill !== "string") throw new Error(`Source mark "${source.id}" has no resolved ${config.inheritColor} color.`);
    return { ...config, fill };
  }
  if (
    !["arc", "rect"].includes(source.mark.type) ||
    config.fillExplicit === true
  ) return config;
  const luminance = relativeLuminance(item.properties.fill);
  if (luminance === undefined) return config;
  return {
    ...config,
    fill: luminance >= 0.26 ? "#0f172a" : "#f8fafc"
  };
}

function resolveSourceTextItems(program, layer, config, identities, members, resolvers, sourceOnly) {
  const { resolveMarkItems } = resolvers;
  const source = findLayer(program, layer.source);
  if (source === undefined) {
    throw new Error(`Text mark "${layer.id}" requires source layer "${layer.source}".`);
  }
  const requested = program.markConfigs[layer.id]?.labelAuthoring?.selection ?? {
    kind: "all"
  };
  const resolveMarkSelection = (program, target, selector) => {
    const normalized = normalizeMarkSelector(selector);
    const items = resolveMarkItems(program, target, normalized.grain, { channels: normalized.channel === undefined ? [] : [normalized.channel] });
    return { items, keys: selectMarkItemKeys(items, normalized) };
  };
  let allItems;
  let items;
  if (requested.kind === "all") {
    allItems = resolveMarkItems(program, source.id, "item", { channels: [] });
    items = allItems;
  } else if (requested.kind === "inline") {
    const resolved = resolveMarkSelection(program, source.id, requested.selector);
    allItems = resolved.items;
    const selected = new Set(resolved.keys);
    items = allItems.filter(item => selected.has(item.key));
  } else if (requested.kind === "named") {
    const definition = program.materializationConfigs.selections?.[requested.id];
    if (definition === undefined) {
      throw new Error(`Unknown label selection "${requested.id}".`);
    }
    if (definition.target !== source.id) {
      throw new Error(
        `Label selection "${requested.id}" must target source mark "${source.id}".`
      );
    }
    const resolved = resolveMarkSelection(program, source.id, selectionPredicate(program, definition, { resolveMarkItems, resolveMarkSourceItems: resolveMarkItems }));
    allItems = resolved.items;
    const selected = new Set(resolved.keys);
    items = allItems.filter(item => selected.has(item.key));
  } else {
    throw new Error(`Unknown label selection kind "${requested.kind}".`);
  }
  if (sourceOnly) return items.map(item => ({ members: item.members, fields: item.fields, channels: item.channels, semanticIdentity: ["label", item.key] }));
  const sourceBindings = resolveTextSourceBindings(program, layer, allItems, resolvers);
  const sourceByKey = sourceBindings === undefined ? undefined : new Map(allItems.map((item, index) => [item.key, sourceBindings[index]]));
  const conditionalFill = resolvers.skipAppearance ? undefined : resolveTextConditional(program, layer, "color", allItems, resolvers);
  const fillByKey = conditionalFill === undefined ? undefined : new Map(allItems.map((item, index) => [item.key, conditionalFill[index]]));
  const conditionalText = resolveTextConditional(program, layer, "text", allItems, resolvers);
  const textByKey = conditionalText === undefined ? undefined : new Map(allItems.map((item, index) => [item.key, conditionalText[index]]));
  const resolvedValues = layer.encoding?.text?.content === undefined ? undefined
    : resolveMarkLabelValues(source, allItems, layer.encoding.text, { sources: sourceBindings });
  const values = resolvedValues === undefined ? undefined : new Map(
    allItems.map((item, index) => [item.key, resolvedValues[index]])
  );
  const identityValues = identities ? textIdentityOccurrences(allItems) : undefined;
  const identityRecords = identities ? new Map(allItems.map((item, index) => [item, identityValues[index]])) : undefined;
  const overrides = resolveTextOverrides(allItems, config.textOverrides);
  return items.flatMap(item => {
    const itemSource = sourceByKey?.get(item.key) ?? source;
    const identity = identityRecords?.get(item);
    const provenance = members ? { members: item.members, fields: item.fields, channels: item.channels, semanticIdentity: ["label", item.key] } : {};
    let resolvedConfig = sourceTextConfig(program, config, itemSource, item);
    if (resolvers.skipAppearance && resolvedConfig.fill === undefined) resolvedConfig = { ...resolvedConfig, fill: DEFAULT_TEXT_MARK.fill };
    if (fillByKey !== undefined) resolvedConfig = { ...resolvedConfig, fill: fillByKey.get(item.key), fillExplicit: true };
    const text = overrides.has(item) ? overrides.get(item) : textByKey !== undefined ? textByKey.get(item.key) : formatTextValue(
      values === undefined
        ? contentValue(layer.encoding.text, item, itemSource)
        : values.get(item.key),
      layer.encoding.text.format
    );
    if (text === undefined) return [];
    const placement = program.markConfigs[layer.id]?.labelAuthoring?.placement;
    if (placement === undefined) {
      const anchor = sourceAnchor(program, itemSource, item);
      const concrete = concreteTextItem(program, resolvedConfig, anchor, text);
      return concrete === undefined ? [] : [{ graphic: concrete, anchor, ...identity, ...provenance }];
    }
    assertMarkLabelPlacementSupport(sourcePlacementContext(program, itemSource), placement);
    const resolved = resolveMarkLabelPlacement({
      placement,
      geometry: sourcePlacementGeometry(program, itemSource, item),
      text: {
        text,
        lines: resolveTextLines(text, resolvedConfig),
        fontSize: resolvedConfig.fontSize,
        fontFamily: resolvedConfig.fontFamily,
        fontWeight: resolvedConfig.fontWeight,
        textAlign: resolvedConfig.align,
        textBaseline: resolvedConfig.baseline,
        rotation: resolvedConfig.rotation,
        dx: resolvedConfig.dx,
        dy: resolvedConfig.dy
      }
    }, program.materializationConfigs.textMetrics);
    if (!resolved.visible) return [];
    if (
      resolved.anchor.startsWith("outside") &&
      config.fillExplicit !== true && !config.inheritColor && fillByKey === undefined
    ) {
      resolvedConfig = config;
    }
    const anchor = { x: resolved.sourceX, y: resolved.sourceY };
    return [{
      graphic: concreteTextItem(
        program, resolvedConfig,
        { x: resolved.x, y: resolved.y },
        text,
        { offsets: false }
      ),
      anchor,
      ...identity,
      ...provenance,
      placement: resolved
    }];
  });
}

function resolveRowTextItems(program, layer, config, includeIdentities, members, resolvers) {
  const sourceDataset = findDataset(program, layer.data);
  if (sourceDataset === undefined) {
    throw new Error(`Text mark "${layer.id}" requires an existing dataset.`);
  }
  const dataset = resolveTextOffsetDataset(layer, sourceDataset);
  const encodings = [layer.encoding?.x, layer.encoding?.y, layer.encoding?.text, layer.encoding?.color,
    layer.encoding?.dx, layer.encoding?.dy];
  const length = conditionalTextUsesRows(layer) || conditionalPositionUsesRows(layer) || encodings.some(encoding => encoding !== undefined && Object.hasOwn(encoding, "field"))
    ? dataset.values.length
    : 1;
  const positionValues = channel => {
    if (layer.conditionals?.[channel] !== undefined) return resolveRowEncodingValues(program, layer, dataset, channel, resolvers);
    const encoding = layer.encoding?.[channel];
    if (encoding === undefined) return undefined;
    if (Object.hasOwn(encoding, "field")) {
      return resolveRowEncodingValues(program, layer, dataset, channel);
    }
    const scale = program.resolvedScales[encoding.scale];
    if (scale === undefined) {
      throw new Error(
        `text mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
      );
    }
    const datum = normalizePositionDatum(
      encoding.datum,
      encoding.fieldType,
      channel,
      encoding.temporalUnit,
      "Text"
    );
    const mapped = ["nominal", "ordinal"].includes(encoding.fieldType)
      ? mapOrdinalPositionValues([datum], scale)
      : mapScaleConsumerValues([datum], scale, channel);
    return Array.from({ length }, () => mapped[0]);
  };
  const x = positionValues("x");
  const y = positionValues("y");
  if (x === undefined || y === undefined) return [];
  const rows = length === 1 && dataset.values.length === 0
    ? [undefined]
    : dataset.values.slice(0, length);
  const definitions = ["text", "dx", "dy", "color"].some(channel => layer.conditionals?.[channel] !== undefined) ? identifyItems(program, layer, "text", rows.map((row, index) => ({
    ...(dataset.rowKeys[index] === undefined ? { semanticIdentity: ["constant"] } : { rowKey: dataset.rowKeys[index] }),
    fields: row ?? {}, channels: {}, members: row === undefined ? [] : [row],
    rows: row === undefined ? [] : memberRowReferences(program, [row], layer.data, [dataset.rowKeys[index]])
  }))) : undefined;
  const conditionalText = resolveTextConditional(program, layer, "text", definitions, resolvers);
  const dx = resolveTextConditional(program, layer, "dx", definitions, resolvers);
  const dy = resolveTextConditional(program, layer, "dy", definitions, resolvers);
  const fills = resolveTextConditional(program, layer, "color", definitions, resolvers) ?? resolveRowEncodingValues(program, layer, dataset, "color");
  const identities = !includeIdentities && !config.textOverrides?.length ? [] : rows.map(row => textIdentity(row ?? {}, Object.fromEntries(
    Object.entries(layer.encoding).map(([channel, encoding]) => [channel,
      encoding.field === undefined ? encoding.datum : row?.[encoding.field]]))));
  const occurrences = includeIdentities ? textIdentityOccurrences(identities) : undefined;
  const overrides = resolveTextOverrides(identities, config.textOverrides);
  return rows.flatMap((row, index) => {
    const identity = identities[index];
    const text = overrides.has(identity) ? overrides.get(identity)
      : conditionalText !== undefined ? conditionalText[index] : formatTextValue(contentValue(layer.encoding.text, row), layer.encoding.text.format);
    const concrete = concreteTextItem(
      program,
      {
        ...config,
        ...(fills === undefined ? {} : { fill: fills[index] }),
        dx: dx === undefined ? textOffsetValue(layer.encoding?.dx, row, config.dx) : dx[index],
        dy: dy === undefined ? textOffsetValue(layer.encoding?.dy, row, config.dy) : dy[index]
      },
      { x: x[index], y: y[index] },
      text
    );
    return concrete === undefined
      ? []
      : [{ graphic: concrete, ...occurrences?.[index], ...(members ? { ...(dataset.rowKeys[index] === undefined ? { semanticIdentity: ["constant"] } : { rowKey: dataset.rowKeys[index] }), members: dataset.values[index] ? [dataset.values[index]] : [], fields: row ?? {}, channels: Object.fromEntries(Object.entries(layer.encoding).map(([channel, encoding]) => [channel, encoding.field === undefined ? encoding.datum : row?.[encoding.field]])) } : {}), anchor: { x: x[index], y: y[index] } }];
  });
}

export function resolveTextGraphicEntries(program, layer, config, { identities = false, members = false, resolveMarkItems, resolveMarkSourceItems, sourceOnly = false, skipAppearance = false } = {}) {
  return layer.source === undefined
    ? resolveRowTextItems(program, layer, config, identities, members, { resolveMarkItems, resolveMarkSourceItems })
    : resolveSourceTextItems(program, layer, config, identities, members, { resolveMarkItems, resolveMarkSourceItems, skipAppearance }, sourceOnly);
}

// Row membership is available before position materialization. Raw-field
// selections therefore never need to recursively build conditional geometry.
export function resolveIndependentTextSourceDefinitions(program, layer, dataset, config) {
  const eligible = resolveTextOffsetDataset(layer, dataset);
  const usesRows = conditionalTextUsesRows(layer) || conditionalPositionUsesRows(layer) || Object.values(layer.encoding ?? {}).some(encoding => encoding.field !== undefined);
  const rows = usesRows ? eligible.values : eligible.values.length ? eligible.values.slice(0, 1) : [undefined];
  return rows.flatMap((row, index) => {
    const text = layer.encoding?.text === undefined ? true
      : formatTextValue(contentValue(layer.encoding.text, row), layer.encoding.text.format);
    if (text === undefined && !config.textOverrides?.length) return [];
    return [{ ...(eligible.rowKeys[index] === undefined ? { semanticIdentity: ["constant"] } : { rowKey: eligible.rowKeys[index] }),
      fields: row ?? {}, members: row === undefined ? [] : [row], channels: Object.fromEntries(
        Object.entries(layer.encoding ?? {}).map(([channel, encoding]) => [channel, encoding.field === undefined ? encoding.datum : row?.[encoding.field]])) }];
  });
}

export function resolveIndependentTextItemDefinitions(program, layer, dataset, config, resolvers) {
  const definitions = resolveIndependentTextSourceDefinitions(program, layer, dataset, config);
  const identified = identifyItems(program, layer, "text", definitions).map(item => ({ ...item,
    rows: memberRowReferences(program, item.members, layer.data, item.memberKeys) }));
  const texts = resolveTextConditional(program, layer, "text", identified, resolvers);
  const identities = definitions.map(item => textIdentity(item.fields, item.channels));
  const overrides = resolveTextOverrides(identities, config.textOverrides);
  return definitions.filter((item, index) => {
    if (overrides.has(identities[index])) return overrides.get(identities[index]) !== undefined;
    if (texts !== undefined) return texts[index] !== undefined;
    return layer.encoding?.text === undefined || formatTextValue(contentValue(layer.encoding.text, item.fields), layer.encoding.text.format) !== undefined;
  });
}

function resolveTextConditional(program, layer, channel, items, resolvers) {
  const definition = layer.conditionals?.[channel];
  if (definition === undefined) return undefined;
  const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
  return mapConditionalValues(program, layer, channel, items, membership, { resolvers });
}
