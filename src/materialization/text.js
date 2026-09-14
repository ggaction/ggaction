import { resolveBarChannels } from "../grammar/bars/policy.js";
import {
  assertMarkLabelPlacementSupport,
  normalizeMarkLabelPlacement,
  resolveMarkLabelPlacement
} from "../layout/labels.js";
import { resolveMarkLabelValues } from "../grammar/markLabels.js";
import { formatTextValue } from "../grammar/text.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { findDataset } from "../selectors/datasets.js";
import { findCoordinate } from "../selectors/coordinates.js";
import { findLayer } from "../selectors/layers.js";
import { unionConcreteGraphicBounds } from
  "../grammar/schemas/graphicBounds.js";
import { polarDirection } from "../grammar/polar.js";
import { resolveMarkItems } from "./selection/policies/index.js";
import { resolveMarkSelection } from "./selection/state.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveRowEncodingValues } from "./rowEncoding.js";

function sourceValue(item, source, field) {
  const measure = source.mark.type === "bar" ? resolveBarChannels(source).measure
    : source.mark.type === "arc" ? "radius" : undefined;
  const encoding = source.encoding?.[measure];
  if (encoding?.field === field && encoding.aggregate != null && item.channels[measure] !== undefined) {
    return source.mark.type === "bar"
      ? item.channels[`${measure}2`] ?? item.channels[measure]
      : item.channels[measure];
  }
  if (Object.hasOwn(item.fields, field)) return item.fields[field];
  for (const [channel, encoding] of Object.entries(source.encoding ?? {})) {
    if (encoding?.field !== field || item.channels[channel] === undefined) continue;
    if (source.mark.type === "bar" && item.channels[`${channel}2`] !== undefined) {
      return item.channels[`${channel}2`];
    }
    return item.channels[channel];
  }
  if (item.members.length === 1 && Object.hasOwn(item.members[0], field)) {
    return item.members[0][field];
  }
  if (source.mark.type === "line" && item.members.length > 0) {
    const endpoint = item.members.at(-1);
    if (Object.hasOwn(endpoint, field)) return endpoint[field];
  }
  return undefined;
}

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
    const graphic = program.graphicSpec.objects[source.id]?.items?.find(
      candidate => candidate.id === graphicId
    );
    const commands = graphic?.properties?.commands;
    const endpoint = Array.isArray(commands)
      ? [...commands].reverse().find(command => Number.isFinite(command.x) && Number.isFinite(command.y))
      : undefined;
    return { x: endpoint?.x, y: endpoint?.y };
  }
  return { x: item.properties.x, y: item.properties.y };
}

function explicitIntervalAxis(source) {
  const axes = ["x", "y"].filter(axis =>
    source.encoding?.[axis] !== undefined &&
    source.encoding?.[`${axis}2`] !== undefined
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
  const theta = item.channels.theta === undefined || thetaScale === undefined
    ? undefined
    : mapScaleConsumerValues([item.channels.theta], thetaScale, "theta")[0];
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

function contentValue(encoding, rowOrItem, source) {
  return Object.hasOwn(encoding, "field")
    ? source === undefined
      ? rowOrItem[encoding.field]
      : sourceValue(rowOrItem, source, encoding.field)
    : encoding.datum;
}

function concreteTextItem(config, position, text, { offsets = true } = {}) {
  const x = position.x;
  const y = position.y;
  if (text === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  return {
    type: "text",
    properties: {
      x: x + (offsets ? config.dx : 0),
      y: y + (offsets ? config.dy : 0),
      text,
      fill: config.fill,
      opacity: config.opacity,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: config.align,
      textBaseline: config.baseline,
      rotation: config.rotation
    }
  };
}

function concreteItem(config, position, value, format) {
  return concreteTextItem(config, position, formatTextValue(value, format));
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

function sourceTextConfig(config, source, item) {
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

function resolveSourceTextItems(program, layer, config) {
  const source = findLayer(program, layer.source);
  if (source === undefined) {
    throw new Error(`Text mark "${layer.id}" requires source layer "${layer.source}".`);
  }
  const requested = program.markConfigs[layer.id]?.labelAuthoring?.selection ?? {
    kind: "all"
  };
  let allItems;
  let items;
  if (requested.kind === "all") {
    allItems = resolveMarkItems(program, source.id);
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
    const resolved = resolveMarkSelection(program, source.id, definition.selector);
    allItems = resolved.items;
    const selected = new Set(resolved.keys);
    items = allItems.filter(item => selected.has(item.key));
  } else {
    throw new Error(`Unknown label selection kind "${requested.kind}".`);
  }
  const resolvedValues = layer.encoding.text.content === undefined ? undefined
    : resolveMarkLabelValues(source, allItems, layer.encoding.text);
  const values = resolvedValues === undefined ? undefined : new Map(
    allItems.map((item, index) => [item.key, resolvedValues[index]])
  );
  return items.flatMap(item => {
    let resolvedConfig = sourceTextConfig(config, source, item);
    const text = formatTextValue(
      values === undefined
        ? contentValue(layer.encoding.text, item, source)
        : values.get(item.key),
      layer.encoding.text.format
    );
    if (text === undefined) return [];
    const placement = program.markConfigs[layer.id]?.labelAuthoring?.placement;
    if (placement === undefined) {
      const anchor = sourceAnchor(program, source, item);
      const concrete = concreteTextItem(resolvedConfig, anchor, text);
      return concrete === undefined ? [] : [{ graphic: concrete, anchor }];
    }
    assertMarkLabelPlacementSupport(sourcePlacementContext(program, source), placement);
    const resolved = resolveMarkLabelPlacement({
      placement,
      geometry: sourcePlacementGeometry(program, source, item),
      text: {
        text,
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
      config.fillExplicit !== true
    ) {
      resolvedConfig = config;
    }
    const anchor = { x: resolved.sourceX, y: resolved.sourceY };
    return [{
      graphic: concreteTextItem(
        resolvedConfig,
        { x: resolved.x, y: resolved.y },
        text,
        { offsets: false }
      ),
      anchor,
      placement: resolved
    }];
  });
}

function resolveRowTextItems(program, layer, config) {
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Text mark "${layer.id}" requires an existing dataset.`);
  }
  const encodings = [layer.encoding?.x, layer.encoding?.y, layer.encoding?.text];
  const length = encodings.some(encoding => encoding !== undefined && Object.hasOwn(encoding, "field"))
    ? dataset.values.length
    : 1;
  const positionValues = channel => {
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
  return rows.flatMap((row, index) => {
    const concrete = concreteItem(
      config,
      { x: x[index], y: y[index] },
      contentValue(layer.encoding.text, row),
      layer.encoding.text.format
    );
    return concrete === undefined
      ? []
      : [{ graphic: concrete, anchor: { x: x[index], y: y[index] } }];
  });
}

export function resolveTextGraphicEntries(program, layer, config) {
  return layer.source === undefined
    ? resolveRowTextItems(program, layer, config)
    : resolveSourceTextItems(program, layer, config);
}

export function resolveTextGraphicItems(program, layer, config) {
  return resolveTextGraphicEntries(program, layer, config)
    .map(entry => entry.graphic);
}
