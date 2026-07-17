import { action } from "../../../../core/action.js";
import { validateNonNegativeFinite } from "../../../../core/validation.js";
import {
  resolveRadialAxisLabels,
  resolveThetaAxisLabels
} from "../../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import {
  formatPolarGuideValues,
  mapPolarGuideValues,
  normalizePolarTickMode,
  POLAR_AXIS_DEFAULTS,
  polarGuideNames,
  resolvePolarFrameForProgram,
  validatePolarLabelFormat,
  validatePolarTextStyle,
  validatePolarTickConfig
} from "../resolve.js";
import {
  componentResources,
  LABEL_CREATE_OPTIONS,
  LABEL_EDIT_OPTIONS,
  operations,
  prefix,
  resolveAngle,
  validateModeOptions,
  validateObject,
  withAxisSemantics
} from "./shared.js";

function labelGeometry(program, kind, config) {
  const frame = resolvePolarFrameForProgram(program);
  const mapped = mapPolarGuideValues(program, config);
  const text = formatPolarGuideValues(program, config, mapped.values);
  return {
    values: mapped.values,
    text,
    ...(kind === "theta"
      ? resolveThetaAxisLabels({
          frame,
          angles: mapped.positions,
          offset: config.offset
        })
      : resolveRadialAxisLabels({
          frame,
          angle: resolveAngle(program, kind, {}),
          radii: mapped.positions,
          offset: config.offset
        }))
  };
}

function resolveLabelConfig(program, kind, args, resources, previous) {
  const ticks = program.guideConfigs.axis?.[kind]?.ticks;
  const count = kind === "theta"
    ? POLAR_AXIS_DEFAULTS.ticks.thetaCount
    : POLAR_AXIS_DEFAULTS.ticks.radiusCount;
  const explicitMode = Object.hasOwn(args, "count") ||
    Object.hasOwn(args, "values");
  let mode;
  if (explicitMode) {
    mode = normalizePolarTickMode(program, resources.scale, args, count);
  } else if (ticks !== undefined) {
    mode = ticks.mode === "values"
      ? {
          mode: "values",
          values: ticks.values,
          inferredValues: ticks.inferredValues
        }
      : {
          mode: "count",
          count: ticks.count,
          inferredValues: ticks.inferredValues
        };
  } else if (previous?.inferredValues === false) {
    mode = previous.mode === "values"
      ? { mode: "values", values: previous.values, inferredValues: false }
      : { mode: "count", count: previous.count, inferredValues: false };
  } else {
    mode = normalizePolarTickMode(program, resources.scale, {}, count);
  }
  const config = {
    ...(previous ?? {}),
    scale: resources.scale,
    coordinate: resources.coordinate,
    ...mode,
    offset: args.offset ?? previous?.offset ?? (kind === "theta"
      ? POLAR_AXIS_DEFAULTS.labels.thetaOffset
      : POLAR_AXIS_DEFAULTS.labels.radiusOffset),
    format: args.format ?? previous?.format ??
      POLAR_AXIS_DEFAULTS.labels.format,
    color: args.color ?? previous?.color ?? POLAR_AXIS_DEFAULTS.labels.color,
    fontSize: args.fontSize ?? previous?.fontSize ??
      POLAR_AXIS_DEFAULTS.labels.fontSize,
    fontFamily: args.fontFamily ?? previous?.fontFamily ??
      POLAR_AXIS_DEFAULTS.labels.fontFamily,
    fontWeight: args.fontWeight ?? previous?.fontWeight ??
      POLAR_AXIS_DEFAULTS.labels.fontWeight
  };
  validatePolarTickConfig(config, `${kind}-axis labels`);
  validateNonNegativeFinite(config.offset, "Polar axis label offset");
  validatePolarLabelFormat(config.format);
  validatePolarTextStyle(config, `${prefix(kind)} axis labels`);
  return config;
}

function makeEditLabels(kind) {
  const operation = operations(kind, "Labels");
  return action({
    op: operation.edit,
    description: `Edit the Polar ${kind}-axis labels.`
  }, function (args = {}) {
    validateObject(args, LABEL_EDIT_OPTIONS, operation.edit);
    validateModeOptions(args, operation.edit);
    const names = polarGuideNames(kind);
    const previous = this.guideConfigs.axis?.[kind]?.labels;
    if (this.graphicSpec.objects[names.labels]?.type !== "text" ||
        previous === undefined) {
      throw new Error(`${operation.edit} requires existing axis labels.`);
    }
    const resources = {
      scale: previous.scale,
      coordinate: previous.coordinate
    };
    const config = resolveLabelConfig(this, kind, args, resources, previous);
    const geometry = labelGeometry(this, kind, config);
    let next = this._withGuideConfig(kind, "labels", config)
      .editGraphics({
        target: names.labels,
        property: "length",
        value: geometry.values.length
      });
    const properties = {
      x: geometry.x,
      y: geometry.y,
      text: geometry.text,
      textAlign: geometry.textAlign,
      textBaseline: geometry.textBaseline,
      fill: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    };
    for (const [property, value] of Object.entries(properties)) {
      next = next.editGraphics({ target: names.labels, property, value });
    }
    return next;
  });
}

function makeCreateLabels(kind) {
  const operation = operations(kind, "Labels");
  return action({
    op: operation.create,
    description: `Create the Polar ${kind}-axis labels.`
  }, function (args = {}) {
    validateObject(args, LABEL_CREATE_OPTIONS, operation.create);
    validateModeOptions(args, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.labels] !== undefined) {
      throw new Error(`${operation.create} requires missing axis labels.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveLabelConfig(this, kind, args, resources);
    labelGeometry(this, kind, config);
    let next = withAxisSemantics(this, kind, resources);
    if (kind === "radius" &&
        next.guideConfigs.axis?.radius?.layout === undefined) {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      .createGraphics({
        id: names.labels,
        type: "text",
        length: 0,
        ...resolvePlotGraphicPlacement(next)
      })
      ._withGuideConfig(kind, "labels", config)
      [operation.edit]();
  });
}

export const createThetaAxisLabels = makeCreateLabels("theta");
export const createRadialAxisLabels = makeCreateLabels("radius");
export const editThetaAxisLabels = makeEditLabels("theta");
export const editRadialAxisLabels = makeEditLabels("radius");
