import { action } from "../../../core/action.js";
import {
  validateGeneratedItemLimit,
  validateKeys
} from "../../../core/validation.js";
import { mapContinuousScaleValues } from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import {
  formatContinuousValues,
  sampleContinuousValues,
  selectLegendLayer,
  styleContinuousText
} from "./continuous/common.js";

const OPTIONS = Object.freeze(["target", "count"]);

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
    const plot = resolveGraphicBounds(this);
    if (plot === undefined) {
      throw new Error("Stroke-width legend requires resolved plot bounds.");
    }
    const values = sampleContinuousValues(scale.domain, config.count);
    const widths = mapContinuousScaleValues(values, scale);
    const originX = plot.x + plot.width + 30;
    const titleY = plot.y + 28;
    const y = values.map((_, index) => titleY + 34 + index * 32);
    const title = config.inferredTitle === true ? encoding.field : config.title;
    let next = this
      .editSemantic({ property: "guide.legend.strokeWidth.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.strokeWidth.title", value: title })
      ._withLegendConfig("strokeWidth", {
        ...config,
        scale: encoding.scale,
        title,
        domain: scale.domain
      })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "length", value: values.length })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "x1", value: values.map(() => originX) })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "x2", value: values.map(() => originX + 32) })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "y1", value: y })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "y2", value: y })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "stroke", value: DEFAULT_COLORS.mark })
      .editGraphics({ target: "strokeWidthLegendSymbols", property: "strokeWidth", value: widths })
      .editGraphics({ target: "strokeWidthLegendLabels", property: "length", value: values.length })
      .editGraphics({
        target: "strokeWidthLegendLabels",
        property: "x",
        value: values.map(() => originX + 32 + config.labels.offset)
      })
      .editGraphics({ target: "strokeWidthLegendLabels", property: "y", value: y })
      .editGraphics({
        target: "strokeWidthLegendLabels",
        property: "text",
        value: formatContinuousValues(values, scale.domain, "quantitative")
      });
    next = styleContinuousText(next, "strokeWidthLegendLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = next
      .editGraphics({ target: "strokeWidthLegendTitle", property: "x", value: originX })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "y", value: titleY })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "text", value: title });
    return styleContinuousText(next, "strokeWidthLegendTitle", config.titleStyle);
  }
);


export function resolveStrokeWidthLegendConfig(program, args = {}) {
  validateKeys(args, OPTIONS, "createStrokeWidthLegend");
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
    title: encoding.field,
    inferredTitle: true,
    count,
    labels: { ...STROKE_WIDTH_LEGEND_LABELS },
    titleStyle: { ...STROKE_WIDTH_LEGEND_TITLE_STYLE },
    titleVisible: true
  };
}

export function createStrokeWidthLegendFromConfig(program, config) {
  const { count } = config;
  let next = program
    .editSemantic({ property: "guide.legend.strokeWidth.scale", value: config.scale })
    .editSemantic({ property: "guide.legend.strokeWidth.title", value: config.title })
    ._withLegendConfig("strokeWidth", config)
    .createGraphics({
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
