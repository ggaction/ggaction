import { action, closedAction } from "../../../core/action.js";
import {
  validateNonEmptyString,
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
  materializeItemLegend,
  createItemLegendGraphics,
  normalizeItemLegendLayout,
  normalizeLegendBorder,
  normalizeLegendTextOptions,
  normalizeLegendTitleOptions,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds,
  formatContinuousValues,
  selectLegendLayer
} from "./continuous/common.js";
import {
  normalizeLegendSampling,
  resolveLegendSampleValues
} from "./sampling.js";
import { resolveEffectiveLegendBlockConfig } from "./blocks.js";

const OPTIONS = Object.freeze(["target", "count", "values", "position", "layout", "align",
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
  const effective = resolveEffectiveLegendBlockConfig(program, "strokeWidth", config);
  const scale = requireScale(program, config.scale);
  const { plot, canvas } = resolveContinuousBounds(program);
  const values = resolveLegendSampleValues(effective, scale, "Stroke-width legend");
  const widths = mapContinuousScaleValues(values, scale);
  const labels = formatContinuousValues(
    values,
    scale.domain,
    "quantitative",
    effective.labels.format
  );
  const layout = resolveLegendItemLayout(plot, effective, labels, { width: 32, height: 0, strokeWidth: widths }, undefined, program.materializationConfigs.textMetrics);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Stroke-width legend layout", effective);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, effective.border, canvas, "Stroke-width legend", effective);
  return { ...layout, widths, labels, background, config: effective };
}

export const rematerializeStrokeWidthLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeStrokeWidthLegend",
    description: "Rematerialize a quantitative stroke-width legend."
  }, [],
  function (args = {}) {
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
    const currentConfig = { ...config, scale: encoding.scale, title };
    const layout = resolveStrokeWidthLegendLayout(this, currentConfig);
    return materializeItemLegend(this, "strokeWidth", { ...currentConfig, domain: scale.domain }, layout, {
      symbols: {
        x1: layout.symbolX, x2: layout.symbolX.map(x => x + 32),
        y1: layout.itemY, y2: layout.itemY,
        stroke: layout.config.blockSymbol?.stroke ?? DEFAULT_COLORS.mark,
        strokeWidth: layout.widths
      },
      optional: { opacity: layout.config.blockSymbol?.opacity }
    });
  }
);


export function resolveStrokeWidthLegendConfig(program, args = {}) {
  validateKeys(args, OPTIONS, "createStrokeWidthLegend");
  if (args.title !== undefined) validateNonEmptyString(args.title, "Legend title");
  const layer = resolveLayer(program, args.target);
  const encoding = layer.encoding.strokeWidth;
  requireScale(program, encoding.scale);
  const sampling = normalizeLegendSampling(args, {
    operation: "create",
    label: "Stroke-width legend"
  });
  return {
    target: layer.id,
    scale: encoding.scale,
    ...normalizeItemLegendLayout({ ...args, itemGap: args.itemGap ?? 32 }),
    title: args.title ?? encoding.field,
    inferredTitle: args.title === undefined,
    sampling,
    labels: normalizeLegendTextOptions(args.labels, "createLegend.labels", STROKE_WIDTH_LEGEND_LABELS),
    titleStyle: normalizeLegendTitleOptions(args.titleStyle, "createLegend.titleStyle", STROKE_WIDTH_LEGEND_TITLE_STYLE),
    border: normalizeLegendBorder(args.border),
    titleVisible: true
  };
}

export function createStrokeWidthLegendFromConfig(program, config) {
  const layout = resolveStrokeWidthLegendLayout(program, config);
  const count = layout.widths.length;
  return createItemLegendGraphics(program, "strokeWidth", config, count, "line", resolveLegendGraphicPlacement(program)).rematerializeStrokeWidthLegend();
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
