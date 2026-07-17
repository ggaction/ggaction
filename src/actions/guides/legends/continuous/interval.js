import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import {
  validateKeys,
  validateOptionObject
} from "../../../../core/validation.js";
import { formatDiscretizedIntervals } from "../../../../grammar/scales.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";
import {
  assertLegendInsideCanvas,
  resolveContinuousBounds,
  resolveContinuousPoint,
  styleContinuousText,
  validateNonNegative,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";

const OPTIONS = Object.freeze([
  "target", "channels", "position", "align", "offset", "title",
  "symbol", "labels", "titleStyle", "itemGap", "direction", "border"
]);
const SYMBOL_OPTIONS = Object.freeze([
  "width", "height", "stroke", "strokeWidth"
]);
const TEXT_OPTIONS = Object.freeze([
  "offset", "color", "fontSize", "fontFamily", "fontWeight"
]);

function textOptions(value, label, defaults) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value ?? {}, TEXT_OPTIONS, label);
  const result = { ...defaults, ...(value ?? {}) };
  if (result.offset !== undefined) validateNonNegative(result.offset, `${label} offset`);
  validatePositive(result.fontSize, `${label} fontSize`);
  return result;
}

export function normalizeIntervalLegend(args) {
  validateOptionObject(args, OPTIONS, "createLegend");
  if (args.channels !== undefined && (
    !Array.isArray(args.channels) ||
    args.channels.length !== 1 ||
    args.channels[0] !== "color"
  )) {
    throw new Error('Interval legend requires channels: ["color"].');
  }
  if ((args.position ?? "right") !== "right") {
    throw new Error('Interval legends currently support position "right".');
  }
  if ((args.direction ?? "vertical") !== "vertical") {
    throw new Error('Interval legends currently support direction "vertical".');
  }
  if (args.border !== undefined && args.border !== false) {
    throw new Error("Interval legend border is not implemented yet.");
  }
  if (args.symbol !== undefined && !isPlainObject(args.symbol)) {
    throw new TypeError("createLegend.symbol must be a plain object.");
  }
  validateKeys(args.symbol ?? {}, SYMBOL_OPTIONS, "createLegend.symbol");
  const symbol = {
    width: args.symbol?.width ?? 14,
    height: args.symbol?.height ?? 12,
    stroke: args.symbol?.stroke ?? "white",
    strokeWidth: args.symbol?.strokeWidth ?? 0.5
  };
  validatePositive(symbol.width, "Legend symbol width");
  validatePositive(symbol.height, "Legend symbol height");
  validateNonNegative(symbol.strokeWidth, "Legend symbol strokeWidth");
  const offset = args.offset ?? 30;
  const itemGap = args.itemGap ?? 28;
  validateNonNegative(offset, "Legend offset");
  validatePositive(itemGap, "Legend itemGap");
  return {
    target: args.target,
    position: "right",
    direction: "vertical",
    align: args.align ?? "center",
    offset,
    itemGap,
    title: args.title,
    inferredTitle: args.title === undefined,
    titleVisible: true,
    symbol,
    labels: textOptions(args.labels, "createLegend.labels", {
      offset: 8,
      color: DEFAULT_COLORS.text,
      fontSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: "normal"
    }),
    titleStyle: textOptions(args.titleStyle, "createLegend.titleStyle", {
      color: DEFAULT_COLORS.text,
      fontSize: 13,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: 600
    }),
    border: false
  };
}

function resolveIntervalConfig(program, stored) {
  const layer = resolveContinuousPoint(program, stored.target, "color");
  const encoding = layer.encoding.color;
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Interval legend requires quantitative color.");
  }
  const scale = program.resolvedScales[encoding.scale];
  if (!["quantize", "quantile", "threshold"].includes(scale?.type)) {
    throw new Error(`Interval legend requires a resolved discretized scale "${encoding.scale}".`);
  }
  return {
    layer,
    encoding,
    scale,
    config: {
      ...stored,
      target: layer.id,
      scale: encoding.scale,
      title: stored.inferredTitle ? encoding.field : stored.title
    }
  };
}

