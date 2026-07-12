import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { isPlainObject } from "../../../core/immutable.js";
import { mapLinearValues } from "../../../core/scale.js";
import {
  inferGridTickConfig,
  valuesFromTickConfig
} from "../tickValues.js";

const GRID_OPTIONS = Object.freeze([
  "scale",
  "coordinate",
  "count",
  "values",
  "color",
  "lineWidth",
  "strokeDash"
]);
const AGGREGATE_OPTIONS = Object.freeze(["horizontal", "vertical"]);
const DEFAULT_STYLE = Object.freeze({
  color: "#e2e8f0",
  lineWidth: 1,
  strokeDash: Object.freeze([])
});

function names(direction) {
  const prefix = direction === "horizontal" ? "Horizontal" : "Vertical";
  return {
    channel: direction === "horizontal" ? "y" : "x",
    create: `create${prefix}Grid`,
    rematerialize: `rematerialize${prefix}Grid`,
    graphic: `${direction}GridLines`
  };
}

function validateKeys(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function validateStrokeDash(value) {
  if (
    !Array.isArray(value) ||
    value.length % 2 !== 0 ||
    !value.every(item => Number.isFinite(item) && item >= 0)
  ) {
    throw new TypeError(
      "Grid strokeDash must be an even-length array of non-negative finite numbers."
    );
  }
  return value;
}

function validateCreateArgs(args, operation) {
  if (!isPlainObject(args)) {
    throw new TypeError(`${operation} options must be a plain object.`);
  }
  validateKeys(args, GRID_OPTIONS, operation);
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (
    Object.hasOwn(args, "count") &&
    (!Number.isInteger(args.count) || args.count <= 0)
  ) {
    throw new RangeError("Grid count must be a positive integer.");
  }
  if (
    Object.hasOwn(args, "values") &&
    (!Array.isArray(args.values) ||
      args.values.length === 0 ||
      !args.values.every(Number.isFinite))
  ) {
    throw new TypeError("Grid values must be a non-empty finite number array.");
  }
  if (
    Object.hasOwn(args, "color") &&
    (typeof args.color !== "string" || args.color.length === 0)
  ) {
    throw new TypeError("Grid color must be a non-empty string.");
  }
  if (
    Object.hasOwn(args, "lineWidth") &&
    (!Number.isFinite(args.lineWidth) || args.lineWidth < 0)
  ) {
    throw new RangeError("Grid lineWidth must be non-negative.");
  }
  if (Object.hasOwn(args, "strokeDash")) {
    validateStrokeDash(args.strokeDash);
  }
}

function resolveResources(program, direction, args) {
  const { channel } = names(direction);
  let layers = program.semanticSpec.layers.filter(
    layer => layer.encoding?.[channel]?.scale !== undefined
  );
  if (layers.length === 0) {
    throw new Error(`${direction} grid requires a ${channel} encoding.`);
  }

  const requestedCoordinate = args.coordinate === undefined
    ? undefined
    : validateUserId(args.coordinate, "Grid coordinate id");
  const requestedScale = args.scale === undefined
    ? undefined
    : validateUserId(args.scale, "Grid scale id");
  if (requestedCoordinate !== undefined) {
    layers = layers.filter(layer => layer.coordinate === requestedCoordinate);
  }
  if (requestedScale !== undefined) {
    layers = layers.filter(
      layer => layer.encoding[channel].scale === requestedScale
    );
  }
  if (layers.length === 0) {
    throw new Error(`${direction} grid found no matching encoded layers.`);
  }
  const coordinateIds = [
    ...new Set(layers.map(layer => layer.coordinate).filter(Boolean))
  ];
  if (layers.some(layer => layer.coordinate === undefined)) {
    throw new Error(`${direction} grid requires a stored coordinate.`);
  }
  if (coordinateIds.length === 0) {
    throw new Error(`Unknown grid coordinate "${requestedCoordinate}".`);
  }
  if (coordinateIds.length > 1) {
    throw new Error(
      `${direction} grid found multiple coordinates; provide coordinate explicitly.`
    );
  }
  const coordinateId = requestedCoordinate ?? coordinateIds[0];
  const coordinateDefinition = program.semanticSpec.coordinates.find(
    item => item.id === coordinateId
  );
  if (coordinateDefinition?.type !== "cartesian") {
    throw new Error(`${direction} grid requires a Cartesian coordinate.`);
  }

  const scaleIds = [
    ...new Set(layers.map(layer => layer.encoding[channel].scale))
  ];
  if (scaleIds.length === 0) {
    throw new Error(`Unknown grid scale "${requestedScale}".`);
  }
  if (scaleIds.length > 1) {
    throw new Error(
      `${direction} grid found multiple ${channel} scales; provide scale explicitly.`
    );
  }
  const scaleId = requestedScale ?? scaleIds[0];
  const resolvedScale = program.resolvedScales[scaleId];
  if (!["linear", "time"].includes(resolvedScale?.type)) {
    throw new Error(
      `${direction} grid requires resolved continuous scale "${scaleId}".`
    );
  }

  const related = new Set(layers.map(layer => layer.id));
  const before = program.graphicSpec.order.find(id => related.has(id));
  if (before === undefined) {
    throw new Error(`${direction} grid requires related mark graphics.`);
  }

  return { channel, coordinate: coordinateId, scale: scaleId, before };
}

function resolveConfig(program, direction, args, resources) {
  const explicit = Object.hasOwn(args, "values")
    ? { mode: "values", values: args.values }
    : Object.hasOwn(args, "count")
      ? { mode: "count", count: args.count }
      : inferGridTickConfig(program, resources.channel, resources.scale);

  return {
    direction,
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...explicit,
    color: args.color ?? DEFAULT_STYLE.color,
    lineWidth: args.lineWidth ?? DEFAULT_STYLE.lineWidth,
    strokeDash: args.strokeDash ?? DEFAULT_STYLE.strokeDash
  };
}

function resolveGeometry(program, config) {
  const scale = program.resolvedScales[config.scale];
  const bounds = program.context.currentGraphicBounds;
  if (!["linear", "time"].includes(scale?.type) || bounds === undefined) {
    throw new Error("Grid materialization requires a continuous scale and Canvas bounds.");
  }

  const values = valuesFromTickConfig(program, config);
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) {
    throw new RangeError("Grid values must be inside the scale domain.");
  }
  const positions = mapLinearValues(values, scale.domain, scale.range);
  return config.direction === "horizontal"
    ? {
        values,
        x1: bounds.x,
        y1: positions,
        x2: bounds.x + bounds.width,
        y2: positions
      }
    : {
        values,
        x1: positions,
        y1: bounds.y,
        x2: positions,
        y2: bounds.y + bounds.height
      };
}

