import { findSemanticScale } from "../../selectors/scales.js";
import {
  findIntervalTransform,
  mergeIntervalStatistics,
  validateIntervalStatistics
} from "../data/intervalEdit.js";
import { resolveDistributionScalePlan } from "../distributions/revision.js";
import { resolveIntervalComposite } from "./resolve.js";

export function currentIntervalRoleArgs(program, owner, current, bar) {
  const transform = findIntervalTransform(program, current.data);
  const intervalChannel = current.orientation === "vertical" ? "y" : "x";
  const positionChannel = intervalChannel === "x" ? "y" : "x";
  const storedPosition = bar
    ? {
        field: current.positionField,
        fieldType: current.positionFieldType,
        temporalUnit: current.positionTemporalUnit
      }
    : current.position;
  const position = {
    field: storedPosition.field,
    fieldType: storedPosition.fieldType,
    ...(storedPosition.temporalUnit === undefined
      ? {}
      : { temporalUnit: storedPosition.temporalUnit }),
    scale: { id: current.positionScale }
  };
  const interval = transform === undefined
    ? {
        center: current.centerField ?? owner.encoding[intervalChannel].title,
        lower: current.lowerField,
        upper: current.upperField,
        scale: { id: current.intervalScale }
      }
    : {
        field: transform.field,
        center: transform.center,
        extent: transform.extent,
        ...(transform.method === undefined ? {} : { method: transform.method }),
        ...(transform.level === undefined ? {} : { level: transform.level }),
        scale: { id: current.intervalScale }
      };
  return {
    source: current.source ?? transform?.source ?? current.data,
    x: positionChannel === "x" ? position : interval,
    y: positionChannel === "y" ? position : interval,
    groupBy: bar ? current.groupField ?? transform?.groupBy?.find(
      field => field !== current.positionField
    ) : current.groupBy
  };
}

export function resolveIntervalRoleScales(program, resolved, current, policy, owner, previous) {
  const positionRole = {
    field: resolved.position.field,
    fieldType: resolved.position.fieldType,
    scale: resolved.position.scale
  };
  const intervalTitle = resolved.interval.mode === "statistical"
    ? resolved.interval.field
    : resolved.interval.title;
  const intervalRole = {
    field: intervalTitle,
    fieldType: "quantitative",
    scale: resolved.interval.scale
  };
  const x = resolved.position.channel === "x" ? positionRole : intervalRole;
  const y = resolved.position.channel === "y" ? positionRole : intervalRole;
  const plan = (channel, role) => {
    const fallback = role === intervalRole
      ? current.intervalScale
      : current.positionScale;
    const stored = findSemanticScale(program, fallback);
    const compatible = role.fieldType === "temporal"
      ? stored?.type === "time"
      : ["nominal", "ordinal"].includes(role.fieldType)
        ? ["band", "point"].includes(stored?.type)
        : ["linear", "log", "pow", "sqrt", "symlog"].includes(stored?.type);
    const defaultType = role.fieldType === "temporal"
      ? "time"
      : ["nominal", "ordinal"].includes(role.fieldType) ? "band" : "linear";
    const requested = role.scale.type !== undefined || compatible
      ? role.scale
      : { ...role.scale, type: defaultType };
    return resolveDistributionScalePlan(program, {
      channel,
      fieldType: role.fieldType,
      requested,
      fallback,
      defaults: role === intervalRole
        ? policy.intervalScaleDefaults
        : policy.scaleDefaults(role.fieldType)
    });
  };
  const xScale = plan("x", x);
  const yScale = plan("y", y);
  return {
    x: { ...x, scale: xScale.id },
    y: { ...y, scale: yScale.id },
    xScale,
    yScale,
    category: resolved.position.field,
    categoryType: resolved.position.fieldType,
    measure: intervalTitle,
    previous: {
      x: { field: previous.x.center ?? previous.x.field,
        fieldType: owner.encoding.x.fieldType, scale: owner.encoding.x.scale },
      y: { field: previous.y.center ?? previous.y.field,
        fieldType: owner.encoding.y.fieldType, scale: owner.encoding.y.scale }
    }
  };
}

export function applyIntervalStatistics(program, full, policy, args, resolved) {
  if (Object.hasOwn(args, "statistics")) {
    validateIntervalStatistics(args.statistics, policy.operation);
    const { method, level, ...interval } = full[resolved.interval.channel];
    full[resolved.interval.channel] = {
      ...interval,
      ...mergeIntervalStatistics(resolved.interval, args.statistics)
    };
    resolved = resolveIntervalComposite(program, full, policy);
  }
  return resolved;
}
