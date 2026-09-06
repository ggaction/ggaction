import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateKeys,
  validatePositiveFinite
} from "../../core/validation.js";
import {
  normalizeStrokeDashPattern,
  validateOpacityValue
} from "../../grammar/scales/index.js";
import {
  validateRuleStroke,
  validateRuleStrokeWidth
} from "../../grammar/ruleAppearance.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { resolveIntervalComposite } from "../intervals/resolve.js";
import {
  resolveDistributionScalePlan,
  setCartesianPosition,
  updateDistributionPositions
} from "../distributions/revision.js";
import {
  applyIntervalRevision,
  collectIntervalConsumers,
  findIntervalTransform,
  ownOptions,
  planIntervalEdit,
  planIntervalRoleData,
  releaseIntervalRevision,
  resolveIntervalOwner
} from "../data/intervalEdit.js";

export const ERROR_BAR_EDIT_OPTIONS = Object.freeze([
  "target", "data", "x", "y", "xOffset", "yOffset", "groupBy",
  "caps", "capSize", "stroke", "strokeWidth", "strokeDash", "opacity",
  "statistics"
]);

export const ERROR_BAR_APPEARANCE_OPTIONS = Object.freeze([
  "caps", "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"
]);
const STATISTICS_OPTIONS = Object.freeze(["center", "extent", "method", "level"]);
const EDIT_POLICY = Object.freeze({
  operation: "editErrorBar",
  resourceLabel: "error-bar",
  defaultId: "errorBar",
  ownerLabel: "Error-bar id",
  positionTypes: Object.freeze([
    "quantitative", "nominal", "ordinal", "temporal"
  ]),
  defaultPositionType: "nominal",
  defaultIntervalChannel: "y",
  scaleDefaults: () => ({}),
  intervalScaleDefaults: Object.freeze({ nice: true, zero: false }),
  allowExplicitGrouping: false,
  ambiguousMessage:
    "editErrorBar requires one quantitative interval axis and one compatible position axis; use interval options to disambiguate two quantitative channels."
});

export function resolveErrorBarAppearance(args, { defaults, operation }) {
  validateKeys(args, ERROR_BAR_EDIT_OPTIONS, operation);
  const caps = args.caps ?? defaults.caps;
  if (typeof caps !== "boolean") {
    throw new TypeError(`${operation} caps must be a boolean.`);
  }
  const capSize = args.capSize ?? defaults.capSize;
  validatePositiveFinite(capSize, `${operation} capSize`);
  const stroke = validateRuleStroke(
    args.stroke ?? defaults.stroke,
    `${operation} stroke`
  );
  const strokeWidth = validateRuleStrokeWidth(
    args.strokeWidth ?? defaults.strokeWidth,
    `${operation} strokeWidth`
  );
  const strokeDash = args.strokeDash ?? defaults.strokeDash;
  normalizeStrokeDashPattern(strokeDash);
  const opacity = validateOpacityValue(
    args.opacity ?? defaults.opacity,
    `${operation} opacity`
  );
  return { caps, capSize, stroke, strokeWidth, strokeDash, opacity };
}

const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

export function errorBarCaps(config) {
  return [
    [config.lowerCapId, config.fields?.lower ?? config.lowerField],
    [config.upperCapId, config.fields?.upper ?? config.upperField]
  ];
}

function resolveOwner(program, requested) {
  return resolveIntervalOwner(program, requested, {
    idLabel: "Error-bar id",
    label: "error bar",
    mark: "rule",
    config: "errorBar"
  });
}

function currentRoleArgs(program, owner, current) {
  const transform = findIntervalTransform(program, current.data);
  const intervalChannel = current.orientation === "vertical" ? "y" : "x";
  const positionChannel = intervalChannel === "x" ? "y" : "x";
  const position = {
    field: current.positionField,
    fieldType: current.positionFieldType,
    ...(current.positionTemporalUnit === undefined
      ? {}
      : { temporalUnit: current.positionTemporalUnit }),
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
    groupBy: current.groupField ?? transform?.groupBy?.find(
      field => field !== current.positionField
    )
  };
}