function makeRematerialize(direction) {
  const operation = names(direction);
  return action(
    {
      op: operation.rematerialize,
      description: `Recompute concrete ${direction} grid lines.`
    },
    function (args = {}) {
      if (!isPlainObject(args) || Object.keys(args).length !== 0) {
        throw new TypeError(`${operation.rematerialize} does not accept options.`);
      }
      const config = this.guideConfigs.grid?.[direction];
      const semantic = this.semanticSpec.guides.grid?.[direction];
      if (
        config === undefined ||
        semantic?.scale !== config.scale ||
        semantic.coordinate !== config.coordinate ||
        this.graphicSpec.objects[operation.graphic]?.type !== "line"
      ) {
        throw new Error(
          `${operation.rematerialize} requires an existing ${direction} grid.`
        );
      }

      const geometry = resolveGeometry(this, config);
      let next = this.editGraphics({
        target: operation.graphic,
        property: "length",
        value: geometry.values.length
      });
      for (const property of ["x1", "y1", "x2", "y2"]) {
        next = next.editGraphics({
          target: operation.graphic,
          property,
          value: geometry[property]
        });
      }
      return next
        .editGraphics({
          target: operation.graphic,
          property: "stroke",
          value: config.color
        })
        .editGraphics({
          target: operation.graphic,
          property: "strokeWidth",
          value: config.lineWidth
        })
        .editGraphics({
          target: operation.graphic,
          property: "strokeDash",
          value: geometry.values.map(() => config.strokeDash)
        });
    }
  );
}