function resolveIntervalLayout(program, config, scale) {
  const { plot, canvas } = resolveContinuousBounds(program);
  const labels = formatDiscretizedIntervals(scale.thresholds);
  const symbolX = plot.x + plot.width + config.offset;
  const itemY = labels.map((_, index) => plot.y + 52 + index * config.itemGap);
  const labelX = symbolX + config.symbol.width + config.labels.offset;
  const title = { x: symbolX, y: plot.y + 20 };
  assertLegendInsideCanvas([
    title,
    ...itemY.flatMap(y => [
      { x: symbolX, y },
      { x: labelX, y }
    ])
  ], canvas, "Interval legend layout");
  return { labels, symbolX, labelX, itemY, title };
}

export const rematerializeIntervalLegend = action(
  {
    op: "rematerializeIntervalLegend",
    description: "Rematerialize a discretized color interval legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeIntervalLegend");
    const stored = this.guideConfigs.legend?.interval;
    if (stored === undefined) {
      throw new Error("Interval legend requires stored configuration.");
    }
    const { encoding, scale, config } = resolveIntervalConfig(this, stored);
    const layout = resolveIntervalLayout(this, config, scale);
    let next = this
      .editSemantic({ property: "guide.legend.color.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.color.title", value: config.title })
      ._withLegendConfig("interval", config)
      .editGraphics({
        target: "colorLegendSymbols",
        property: "length",
        value: scale.range.length
      })
      .editGraphics({ target: "colorLegendSymbols", property: "x", value: layout.symbolX })
      .editGraphics({
        target: "colorLegendSymbols",
        property: "y",
        value: layout.itemY.map(value => value - config.symbol.height / 2)
      })
      .editGraphics({ target: "colorLegendSymbols", property: "width", value: config.symbol.width })
      .editGraphics({ target: "colorLegendSymbols", property: "height", value: config.symbol.height })
      .editGraphics({ target: "colorLegendSymbols", property: "fill", value: scale.range })
      .editGraphics({ target: "colorLegendSymbols", property: "stroke", value: config.symbol.stroke })
      .editGraphics({ target: "colorLegendSymbols", property: "strokeWidth", value: config.symbol.strokeWidth })
      .editGraphics({ target: "colorLegendLabels", property: "length", value: layout.labels.length })
      .editGraphics({ target: "colorLegendLabels", property: "x", value: layout.labelX })
      .editGraphics({ target: "colorLegendLabels", property: "y", value: layout.itemY })
      .editGraphics({ target: "colorLegendLabels", property: "text", value: layout.labels });
    next = styleContinuousText(next, "colorLegendLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = next
      .editGraphics({ target: "colorLegendTitle", property: "x", value: layout.title.x })
      .editGraphics({ target: "colorLegendTitle", property: "y", value: layout.title.y })
      .editGraphics({ target: "colorLegendTitle", property: "text", value: config.title });
    return styleContinuousText(next, "colorLegendTitle", config.titleStyle);
  }
);

export const createIntervalLegend = action(
  {
    op: "createIntervalLegend",
    description: "Create a discretized color interval legend."
  },
  function (args = {}) {
    const config = normalizeIntervalLegend(args);
    const resolved = resolveIntervalConfig(this, config);
    resolveIntervalLayout(this, resolved.config, resolved.scale);
    if (this.graphicSpec.objects.colorLegendSymbols !== undefined) {
      throw new Error("createIntervalLegend requires a missing interval legend.");
    }
    return this
      .editSemantic({
        property: "guide.legend.color.scale",
        value: resolved.encoding.scale
      })
      .editSemantic({
        property: "guide.legend.color.title",
        value: resolved.config.title
      })
      ._withLegendConfig("interval", resolved.config)
      .createGraphics({
        id: "colorLegendSymbols",
        type: "rect",
        length: 0,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "colorLegendLabels",
        type: "text",
        length: 0,
        ...resolveLegendGraphicPlacement(this)
      })
      .createGraphics({
        id: "colorLegendTitle",
        type: "text",
        ...resolveLegendGraphicPlacement(this)
      })
      .rematerializeIntervalLegend();
  }
);
