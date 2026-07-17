import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { getPointGraphicType } from "../../grammar/schemas/mark.js";
import {
  createPointShapeGraphic,
  validatePointShape
} from "../../grammar/pointShapes.js";
import {
  mapContinuousScaleValues,
  mapDiscretizedColors,
  mapOrdinalPositionValues,
  mapOrdinalValues,
  mapSequentialColors,
  readScaleField,
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "../../grammar/scales.js";
import { polarToCartesian, resolvePolarFrame } from "../../grammar/polar.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { rematerializeExistingLegend } from "../encodings/shared.js";
import { resolveMarkGraphicPlacement } from
  "../../materialization/graphicHierarchy.js";

const POINT_MARK_OPTIONS = Object.freeze([
  "id", "data", "shape", "fill", "opacity", "stroke", "strokeWidth"
]);
const EDIT_POINT_OPTIONS = Object.freeze([
  "target", "shape", "fill", "opacity", "stroke", "strokeWidth"
]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const DEFAULT_POINT_FILL = DEFAULT_COLORS.mark;

const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateMarkOptions(args, POINT_MARK_OPTIONS, "createPointMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "point",
      label: "Point mark id",
      markType: "point",
      operation: "createPointMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "point");
    const { data, dataset } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined &&
        this.context.currentData === undefined &&
        inherited?.data !== undefined
        ? { data: inherited.data }
        : {})
    });
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    validatePointShape(shape);
    const resolvedType = getPointGraphicType(shape);
    const graphicType = resolvedType === "path" ? "circle" : resolvedType;

    assertMarkAvailable(this, id);

    let next = this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "point"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      });
    next = applyLayeredMarkInheritance(next, id, inherited)
      .createGraphics({
        id,
        type: graphicType,
        length: dataset.values.length,
        ...resolveMarkGraphicPlacement(next, { data, markType: "point" })
      })
      ._withMarkConfig(id, { shape });
    const created = materializeInheritedMark(next, id);
    const appearance = Object.fromEntries(
      ["fill", "opacity", "stroke", "strokeWidth"]
        .filter(property => Object.hasOwn(args, property))
        .map(property => [property, args[property]])
    );
    return Object.keys(appearance).length === 0
      ? created
      : created.editPointMark({ target: id, ...appearance });
  }
);

