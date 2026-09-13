import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject,
  validatePositiveFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import { isNominalValue } from "../../../grammar/scales/fields.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { legendResourcePolicy } from "../../../materialization/guides/resources.js";
import {
  preserveGraphicPlacement,
  resolveLegendGraphicPlacement
} from "../../../materialization/graphicHierarchy.js";
import {
  normalizeLegendSampling,
  validateSamplingAgainstScale
} from "./sampling.js";
import {
  legendBlockKey,
  resolveLegendBlock
} from "./target.js";
import { validateFontWeight } from "./categorical/validation.js";

const OPTIONS = Object.freeze([
  "target", "channel", "title", "values", "count", "order", "gap", "text", "symbol"
]);
const TEXT_OPTIONS = Object.freeze(["fontSize", "fontFamily", "fontWeight", "color"]);
const SYMBOL_OPTIONS = Object.freeze(["size", "fill", "stroke", "strokeWidth", "opacity"]);

function validatePatchObject(value, keys, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object.`);
  validateOptionObject(value, keys, label);
}

function normalizeTextPatch(value) {
  validatePatchObject(value, TEXT_OPTIONS, "editLegendBlock text");
  if (value.fontSize !== undefined) {
    validatePositiveFinite(value.fontSize, "editLegendBlock text.fontSize");
  }
  if (value.fontFamily !== undefined) {
    validateNonEmptyString(value.fontFamily, "editLegendBlock text.fontFamily");
  }
  if (value.fontWeight !== undefined) {
    validateFontWeight(value.fontWeight, "editLegendBlock text.fontWeight");
  }
  if (value.color !== undefined) {
    validateNonEmptyString(value.color, "editLegendBlock text.color");
  }
  return { ...value };
}

function categoricalSupports(config, property) {
  const types = new Set(config.symbol.layers.map(layer => layer.type));
  if (property === "size") return types.has("point");
  if (property === "fill") return types.has("point") || types.has("swatch");
  return types.size > 0;
}

function validateSymbolSupport(descriptor, property) {
  const { channels, family, kind, config } = descriptor;
  if (family === "gradient") {
    throw new Error(`editLegendBlock symbol.${property} is unsupported for gradient blocks.`);
  }
  if (family === "categorical") {
    if (property === "fill" && channels.includes("color")) {
      throw new Error("editLegendBlock symbol.fill conflicts with the color mapping.");
    }
    if (property === "stroke" && channels.includes("stroke")) {
      throw new Error("editLegendBlock symbol.stroke conflicts with the stroke mapping.");
    }
    if (!categoricalSupports(config, property)) {
      throw new Error(`editLegendBlock symbol.${property} is unsupported by this categorical recipe.`);
    }
    return;
  }
  if (kind === "size" && property === "size") {
    throw new Error("editLegendBlock symbol.size conflicts with the size mapping.");
  }
  if (kind === "opacity" && property === "opacity") {
    throw new Error("editLegendBlock symbol.opacity conflicts with the opacity mapping.");
  }
  if (kind === "strokeWidth" && property === "strokeWidth") {
    throw new Error("editLegendBlock symbol.strokeWidth conflicts with the strokeWidth mapping.");
  }
  if (kind === "strokeWidth" && ["size", "fill"].includes(property)) {
    throw new Error(`editLegendBlock symbol.${property} is unsupported for strokeWidth blocks.`);
  }
  if (kind === "interval" && property === "fill") {
    throw new Error("editLegendBlock symbol.fill conflicts with the color mapping.");
  }
  if (kind === "strokeInterval" && property === "stroke") {
    throw new Error("editLegendBlock symbol.stroke conflicts with the stroke mapping.");
  }
  if (["interval", "strokeInterval"].includes(kind) && property === "size") {
    throw new Error(`editLegendBlock symbol.size is unsupported for ${kind} blocks.`);
  }
}

function normalizeSymbolPatch(value, descriptor) {
  validatePatchObject(value, SYMBOL_OPTIONS, "editLegendBlock symbol");
  if (value.size !== undefined) {
    validateNonNegativeFinite(value.size, "editLegendBlock symbol.size");
  }
  if (value.fill !== undefined) {
    validateNonEmptyString(value.fill, "editLegendBlock symbol.fill");
  }
  if (value.stroke !== undefined) {
    validateNonEmptyString(value.stroke, "editLegendBlock symbol.stroke");
  }
  if (value.strokeWidth !== undefined) {
    validateNonNegativeFinite(value.strokeWidth, "editLegendBlock symbol.strokeWidth");
  }
  if (value.opacity !== undefined) {
    validateUnitInterval(value.opacity, "editLegendBlock symbol.opacity");
  }
  for (const property of Object.keys(value)) {
    validateSymbolSupport(descriptor, property);
  }
  return { ...value };
}

export function validateLegendBlockOverride(descriptor, override) {
  if (override.symbol !== undefined) normalizeSymbolPatch(override.symbol, descriptor);
  return override;
}

function exactCategoricalOrder(program, descriptor, value) {
  if (descriptor.family !== "categorical") {
    throw new Error("editLegendBlock order requires a categorical block.");
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("editLegendBlock order must be a non-empty array.");
  }
  if (!value.every(isNominalValue)) {
    throw new TypeError("editLegendBlock order must contain categorical values.");
  }
  if (value.some((item, index) =>
    value.slice(0, index).some(previous => Object.is(previous, item)))) {
    throw new Error("editLegendBlock order values must be unique.");
  }
  const domain = program.resolvedScales[descriptor.scaleIds[0]].domain;
  if (domain.length !== value.length ||
    domain.some(item => !value.some(candidate => Object.is(candidate, item)))) {
    throw new Error("editLegendBlock order must be an exact permutation of the current domain.");
  }
  return Object.freeze({ values: Object.freeze([...value]) });
}

function withoutEmptyNested(entry, key, value) {
  if (Object.keys(value).length > 0) return { ...entry, [key]: value };
  const { [key]: _removed, ...rest } = entry;
  return rest;
}

export function patchLegendBlockOverride(config, key, patch) {
  const previous = config.blockOverrides?.[key] ?? {};
  let entry = { ...previous };
  if (Object.hasOwn(patch, "title")) entry.title = patch.title;
  if (Object.hasOwn(patch, "gap")) entry.gap = patch.gap;
  if (Object.hasOwn(patch, "text")) {
    entry = withoutEmptyNested(entry, "text", patch.text);
  }
  if (Object.hasOwn(patch, "symbol")) {
    entry = withoutEmptyNested(entry, "symbol", patch.symbol);
  }
  const blockOverrides = { ...(config.blockOverrides ?? {}) };
  if (Object.keys(entry).length === 0) delete blockOverrides[key];
  else blockOverrides[key] = entry;
  return Object.keys(blockOverrides).length === 0
    ? undefined
    : blockOverrides;
}

function applyCategoricalSymbol(symbol, patch) {
  return {
    ...symbol,
    layers: symbol.layers.map(layer => ({
      ...layer,
      ...(patch.size !== undefined && layer.type === "point"
        ? { size: Math.sqrt(patch.size / Math.PI) }
        : {}),
      ...(patch.fill !== undefined && ["point", "swatch"].includes(layer.type)
        ? { fill: patch.fill }
        : {}),
      ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
      ...(patch.strokeWidth !== undefined
        ? layer.type === "line"
          ? { lineWidth: patch.strokeWidth }
          : { strokeWidth: patch.strokeWidth }
        : {}),
      ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {})
    }))
  };
}

export function resolveEffectiveLegendBlockConfig(program, kind, config) {
  const channels = kind === "series" || kind === "color" || kind === "stroke"
    ? config.channels
    : [{ size: "size", opacity: "opacity", strokeWidth: "strokeWidth",
      gradient: "color", interval: "color", strokeGradient: "stroke",
      strokeInterval: "stroke" }[kind]];
  const override = config.blockOverrides?.[legendBlockKey(channels)] ?? {};
  const effective = {
    ...config,
    ...(override.title === undefined || override.title === ""
      ? {}
      : { title: override.title }),
    ...(override.title === ""
      ? { titleVisible: false }
      : override.title === undefined
        ? {}
        : { titleVisible: true }),
    ...(override.gap === undefined ? {} : { itemGap: override.gap, blockGap: override.gap }),
    ...(override.text === undefined
      ? {}
      : { labels: { ...config.labels, ...override.text } })
  };
  if (override.symbol === undefined) return effective;
  if (["series", "color", "stroke"].includes(kind)) {
    return {
      ...effective,
      symbol: applyCategoricalSymbol(config.symbol, override.symbol),
      blockSymbol: override.symbol
    };
  }
  if (kind === "opacity") {
    return {
      ...effective,
      symbol: {
        ...config.symbol,
        ...(override.symbol.size === undefined
          ? {}
          : { radius: Math.sqrt(override.symbol.size / Math.PI) }),
        ...Object.fromEntries(Object.entries(override.symbol)
          .filter(([key]) => ["fill", "stroke", "strokeWidth"].includes(key)))
      },
      blockSymbol: override.symbol
    };
  }
  if (["interval", "strokeInterval"].includes(kind)) {
    return {
      ...effective,
      symbol: { ...config.symbol, ...override.symbol },
      blockSymbol: override.symbol
    };
  }
  return { ...effective, blockSymbol: override.symbol };
}

function titleGraphicId(kind) {
  return legendResourcePolicy(kind).graphicIds.find(id => id.endsWith("Title"));
}

export function reconcileLegendBlockTitleGraphic(program, kind, visible) {
  const id = titleGraphicId(kind);
  const exists = program.graphicSpec.objects[id] !== undefined;
  if (!visible && exists) return program.editGraphics({ target: id, remove: true });
  if (visible && !exists) {
    const owned = new Set(legendResourcePolicy(kind).graphicIds);
    const anchor = program.graphicSpec.objects.canvas.children
      .filter(childId => childId !== id && owned.has(childId))
      .at(-1);
    if (anchor === undefined) {
      throw new Error(`editLegendBlock cannot place the ${kind} legend title.`);
    }
    return program.createGraphics({
      id,
      type: "text",
      ...resolveLegendGraphicPlacement(program, { after: anchor })
    });
  }
  return program;
}

const SPECIALIZED_SYMBOLS = Object.freeze({
  size: Object.freeze({ id: "sizeLegendSymbols", type: "circle" }),
  opacity: Object.freeze({ id: "opacityLegendSymbols", type: "circle" }),
  strokeWidth: Object.freeze({ id: "strokeWidthLegendSymbols", type: "line" }),
  interval: Object.freeze({ id: "colorLegendSymbols", type: "rect" }),
  strokeInterval: Object.freeze({ id: "strokeIntervalSymbols", type: "rect" })
});

// Symbol patches replace the complete block-local patch. Recreating the concrete
// symbol owner removes properties that existed only in the previous patch before
// the ordinary rematerializer writes the new effective appearance.
function recreateSymbolGraphics(program, descriptor) {
  if (descriptor.family === "gradient") return program;
  if (descriptor.family === "categorical") {
    const symbolIds = legendResourcePolicy(descriptor.kind).graphicIds
      .filter(id => id.includes("Symbol"));
    let next = program;
    for (const id of symbolIds) {
      if (next.graphicSpec.objects[id] !== undefined) {
        next = next.editGraphics({ target: id, remove: true });
      }
    }
    return next.createLegendSymbols({ kind: descriptor.kind });
  }
  const symbol = SPECIALIZED_SYMBOLS[descriptor.kind];
  if (symbol === undefined || program.graphicSpec.objects[symbol.id] === undefined) {
    throw new Error(`editLegendBlock cannot recreate ${descriptor.kind} legend symbols.`);
  }
  const placement = preserveGraphicPlacement(program, symbol.id);
  return program
    .editGraphics({ target: symbol.id, remove: true })
    .createGraphics({ id: symbol.id, type: symbol.type, length: 0, ...placement });
}

function normalizeBlockPatch(args, descriptor) {
  const patch = {};
  if (Object.hasOwn(args, "title")) {
    if (typeof args.title !== "string") {
      throw new TypeError("editLegendBlock title must be a string.");
    }
    patch.title = args.title;
  }
  if (Object.hasOwn(args, "gap")) {
    validateNonNegativeFinite(args.gap, "editLegendBlock gap");
    patch.gap = args.gap;
  }
  if (Object.hasOwn(args, "text")) patch.text = normalizeTextPatch(args.text);
  if (Object.hasOwn(args, "symbol")) {
    patch.symbol = normalizeSymbolPatch(args.symbol, descriptor);
  }
  return patch;
}

export const editLegendBlock = action(
  {
    op: "editLegendBlock",
    description: "Edit one logical legend block selected by channel."
  },
  withGuideLayoutValidation(function (args = {}) {
    validateOptionObject(args, OPTIONS, "editLegendBlock");
    if (!Object.hasOwn(args, "target") || typeof args.target !== "string") {
      throw new TypeError("editLegendBlock target must be an explicit legend target id.");
    }
    if (!Object.hasOwn(args, "channel") || typeof args.channel !== "string") {
      throw new TypeError("editLegendBlock channel must be explicit.");
    }
    if (!Object.keys(args).some(key => !["target", "channel"].includes(key))) {
      throw new Error("editLegendBlock requires at least one change.");
    }
    const descriptor = resolveLegendBlock(this, args, "editLegendBlock");
    if ((Object.hasOwn(args, "values") || Object.hasOwn(args, "count")) &&
      descriptor.family !== "sampled") {
      throw new Error("editLegendBlock values and count require a sampled legend block.");
    }
    const patch = normalizeBlockPatch(args, descriptor);
    let config = descriptor.config;
    const blockOverrides = patchLegendBlockOverride(config, descriptor.key, patch);
    if (blockOverrides === undefined) {
      const { blockOverrides: _removed, ...rest } = config;
      config = rest;
    } else {
      config = { ...config, blockOverrides };
    }
    if (Object.hasOwn(args, "values") || Object.hasOwn(args, "count")) {
      const sampling = normalizeLegendSampling(args, {
        previous: config,
        operation: "edit",
        label: `editLegendBlock ${descriptor.channel ?? args.channel} legend`
      });
      validateSamplingAgainstScale(sampling, this.resolvedScales[descriptor.scaleIds[0]],
        "editLegendBlock values");
      const { count: _legacyCount, ...withoutCount } = config;
      config = { ...withoutCount, sampling };
    }
    const order = Object.hasOwn(args, "order")
      ? exactCategoricalOrder(this, descriptor, args.order)
      : undefined;
    if (args.title !== undefined && args.title !== "") {
      config = { ...config, title: args.title, inferredTitle: false };
    }
    let next = this._withLegendConfig(descriptor.kind, config);
    const semanticKind = legendResourcePolicy(descriptor.kind).semanticKind;
    if (order !== undefined) {
      next = next.editSemantic({
        property: `guide.legend.${semanticKind}.order`,
        value: order
      });
    }
    if (args.title !== undefined && args.title !== "") {
      next = next.editSemantic({
        property: `guide.legend.${semanticKind}.title`,
        value: args.title
      });
    }
    const effective = resolveEffectiveLegendBlockConfig(next, descriptor.kind,
      next.guideConfigs.legend[descriptor.kind]);
    if (Object.hasOwn(args, "symbol")) {
      next = recreateSymbolGraphics(next, descriptor);
    }
    next = reconcileLegendBlockTitleGraphic(next, descriptor.kind,
      effective.titleVisible !== false);
    return next.rematerializeLegend();
  })
);
