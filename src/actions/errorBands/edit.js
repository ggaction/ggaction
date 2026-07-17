import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateUnitInterval
} from "../../core/validation.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { findLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import {
  ERROR_BAND_BOUNDARY_OPTIONS,
  resolveBoundaryAppearance
} from "./options.js";

const EDIT_OPTIONS = Object.freeze(["target", "fill", "opacity", "curve"]);
const BOUNDARY_EDIT_OPTIONS = Object.freeze([
  "target", "boundary", ...ERROR_BAND_BOUNDARY_OPTIONS
]);
const REMATERIALIZE_OPTIONS = Object.freeze([
  "id", ...ERROR_BAND_BOUNDARY_OPTIONS
]);

function resolveOwner(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Error-band id");
  return resolveEligibleLayer(program, {
    target,
    label: "error band",
    predicate: layer =>
      layer.mark?.type === "area" &&
      program.markConfigs[layer.id]?.errorBand !== undefined
  });
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
    curve: config.curve ?? "linear"
  };
}

function defaultBoundaryAppearance(program, owner) {
  return {
    stroke: DEFAULT_COLORS.mark,
    strokeWidth: 1,
    strokeDash: "solid",
    opacity: 1,
    curve: program.markConfigs[owner]?.curve ?? "linear"
  };
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

export const rematerializeErrorBandBoundary = action(
  {
    op: "rematerializeErrorBandBoundary",
    description: "Rematerialize one owned error-band boundary."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("rematerializeErrorBandBoundary options must be a plain object.");
    }
    validateKeys(args, REMATERIALIZE_OPTIONS, "rematerializeErrorBandBoundary");
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
        curve: args.curve
      })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: graphic.items.map(() => args.strokeDash)
      });
    return next.rematerializeLineMark({ id });
  }
);

export const editErrorBand = action(
  {
    op: "editErrorBand",
    description: "Edit one error-band body appearance."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("editErrorBand options must be a plain object.");
    }
    validateKeys(args, EDIT_OPTIONS, "editErrorBand");
    if (!["fill", "opacity", "curve"].some(key => Object.hasOwn(args, key))) {
      throw new Error("editErrorBand requires fill, opacity, or curve.");
    }
    const owner = resolveOwner(this, args.target);
    const config = { ...this.markConfigs[owner.id] };
    const errorBand = { ...config.errorBand };
    if (Object.hasOwn(args, "fill")) {
      errorBand.fill = validateNonEmptyString(args.fill, "Error-band fill");
    }
    if (Object.hasOwn(args, "opacity")) {
      config.opacity = validateUnitInterval(args.opacity, "Error-band opacity");
    }
    if (Object.hasOwn(args, "curve")) {
      config.curve = validateCurveInterpolation(args.curve);
    }
    return this
      ._withMarkConfig(owner.id, { ...config, errorBand })
      .rematerializeAreaMark({ id: owner.id });
  }
);

export const editErrorBandBoundary = action(
  {
    op: "editErrorBandBoundary",
    description: "Edit one or both owned error-band boundaries."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("editErrorBandBoundary options must be a plain object.");
    }
    validateKeys(args, BOUNDARY_EDIT_OPTIONS, "editErrorBandBoundary");
    if (!ERROR_BAND_BOUNDARY_OPTIONS.some(key => Object.hasOwn(args, key))) {
      throw new Error("editErrorBandBoundary requires an appearance change.");
    }
    const boundary = args.boundary ?? "both";
    if (!["both", "lower", "upper"].includes(boundary)) {
      throw new Error(`Unsupported error-band boundary "${boundary}".`);
    }
    const owner = resolveOwner(this, args.target);
    const config = this.markConfigs[owner.id].errorBand;
    const patch = Object.fromEntries(
      ERROR_BAND_BOUNDARY_OPTIONS
        .filter(key => Object.hasOwn(args, key))
        .map(key => [key, args[key]])
    );
    const ids = boundary === "both"
      ? [config.lowerBoundaryId, config.upperBoundaryId]
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
