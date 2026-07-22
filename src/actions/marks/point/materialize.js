import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { getPointGraphicType } from "../../../grammar/schemas/mark.js";
import {
  createPointShapeGraphic,
  resolvePointShapeExtent,
  validatePointShape
} from "../../../grammar/pointShapes.js";
import {
  canonicalJitterScalar,
  normalizePointJitterPolicy,
  resolvePointJitter
} from "../../../grammar/jitter.js";
import { polarToCartesian, resolvePolarFrame } from "../../../grammar/polar.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { validateMarkOptions } from "../shared.js";
import {
  DEFAULT_COLORS,
  DEFAULT_POINT_RADIUS
} from "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer } from "../../../selectors/layers.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { resolveRowEncodingValues } from
  "../../../materialization/rowEncoding.js";

const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const DEFAULT_POINT_FILL = DEFAULT_COLORS.mark;

function resolvePointPositions(program, layer, dataset) {
  const hasPolar = layer.encoding?.theta !== undefined ||
    layer.encoding?.radius !== undefined;
  if (!hasPolar) {
    return {
      x: resolveRowEncodingValues(program, layer, dataset, "x"),
      y: resolveRowEncodingValues(program, layer, dataset, "y")
    };
  }
  const theta = resolveRowEncodingValues(program, layer, dataset, "theta");
  const radius = resolveRowEncodingValues(program, layer, dataset, "radius");
  if (theta === undefined || radius === undefined) {
    return { x: undefined, y: undefined };
  }
  const frame = resolvePolarFrame(resolveGraphicBounds(program));
  const positions = theta.map((angle, index) => {
    const distance = radius[index];
    return Number.isFinite(angle) && Number.isFinite(distance)
      ? polarToCartesian({ theta: angle, radius: distance, frame })
      : { x: undefined, y: undefined };
  });
  return {
    x: positions.map(position => position.x),
    y: positions.map(position => position.y)
  };
}

function compactProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

function incompleteShapeGraphic(shape, properties) {
  const type = getPointGraphicType(shape);
  const incomplete = type === "path"
    ? { fill: properties.fill, opacity: properties.opacity }
    : properties;
  return { type, properties: compactProperties(incomplete) };
}

function existingArea(child, parentType) {
  const type = child?.type ?? parentType;
  if (type === "circle" && Number.isFinite(child?.properties?.radius)) {
    return Math.PI * child.properties.radius ** 2;
  }
  if (
    type === "rect" &&
    Number.isFinite(child.properties?.width) &&
    Number.isFinite(child.properties?.height)
  ) {
    return child.properties.width * child.properties.height;
  }
  return undefined;
}

function resolvedPointArea(area, index, config, existingChildren, graphicType) {
  return area?.[index] ?? (
    config.radius === undefined
      ? existingArea(existingChildren[index], graphicType) ??
        Math.PI * DEFAULT_POINT_RADIUS ** 2
      : Math.PI * config.radius ** 2
  );
}

function resolveJitterEntries({
  policy,
  dataset,
  x,
  y,
  area,
  shapes,
  config,
  graphic,
  existingChildren
}) {
  const seen = new Set();
  return dataset.values.flatMap((row, index) => {
    if (!Number.isFinite(x?.[index]) || !Number.isFinite(y?.[index])) return [];
    const identity = policy.key === undefined ? index : row[policy.key];
    const canonical = canonicalJitterScalar(
      identity,
      policy.key === undefined
        ? "Point jitter source index"
        : `Point jitter key field "${policy.key}"`
    );
    if (seen.has(canonical)) {
      throw new Error(
        `Point jitter key field "${policy.key}" must be unique for materialized items.`
      );
    }
    seen.add(canonical);
    const resolvedArea = resolvedPointArea(
      area,
      index,
      config,
      existingChildren,
      graphic.type
    );
    const extent = resolvePointShapeExtent({
      shape: shapes[index],
      area: resolvedArea,
      strokeWidth: typeof config.stroke === "string"
        ? config.strokeWidth ?? 1
        : 0
    });
    return [{
      index,
      identity,
      base: policy.channel === "x" ? x[index] : y[index],
      halfExtent: extent[policy.channel]
    }];
  });
}

