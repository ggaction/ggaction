import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  DEFAULT_TEXT_MARK,
  normalizeTextMarkConfig
} from "../../../grammar/text.js";
import { canMaterializeText } from "../../../materialization/marks.js";
import { resolveTextGraphicItems } from "../../../materialization/text.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import {
  applyLayeredMarkInheritance,
  assertMarkAvailable,
  resolveCompatibleEncodings,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";

const STYLE_OPTIONS = Object.freeze([
  "fill", "opacity", "fontSize", "fontFamily", "fontWeight",
  "align", "baseline", "rotation", "dx", "dy"
]);
const CREATE_OPTIONS = Object.freeze(["id", "data", "text", ...STYLE_OPTIONS]);
const EDIT_OPTIONS = Object.freeze(["target", ...STYLE_OPTIONS]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const SOURCE_TYPES = new Set(["point", "bar", "rule", "rect"]);

function eligibleSource(program, layer, requestedData) {
  if (
    !SOURCE_TYPES.has(layer?.mark?.type) ||
    layer.data === undefined ||
    (requestedData !== undefined && layer.data !== requestedData)
  ) return false;
  const encodings = resolveCompatibleEncodings(program, layer, "text");
  return encodings.x !== undefined && encodings.y !== undefined;
}

function resolveTextInheritance(program, args) {
  if (Object.hasOwn(args, "data")) return undefined;
  const requestedData = program.context.currentData;
  const candidates = program.semanticSpec.layers.filter(layer =>
    eligibleSource(program, layer, requestedData)
  );
  const current = findLayer(program, program.context.currentMark);
  const source = eligibleSource(program, current, requestedData)
    ? current
    : candidates.length === 1
      ? candidates[0]
      : undefined;
  if (source === undefined && candidates.length > 1) {
    throw new Error(
      "Text source inference is ambiguous; provide data and encode its position explicitly."
    );
  }
  if (source === undefined) return undefined;
  return {
    source: source.id,
    data: source.data,
    coordinate: source.coordinate,
    encoding: resolveCompatibleEncodings(program, source, "text")
  };
}

function requireTextLayer(program, requested, operation) {
  const id = requested === undefined ? undefined : validateUserId(requested, "Text mark id");
  return resolveEligibleLayer(program, {
    target: id,
    predicate: layer => layer.mark?.type === "text",
    label: `${operation} text mark`
  });
}

const createTextMark = action(
  {
    op: "createTextMark",
    description: "Create a semantic text annotation layer."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createTextMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "text",
      label: "Text mark id",
      markType: "text",
      operation: "createTextMark"
    });
    const inherited = resolveTextInheritance(this, args);
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && inherited?.data !== undefined
        ? { data: inherited.data }
        : {})
    });
    assertMarkAvailable(this, id);

    let next = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "text" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    if (inherited?.source !== undefined) {
      next = next.editSemantic({
        property: `layer[${id}].source`,
        value: inherited.source
      });
    }
    next = applyLayeredMarkInheritance(next, id, inherited)
      .createGraphics({
        id,
        type: "text",
        length: 0,
        ...resolveMarkGraphicPlacement(next, { data, markType: "text" })
      })
      ._withMarkConfig(id, { ...DEFAULT_TEXT_MARK, fillExplicit: false });

    const style = Object.fromEntries(
      STYLE_OPTIONS.filter(option => Object.hasOwn(args, option))
        .map(option => [option, args[option]])
    );
    if (Object.keys(style).length > 0) {
      next = next.editTextMark({ target: id, ...style });
    }
    return Object.hasOwn(args, "text")
      ? next.encodeText({ target: id, value: args.text })
      : next;
  }
);

const rematerializeTextMark = action(
  {
    op: "rematerializeTextMark",
    description: "Recompute concrete text content, anchors, and typography."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeTextMark");
    const id = validateUserId(args.id, "Text mark id");
    const layer = findLayer(this, id);
    const graphic = this.graphicSpec.objects[id];
    if (layer?.mark?.type !== "text") throw new Error(`Unknown text mark "${id}".`);
    if (graphic?.type !== "text" || !Array.isArray(graphic.items)) {
      throw new Error(`Text mark "${id}" requires text collection graphics.`);
    }
    if (!canMaterializeText(this, layer)) {
      return graphic.items.length === 0
        ? this
        : this.editGraphics({ target: id, property: "length", value: 0 });
    }
    return this.editGraphics({
      target: id,
      property: "items",
      value: resolveTextGraphicItems(
        this,
        layer,
        this.markConfigs[id] ?? DEFAULT_TEXT_MARK
      )
    });
  }
);

const editTextMark = action(
  {
    op: "editTextMark",
    description: "Edit text typography, alignment, rotation, and offsets."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editTextMark");
    if (!STYLE_OPTIONS.some(option => Object.hasOwn(args, option))) {
      throw new Error("editTextMark requires at least one editable property.");
    }
    const layer = requireTextLayer(this, args.target, "editTextMark");
    const next = this._withMarkConfig(
      layer.id,
      {
        ...normalizeTextMarkConfig(
          args,
          this.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK
        ),
        fillExplicit: Object.hasOwn(args, "fill")
          ? true
          : this.markConfigs[layer.id]?.fillExplicit ?? false
      }
    );
    return canMaterializeText(next, layer)
      ? next.rematerializeTextMark({ id: layer.id })
      : next;
  }
);

export function registerTextMarkActions(ProgramClass) {
  ProgramClass.prototype.createTextMark = createTextMark;
  ProgramClass.prototype.editTextMark = editTextMark;
  ProgramClass.prototype.rematerializeTextMark = rematerializeTextMark;
}
