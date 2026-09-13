import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  DEFAULT_RECT_MARK,
  normalizeRectMarkConfig
} from "../../../materialization/rectConfig.js";
import {
  canMaterializeRect
} from "../../../materialization/marks/index.js";
import { resolveRectGraphicItems } from "../../../materialization/rect.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";
import { replaceGraphicItems } from "../../primitives/editGraphics.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import {
  requestedRectStyleDetails
} from "../../../grammar/roundedRect.js";
import { STROKE_STYLE_PROPERTIES } from
  "../../../grammar/strokeStyle.js";

const STYLE_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth", "cornerRadius",
  ...STROKE_STYLE_PROPERTIES
]);
const CREATE_OPTIONS = Object.freeze(["id", "data", ...STYLE_OPTIONS]);
const EDIT_OPTIONS = Object.freeze(["target", ...STYLE_OPTIONS]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

function requireRectLayer(program, requested, operation) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Rect mark id");
  return resolveEligibleLayer(program, {
    target,
    predicate: layer => layer.mark?.type === "rect",
    label: `${operation} rect mark`
  });
}

const createRectMark = action(
  { op: "createRectMark", description: "Create a semantic rectangular cell layer." },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createRectMark");
    requestedRectStyleDetails(args, "createRectMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "rect",
      label: "Rect mark id",
      markType: "rect",
      operation: "createRectMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "rect");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    assertMarkAvailable(this, id);

    let next = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "rect" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    next = applyLayeredMarkInheritance(next, id, inherited)
      .createGraphics({
        id,
        type: "rect",
        length: 0,
        ...resolveMarkGraphicPlacement(next, { data, markType: "rect" })
      })
      ._withMarkConfig(id, { ...DEFAULT_RECT_MARK, fillExplicit: false });
    next = materializeInheritedMark(next, id);
    const style = Object.fromEntries(
      STYLE_OPTIONS.filter(option => Object.hasOwn(args, option))
        .map(option => [option, args[option]])
    );
    return Object.keys(style).length === 0
      ? next
      : next.editRectMark({ target: id, ...style });
  }
);

const rematerializeRectMark = action(
  { op: "rematerializeRectMark", description: "Recompute concrete rectangular cells." },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeRectMark");
    const id = validateUserId(args.id, "Rect mark id");
    if (args.scales !== undefined && typeof args.scales !== "boolean") {
      throw new TypeError("rematerializeRectMark scales must be a boolean.");
    }
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeRectMark",
      resetProperty: "items",
      resetValue: []
    });
    if (highlighted !== undefined) return highlighted;
    const layer = findLayer(this, id);
    const graphic = this.graphicSpec.objects[id];
    if (layer?.mark?.type !== "rect") throw new Error(`Unknown rect mark "${id}".`);
    const roundedCollection = graphic?.type === "collection" &&
      Object.hasOwn(this.markConfigs[id] ?? {}, "cornerRadius") &&
      graphic.items?.every(item => ["rect", "path"].includes(item.type));
    if (
      (graphic?.type !== "rect" && !roundedCollection) ||
      !Array.isArray(graphic.items)
    ) {
      throw new Error(`Rect mark "${id}" requires rect collection graphics.`);
    }
    if (this.markConfigs[id]?.gradientPlot?.materialized === true) {
      return this.materializeGradientPlotFill({ id });
    }
    const dataset = findDataset(this, layer.data);
    if (dataset === undefined) {
      throw new Error(`Rect mark "${id}" requires an existing dataset.`);
    }
    if (!canMaterializeRect(this, layer)) {
      return replaceGraphicItems(this, id, "rect", []);
    }
    let next = this;
    if (args.scales !== false) {
      const ids = new Set(["x", "y", "x2", "y2", "color", "stroke"].flatMap(channel => {
        const scale = layer.encoding?.[channel]?.scale;
        return scale === undefined ? [] : [scale];
      }));
      for (const scale of ids) {
        next = next.rematerializeScale({ id: scale, marks: false });
      }
    }
    return replaceGraphicItems(
      next,
      id,
      "rect",
      resolveRectGraphicItems(next, layer, dataset)
    );
  }
);

const editRectMark = action(
  { op: "editRectMark", description: "Edit rectangular cell appearance." },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editRectMark");
    requestedRectStyleDetails(args, "editRectMark");
    if (!STYLE_OPTIONS.some(option => Object.hasOwn(args, option))) {
      throw new Error("editRectMark requires at least one editable property.");
    }
    const layer = requireRectLayer(this, args.target, "editRectMark");
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error("editRectMark fill cannot be combined with a color encoding.");
    }
    if (Object.hasOwn(args, "stroke") && layer.encoding?.stroke !== undefined) {
      throw new Error(
        "editRectMark stroke conflicts with a field encoding; use encodeStroke with value to replace it."
      );
    }
    const next = this._withMarkConfig(
      layer.id,
      {
        ...normalizeRectMarkConfig(
          args,
          this.markConfigs[layer.id] ?? DEFAULT_RECT_MARK
        ),
        fillExplicit: Object.hasOwn(args, "fill")
          ? true
          : this.markConfigs[layer.id]?.fillExplicit ?? false
      }
    );
    const materialized = canMaterializeRect(next, layer)
      ? next.rematerializeRectMark({ id: layer.id })
      : next;
    return rematerializeExistingLegend(materialized);
  }
);

export function registerRectMarkActions(ProgramClass) {
  ProgramClass.prototype.editRectMark = editRectMark;
  registerBasicRectMarkActions(ProgramClass);
}

export function registerBasicRectMarkActions(ProgramClass) {
  ProgramClass.prototype.createRectMark = createRectMark;
  ProgramClass.prototype.rematerializeRectMark = rematerializeRectMark;
}
