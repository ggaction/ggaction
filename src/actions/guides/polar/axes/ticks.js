import { action } from "../../../../core/action.js";
import { validateNonNegativeFinite } from "../../../../core/validation.js";
import {
  resolveRadialAxisTicks,
  resolveThetaAxisTicks
} from "../../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import {
  mapPolarGuideValues,
  normalizePolarTickMode,
  POLAR_AXIS_DEFAULTS,
  polarGuideNames,
  resolvePolarFrameForProgram,
  validatePolarLineStyle,
  validatePolarTickConfig
} from "../resolve.js";
import {
  componentResources,
  operations,
  prefix,
  resolveAngle,
  TICK_CREATE_OPTIONS,
  TICK_EDIT_OPTIONS,
  validateModeOptions,
  validateObject,
  withAxisSemantics
} from "./shared.js";

function tickGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  const mapped = mapPolarGuideValues(program, config);
  return {
    values: mapped.values,
    ...(kind === "theta"
      ? resolveThetaAxisTicks({
          frame,
          angles: mapped.positions,
          length: config.length
        })
      : resolveRadialAxisTicks({
          frame,
          angle: resolveAngle(program, kind, {}),
          radii: mapped.positions,
          length: config.length
        }))
  };
}

function resolveTickConfig(program, kind, args, resources, previous) {
  const count = kind === "theta"
    ? POLAR_AXIS_DEFAULTS.ticks.thetaCount
    : POLAR_AXIS_DEFAULTS.ticks.radiusCount;
  const explicitMode = Object.hasOwn(args, "count") ||
    Object.hasOwn(args, "values");
  const mode = explicitMode
    ? normalizePolarTickMode(program, resources.scale, args, count)
    : previous?.inferredValues === false
      ? previous.mode === "values"
        ? { mode: "values", values: previous.values, inferredValues: false }
        : { mode: "count", count: previous.count, inferredValues: false }
      : normalizePolarTickMode(program, resources.scale, {}, count);
  const config = {
    ...(previous ?? {}),
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...mode,
    length: args.length ?? previous?.length ?? (kind === "theta"
      ? POLAR_AXIS_DEFAULTS.ticks.length
      : POLAR_AXIS_DEFAULTS.ticks.radialLength),
    color: args.color ?? previous?.color ?? POLAR_AXIS_DEFAULTS.ticks.color,
    lineWidth: args.lineWidth ?? previous?.lineWidth ??
      POLAR_AXIS_DEFAULTS.ticks.lineWidth
  };
  validatePolarTickConfig(config, `${kind}-axis ticks`);
  validateNonNegativeFinite(config.length, "Polar axis tick length");
  validatePolarLineStyle(config, `${prefix(kind)} axis ticks`);
  return config;
}

function makeEditTicks(kind) {
  const operation = operations(kind, "Ticks");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis ticks.`
  }, function (args = {}) {
    validateObject(args, TICK_EDIT_OPTIONS, operation.edit);
    validateModeOptions(args, operation.edit);
    const names = polarGuideNames(kind);
    const previous = this.guideConfigs.axis?.[kind]?.ticks;
    if (this.graphicSpec.objects[names.ticks]?.type !== "line" ||
        previous === undefined) {
      throw new Error(`${operation.edit} requires existing axis ticks.`);
    }
    const resources = {
      scale: previous.scale,
      coordinate: previous.coordinate
    };
    const config = resolveTickConfig(this, kind, args, resources, previous);
    const geometry = tickGeometry(this, kind, config);
    let next = this._withGuideConfig(kind, "ticks", config)
      .editGraphics({
        target: names.ticks,
        property: "length",
        value: geometry.values.length
      });
    for (const property of ["x1", "y1", "x2", "y2"]) {
      next = next.editGraphics({
        target: names.ticks,
        property,
        value: geometry[property]
      });
    }
    return next
      .editGraphics({
        target: names.ticks,
        property: "stroke",
        value: config.color
      })
      .editGraphics({
        target: names.ticks,
        property: "strokeWidth",
        value: config.lineWidth
      });
  });
}

function makeCreateTicks(kind) {
  const operation = operations(kind, "Ticks");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis ticks.`
  }, function (args = {}) {
    validateObject(args, TICK_CREATE_OPTIONS, operation.create);
    validateModeOptions(args, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.ticks] !== undefined) {
      throw new Error(`${operation.create} requires missing axis ticks.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveTickConfig(this, kind, args, resources);
    tickGeometry(this, kind, config);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      .createGraphics({
        id: names.ticks,
        type: "line",
        length: 0,
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "ticks", config)
      [operation.edit]();
  });
}

export const createThetaAxisTicks = makeCreateTicks("theta");
export const createRadialAxisTicks = makeCreateTicks("radius");
export const editThetaAxisTicks = makeEditTicks("theta");
export const editRadialAxisTicks = makeEditTicks("radius");
