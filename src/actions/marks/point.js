import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { getPointGraphicType } from "../../grammar/schemas/mark.js";
import {
  createPointShapeGraphic,
  validatePointShape
} from "../../grammar/pointShapes.js";
import {
  mapLinearValues,
  mapOrdinalPositionValues,
  mapOrdinalValues,
  mapSequentialColors,
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "../../grammar/scales.js";
import {
  assertMarkAvailable,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { rematerializeExistingLegend } from "../encodings/shared.js";

const POINT_MARK_OPTIONS = Object.freeze(["id", "data", "shape"]);
const EDIT_POINT_OPTIONS = Object.freeze(["target", "shape"]);
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
    const { data, dataset } = resolveMarkData(this, args);
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    validatePointShape(shape);
    const resolvedType = getPointGraphicType(shape);
    const graphicType = resolvedType === "path" ? "circle" : resolvedType;

    assertMarkAvailable(this, id);

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "point"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: graphicType,
        length: dataset.values.length
      })
      ._withMarkConfig(id, { shape });
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
  const values = ordinal
    ? readNominalField(dataset.values, encoding.field)
    : encoding.fieldType === "temporal"
      ? readTemporalField(dataset.values, encoding.field)
      : readQuantitativeField(dataset.values, encoding.field);
  if (channel === "color" && scale.type === "sequential") {
    return mapSequentialColors(values, scale.domain, scale.range, {
      interpolation: scale.interpolate,
      clamp: scale.clamp ?? false
    });
  }
  return ordinal
    ? ["x", "y"].includes(channel)
      ? mapOrdinalPositionValues(values, scale)
      : mapOrdinalValues(values, scale.domain, scale.range)
    : mapLinearValues(values, scale.domain, scale.range, {
        clamp: scale.clamp ?? false
      });
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

    const x = resolveMappedValues(this, layer, dataset, "x");
    const y = resolveMappedValues(this, layer, dataset, "y");
    const mappedFill = resolveMappedValues(this, layer, dataset, "color");
    const area = resolveMappedValues(this, layer, dataset, "size");
    const encodedShape = resolveMappedValues(this, layer, dataset, "shape");
    const encodedOpacity = resolveMappedValues(this, layer, dataset, "opacity");
    const fill = mappedFill ?? (
      encodedOpacity === undefined ? undefined : DEFAULT_POINT_FILL
    );
    const config = this.markConfigs[id] ?? {};
    const shapes = encodedShape ?? dataset.values.map(() => config.shape ?? "circle");
    const existingChildren = graphic.children ?? [];
    const constantShape = validatePointShape(config.shape ?? "circle");
    const requiresMixedCollection =
      encodedShape !== undefined ||
      graphic.type === "collection" ||
      getPointGraphicType(constantShape) !== graphic.type;

    if (requiresMixedCollection) {
      const children = dataset.values.map((_, index) => {
        const shape = shapes[index];
        const existing = existingChildren[index]?.properties ?? {};
        const color = mappedFill?.[index] ?? existing.fill ?? DEFAULT_POINT_FILL;
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
          opacity
        });
      });
      return this.editGraphics({ target: id, property: "children", value: children });
    }

    let next = graphic.children.length === dataset.values.length
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
    if (!Object.hasOwn(args, "shape")) {
      throw new Error("editPointMark requires shape.");
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
    if (layer.encoding?.shape !== undefined) {
      throw new Error(
        "editPointMark shape cannot be combined with a shape encoding."
      );
    }
    const shape = validatePointShape(args.shape);
    const next = this
      ._withMarkConfig(id, { ...this.markConfigs[id], shape })
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