function applyPointJitter(program, {
  id,
  layer,
  dataset,
  x,
  y,
  area,
  shapes,
  config,
  graphic,
  existingChildren
}) {
  const stored = program.materializationConfigs.jitters?.[id];
  if (stored === undefined) return { program, x, y };
  const policy = normalizePointJitterPolicy(stored);
  const encoding = layer.encoding?.[policy.channel];
  const scale = program.resolvedScales[encoding?.scale];
  if (scale === undefined) {
    throw new Error(
      `Point jitter on "${id}" requires a resolved ${policy.channel} scale.`
    );
  }
  const bounds = resolveGraphicBounds(program);
  const entries = resolveJitterEntries({
    policy,
    dataset,
    x,
    y,
    area,
    shapes,
    config,
    graphic,
    existingChildren
  });
  const resolution = resolvePointJitter({
    target: id,
    policy,
    scale,
    entries,
    plotMinimum: policy.channel === "x" ? bounds.x : bounds.y,
    plotMaximum: policy.channel === "x"
      ? bounds.x + bounds.width
      : bounds.y + bounds.height
  });
  const values = [...(policy.channel === "x" ? x : y)];
  for (const item of resolution.items) {
    values[item.index] += item.finalOffset;
  }
  return {
    program: program._withMaterializationConfig(["jitters", id], {
      ...policy,
      resolved: resolution
    }),
    x: policy.channel === "x" ? values : x,
    y: policy.channel === "y" ? values : y
  };
}

