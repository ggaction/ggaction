import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { mapContinuousScaleValues } from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";

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
  const candidates = program.semanticSpec.layers.filter(isStrokeWidthLegendLayer);
  const layer = requested === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : (() => {
        const candidate = findLayer(program, requested);
        return candidates.includes(candidate) ? candidate : undefined;
      })();
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

function styleText(program, id, style) {
  return program
    .editGraphics({ target: id, property: "fill", value: style.color })
    .editGraphics({ target: id, property: "fontSize", value: style.fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: style.fontFamily })
    .editGraphics({ target: id, property: "fontWeight", value: style.fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: "left" })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

export const rematerializeStrokeWidthLegend = action(
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
    const values = Array.from(
      { length: config.count },
      (_, index) => scale.domain[0] +
        index / (config.count - 1) * (scale.domain[1] - scale.domain[0])
    );
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
        value: values.map(value => String(+value.toPrecision(3)))
      });
    next = styleText(next, "strokeWidthLegendLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = next
      .editGraphics({ target: "strokeWidthLegendTitle", property: "x", value: originX })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "y", value: titleY })
      .editGraphics({ target: "strokeWidthLegendTitle", property: "text", value: title });
    return styleText(next, "strokeWidthLegendTitle", config.titleStyle);
  }
);

export const createStrokeWidthLegend = action(
  {
    op: "createStrokeWidthLegend",
    description: "Create a quantitative stroke-width legend."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createStrokeWidthLegend");
    const layer = resolveLayer(this, args.target);
    const encoding = layer.encoding.strokeWidth;
    requireScale(this, encoding.scale);
    const count = args.count ?? 5;
    if (!Number.isInteger(count) || count < 2) {
      throw new RangeError(
        "Stroke-width legend count must be an integer of at least 2."
      );
    }
    return this
      .editSemantic({ property: "guide.legend.strokeWidth.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.strokeWidth.title", value: encoding.field })
      ._withLegendConfig("strokeWidth", {
        target: layer.id,
        scale: encoding.scale,
        title: encoding.field,
        inferredTitle: true,
        count,
        labels: { ...STROKE_WIDTH_LEGEND_LABELS },
        titleStyle: { ...STROKE_WIDTH_LEGEND_TITLE_STYLE },
        titleVisible: true
      })
      .createGraphics({
        id: "strokeWidthLegendSymbols",
        type: "line",
        length: count,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "strokeWidthLegendLabels",
        type: "text",
        length: count,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "strokeWidthLegendTitle",
        type: "text",
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeStrokeWidthLegend();
  }
);

export function registerStrokeWidthLegendActions(ProgramClass) {
  ProgramClass.prototype.createStrokeWidthLegend = createStrokeWidthLegend;
  ProgramClass.prototype.rematerializeStrokeWidthLegend =
    rematerializeStrokeWidthLegend;
}
