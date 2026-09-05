import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateOptionObject,
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales/index.js";
import { findLayer } from "../../selectors/layers.js";
import { removeOwnedMark } from "../marks/remove.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import {
  applyIntervalRevision,
  ownOptions,
  planIntervalEdit,
  releaseIntervalRevision,
  resolveIntervalOwner
} from "../data/intervalEdit.js";

export const ERROR_BAND_BOUNDARY_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity", "curve"
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
  return { stroke, strokeWidth, strokeDash: resolvedStrokeDash, opacity, curve };
}

const EDIT_OPTIONS = Object.freeze([
  "target", "fill", "opacity", "curve", "statistics", "boundaries"
]);
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

export const rematerializeErrorBandBoundary = action(
  {
    op: "rematerializeErrorBandBoundary",
    description: "Rematerialize one owned error-band boundary."
  },
  function (args = {}) {
    validateOptionObject(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeErrorBandBoundary"
    );
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
    validateOptionObject(args, EDIT_OPTIONS, "editErrorBand");
    if (!["fill", "opacity", "curve", "statistics", "boundaries"]
      .some(key => Object.hasOwn(args, key))) {
      throw new Error("editErrorBand requires at least one change.");
    }
    const owner = resolveOwner(this, args.target);
    const config = { ...this.markConfigs[owner.id] };
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
    const interval = Object.hasOwn(args, "statistics")
      ? planIntervalEdit(this, {
          owner: owner.id,
          data: errorBand.data,
          consumers: [
            owner.id,
            ...errorBandBoundaries(errorBand)
              .map(([id]) => id)
              .filter(id => findLayer(this, id) !== undefined)
          ],
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

    let next = applyIntervalRevision(this, interval);
    if (interval.changed) errorBand.data = interval.revision.id;
    next = next
      ._withMarkConfig(owner.id, { ...config, errorBand })
      .rematerializeAreaMark({ id: owner.id });
    if (Object.hasOwn(args, "boundaries")) {
      if (args.boundaries === false) {
        next = removeBoundary(next, errorBand.lowerBoundaryId);
        next = removeBoundary(next, errorBand.upperBoundaryId);
      } else if (Object.keys(args.boundaries).length === 0) {
        for (const [id, bound] of errorBandBoundaries(errorBand)) {
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
    } else if (interval.changed) {
      for (const [id] of errorBandBoundaries(errorBand)) {
        if (findLayer(next, id) !== undefined) {
          next = next.rematerializeLineMark({ id });
        }
      }
    }
    return releaseIntervalRevision(next, interval);
  }
);

export const editErrorBandBoundary = action(
  {
    op: "editErrorBandBoundary",
    description: "Edit one or both owned error-band boundaries."
  },
  function (args = {}) {
    validateOptionObject(
      args,
      BOUNDARY_EDIT_OPTIONS,
      "editErrorBandBoundary"
    );
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
