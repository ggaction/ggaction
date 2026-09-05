import { validateAxesArgs } from "./axes/axes.js";
import { validateAxisArgs } from "./axes/axis.js";
import { validateAxisTickGroupArgs } from "./axes/tickGroups.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import {
  assertGuideOptions, guideConflict, resolveStoredGuideCoordinate, sameGuideValue
} from "./reuse.js";

export function scopeFacadeAxes(program, layer, args) {
  const descriptor = validateAxesArgs(args);
  const coordinate = findCoordinate(program, layer.coordinate);
  if (coordinate === undefined) guideConflict(`layer "${layer.id}" has no coordinate`);
  if (descriptor.id !== undefined && descriptor.id !== coordinate.id) {
    guideConflict("axes.coordinate.id does not belong to this facade");
  }
  if (descriptor.type !== undefined && descriptor.type !== "auto" && descriptor.type !== coordinate.type) {
    guideConflict("axes.coordinate.type does not match this facade");
  }
  if (args.theta !== undefined || args.radius !== undefined) {
    guideConflict("Cartesian and Parallel facades do not own Polar axes");
  }
  if (coordinate.type === "parallel") {
    if (args.x !== undefined || args.y !== undefined) {
      throw new Error("createAxes channel options are not supported for Parallel axes.");
    }
    return { coordinate: { id: coordinate.id, type: "parallel" } };
  }
  const scoped = { coordinate: { id: coordinate.id, type: "cartesian" } };
  for (const channel of ["x", "y"]) {
    const option = args[channel];
    if (option === false || (option === undefined && layer.encoding?.[channel] === undefined)) {
      scoped[channel] = false;
      continue;
    }
    const scale = layer.encoding?.[channel]?.scale;
    if (scale === undefined) guideConflict(`this facade has no ${channel} scale`);
    if (option?.scale !== undefined && option.scale !== scale) {
      guideConflict(`axes.${channel}.scale does not belong to this facade`);
    }
    if (option?.coordinate !== undefined && option.coordinate !== coordinate.id) {
      guideConflict(`axes.${channel}.coordinate does not belong to this facade`);
    }
    scoped[channel] = { ...option, scale, coordinate: coordinate.id };
    validateAxisArgs(scoped[channel], `create${channel.toUpperCase()}Axis`);
    validateAxisTickGroupArgs(scoped[channel].ticksAndLabels ?? {}, "createAxisTicksAndLabels", true);
  }
  return scoped;
}

function tickMode(config) {
  return config?.mode === "values" ? { values: config.values }
    : config?.mode === "count" ? { count: config.count } : {};
}

function planAxis(program, channel, args, explicit) {
  const prefix = channel.toUpperCase();
  const guide = program.semanticSpec.guides.axis?.[channel];
  const configs = program.guideConfigs.axis?.[channel] ?? {};
  if (guide === undefined && Object.keys(configs).length === 0) {
    return [{ op: `create${prefix}Axis`, args }];
  }
  if (guide?.scale !== args.scale || resolveStoredGuideCoordinate(program, guide, channel) !== args.coordinate) {
    guideConflict(`${channel} axis uses a different coordinate or scale`);
  }
  const positions = [...new Set(Object.values(configs).map(config => config.position).filter(Boolean))];
  if (positions.length > 1) guideConflict(`${channel} axis components have incompatible positions`);
  const position = explicit.position ?? positions[0];
  const shared = { scale: args.scale, ...(position === undefined ? {} : { position }) };
  const explicitShared = explicit.position === undefined ? {} : { position: explicit.position };
  const steps = guide.coordinate === undefined ? [{
    op: "editSemantic", args: { property: `guide.axis.${channel}.coordinate`, value: args.coordinate }
  }] : [];
  const group = args.ticksAndLabels ?? {};
  const explicitGroup = explicit.ticksAndLabels ?? {};
  const explicitMode = Object.fromEntries(["count", "values"].filter(key =>
    Object.hasOwn(explicitGroup, key)
  ).map(key => [key, explicitGroup[key]]));
  const requested = {
    line: { ...explicitShared, ...(explicit.line ?? {}) },
    ticks: { ...explicitShared, ...explicitMode, ...(explicitGroup.ticks ?? {}) },
    labels: { ...explicitShared, ...explicitMode, ...(explicitGroup.labels ?? {}) },
    title: { ...explicitShared, ...(explicit.title ?? {}) }
  };
  for (const component of ["line", "ticks", "labels", "title"]) {
    const config = configs[component];
    if (config === undefined) continue;
    if (config.scale !== undefined && config.scale !== args.scale) {
      guideConflict(`${channel} ${component} uses a different scale`);
    }
    assertGuideOptions(requested[component], component === "title"
      ? { ...config, text: guide.title } : config, `${channel} axis ${component}`);
  }
  if (configs.line === undefined) {
    steps.push({ op: `create${prefix}AxisLine`, args: { ...shared, ...args.line } });
  }
  if (configs.ticks === undefined && configs.labels === undefined) {
    steps.push({ op: `create${prefix}AxisTicksAndLabels`, args: { ...shared, ...group } });
  } else {
    if (configs.ticks === undefined) {
      steps.push({ op: `create${prefix}AxisTicks`, args: { ...shared, ...tickMode(configs.labels), ...explicitMode, ...group.ticks } });
    }
    if (configs.labels === undefined) {
      steps.push({ op: `create${prefix}AxisLabels`, args: { ...shared, ...group.labels } });
    }
  }
  if (configs.title === undefined) {
    steps.push({ op: `create${prefix}AxisTitle`, args: { ...shared, ...args.title } });
  }
  return steps;
}

export function planFacadeAxes(program, layer, scoped, explicit = {}) {
  if (scoped.coordinate.type === "parallel") {
    const existing = program.semanticSpec.guides.axis?.parallel;
    if (existing === undefined) return [{
      op: "createParallelAxes", args: { target: layer.id, coordinate: layer.coordinate }
    }];
    const scales = layer.encoding.parallel.dimensions.map(dimension => dimension.scale);
    if (existing.coordinate !== layer.coordinate || !sameGuideValue(existing.scales, scales)) {
      guideConflict("Parallel axes use a different coordinate or dimension scales");
    }
    return [];
  }
  return ["x", "y"].flatMap(channel => scoped[channel] === false ? []
    : planAxis(program, channel, scoped[channel], explicit[channel] ?? {}));
}
