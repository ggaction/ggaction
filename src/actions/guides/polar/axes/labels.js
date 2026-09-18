import { axisThemeTypography } from "../../../theme/state.js";
import { action } from "../../../../core/action.js";
import { validateNonNegativeFinite } from "../../../../core/validation.js";
import {
  resolveRadialAxisLabels,
  resolveThetaAxisLabels
} from "../../../../grammar/polarGuides.js";
import { resolvePlotGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { assertPolarTextLayout } from "../../../../layout/labels.js";
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
  labelCreateOptions,
  labelEditOptions,
  operations,
  prefix,
  resolveAngle,
  validateModeOptions,
  validateComponentCreateArgs,
  validateObject,
  withAxisSemantics
} from "./shared.js";
import { normalizeDisplayLabelMap } from
  "../../../../grammar/displayLabels.js";

function labelGeometry(program, kind, config, angle = resolveAngle(program, kind, {})) {
  const frame = resolvePolarFrameForProgram(program, config.coordinate);
  const mapped = mapPolarGuideValues(program, config);
  const text = formatPolarGuideValues(program, config, mapped.values);
  const geometry = {
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
          angle,
          radii: mapped.positions,
          offset: config.offset
        }))
  };
  assertPolarTextLayout({
    canvas: program.graphicSpec.objects.canvas,
    label: `${prefix(kind)} axis labels`,
    items: text.map((value, index) => ({
      x: geometry.x[index],
      y: geometry.y[index],
      text: value,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: geometry.textAlign[index],
      textBaseline: geometry.textBaseline[index]
    }))
  }, program.materializationConfigs.textMetrics);
  return geometry;
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
  const typography = axisThemeTypography(program.materializationConfigs.theme, "labels");
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
    fontSize: args.fontSize ?? previous?.fontSize ?? typography.fontSize ??
      POLAR_AXIS_DEFAULTS.labels.fontSize,
    fontFamily: args.fontFamily ?? previous?.fontFamily ?? typography.fontFamily ??
      POLAR_AXIS_DEFAULTS.labels.fontFamily,
    fontWeight: args.fontWeight ?? previous?.fontWeight ??
      POLAR_AXIS_DEFAULTS.labels.fontWeight
  };
  const labelScale = program.resolvedScales[resources.scale];
  if (Object.hasOwn(args, "labelMap")) {
    if (kind !== "theta" || !["ordinal", "band", "point"].includes(labelScale?.type)) {
      throw new Error(`${prefix(kind)} axis labelMap requires a categorical theta scale.`);
    }
    if (args.labelMap === "auto") delete config.labelMap;
    else {
      config.labelMap = normalizeDisplayLabelMap(
        args.labelMap,
        `${prefix(kind)} axis labelMap`
      );
    }
  }
  if (config.labelMap !== undefined &&
      (kind !== "theta" || !["ordinal", "band", "point"].includes(labelScale?.type))) {
    throw new Error(`${prefix(kind)} axis labelMap requires a categorical theta scale.`);
  }
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
    validateObject(args, labelEditOptions(kind), operation.edit);
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
    validateComponentCreateArgs(kind, args, labelCreateOptions(kind), operation.create);
    validateModeOptions(args, operation.create);
    const names = polarGuideNames(kind);
    if (this.graphicSpec.objects[names.labels] !== undefined) {
      throw new Error(`${operation.create} requires missing axis labels.`);
    }
    const resources = componentResources(this, kind, args, operation.create);
    const angle = resolveAngle(this, kind, args);
    const config = resolveLabelConfig(this, kind, args, resources);
    labelGeometry(this, kind, config, angle);
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

export const createThetaAxisLabels = /* @__PURE__ */ makeCreateLabels("theta");
export const createRadialAxisLabels = /* @__PURE__ */ makeCreateLabels("radius");
export const editThetaAxisLabels = /* @__PURE__ */ makeEditLabels("theta");
export const editRadialAxisLabels = /* @__PURE__ */ makeEditLabels("radius");
