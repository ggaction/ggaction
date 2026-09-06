import { TEXT_LABEL_LAYOUT_OPTIONS } from "./layout.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  DEFAULT_TEXT_MARK,
  isSourceOwnedText,
  normalizeTextMarkConfig
} from "../../../grammar/text.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import {
  canMaterializeArc,
  canMaterializeRect,
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
import {
  resolveFacadeData,
  resolveFacadeId
} from "../../charts/shared.js";
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
  if (layer.mark.type === "rect" && (canMaterializeRect(program, layer) ||
    program.markConfigs[layer.id]?.gradientPlot?.materialized === true)) return true;
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

const ANNOTATION_OPTIONS = Object.freeze([
  "id", "text", "format", "x", "y", "space", "source", "data", "coordinate", "layout",
  ...STYLE_OPTIONS
]);

function annotationLayout(value) {
  const layout = value === undefined || value === false ? undefined : value;
  if (layout !== undefined && Object.hasOwn(layout ?? {}, "target")) {
    throw new Error("createAnnotation layout target is owned by the created text layer.");
  }
  if (layout !== undefined) {
    validateMarkOptions(layout, TEXT_LABEL_LAYOUT_OPTIONS, "createAnnotation layout");
  }
  return layout;
}

function resolveAnnotationBinding(program, args) {
  const hasX = Object.hasOwn(args, "x");
  const hasY = Object.hasOwn(args, "y");
  if (!hasX && !hasY) {
    if (["space", "data", "coordinate"].some(option => Object.hasOwn(args, option))) {
      throw new Error("createAnnotation mark anchor accepts source but not space, data, or coordinate.");
    }
    return { mode: "mark" };
  }
  if (!hasX || !hasY) {
    throw new Error("createAnnotation coordinate anchor requires both x and y.");
  }
  const space = args.space ?? "data";
  if (space !== "data" && space !== "plot") {
    throw new Error("createAnnotation space must be data or plot.");
  }
  if (space === "plot") {
    if (Object.hasOwn(args, "source")) {
      throw new Error("createAnnotation plot anchor does not accept source.");
    }
    if (![args.x, args.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
      throw new Error("createAnnotation plot coordinates must be finite numbers in [0, 1].");
    }
    return {
      mode: "plot",
      data: resolveFacadeData(program, args.data, "createAnnotation"),
      coordinate: args.coordinate
    };
  }
  if (Object.hasOwn(args, "data") || Object.hasOwn(args, "coordinate")) {
    throw new Error("createAnnotation data anchor uses source data and coordinate.");
  }
  const source = resolveEligibleLayer(program, {
    target: args.source === undefined
      ? undefined
      : validateUserId(args.source, "createAnnotation source"),
    predicate: layer =>
      !isSourceOwnedText(layer) &&
      layer.data !== undefined &&
      layer.encoding?.x?.scale !== undefined &&
      layer.encoding?.y?.scale !== undefined &&
      findCoordinate(program, layer.coordinate)?.type === "cartesian",
    label: "createAnnotation Cartesian layer",
    targetOption: "source"
  });
  return {
    mode: "data",
    data: source.data,
    coordinate: source.coordinate,
    x: source.encoding.x,
    y: source.encoding.y
  };
}

const createAnnotation = action(
  {
    op: "createAnnotation",
    description: "Create text at a final mark, data, or plot anchor."
  },
  function (args = {}) {
    validateMarkOptions(args, ANNOTATION_OPTIONS, "createAnnotation");
    if (!Object.hasOwn(args, "text")) {
      throw new Error("createAnnotation requires text.");
    }
    const id = resolveFacadeId(this, args.id, {
      defaultId: "annotation",
      operation: "createAnnotation"
    });
    const binding = resolveAnnotationBinding(this, args);
    const layout = annotationLayout(args.layout);
    const style = Object.fromEntries(STYLE_OPTIONS
      .filter(option => Object.hasOwn(args, option))
      .map(option => [option, args[option]]));
    const text = {
      value: args.text,
      ...(args.format === undefined ? {} : { format: args.format })
    };
    const apply = program => {
      if (binding.mode === "mark") {
        return program.createMarkLabels({
          id,
          ...(args.source === undefined ? {} : { source: args.source }),
          ...style,
          ...text,
          ...(layout === undefined ? {} : { layout })
        });
      }
      const xScale = binding.mode === "plot" ? `${id}-x` : binding.x.scale;
      const yScale = binding.mode === "plot" ? `${id}-y` : binding.y.scale;
      let next = binding.mode === "plot"
        ? program
          .createScale({ id: xScale, type: "linear", domain: [0, 1] })
          .createScale({ id: yScale, type: "linear", domain: [0, 1] })
        : program;
      next = next
        .createTextMark({ id, data: binding.data, ...style })
        .encodeText({ target: id, ...text })
        .encodeX({
          target: id,
          datum: args.x,
          fieldType: binding.mode === "plot" ? "quantitative" : binding.x.fieldType,
          scale: { id: xScale },
          ...(binding.coordinate === undefined ? {} : { coordinate: binding.coordinate }),
          ...(binding.mode === "data" && binding.x.temporalUnit !== undefined
            ? { temporalUnit: binding.x.temporalUnit }
            : {})
        })
        .encodeY({
          target: id,
          datum: args.y,
          fieldType: binding.mode === "plot" ? "quantitative" : binding.y.fieldType,
          scale: { id: yScale },
          ...(binding.coordinate === undefined ? {} : { coordinate: binding.coordinate }),
          ...(binding.mode === "data" && binding.y.temporalUnit !== undefined
            ? { temporalUnit: binding.y.temporalUnit }
            : {})
        });
      return layout === undefined
        ? next
        : next.layoutLabels({ ...layout, target: id });
    };
    // Validate the full lower action chain before committing any child effect.
    apply(this);
    return apply(this);
  }
);

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
    createAnnotation,
    editTextMark,
    rematerializeTextMark
  });
}
