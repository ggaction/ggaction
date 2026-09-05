import { TEXT_LABEL_LAYOUT_OPTIONS } from "./layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  DEFAULT_TEXT_MARK,
  normalizeTextMarkConfig
} from "../../../grammar/text.js";
import {
  canMaterializeArc,
  canMaterializeText,
  isTextSource
} from "../../../materialization/marks/index.js";
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
const CREATE_OPTIONS = Object.freeze(["id", "data", "source", "text", ...STYLE_OPTIONS]);
const EDIT_OPTIONS = Object.freeze(["target", ...STYLE_OPTIONS]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "replayLayout"]);

function sourceMatchesData(program, layer, requestedData) {
  if (requestedData === undefined || layer?.data === requestedData) return true;
  return program.markConfigs[layer.id]?.gradientPlot?.source === requestedData;
}

function eligibleSource(program, layer, requestedData) {
  if (
    !isTextSource(layer) ||
    !sourceMatchesData(program, layer, requestedData)
  ) return false;
  if (layer.mark.type === "arc") return canMaterializeArc(program, layer);
  const encodings = resolveCompatibleEncodings(program, layer, "text");
  return encodings.x !== undefined && encodings.y !== undefined;
}

function resolveTextInheritance(program, args) {
  if (Object.hasOwn(args, "source")) {
    if (Object.hasOwn(args, "data")) {
      throw new Error("createTextMark source and data are mutually exclusive.");
    }
    return textInheritance(program, resolveEligibleLayer(program, {
      target: validateUserId(args.source, "Text source id"),
      predicate: isTextSource,
      label: "text source"
    }));
  }
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
      "Text source inference is ambiguous; provide source, or data and encode its position explicitly."
    );
  }
  if (source === undefined) return undefined;
  return textInheritance(program, source);
}

function textInheritance(program, source) {
  return {
    source: source.id,
    data: source.data,
    coordinate: source.coordinate,
    encoding: source.mark.type === "arc"
      ? {}
      : resolveCompatibleEncodings(program, source, "text")
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

const LABEL_OPTIONS = Object.freeze([
  "id", "source", "field", "value", "content", "normalizeBy", "format", "layout",
  ...STYLE_OPTIONS
]);

const createMarkLabels = action(
  {
    op: "createMarkLabels",
    description: "Create final-item text labels attached to an existing mark."
  },
  function (args = {}) {
    validateMarkOptions(args, LABEL_OPTIONS, "createMarkLabels");
    const inherited = resolveTextInheritance(this, args);
    if (inherited === undefined) {
      throw new Error("createMarkLabels requires an eligible source mark; provide source explicitly.");
    }
    const id = validateUserId(args.id === undefined ? `${inherited.source}-labels` : args.id, "Text mark id");
    assertMarkAvailable(this, id);
    const style = Object.fromEntries(STYLE_OPTIONS
      .filter(option => Object.hasOwn(args, option))
      .map(option => [option, args[option]]));
    normalizeTextMarkConfig(style);
    const encoding = Object.fromEntries(
      ["field", "value", "content", "normalizeBy", "format"]
        .filter(option => Object.hasOwn(args, option))
        .map(option => [option, args[option]])
    );
    if (!["field", "value", "content"].some(option => Object.hasOwn(args, option))) {
      encoding.content = "value";
    }
    const layout = args.layout === undefined || args.layout === false ? undefined : args.layout;
    if (layout !== undefined && Object.hasOwn(layout ?? {}, "target")) {
      throw new Error("createMarkLabels layout target is owned by the created label layer.");
    }
    const apply = program => {
      const next = program.createTextMark({
        id, source: inherited.source, align: "center", baseline: "middle", ...style
      }).encodeText({ target: id, ...encoding });
      return layout === undefined ? next : next.layoutLabels({ ...layout, target: id });
    };
    if (layout !== undefined) {
      // Validate object shape before spreading it into the child action's options.
      validateMarkOptions(layout, TEXT_LABEL_LAYOUT_OPTIONS, "createMarkLabels layout");
    }
    // Validate all child effects on a discarded immutable branch, as scale edits do.
    apply(this);
    return apply(this);
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
    const replayLayout = args.replayLayout ?? true;
    if (typeof replayLayout !== "boolean") {
      throw new TypeError("rematerializeTextMark replayLayout must be a boolean.");
    }
    const layer = findLayer(this, id);
    const graphic = this.graphicSpec.objects[id];
    if (layer?.mark?.type !== "text") throw new Error(`Unknown text mark "${id}".`);
    if (graphic?.type !== "text" || !Array.isArray(graphic.items)) {
      throw new Error(`Text mark "${id}" requires text collection graphics.`);
    }
    if (!canMaterializeText(this, layer)) {
      const next = graphic.items.length === 0
        ? this
        : this.editGraphics({ target: id, property: "length", value: 0 });
      return replayLayout && next.materializationConfigs.labelLayouts?.[id] !== undefined
        ? next.materializeLabelLayout({ id, rematerializeBase: false })
        : next;
    }
    const next = this.editGraphics({
      target: id,
      property: "items",
      value: resolveTextGraphicItems(
        this,
        layer,
        this.markConfigs[id] ?? DEFAULT_TEXT_MARK
      )
    });
    return replayLayout && next.materializationConfigs.labelLayouts?.[id] !== undefined
      ? next.materializeLabelLayout({ id, rematerializeBase: false })
      : next;
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
  Object.assign(ProgramClass.prototype, {
    createTextMark,
    createMarkLabels,
    editTextMark,
    rematerializeTextMark
  });
}