function makeCreate(direction) {
  const operation = names(direction);
  return action(
    {
      op: operation.create,
      description: `Create a semantic and concrete ${direction} grid.`
    },
    function (args = {}) {
      validateCreateArgs(args, operation.create);
      if (
        this.semanticSpec.guides.grid?.[direction] !== undefined ||
        this.graphicSpec.objects[operation.graphic] !== undefined
      ) {
        throw new Error(`${operation.create} requires a missing grid.`);
      }
      const resources = resolveResources(this, direction, args);
      const config = resolveConfig(this, direction, args, resources);
      resolveGeometry(this, config);

      return this
        .editSemantic({
          property: `guide.grid.${direction}.scale`,
          value: resources.scale
        })
        .editSemantic({
          property: `guide.grid.${direction}.coordinate`,
          value: resources.coordinate
        })
        .createGraphics({
          id: operation.graphic,
          type: "line",
          length: 0,
          before: resources.before
        })
        ._withGridConfig(direction, config)[operation.rematerialize]();
    }
  );
}

function normalizeDirection(value, direction) {
  if (value === false) return undefined;
  if (value === true || value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(
      `createGrid ${direction} must be a boolean or plain object.`
    );
  }
  return value;
}

const rematerializeHorizontalGrid = makeRematerialize("horizontal");
const rematerializeVerticalGrid = makeRematerialize("vertical");
const createHorizontalGrid = makeCreate("horizontal");
const createVerticalGrid = makeCreate("vertical");

const createGrid = action(
  {
    op: "createGrid",
    description: "Create selected Cartesian grid directions."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("createGrid options must be a plain object.");
    }
    validateKeys(args, AGGREGATE_OPTIONS, "createGrid");
    const horizontal = normalizeDirection(args.horizontal, "horizontal");
    const vertical = args.vertical === undefined
      ? undefined
      : normalizeDirection(args.vertical, "vertical");
    if (horizontal === undefined && vertical === undefined) {
      throw new Error("createGrid requires at least one selected direction.");
    }

    let next = this;
    if (horizontal !== undefined) {
      next = next.createHorizontalGrid(horizontal);
    }
    if (vertical !== undefined) {
      next = next.createVerticalGrid(vertical);
    }
    return next;
  }
);

const rematerializeGrid = action(
  {
    op: "rematerializeGrid",
    description: "Recompute every existing grid direction."
  },
  function (args = {}) {
    if (!isPlainObject(args) || Object.keys(args).length !== 0) {
      throw new TypeError("rematerializeGrid does not accept options.");
    }
    let next = this;
    let count = 0;
    if (this.guideConfigs.grid?.horizontal !== undefined) {
      next = next.rematerializeHorizontalGrid();
      count += 1;
    }
    if (this.guideConfigs.grid?.vertical !== undefined) {
      next = next.rematerializeVerticalGrid();
      count += 1;
    }
    if (count === 0) {
      throw new Error("rematerializeGrid requires an existing grid.");
    }
    return next;
  }
);

export function registerGridActions(ProgramClass) {
  ProgramClass.prototype.createGrid = createGrid;
  ProgramClass.prototype.createHorizontalGrid = createHorizontalGrid;
  ProgramClass.prototype.createVerticalGrid = createVerticalGrid;
  ProgramClass.prototype.rematerializeGrid = rematerializeGrid;
  ProgramClass.prototype.rematerializeHorizontalGrid =
    rematerializeHorizontalGrid;
  ProgramClass.prototype.rematerializeVerticalGrid = rematerializeVerticalGrid;
}
