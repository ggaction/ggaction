import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import {
  centeredDirectionalSegment,
  resolveDirectionValues
} from "../../../grammar/direction.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { resolveRowEncodingValues } from
  "../../../materialization/rowEncoding.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import {
  applyLayeredMarkInheritance,
  assertMarkAvailable,
  editMarkGraphic,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";

const APPEARANCE_OPTIONS = Object.freeze([
  "length", "stroke", "strokeWidth", "opacity"
]);
const CREATE_OPTIONS = Object.freeze(["id", "data", ...APPEARANCE_OPTIONS]);
const EDIT_OPTIONS = Object.freeze(["target", ...APPEARANCE_OPTIONS]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

export const DEFAULT_TICK_CONFIG = Object.freeze({
  length: 14,
  stroke: DEFAULT_COLORS.mark,
  strokeWidth: 2,
  opacity: 1
});

function resolveTick(program, requested, operation) {
  const candidates = program.semanticSpec.layers.filter(
    layer => layer.mark?.type === "tick"
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Tick mark id");
    const layer = findLayer(program, id);
    if (layer?.mark?.type !== "tick") {
      throw new Error(`Unknown tick mark "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current?.mark?.type === "tick") return current;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) {
    throw new Error(`${operation} requires an existing tick mark.`);
  }
  throw new Error(`${operation} target is ambiguous; provide target.`);
}

function validateTickConfig(args, current = DEFAULT_TICK_CONFIG) {
  return {
    length: Object.hasOwn(args, "length")
      ? validatePositiveFinite(args.length, "Tick length")
      : current.length,
    stroke: Object.hasOwn(args, "stroke")
      ? validateNonEmptyString(args.stroke, "Tick stroke")
      : current.stroke,
    strokeWidth: Object.hasOwn(args, "strokeWidth")
      ? validateNonNegativeFinite(args.strokeWidth, "Tick strokeWidth")
      : current.strokeWidth,
    opacity: Object.hasOwn(args, "opacity")
      ? validateUnitInterval(args.opacity, "Tick opacity")
      : current.opacity
  };
}

export const createTickMark = action(
  {
    op: "createTickMark",
    description: "Create a centered fixed-length Tick mark."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createTickMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "tick",
      label: "Tick mark id",
      markType: "tick",
      operation: "createTickMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "tick");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    const config = validateTickConfig(args);
    assertMarkAvailable(this, id);

    let created = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "tick" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    created = applyLayeredMarkInheritance(created, id, inherited)
      .createGraphics({
        id,
        type: "line",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "tick" })
      })
      ._withMarkConfig(id, DEFAULT_TICK_CONFIG);
    const materialized = materializeInheritedMark(created, id);
    const appearance = Object.fromEntries(
      APPEARANCE_OPTIONS.filter(property => Object.hasOwn(args, property))
        .map(property => [property, config[property]])
    );
    return Object.keys(appearance).length === 0
      ? materialized
      : materialized.editTickMark({ target: id, ...appearance });
  }
);

export const editTickMark = action(
  {
    op: "editTickMark",
    description: "Edit Tick length and constant line appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editTickMark");
    if (!APPEARANCE_OPTIONS.some(property => Object.hasOwn(args, property))) {
      throw new Error(
        "editTickMark requires length, stroke, strokeWidth, or opacity."
      );
    }
    const layer = resolveTick(this, args.target, "editTickMark");
    const config = validateTickConfig(args, {
      ...DEFAULT_TICK_CONFIG,
      ...this.markConfigs[layer.id]
    });
    return this
      ._withMarkConfig(layer.id, config)
      .rematerializeTickMark({ id: layer.id });
  }
);

export const rematerializeTickMark = action(
  {
    op: "rematerializeTickMark",
    description: "Recompute concrete centered Tick endpoints and appearance."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeTickMark"
    );
    const id = validateUserId(args.id, "Tick mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeTickMark",
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const layer = findLayer(this, id);
    if (layer?.mark?.type !== "tick") {
      throw new Error(`Unknown tick mark "${id}".`);
    }
    const graphic = this.graphicSpec.objects[id];
    if (graphic?.type !== "line" || !Array.isArray(graphic.items)) {
      throw new Error(`Tick mark "${id}" requires line collection graphics.`);
    }
    const dataset = findDataset(this, layer.data);
    if (dataset === undefined) {
      throw new Error(`Tick mark "${id}" requires an existing dataset.`);
    }
    if (
      layer.encoding?.x?.scale === undefined ||
      layer.encoding?.y?.scale === undefined
    ) {
      return graphic.items.length === 0
        ? this
        : this.editGraphics({ target: id, property: "length", value: 0 });
    }

    const x = resolveRowEncodingValues(this, layer, dataset, "x");
    const y = resolveRowEncodingValues(this, layer, dataset, "y");
    const angles = resolveDirectionValues(dataset.values, layer.encoding?.angle);
    const config = validateTickConfig({}, {
      ...DEFAULT_TICK_CONFIG,
      ...this.markConfigs[id]
    });
    const segments = dataset.values.map((_, index) =>
      centeredDirectionalSegment({
        x: x[index],
        y: y[index],
        degrees: angles?.[index] ?? 0,
        length: config.length
      })
    );

    return editMarkGraphic(this, id, {
      length: segments.length,
      x1: segments.map(item => item.x1),
      y1: segments.map(item => item.y1),
      x2: segments.map(item => item.x2),
      y2: segments.map(item => item.y2),
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      opacity: config.opacity
    });
  }
);

export function registerTickMarkActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createTickMark,
    editTickMark,
    rematerializeTickMark
  });
}