function resolveRoleCandidate(program, owner, current, args) {
  const previous = currentRoleArgs(program, owner, current);
  const full = {
    data: Object.hasOwn(args, "data") ? args.data : previous.source,
    x: Object.hasOwn(args, "x") ? args.x : previous.x,
    y: Object.hasOwn(args, "y") ? args.y : previous.y,
    ...(Object.hasOwn(args, "groupBy")
      ? { groupBy: args.groupBy }
      : previous.groupBy === undefined ? {} : { groupBy: previous.groupBy }),
    coordinate: current.coordinate
  };
  const policy = {
    ...EDIT_POLICY,
    existingId: owner.id,
    coordinate: current.coordinate,
    generatedFields: findIntervalTransform(program, current.data)?.as
  };
  let resolved = resolveIntervalComposite(program, full, policy);
  if (Object.hasOwn(args, "statistics")) {
    if (!isPlainObject(args.statistics)) {
      throw new TypeError("editErrorBar statistics must be a plain object.");
    }
    validateKeys(args.statistics, STATISTICS_OPTIONS, "editErrorBar statistics");
    if (!STATISTICS_OPTIONS.some(key => Object.hasOwn(args.statistics, key))) {
      throw new Error(
        "editErrorBar statistics requires center, extent, method, or level."
      );
    }
    full[resolved.interval.channel] = {
      ...full[resolved.interval.channel],
      ...args.statistics
    };
    resolved = resolveIntervalComposite(program, full, policy);
  }
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
        ? EDIT_POLICY.intervalScaleDefaults
        : EDIT_POLICY.scaleDefaults(role.fieldType)
    });
  };
  const xScale = plan("x", x);
  const yScale = plan("y", y);
  const expectedOffset = `${resolved.position.channel}Offset`;
  const incompatibleOffset = expectedOffset === "xOffset" ? "yOffset" : "xOffset";
  if (Object.hasOwn(args, incompatibleOffset)) {
    throw new Error(
      `editErrorBar ${incompatibleOffset} does not match the ${resolved.orientation} interval orientation.`
    );
  }
  const offset = Object.hasOwn(args, expectedOffset)
    ? args[expectedOffset] === false ? undefined : args[expectedOffset]
    : current.offset === undefined ? undefined : {
        field: current.offset.field,
        fieldType: current.offset.fieldType,
        scale: { id: current.offset.scale },
        paddingInner: current.offset.paddingInner,
        paddingOuter: current.offset.paddingOuter
      };
  const normalizedOffset = offset === undefined ? undefined : {
    channel: expectedOffset,
    field: offset.field,
    fieldType: offset.fieldType ?? "nominal",
    scale: offset.scale ?? { id: current.offset?.scale ?? expectedOffset },
    paddingInner: offset.paddingInner ?? current.offset?.paddingInner ?? 0,
    paddingOuter: offset.paddingOuter ?? current.offset?.paddingOuter ?? 0
  };
  if (normalizedOffset !== undefined) {
    if (typeof normalizedOffset.field !== "string" || normalizedOffset.field.length === 0) {
      throw new TypeError(`editErrorBar ${expectedOffset} field must be a non-empty string.`);
    }
    if (!["nominal", "ordinal"].includes(normalizedOffset.fieldType)) {
      throw new Error(`editErrorBar ${expectedOffset} requires a categorical field.`);
    }
    if (resolved.interval.mode === "statistical") {
      resolved = {
        ...resolved,
        groupBy: [...new Set([...resolved.groupBy, normalizedOffset.field])]
      };
    }
  }
  return {
    ...resolved,
    offset: normalizedOffset,
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

function removeCap(program, id) {
  if (findLayer(program, id) === undefined) return program;
  return program
    .editSemantic({ property: `layer[${id}]`, remove: true })
    .editGraphics({ target: id, remove: true })
    ._withoutMaterializationConfig(["marks", id]);
}

function capArgs(config, id, intervalField) {
  return {
    id,
    data: config.data,
    orientation: config.orientation,
    positionField: config.positionField,
    positionFieldType: config.positionFieldType,
    ...(config.positionTemporalUnit === undefined ? {} : { positionTemporalUnit: config.positionTemporalUnit }),
    intervalField,
    coordinate: config.coordinate,
    positionScale: config.positionScale,
    intervalScale: config.intervalScale,
    ...(config.offset === undefined
      ? {}
      : {
          offsetChannel: config.offset.channel,
          offsetField: config.offset.field,
          offsetFieldType: config.offset.fieldType,
          offsetScale: config.offset.scale,
          offsetPaddingInner: config.offset.paddingInner,
          offsetPaddingOuter: config.offset.paddingOuter
        }),
    capSize: config.capSize,
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    strokeDash: config.strokeDash,
    opacity: config.opacity
  };
}

function rematerializeRuleAppearance(program, id, config, fixedSpan) {
  return program
    .editSemantic({
      property: `layer[${id}].encoding.strokeDash.datum`,
      value: config.strokeDash
    })
    ._withMarkConfig(id, {
      ...program.markConfigs[id],
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      strokeDash: config.strokeDash,
      opacity: config.opacity,
      ...(fixedSpan === undefined ? {} : { fixedSpan })
    })
    .rematerializeRuleMark({ id });
}

function updateErrorBarOffsets(program, ids, current, candidate) {
  let next = program;
  const oldChannel = current.offset?.channel;
  const newChannel = candidate.offset?.channel;
  for (const id of ids) {
    const layer = findLayer(next, id);
    if (
      layer !== undefined && oldChannel !== undefined &&
      (newChannel !== oldChannel || candidate.offset === undefined) &&
      layer.encoding?.[oldChannel] !== undefined
    ) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.${oldChannel}`, remove: true
      });
    }
  }
  if (candidate.offset === undefined) return next;
  const actionName = newChannel === "xOffset" ? "encodeXOffset" : "encodeYOffset";
  for (const id of ids) {
    if (findLayer(next, id) === undefined) continue;
    next = next[actionName]({
      target: id,
      field: candidate.offset.field,
      fieldType: candidate.offset.fieldType,
      scale: candidate.offset.scale,
      paddingInner: candidate.offset.paddingInner,
      paddingOuter: candidate.offset.paddingOuter
    });
  }
  return next;
}

function updateErrorBarRoles(program, owner, current, candidate, dataId, capIds) {
  const owned = [owner.id, ...capIds];
  let next = updateErrorBarOffsets(
    program, owned, current, { ...candidate, offset: undefined }
  );
  next = updateDistributionPositions(next, owner, current, candidate, {
    owned,
    lower: candidate.fields.lower,
    upper: candidate.fields.upper,
    title: candidate.measure,
    update(value, { category, measure, categoryChannel, measureChannel }) {
      let updated = value;
      for (const [id, field] of [
        [current.lowerCapId, candidate.fields.lower],
        [current.upperCapId, candidate.fields.upper]
      ]) {
        if (findLayer(updated, id) === undefined) continue;
        updated = setCartesianPosition(updated, id, categoryChannel, {
          field: candidate.position.field,
          fieldType: candidate.position.fieldType,
          scale: category.scale
        });
        updated = setCartesianPosition(updated, id, measureChannel, {
          field,
          fieldType: "quantitative",
          scale: measure.scale
        })._withMarkConfig(id, {
          ...updated.markConfigs[id],
          fixedSpan: {
            ...updated.markConfigs[id].fixedSpan,
            orientation: candidate.orientation === "vertical"
              ? "horizontal" : "vertical"
          }
        });
      }
      return updated;
    }
  });
  next = updateErrorBarOffsets(next, owned, current, candidate);
  const positionScale = candidate.position.channel === "x"
    ? candidate.xScale.id : candidate.yScale.id;
  const intervalScale = candidate.interval.channel === "x"
    ? candidate.xScale.id : candidate.yScale.id;
  const revisedConfig = {
    ...next.markConfigs[owner.id].errorBar,
    source: candidate.source,
    data: dataId,
    intervalMode: candidate.interval.mode,
    groupField: candidate.groupField,
    groupBy: candidate.groupBy,
    orientation: candidate.orientation,
    positionField: candidate.position.field,
    positionFieldType: candidate.position.fieldType,
    lowerField: candidate.fields.lower,
    upperField: candidate.fields.upper,
    positionScale,
    intervalScale
  };
  delete revisedConfig.intervalField;
  delete revisedConfig.centerField;
  delete revisedConfig.positionTemporalUnit;
  delete revisedConfig.offset;
  if (candidate.interval.mode === "statistical") {
    revisedConfig.intervalField = candidate.interval.field;
  } else {
    revisedConfig.centerField = candidate.fields.center;
  }
  if (candidate.position.temporalUnit !== undefined) {
    revisedConfig.positionTemporalUnit = candidate.position.temporalUnit;
  }
  if (candidate.offset !== undefined) {
    revisedConfig.offset = {
      ...candidate.offset,
      scale: typeof candidate.offset.scale === "string"
        ? candidate.offset.scale
        : candidate.offset.scale.id
    };
  }
  next = next._withMarkConfig(owner.id, {
    ...next.markConfigs[owner.id],
    errorBar: revisedConfig
  });
  return next.rematerializeErrorBar({ id: owner.id });
}

export const rematerializeErrorBar = action(
  {
    op: "rematerializeErrorBar",
    description: "Reconcile one error bar and its owned caps."
  },
  function (args = {}) {
    validateKeys(args, REMATERIALIZE_OPTIONS, "rematerializeErrorBar");
    const id = validateUserId(args.id, "Error-bar id");
    const layer = findLayer(this, id);
    const config = this.markConfigs[id]?.errorBar;
    if (layer?.mark?.type !== "rule" || config === undefined) {
      throw new Error(`Unknown error bar "${id}".`);
    }
    let next = rematerializeRuleAppearance(this, id, config);
    const capDefinitions = errorBarCaps(config);
    if (!config.caps) {
      for (const [capId] of capDefinitions) next = removeCap(next, capId);
      return next;
    }
    const span = {
      orientation: config.orientation === "vertical" ? "horizontal" : "vertical",
      size: config.capSize
    };
    for (const [capId, field] of capDefinitions) {
      if (findLayer(next, capId) === undefined) {
        next = next.createErrorBarCap(capArgs(config, capId, field));
      } else {
        next = rematerializeRuleAppearance(next, capId, config, span);
      }
    }
    return next;
  }
);

export const editErrorBar = action(
  {
    op: "editErrorBar",
    description: "Revise one error bar's roles, statistics, and owned caps."
  },
  function (args = {}) {
    validateKeys(args, ERROR_BAR_EDIT_OPTIONS, "editErrorBar");
    const editable = ERROR_BAR_EDIT_OPTIONS.filter(option => option !== "target");
    if (!editable.some(option => Object.hasOwn(args, option))) {
      throw new Error("editErrorBar requires at least one change.");
    }
    const owner = resolveOwner(this, args.target);
    const current = this.markConfigs[owner.id].errorBar;
    const appearance = resolveErrorBarAppearance(
      ownOptions(args, ERROR_BAR_APPEARANCE_OPTIONS), {
      defaults: current,
      operation: "editErrorBar"
      }
    );
    const roleRequested = [
      "data", "x", "y", "xOffset", "yOffset", "groupBy"
    ].some(key => Object.hasOwn(args, key));
    const candidate = roleRequested
      ? resolveRoleCandidate(this, owner, current, args)
      : undefined;
    const capIds = errorBarCaps(current)
      .map(([id]) => id)
      .filter(id => findLayer(this, id) !== undefined);
    const consumers = collectIntervalConsumers(this, [owner.id, ...capIds]);
    const interval = roleRequested
      ? planIntervalRoleData(this, {
          owner: owner.id,
          currentData: current.data,
          candidate,
          consumers
        })
      : Object.hasOwn(args, "statistics")
      ? planIntervalEdit(this, {
          owner: owner.id,
          data: current.data,
          consumers,
          statistics: args.statistics,
          operation: "editErrorBar"
        })
      : { changed: false };

    let next = applyIntervalRevision(this, interval);
    next = next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      errorBar: {
        ...current,
        ...appearance,
        ...(interval.changed
          ? { data: interval.dataId ?? interval.revision.id }
          : {})
      }
    });
    next = roleRequested
      ? updateErrorBarRoles(
          next, owner, current, candidate, interval.dataId, capIds
        )
      : next.rematerializeErrorBar({ id: owner.id });
    return releaseIntervalRevision(next, interval);
  }
);
