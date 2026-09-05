import { action } from "../../../core/action.js";
import {
  validateGeneratedItemLimit,
  validateNonEmptyString,
  validateOptionObject,
  validateKeys
} from "../../../core/validation.js";
import { mapContinuousScaleValues } from "../../../grammar/scales/index.js";
import { resolveLegendItemLayout } from "../../../layout/legendItems.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editLegendBackground,
  normalizeItemLegendLayout,
  normalizeLegendBorder,
  normalizeLegendTextOptions,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds,
  formatContinuousValues,
  sampleContinuousValues,
  selectLegendLayer,
  styleContinuousText
} from "./continuous/common.js";

const OPTIONS = Object.freeze(["target", "count", "position", "layout", "align",
  "direction", "columns", "titlePosition", "offset", "itemGap", "title", "labels", "titleStyle", "border"]);

export const STROKE_WIDTH_LEGEND_LABELS = Object.freeze({
  offset: 12,
  color: DEFAULT_COLORS.text,
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: "normal"
});

export const STROKE_WIDTH_LEGEND_TITLE_STYLE = Object.freeze({
  color: DEFAULT_COLORS.strongText,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
});

export function isStrokeWidthLegendLayer(layer) {
  return ["line", "rule"].includes(layer?.mark?.type) &&
    layer.encoding?.strokeWidth?.scale !== undefined;
}

function resolveLayer(program, requested) {
  const layer = selectLegendLayer(
    program,
    requested,
    isStrokeWidthLegendLayer
  );
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "Stroke-width legend requires one eligible line or rule mark or an explicit target."
        : `Unknown stroke-width legend target "${requested}".`
    );
  }
  return layer;
}

function requireScale(program, id) {
  const scale = program.resolvedScales[id];
  if (scale === undefined || !["linear", "log", "pow", "sqrt", "symlog"].includes(scale.type)) {
    throw new Error(`Stroke-width legend requires resolved quantitative scale "${id}".`);
  }
  return scale;
}

export function resolveStrokeWidthLegendLayout(program, config) {
  const scale = requireScale(program, config.scale);
  const { plot, canvas } = resolveContinuousBounds(program);
  const values = sampleContinuousValues(scale.domain, config.count);
  const widths = mapContinuousScaleValues(values, scale);
  const labels = formatContinuousValues(values, scale.domain, "quantitative");
  const layout = resolveLegendItemLayout(plot, config, labels, { width: 32, height: 0, strokeWidth: widths });
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Stroke-width legend layout");
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas, "Stroke-width legend");
  return { ...layout, widths, labels, background };
}

export const rematerializeStrokeWidthLegend = /* @__PURE__ */ action(
  {
    op: "rematerializeStrokeWidthLegend",
    description: "Rematerialize a quantitative stroke-width legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeStrokeWidthLegend");
    const stored = this.guideConfigs.legend?.strokeWidth;
    if (stored === undefined) {
      throw new Error("Stroke-width legend requires stored configuration.");
    }
    const config = {
      ...stored,
      labels: stored.labels ?? { ...STROKE_WIDTH_LEGEND_LABELS },
      titleStyle: stored.titleStyle ?? { ...STROKE_WIDTH_LEGEND_TITLE_STYLE },
      titleVisible: stored.titleVisible !== false
    };
    const layer = findLayer(this, config.target);
    const encoding = layer?.encoding?.strokeWidth;
    if (encoding?.scale === undefined) {
      throw new Error("Stroke-width legend target requires a strokeWidth encoding.");
    }
    const scale = requireScale(this, encoding.scale);
    const title = config.inferredTitle === true ? encoding.field : config.title;
    const layout = resolveStrokeWidthLegendLayout(this, { ...config, scale: encoding.scale, title });
    const { itemY: y, widths } = layout;
    let next = this
      .editSemantic({ property: "guide.legend.strokeWidth.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.strokeWidth.title", value: title })
      ._withLegendConfig("strokeWidth", {
        ...config,
        scale: encoding.scale,
        title,
        domain: scale.domain
      })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "length", value: widths.length })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "x1", value: layout.symbolX })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "x2", value: layout.symbolX.map(x => x + 32) })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "y1", value: y })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "y2", value: y })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "stroke", value: DEFAULT_COLORS.mark })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "strokeWidth", value: widths })
      .editGraphics({ target: "strokeWidthLegendLabels", property: "length", value: widths.length })
      .editGraphics({
        target: "strokeWidthLegendLabels",
        property: "x",
        value: layout.labelX
      })
      .editGraphics({ target: "strokeWidthLegendLabels", property: "y", value: y })
      .editGraphics({
        target: "strokeWidthLegendLabels",
        property: "text",
        value: layout.labels
      });
    next = editLegendBackground(next, "strokeWidthLegendBackground", layout.background, config.border);
    next = styleContinuousText(next, "strokeWidthLegendLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = next
      .editGraphics({ target: "strokeWidthLegendTitle", property: "x", value: layout.title.x })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "y", value: layout.title.y })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "text", value: title });
    return styleContinuousText(next, "strokeWidthLegendTitle", config.titleStyle, { align: layout.title.align });
  }
);


