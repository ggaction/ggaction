import { action } from "../../../core/action.js";
import {
  noOptions,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import {
  resolveRadialCircles,
  resolveThetaSpokes
} from "../../../grammar/polarGuides.js";
import {
  POLAR_GRID_DEFAULTS,
  mapPolarGuideValues,
  normalizePolarTickMode,
  polarGuideNames,
  resolvePolarFrameForProgram,
  resolvePolarGuideResources,
  validatePolarTickConfig
} from "./resolve.js";

const CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "count", "values", "color", "lineWidth",
  "strokeDash"
]);
const EDIT_OPTIONS = Object.freeze([
  "count", "values", "color", "lineWidth", "strokeDash"
]);

function operationNames(kind) {
  const prefix = kind === "theta" ? "Theta" : "Radial";
  return {
    create: `create${prefix}Grid`,
    edit: `edit${prefix}Grid`,
    rematerialize: `rematerialize${prefix}Grid`
  };
}

function validateStrokeDash(value) {
  if (!Array.isArray(value) || value.length % 2 !== 0 ||
      !value.every(item => Number.isFinite(item) && item >= 0)) {
    throw new TypeError(
      "Polar grid strokeDash must be an even-length array of non-negative finite numbers."
    );
  }
}

function validateOptions(args, operation, create) {
  validateOptionObject(
    args,
    create ? CREATE_OPTIONS : EDIT_OPTIONS,
    operation,
    { allowEmpty: create, emptyError: Error }
  );
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
  if (Object.hasOwn(args, "color")) {
    validateNonEmptyString(args.color, "Polar grid color");
  }
  if (Object.hasOwn(args, "lineWidth")) {
    validateNonNegativeFinite(args.lineWidth, "Polar grid lineWidth");
  }
  if (Object.hasOwn(args, "strokeDash")) validateStrokeDash(args.strokeDash);
}

function resolveConfig(program, kind, args, resources, previous) {
  const defaults = kind === "theta"
    ? POLAR_GRID_DEFAULTS.thetaCount
    : POLAR_GRID_DEFAULTS.radiusCount;
  const explicitMode = Object.hasOwn(args, "count") ||
    Object.hasOwn(args, "values");
  const mode = explicitMode
    ? normalizePolarTickMode(program, resources.scale, args, defaults)
    : previous === undefined
      ? normalizePolarTickMode(program, resources.scale, args, defaults)
      : previous.inferredValues === true
        ? normalizePolarTickMode(program, resources.scale, {}, defaults)
        : previous.mode === "values"
          ? { mode: "values", values: previous.values, inferredValues: false }
          : { mode: "count", count: previous.count, inferredValues: false };
  const config = {
    ...(previous ?? {}),
    kind,
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...mode,
    color: args.color ?? previous?.color ?? POLAR_GRID_DEFAULTS.color,
    lineWidth: args.lineWidth ?? previous?.lineWidth ??
      POLAR_GRID_DEFAULTS.lineWidth,
    strokeDash: args.strokeDash ?? previous?.strokeDash ??
      POLAR_GRID_DEFAULTS.strokeDash
  };
  validatePolarTickConfig(config, `${kind} grid`);
  validateNonEmptyString(config.color, "Polar grid color");
  validateNonNegativeFinite(config.lineWidth, "Polar grid lineWidth");
  validateStrokeDash(config.strokeDash);
  return config;
}

function resolveGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  const mapped = mapPolarGuideValues(program, config);
  if (kind === "theta") {
    return { values: mapped.values, ...resolveThetaSpokes({
      frame,
      angles: mapped.positions
    }) };
  }
  const circles = resolveRadialCircles({
    frame,
    radii: mapped.positions
  });
  return {
    values: mapped.values.filter((_, index) => mapped.positions[index] > 0),
    commands: circles.commands
  };
}

function editConcrete(program, kind, config, geometry) {
  const graphic = polarGuideNames(kind).grid;
  const properties = kind === "theta"
    ? {
        x1: geometry.x1,
        y1: geometry.y1,
        x2: geometry.x2,
        y2: geometry.y2
      }
    : { commands: geometry.commands };
  let next = program.editGraphics({
    target: graphic,
    property: "length",
    value: geometry.values.length
  });
  for (const [property, value] of Object.entries(properties)) {
    next = next.editGraphics({ target: graphic, property, value });
  }
  return next
    .editGraphics({ target: graphic, property: "stroke", value: config.color })
    .editGraphics({
      target: graphic,
      property: "strokeWidth",
      value: config.lineWidth
    })
    .editGraphics({
      target: graphic,
      property: "strokeDash",
      value: geometry.values.map(() => config.strokeDash)
    });
}

