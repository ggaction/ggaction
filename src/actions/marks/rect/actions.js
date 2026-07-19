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
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";

const STYLE_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth"
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
    if (graphic?.type !== "rect" || !Array.isArray(graphic.items)) {
      throw new Error(`Rect mark "${id}" requires rect collection graphics.`);
    }
    const dataset = findDataset(this, layer.data);
    if (dataset === undefined) {
      throw new Error(`Rect mark "${id}" requires an existing dataset.`);
    }
    if (!canMaterializeRect(this, layer)) {
      return graphic.items.length === 0
        ? this
        : this.editGraphics({ target: id, property: "items", value: [] });
    }
    let next = this;
    if (args.scales !== false) {
      const ids = new Set(["x", "y", "x2", "y2", "color"].flatMap(channel => {
        const scale = layer.encoding?.[channel]?.scale;
        return scale === undefined ? [] : [scale];
      }));
      for (const scale of ids) {
        next = next.rematerializeScale({ id: scale, marks: false });
      }
    }
    return next.editGraphics({
      target: id,
      property: "items",
      value: resolveRectGraphicItems(next, layer, dataset)
    });
  }
);

const editRectMark = action(
  { op: "editRectMark", description: "Edit rectangular cell appearance." },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editRectMark");
    if (!STYLE_OPTIONS.some(option => Object.hasOwn(args, option))) {
      throw new Error("editRectMark requires at least one editable property.");
    }
    const layer = requireRectLayer(this, args.target, "editRectMark");
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error("editRectMark fill cannot be combined with a color encoding.");
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
    return canMaterializeRect(next, layer)
      ? next.rematerializeRectMark({ id: layer.id })
      : next;
  }
);

export function registerRectMarkActions(ProgramClass) {
  ProgramClass.prototype.createRectMark = createRectMark;
  ProgramClass.prototype.editRectMark = editRectMark;
  ProgramClass.prototype.rematerializeRectMark = rematerializeRectMark;
}