export function resolveStrokeWidthLegendConfig(program, args = {}) {
  validateKeys(args, OPTIONS, "createStrokeWidthLegend");
  if (args.title !== undefined) validateNonEmptyString(args.title, "Legend title");
  if (args.titleStyle !== undefined) validateOptionObject(args.titleStyle,
    ["color", "fontSize", "fontFamily", "fontWeight"], "createLegend.titleStyle");
  const layer = resolveLayer(program, args.target);
  const encoding = layer.encoding.strokeWidth;
  requireScale(program, encoding.scale);
  const count = args.count ?? 5;
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(
      "Stroke-width legend count must be an integer of at least 2."
    );
  }
  validateGeneratedItemLimit(count, "Stroke-width legend count");
  return {
    target: layer.id,
    scale: encoding.scale,
    ...normalizeItemLegendLayout({ ...args, itemGap: args.itemGap ?? 32 }),
    title: args.title ?? encoding.field,
    inferredTitle: args.title === undefined,
    count,
    labels: normalizeLegendTextOptions(args.labels, "createLegend.labels", STROKE_WIDTH_LEGEND_LABELS),
    titleStyle: normalizeLegendTextOptions(args.titleStyle, "createLegend.titleStyle", STROKE_WIDTH_LEGEND_TITLE_STYLE),
    border: normalizeLegendBorder(args.border),
    titleVisible: true
  };
}

export function createStrokeWidthLegendFromConfig(program, config) {
  resolveStrokeWidthLegendLayout(program, config);
  const { count } = config;
  let next = program
    .editSemantic({ property: "guide.legend.strokeWidth.scale", value: config.scale })
    .editSemantic({ property: "guide.legend.strokeWidth.title", value: config.title })
    ._withLegendConfig("strokeWidth", config);
  if (config.border !== false) {
    next = next.createGraphics({ id: "strokeWidthLegendBackground", type: "rect",
      ...resolveLegendGraphicPlacement(program) });
  }
  next = next.createGraphics({
      id: "strokeWidthLegendSymbols",
      type: "line",
      length: count,
      ...resolveLegendGraphicPlacement(program)
    })
    .createGraphics({
      id: "strokeWidthLegendLabels",
      type: "text",
      length: count,
      ...resolveLegendGraphicPlacement(program)
    });
  if (config.titleVisible !== false) {
    next = next.createGraphics({
      id: "strokeWidthLegendTitle",
      type: "text",
      ...resolveLegendGraphicPlacement(program)
    });
  }
  return next.rematerializeStrokeWidthLegend();
}

export const createStrokeWidthLegend = /* @__PURE__ */ action(
  {
    op: "createStrokeWidthLegend",
    description: "Create a quantitative stroke-width legend."
  },
  function (args = {}) {
    const config = resolveStrokeWidthLegendConfig(this, args);
    return createStrokeWidthLegendFromConfig(this, config);
  }
);

export function registerStrokeWidthLegendActions(ProgramClass) {
  ProgramClass.prototype.createStrokeWidthLegend = createStrokeWidthLegend;
  ProgramClass.prototype.rematerializeStrokeWidthLegend =
    rematerializeStrokeWidthLegend;
}