function makeRematerialize(kind) {
  const operations = operationNames(kind);
  return action({
    op: operations.rematerialize,
    description: `Recompute concrete Polar ${kind} grid geometry.`
  }, function (args = {}) {
    noOptions(args, operations.rematerialize);
    const config = this.guideConfigs.grid?.[kind];
    const semantic = this.semanticSpec.guides.grid?.[kind];
    const graphic = this.graphicSpec.objects[polarGuideNames(kind).grid];
    const expectedType = kind === "theta" ? "line" : "path";
    if (config === undefined || semantic?.scale !== config.scale ||
        semantic.coordinate !== config.coordinate || graphic?.type !== expectedType) {
      throw new Error(`${operations.rematerialize} requires an existing grid.`);
    }
    const resources = { scale: config.scale, coordinate: config.coordinate };
    const refreshed = resolveConfig(this, kind, {}, resources, config);
    const geometry = resolveGeometry(this, kind, refreshed);
    return editConcrete(
      this._withGridConfig(kind, refreshed),
      kind,
      refreshed,
      geometry
    );
  });
}

function makeCreate(kind) {
  const operations = operationNames(kind);
  return action({
    op: operations.create,
    description: `Create a semantic and concrete Polar ${kind} grid.`
  }, function (args = {}) {
    validateOptions(args, operations.create, true);
    const graphic = polarGuideNames(kind).grid;
    if (this.semanticSpec.guides.grid?.[kind] !== undefined ||
        this.graphicSpec.objects[graphic] !== undefined) {
      throw new Error(`${operations.create} requires a missing grid.`);
    }
    const resources = resolvePolarGuideResources(
      this,
      kind,
      args,
      operations.create
    );
    const config = resolveConfig(this, kind, args, resources);
    resolveGeometry(this, kind, config);
    return this
      .editSemantic({
        property: `guide.grid.${kind}.scale`,
        value: resources.scale
      })
      .editSemantic({
        property: `guide.grid.${kind}.coordinate`,
        value: resources.coordinate
      })
      .createGraphics({
        id: graphic,
        type: kind === "theta" ? "line" : "path",
        length: 0,
        ...(resources.parent === undefined ? {} : { parent: resources.parent }),
        before: resources.before
      })
      ._withGridConfig(kind, config)
      [operations.rematerialize]();
  });
}

function makeEdit(kind) {
  const operations = operationNames(kind);
  return action({
    op: operations.edit,
    description: `Edit the existing Polar ${kind} grid.`
  }, function (args = {}) {
    validateOptions(args, operations.edit, false);
    const previous = this.guideConfigs.grid?.[kind];
    if (previous === undefined) {
      throw new Error(`${operations.edit} requires an existing grid.`);
    }
    const resources = { scale: previous.scale, coordinate: previous.coordinate };
    const config = resolveConfig(this, kind, args, resources, previous);
    resolveGeometry(this, kind, config);
    return this._withGridConfig(kind, config)[operations.rematerialize]();
  });
}

const createThetaGrid = makeCreate("theta");
const createRadialGrid = makeCreate("radial");
const editThetaGrid = makeEdit("theta");
const editRadialGrid = makeEdit("radial");
const rematerializeThetaGrid = makeRematerialize("theta");
const rematerializeRadialGrid = makeRematerialize("radial");

export function registerPolarGridActions(ProgramClass) {
  ProgramClass.prototype.createThetaGrid = createThetaGrid;
  ProgramClass.prototype.createRadialGrid = createRadialGrid;
  ProgramClass.prototype.editThetaGrid = editThetaGrid;
  ProgramClass.prototype.editRadialGrid = editRadialGrid;
  ProgramClass.prototype.rematerializeThetaGrid = rematerializeThetaGrid;
  ProgramClass.prototype.rematerializeRadialGrid = rematerializeRadialGrid;
}
