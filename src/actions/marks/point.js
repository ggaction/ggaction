import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { getPointGraphicType } from "../../grammar/schemas/mark.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField
} from "../../grammar/scales.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const POINT_MARK_OPTIONS = Object.freeze(["id", "data", "shape"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const DEFAULT_POINT_FILL = "#4c78a8";

const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateMarkOptions(args, POINT_MARK_OPTIONS, "createPointMark");
    const id = validateUserId(args.id, "Point mark id");
    const { data, dataset } = resolveMarkData(this, args);
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    const graphicType = getPointGraphicType(shape);

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
  const values = channel === "color" || channel === "shape"
    ? readNominalField(dataset.values, encoding.field)
    : readQuantitativeField(dataset.values, encoding.field);
  return channel === "color" || channel === "shape"
    ? mapOrdinalValues(values, scale.domain, scale.range)
    : mapLinearValues(values, scale.domain, scale.range);
}

function compactProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

const rematerializePointMark = action(
  {
    op: "rematerializePointMark",
    description: "Recompute concrete point geometry and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializePointMark");
    const id = validateUserId(args.id, "Point mark id");
    const layer = this.semanticSpec.layers.find(item => item.id === id);
    const graphic = this.graphicSpec.objects[id];

    if (layer?.mark?.type !== "point") {
      throw new Error(`Unknown point mark "${id}".`);
    }
    if (!["circle", "rect", "collection"].includes(graphic?.type)) {
      throw new Error(`Point mark "${id}" requires point graphics.`);
    }
    const dataset = this.semanticSpec.datasets.find(item => item.id === layer.data);
    if (dataset === undefined) {
      throw new Error(`Point mark "${id}" requires an existing dataset.`);
    }

    const x = resolveMappedValues(this, layer, dataset, "x");
    const y = resolveMappedValues(this, layer, dataset, "y");
    const fill = resolveMappedValues(this, layer, dataset, "color");
    const area = resolveMappedValues(this, layer, dataset, "size");
    const encodedShape = resolveMappedValues(this, layer, dataset, "shape");
    const config = this.markConfigs[id] ?? {};
    const shapes = encodedShape ?? dataset.values.map(() => config.shape ?? "circle");
    const existingChildren = graphic.children ?? [];
    const requiresMixedCollection = encodedShape !== undefined || graphic.type === "collection";

    if (requiresMixedCollection) {
      const children = dataset.values.map((_, index) => {
        const shape = shapes[index];
        const existing = existingChildren[index]?.properties ?? {};
        const color = fill?.[index] ?? existing.fill ?? DEFAULT_POINT_FILL;
        const opacity = config.opacity ?? existing.opacity;
        const size = area?.[index];
        const radius = size === undefined
          ? config.radius ?? existing.radius
          : Math.sqrt(size / Math.PI);

        if (shape === "circle") {
          return {
            type: "circle",
            properties: compactProperties({
              x: x?.[index] ?? existing.x,
              y: y?.[index] ?? existing.y,
              radius,
              fill: color,
              opacity
            })
          };
        }
        if (shape !== "square") {
          throw new Error(`Unsupported resolved point shape "${shape}".`);
        }
        const side = size === undefined
          ? config.radius === undefined
            ? existing.width
            : config.radius * 2
          : Math.sqrt(size);
        const centerX = x?.[index];
        const centerY = y?.[index];
        return {
          type: "rect",
          properties: compactProperties({
            x: centerX === undefined ? existing.x : centerX - (side ?? 0) / 2,
            y: centerY === undefined ? existing.y : centerY - (side ?? 0) / 2,
            width: side,
            height: side,
            fill: color,
            stroke: color,
            strokeWidth: 0,
            opacity
          })
        };
      });
      return this.editGraphics({ target: id, property: "children", value: children });
    }

    let next = this;
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
        ? config.radius * 2
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
    }
    return next;
  }
);

export function registerPointMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
  ProgramClass.prototype.rematerializePointMark = rematerializePointMark;
}
