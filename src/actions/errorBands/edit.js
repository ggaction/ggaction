import { currentIntervalRoleArgs, resolveIntervalRoleScales, applyIntervalStatistics } from "../intervals/revision.js";
import { closedAction } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales/index.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../grammar/strokeStyle.js";
import { findLayer } from "../../selectors/layers.js";
import { removeOwnedMark } from "../marks/remove.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { resolveIntervalComposite } from "../intervals/resolve.js";
import {
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

export const ERROR_BAND_BOUNDARY_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity", "curve",
  ...STROKE_STYLE_PROPERTIES
]);

export function resolveBoundaryAppearance(value, { defaults, operation }) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} must be a plain object.`);
  }
  validateKeys(value, ERROR_BAND_BOUNDARY_OPTIONS, operation);
  const stroke = value.stroke ?? defaults.stroke;
  const strokeWidth = value.strokeWidth ?? defaults.strokeWidth;
  const strokeDash = value.strokeDash ?? defaults.strokeDash;
  const opacity = value.opacity ?? defaults.opacity;
  const curve = validateCurveInterpolation(value.curve ?? defaults.curve);
  validateNonEmptyString(stroke, `${operation} stroke`);
  validateNonNegativeFinite(strokeWidth, `${operation} strokeWidth`);
  const resolvedStrokeDash = normalizeStrokeDashPattern(strokeDash);
  validateUnitInterval(opacity, `${operation} opacity`);
  return {
    stroke,
    strokeWidth,
    strokeDash: resolvedStrokeDash,
    opacity,
    curve,
    ...requestedStrokeDetails({ ...defaults, ...value }, operation)
  };
}

const EDIT_OPTIONS = Object.freeze([
  "target", "data", "x", "y", "groupBy", "fill", "opacity", "curve",
  "statistics", "boundaries", ...STROKE_STYLE_PROPERTIES
]);
const EDIT_POLICY = Object.freeze({
  operation: "editErrorBand",
  resourceLabel: "error-band",
  defaultId: "errorBand",
  ownerLabel: "Error-band id",
  positionTypes: Object.freeze(["quantitative", "temporal"]),
  defaultPositionType: "quantitative",
  defaultIntervalChannel: "y",
  scaleDefaults: fieldType => fieldType === "temporal"
    ? { nice: true }
    : { nice: true, zero: false },
  intervalScaleDefaults: Object.freeze({ nice: true, zero: false }),
  allowExplicitGrouping: true,
  ambiguousMessage:
    "editErrorBand cannot infer the interval axis when both positions are quantitative; provide an interval option."
});
const BOUNDARY_EDIT_OPTIONS = Object.freeze([
  "target", "boundary", ...ERROR_BAND_BOUNDARY_OPTIONS
]);
const REMATERIALIZE_OPTIONS = Object.freeze([
  "id", ...ERROR_BAND_BOUNDARY_OPTIONS
]);

export function errorBandBoundaries(config) {
  return [
    [
      config.lowerBoundaryId,
      config.fields?.lower ?? config.lowerField,
      "lower"
    ],
    [
      config.upperBoundaryId,
      config.fields?.upper ?? config.upperField,
      "upper"
    ]
  ];
}

function resolveOwner(program, requested) {
  return resolveIntervalOwner(program, requested, {
    idLabel: "Error-band id",
    label: "error band",
    mark: "area",
    config: "errorBand"
  });
}

function channelArgs(requested, fallback) {
  if (requested === undefined) return fallback;
  return requested;
}

function resolveRoleCandidate(program, owner, current, args) {
  const previous = currentIntervalRoleArgs(program, owner, current, false);
  const full = {
    data: Object.hasOwn(args, "data") ? args.data : previous.source,
    x: channelArgs(args.x, previous.x),
    y: channelArgs(args.y, previous.y),
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
  if (resolved.groupField === resolved.position.field) {
    throw new Error(
      "editErrorBand groupBy must differ from the independent position field."
    );
  }
  resolved = applyIntervalStatistics(program, full, policy, args, resolved);
  const roles = resolveIntervalRoleScales(program, resolved, current, EDIT_POLICY, owner, previous);
  return {
    ...resolved,
    ...roles
  };
}

function updateGrouping(program, ids, previous, nextField) {
  let next = program;
  for (const id of ids) {
    const layer = findLayer(next, id);
    if (layer === undefined) continue;
    if (nextField === undefined) {
      if (layer.encoding?.group !== undefined) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.group`, remove: true
        });
      }
    } else if (layer.encoding?.group === undefined) {
      next = next.encodeGroup({ target: id, field: nextField, fieldType: "nominal" });
    } else if (layer.encoding.group.field !== nextField) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.group.field`, value: nextField
      });
    }
  }
  return next;
}

function updateErrorBandRoles(program, owner, current, candidate, dataId, boundaryIds) {
  const owned = [owner.id, ...boundaryIds];
  let next = updateDistributionPositions(program, owner, current, candidate, {
    owned,
    lower: candidate.fields.lower,
    upper: candidate.fields.upper,
    title: candidate.measure,
    update(value, { category, measure, categoryChannel, measureChannel }) {
      let updated = value;
      for (const [id, field] of [
        [current.lowerBoundaryId, candidate.fields.lower],
        [current.upperBoundaryId, candidate.fields.upper]
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
        });
      }
      return updated;
    }
  });
  next = updateGrouping(next, owned, current.groupBy, candidate.groupField);
  const revisedConfig = {
    ...current,
    source: candidate.source,
    data: dataId,
    intervalMode: candidate.interval.mode,
    orientation: candidate.orientation,
    position: candidate.position,
    positionScale: candidate.position.channel === "x"
      ? candidate.xScale.id : candidate.yScale.id,
    intervalScale: candidate.interval.channel === "x"
      ? candidate.xScale.id : candidate.yScale.id,
    groupBy: candidate.groupField,
    transformGroupBy: candidate.groupBy,
    lowerField: candidate.fields.lower,
    upperField: candidate.fields.upper
  };
  delete revisedConfig.intervalField;
  delete revisedConfig.centerField;
  if (candidate.interval.mode === "statistical") {
    revisedConfig.intervalField = candidate.interval.field;
  } else {
    revisedConfig.centerField = candidate.fields.center;
  }
  next = next._withMarkConfig(owner.id, {
    ...next.markConfigs[owner.id],
    errorBand: revisedConfig
  }).rematerializeAreaMark({ id: owner.id });
  for (const id of boundaryIds) next = next.rematerializeLineMark({ id });
  return next;
}

function currentBoundaryAppearance(program, id) {
  const config = program.markConfigs[id];
  if (findLayer(program, id)?.mark?.type !== "line" || config === undefined) {
    throw new Error(`Unknown error-band boundary "${id}".`);
  }
  return {
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    strokeDash: config.strokeDash,
    opacity: config.opacity,
    curve: config.curve ?? "linear",
    ...requestedStrokeDetails(config, "Error-band boundary")
  };
}

function defaultBoundaryAppearance(program, owner) {
  return resolveBoundaryAppearance({}, {
    defaults: {
      stroke: DEFAULT_COLORS.mark,
      strokeWidth: 1,
      strokeDash: "solid",
      opacity: 1,
      curve: program.markConfigs[owner]?.curve ?? "linear"
    },
    operation: "editErrorBand boundaries"
  });
}

function createBoundary(program, owner, id, bound, appearance) {
  const config = program.markConfigs[owner].errorBand;
  const next = program.createErrorBandBoundary({
    id,
    data: config.data,
    orientation: config.orientation,
    bound,
    position: config.position,
    coordinate: config.coordinate,
    intervalScale: config.intervalScale,
    positionScale: config.positionScale,
    groupBy: config.groupBy,
    ...appearance
  });
  return next._withMarkConfig(id, {
    ...next.markConfigs[id],
    ...appearance,
    errorBandBoundary: {
      owner,
      bound: id === config.lowerBoundaryId ? "lower" : "upper"
    }
  });
}

function removeBoundary(program, id) {
  return removeOwnedMark(program, id);
}

export const rematerializeErrorBandBoundary = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeErrorBandBoundary",
    description: "Rematerialize one owned error-band boundary."
  }, REMATERIALIZE_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Error-band boundary id");
    currentBoundaryAppearance(this, id);
    const graphic = this.graphicSpec.objects[id];
    const next = this
      ._withMarkConfig(id, {
        ...this.markConfigs[id],
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        strokeDash: args.strokeDash,
        opacity: args.opacity,
        curve: args.curve,
        ...requestedStrokeDetails(args, "Error-band boundary")
      })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: graphic.items.map(() => args.strokeDash)
      });
    return next.rematerializeLineMark({ id });
  }
);

export const editErrorBand = /* @__PURE__ */ closedAction(
  {
    op: "editErrorBand",
    description: "Revise one error band's roles, statistics, body, and boundaries."
  }, EDIT_OPTIONS,
  function (args = {}) {
    if (!["data", "x", "y", "groupBy", "fill", "opacity", "curve",
      "statistics", "boundaries", ...STROKE_STYLE_PROPERTIES]
      .some(key => Object.hasOwn(args, key))) {
      throw new Error("editErrorBand requires at least one change.");
    }
    const owner = resolveOwner(this, args.target);
    const config = { ...this.markConfigs[owner.id] };
    Object.assign(config, requestedStrokeDetails(args, "editErrorBand"));
    const errorBand = { ...config.errorBand };
    if (Object.hasOwn(args, "fill")) {
      if (args.fill === false) {
        delete errorBand.fill;
        config.fill = DEFAULT_COLORS.mark;
      } else {
        if (owner.encoding?.color !== undefined) {
          throw new Error("editErrorBand fill conflicts with a color encoding; remove the color encoding first.");
        }
        errorBand.fill = validateNonEmptyString(args.fill, "Error-band fill");
        config.fill = errorBand.fill;
      }
    }
    if (Object.hasOwn(args, "opacity")) {
      config.opacity = validateUnitInterval(args.opacity, "Error-band opacity");
    }
    if (Object.hasOwn(args, "curve")) {
      config.curve = validateCurveInterpolation(args.curve);
    }
    const roleRequested = ["data", "x", "y", "groupBy"].some(
      key => Object.hasOwn(args, key)
    );
    const candidate = roleRequested
      ? resolveRoleCandidate(this, owner, errorBand, args)
      : undefined;
    const existingBoundaryIds = errorBandBoundaries(errorBand)
      .map(([id]) => id)
      .filter(id => findLayer(this, id) !== undefined);
    const consumers = collectIntervalConsumers(
      this, [owner.id, ...existingBoundaryIds]
    );
    const interval = roleRequested
      ? planIntervalRoleData(this, {
          owner: owner.id,
          currentData: errorBand.data,
          candidate,
          consumers
        })
      : Object.hasOwn(args, "statistics")
      ? planIntervalEdit(this, {
          owner: owner.id,
          data: errorBand.data,
          consumers,
          statistics: args.statistics,
          operation: "editErrorBand"
        })
      : { changed: false };
    if (
      Object.hasOwn(args, "boundaries") &&
      args.boundaries !== false &&
      !isPlainObject(args.boundaries)
    ) {
      throw new TypeError(
        "editErrorBand boundaries must be false or a plain object."
      );
    }

    let base = this;
    if (roleRequested && owner.encoding?.color?.field !== undefined) {
      const colorField = owner.encoding.color.field;
      const followsGroup = colorField === this.markConfigs[owner.id].errorBand.groupBy;
      if (followsGroup && candidate.groupField !== undefined) {
        const referenced = Object.entries(
          this.materializationConfigs.selections ?? {}
        ).find(([, selection]) =>
          selection.target === owner.id &&
          ["group", "color"].includes(selection.selector?.channel)
        );
        if (referenced !== undefined && candidate.groupField !== colorField) {
          throw new Error(
            `editErrorBand cannot change groupBy while selection "${referenced[0]}" ` +
            `references ${referenced[1].selector.channel}.`
          );
        }
        base = base.editSemantic({
          property: `layer[${owner.id}].encoding.color.field`,
          value: candidate.groupField
        });
      } else if (
        candidate.interval.mode === "statistical" &&
        !candidate.groupBy.includes(colorField)
      ) {
        throw new Error(
          `editErrorBand roles would remove color field "${colorField}" from the interval data.`
        );
      }
    }
    if (roleRequested && candidate.groupField !== undefined) {
      for (const id of [owner.id, ...existingBoundaryIds]) {
        const layer = findLayer(base, id);
        if (
          layer?.encoding?.group !== undefined &&
          layer.encoding.group.field !== candidate.groupField
        ) {
          base = base.editSemantic({
            property: `layer[${id}].encoding.group.field`,
            value: candidate.groupField
          });
        }
      }
    }
    let next = applyIntervalRevision(base, interval);
    if (interval.changed) {
      errorBand.data = interval.dataId ?? interval.revision.id;
    }
    next = next._withMarkConfig(owner.id, { ...config, errorBand });
    next = roleRequested
      ? updateErrorBandRoles(
          next, owner, this.markConfigs[owner.id].errorBand,
          candidate, interval.dataId, existingBoundaryIds
        )
      : next.rematerializeAreaMark({ id: owner.id });
    const revisedErrorBand = next.markConfigs[owner.id].errorBand;
    if (Object.hasOwn(args, "boundaries")) {
      if (args.boundaries === false) {
        next = removeBoundary(next, revisedErrorBand.lowerBoundaryId);
        next = removeBoundary(next, revisedErrorBand.upperBoundaryId);
      } else if (Object.keys(args.boundaries).length === 0) {
        for (const [id, bound] of errorBandBoundaries(revisedErrorBand)) {
          next = findLayer(next, id) === undefined
            ? createBoundary(
                next,
                owner.id,
                id,
                bound,
                defaultBoundaryAppearance(next, owner.id)
              )
            : interval.changed
              ? next.rematerializeLineMark({ id })
              : next;
        }
      } else {
        next = next.editErrorBandBoundary({
          target: owner.id,
          ...args.boundaries
        });
      }
    } else if (interval.changed && !roleRequested) {
      for (const [id] of errorBandBoundaries(revisedErrorBand)) {
        if (findLayer(next, id) !== undefined) {
          next = next.rematerializeLineMark({ id });
        }
      }
    }
    return releaseIntervalRevision(next, interval);
  }
);

export const editErrorBandBoundary = /* @__PURE__ */ closedAction(
  {
    op: "editErrorBandBoundary",
    description: "Edit one or both owned error-band boundaries."
  }, BOUNDARY_EDIT_OPTIONS,
  function (args = {}) {
    if (!ERROR_BAND_BOUNDARY_OPTIONS.some(key => Object.hasOwn(args, key))) {
      throw new Error("editErrorBandBoundary requires an appearance change.");
    }
    const boundary = args.boundary ?? "both";
    if (!["both", "lower", "upper"].includes(boundary)) {
      throw new Error(`Unsupported error-band boundary "${boundary}".`);
    }
    const owner = resolveOwner(this, args.target);
    const config = this.markConfigs[owner.id].errorBand;
    const patch = ownOptions(args, ERROR_BAND_BOUNDARY_OPTIONS);
    const ids = boundary === "both"
      ? errorBandBoundaries(config).map(([id]) => id)
      : [boundary === "lower" ? config.lowerBoundaryId : config.upperBoundaryId];
    const plans = ids.map(id => {
      const existing = findLayer(this, id) !== undefined;
      return {
        id,
        existing,
        bound: id === config.lowerBoundaryId
          ? config.lowerField
          : config.upperField,
        appearance: resolveBoundaryAppearance(patch, {
          defaults: existing
            ? currentBoundaryAppearance(this, id)
            : defaultBoundaryAppearance(this, owner.id),
          operation: "editErrorBandBoundary"
        })
      };
    });
    let next = this;
    for (const plan of plans) {
      next = plan.existing
        ? next.rematerializeErrorBandBoundary({
            id: plan.id,
            ...plan.appearance
          })
        : createBoundary(
            next,
            owner.id,
            plan.id,
            plan.bound,
            plan.appearance
          );
    }
    return next;
  }
);
