import { action } from "../../core/action.js";
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
import {
  applyIntervalRevision,
  ownOptions,
  planIntervalEdit,
  releaseIntervalRevision,
  resolveIntervalOwner
} from "../data/intervalEdit.js";

export const ERROR_BAR_EDIT_OPTIONS = Object.freeze([
  "target", "caps", "capSize", "stroke", "strokeWidth",
  "strokeDash", "opacity", "statistics"
]);

export const ERROR_BAR_APPEARANCE_OPTIONS = Object.freeze(
  ERROR_BAR_EDIT_OPTIONS.filter(option =>
    option !== "target" && option !== "statistics"
  )
);

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
    description: "Edit one error bar and its owned cap appearance."
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
    const interval = Object.hasOwn(args, "statistics")
      ? planIntervalEdit(this, {
          owner: owner.id,
          data: current.data,
          consumers: [
            owner.id,
            ...errorBarCaps(current)
              .map(([id]) => id)
              .filter(id => findLayer(this, id) !== undefined)
          ],
          statistics: args.statistics,
          operation: "editErrorBar"
        })
      : { changed: false };

    const next = applyIntervalRevision(this, interval);
    return releaseIntervalRevision(next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      errorBar: {
        ...current,
        ...appearance,
        ...(interval.changed ? { data: interval.revision.id } : {})
      }
    }).rematerializeErrorBar({ id: owner.id }), interval);
  }
);