export const rematerializePointMark = action(
  {
    op: "rematerializePointMark",
    description: "Recompute concrete point geometry and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializePointMark");
    const id = validateUserId(args.id, "Point mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializePointMark",
      resetProperty: "items",
      resetValue: []
    });
    if (highlighted !== undefined) return highlighted;
    const layer = findLayer(this, id);
    const graphic = this.graphicSpec.objects[id];

    if (layer?.mark?.type !== "point") {
      throw new Error(`Unknown point mark "${id}".`);
    }
    if (!["circle", "rect", "path", "collection"].includes(graphic?.type)) {
      throw new Error(`Point mark "${id}" requires point graphics.`);
    }
    const dataset = findDataset(this, layer.data);
    if (dataset === undefined) {
      throw new Error(`Point mark "${id}" requires an existing dataset.`);
    }

    const positions = resolvePointPositions(this, layer, dataset);
    const mappedFill = resolveRowEncodingValues(this, layer, dataset, "color");
    const area = resolveRowEncodingValues(this, layer, dataset, "size");
    const encodedShape = resolveRowEncodingValues(this, layer, dataset, "shape");
    const encodedOpacity = resolveRowEncodingValues(this, layer, dataset, "opacity");
    const config = this.markConfigs[id] ?? {};
    const fill = mappedFill ?? config.fill ?? DEFAULT_POINT_FILL;
    const shapes = encodedShape ?? dataset.values.map(() => config.shape ?? "circle");
    const existingChildren = graphic.items ?? [];
    const constantShape = validatePointShape(config.shape ?? "circle");
    const requiresMixedCollection =
      encodedShape !== undefined ||
      graphic.type === "collection" ||
      getPointGraphicType(constantShape) !== graphic.type;
    const jittered = applyPointJitter(this, {
      id,
      layer,
      dataset,
      x: positions.x,
      y: positions.y,
      area,
      shapes,
      config,
      graphic,
      existingChildren
    });
    const { x, y } = jittered;

    if (requiresMixedCollection) {
      const items = dataset.values.map((_, index) => {
        const shape = shapes[index];
        const existing = existingChildren[index]?.properties ?? {};
        const color = mappedFill?.[index] ?? config.fill ??
          existing.fill ?? DEFAULT_POINT_FILL;
        const opacity = encodedOpacity?.[index] ?? config.opacity ?? existing.opacity;
        const resolvedArea = resolvedPointArea(
          area,
          index,
          config,
          existingChildren,
          graphic.type
        );
        const centerX = x?.[index] ?? existing.x;
        const centerY = y?.[index] ?? existing.y;
        if (
          resolvedArea === undefined ||
          !Number.isFinite(centerX) ||
          !Number.isFinite(centerY)
        ) {
          return incompleteShapeGraphic(shape, {
            x: centerX,
            y: centerY,
            fill: color,
            opacity
          });
        }
        return createPointShapeGraphic({
          shape,
          x: centerX,
          y: centerY,
          area: resolvedArea,
          fill: color,
          ...(typeof config.stroke === "string" ? { stroke: config.stroke } : {}),
          ...(config.strokeWidth === undefined
            ? {}
            : { strokeWidth: config.strokeWidth }),
          opacity
        });
      });
      return jittered.program.editGraphics({
        target: id,
        property: "items",
        value: items
      });
    }

    let next = graphic.items.length === dataset.values.length
      ? jittered.program
      : jittered.program.editGraphics({
          target: id,
          property: "length",
          value: dataset.values.length
        });
    if (x !== undefined) next = next.editGraphics({ target: id, property: "x", value: x });
    if (y !== undefined) next = next.editGraphics({ target: id, property: "y", value: y });
    if (fill !== undefined) {
      next = next.editGraphics({ target: id, property: "fill", value: fill });
    }
    if (graphic.type === "circle") {
      const radii = area === undefined
        ? config.radius ?? (
          x !== undefined && y !== undefined
            ? dataset.values.map((_, index) => {
                const existing = existingChildren[index]?.properties?.radius;
                return Number.isFinite(existing)
                  ? existing
                  : DEFAULT_POINT_RADIUS;
              })
            : undefined
        )
        : area.map(value => Math.sqrt(value / Math.PI));
      if (radii !== undefined) {
        next = next.editGraphics({ target: id, property: "radius", value: radii });
      }
    } else if (
      area !== undefined ||
      config.radius !== undefined ||
      (x !== undefined && y !== undefined)
    ) {
      const sides = area === undefined
        ? dataset.values.map((_, index) => {
          const existing = existingArea(existingChildren[index], graphic.type);
          return Math.sqrt(
            existing ?? Math.PI * (config.radius ?? DEFAULT_POINT_RADIUS) ** 2
          );
        })
        : area.map(value => Math.sqrt(value));
      const centersX = x ?? existingChildren.map(child => child.properties.x);
      const centersY = y ?? existingChildren.map(child => child.properties.y);
      if (centersX.every(Number.isFinite)) {
        next = next.editGraphics({
          target: id,
          property: "x",
          value: centersX.map((value, index) => value - (Array.isArray(sides) ? sides[index] : sides) / 2)
        });
      }
      if (centersY.every(Number.isFinite)) {
        next = next.editGraphics({
          target: id,
          property: "y",
          value: centersY.map((value, index) => value - (Array.isArray(sides) ? sides[index] : sides) / 2)
        });
      }
      next = next
        .editGraphics({ target: id, property: "width", value: sides })
        .editGraphics({ target: id, property: "height", value: sides })
        .editGraphics({ target: id, property: "stroke", value: fill ?? DEFAULT_POINT_FILL })
        .editGraphics({ target: id, property: "strokeWidth", value: 0 });
    }
    if (config.opacity !== undefined) {
      next = next.editGraphics({ target: id, property: "opacity", value: config.opacity });
    } else if (encodedOpacity !== undefined) {
      next = next.editGraphics({ target: id, property: "opacity", value: encodedOpacity });
    }
    if (config.stroke === false) {
      next = next
        .editGraphics({ target: id, property: "stroke", value: "transparent" })
        .editGraphics({ target: id, property: "strokeWidth", value: 0 });
    } else if (config.stroke !== undefined) {
      next = next.editGraphics({ target: id, property: "stroke", value: config.stroke });
      next = next.editGraphics({
        target: id,
        property: "strokeWidth",
        value: config.strokeWidth
      });
    }
    return next;
  }
);