function resolveMappedValues(program, layer, dataset, channel) {
  const encoding = layer.encoding?.[channel];
  if (encoding === undefined) return undefined;
  const scale = program.resolvedScales[encoding.scale];
  if (scale === undefined) {
    throw new Error(
      `Point mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
    );
  }
  const ordinal = ["nominal", "ordinal"].includes(encoding.fieldType);
  const values = Object.hasOwn(scale, "unknown")
    ? readScaleField(dataset.values, encoding.field, encoding.fieldType, {
        allowUnknown: true
      })
    : ordinal
      ? readNominalField(dataset.values, encoding.field)
      : encoding.fieldType === "temporal"
        ? readTemporalField(dataset.values, encoding.field)
        : readQuantitativeField(dataset.values, encoding.field);
  if (channel === "color" && scale.type === "sequential") {
    return mapSequentialColors(values, scale.domain, scale.range, {
      interpolation: scale.interpolate,
      clamp: scale.clamp ?? false,
      ...(Object.hasOwn(scale, "unknown") ? { unknown: scale.unknown } : {})
    });
  }
  if (
    channel === "color" &&
    ["quantize", "quantile", "threshold"].includes(scale.type)
  ) {
    return mapDiscretizedColors(values, scale);
  }
  return ordinal
    ? ["x", "y", "theta", "radius"].includes(channel)
      ? mapOrdinalPositionValues(values, scale)
      : mapOrdinalValues(values, scale.domain, scale.range, {
          ...(Object.hasOwn(scale, "unknown") ? { unknown: scale.unknown } : {})
        })
    : mapContinuousScaleValues(values, scale);
}

function resolvePointPositions(program, layer, dataset) {
  const hasPolar = layer.encoding?.theta !== undefined ||
    layer.encoding?.radius !== undefined;
  if (!hasPolar) {
    return {
      x: resolveMappedValues(program, layer, dataset, "x"),
      y: resolveMappedValues(program, layer, dataset, "y")
    };
  }
  const theta = resolveMappedValues(program, layer, dataset, "theta");
  const radius = resolveMappedValues(program, layer, dataset, "radius");
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

const rematerializePointMark = action(
  {
    op: "rematerializePointMark",
    description: "Recompute concrete point geometry and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializePointMark");
    const id = validateUserId(args.id, "Point mark id");
    const highlights = Object.entries(
      this.materializationConfigs.highlights ?? {}
    ).filter(([, config]) => config.target === id);
    if (highlights.length > 0) {
      let baseline = this;
      for (const [highlightId] of highlights) {
        baseline = baseline._withoutMaterializationConfig([
          "highlights",
          highlightId
        ]);
      }
      return baseline
        .editGraphics({ target: id, property: "items", value: [] })
        .rematerializePointMark({ id })
        .rematerializeMarkHighlights({ target: id, highlights });
    }
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

    const { x, y } = resolvePointPositions(this, layer, dataset);
    const mappedFill = resolveMappedValues(this, layer, dataset, "color");
    const area = resolveMappedValues(this, layer, dataset, "size");
    const encodedShape = resolveMappedValues(this, layer, dataset, "shape");
    const encodedOpacity = resolveMappedValues(this, layer, dataset, "opacity");
    const config = this.markConfigs[id] ?? {};
    const fill = mappedFill ?? config.fill ?? DEFAULT_POINT_FILL;
    const shapes = encodedShape ?? dataset.values.map(() => config.shape ?? "circle");
    const existingChildren = graphic.items ?? [];
    const constantShape = validatePointShape(config.shape ?? "circle");
    const requiresMixedCollection =
      encodedShape !== undefined ||
      graphic.type === "collection" ||
      getPointGraphicType(constantShape) !== graphic.type;

    if (requiresMixedCollection) {
      const items = dataset.values.map((_, index) => {
        const shape = shapes[index];
        const existing = existingChildren[index]?.properties ?? {};
        const color = mappedFill?.[index] ?? config.fill ??
          existing.fill ?? DEFAULT_POINT_FILL;
        const opacity = encodedOpacity?.[index] ?? config.opacity ?? existing.opacity;
        const resolvedArea = area?.[index] ??
          (config.radius === undefined
            ? existingArea(existingChildren[index], graphic.type)
            :
            Math.PI * config.radius ** 2);
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
          ...(config.stroke === undefined ? {} : { stroke: config.stroke }),
          ...(config.strokeWidth === undefined
            ? {}
            : { strokeWidth: config.strokeWidth }),
          opacity
        });
      });
      return this.editGraphics({ target: id, property: "items", value: items });
    }

    let next = graphic.items.length === dataset.values.length
      ? this
      : this.editGraphics({
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
        ? config.radius
        : area.map(value => Math.sqrt(value / Math.PI));
      if (radii !== undefined) {
        next = next.editGraphics({ target: id, property: "radius", value: radii });
      }
    } else if (area !== undefined || config.radius !== undefined) {
      const sides = area === undefined
        ? config.radius * Math.sqrt(Math.PI)
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
    if (config.stroke !== undefined) {
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

const editPointMark = action(
  {
    op: "editPointMark",
    description: "Edit constant point-mark appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_POINT_OPTIONS, "editPointMark");
    const editable = ["shape", "fill", "opacity", "stroke", "strokeWidth"];
    if (!editable.some(property => Object.hasOwn(args, property))) {
      throw new Error(
        "editPointMark requires shape, fill, opacity, stroke, or strokeWidth."
      );
    }
    const candidates = this.semanticSpec.layers.filter(
      layer => layer.mark?.type === "point"
    );
    const current = findLayer(this, this.context.currentMark);
    const requested = args.target ??
      (current?.mark?.type === "point" ? current.id : undefined);
    const inferred = requested ?? (candidates.length === 1
      ? candidates[0].id
      : undefined);
    const id = validateUserId(inferred, "Point mark id");
    const layer = findLayer(this, id);
    if (layer?.mark?.type !== "point") {
      throw new Error(`Unknown point mark "${id}".`);
    }
    if (Object.hasOwn(args, "shape") && layer.encoding?.shape !== undefined) {
      throw new Error(
        "editPointMark shape cannot be combined with a shape encoding."
      );
    }
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error(
        "editPointMark fill cannot be combined with a color encoding."
      );
    }
    const config = { ...this.markConfigs[id] };
    if (Object.hasOwn(args, "shape")) {
      config.shape = validatePointShape(args.shape);
    }
    if (Object.hasOwn(args, "fill")) {
      config.fill = validateNonEmptyString(args.fill, "Point fill");
    }
    if (Object.hasOwn(args, "opacity")) {
      config.opacity = validateUnitInterval(args.opacity, "Point opacity");
    }
    if (Object.hasOwn(args, "stroke")) {
      config.stroke = validateNonEmptyString(args.stroke, "Point stroke");
      config.strokeWidth ??= 1;
    }
    if (Object.hasOwn(args, "strokeWidth")) {
      if (config.stroke === undefined) {
        throw new Error("Point strokeWidth requires an active stroke.");
      }
      config.strokeWidth = validateNonNegativeFinite(
        args.strokeWidth,
        "Point strokeWidth"
      );
    }
    const next = this
      ._withMarkConfig(id, config)
      .rematerializePointMark({ id });
    const legend = next.guideConfigs.legend?.series;
    return legend?.target === id && legend.channels.includes("shape")
      ? rematerializeExistingLegend(next)
      : next;
  }
);

export function registerPointMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
  ProgramClass.prototype.editPointMark = editPointMark;
  ProgramClass.prototype.rematerializePointMark = rematerializePointMark;
}
