import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import {
  validateKeys,
  validateOptionObject
} from "../../../../core/validation.js";
import { formatDiscretizedIntervals } from "../../../../grammar/scales/index.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editGraphicProperties,
  editLegendBackground,
  normalizeLegendBorder,
  normalizeLegendTextOptions,
  resolveContinuousBounds,
  resolveContinuousLegendLayer,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  styleContinuousText,
  validateNonNegative,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";

const OPTIONS = [
  "target", "channels", "position", "align", "offset", "title",
  "symbol", "labels", "titleStyle", "itemGap", "direction", "border"
];
const SYMBOL_OPTIONS = [
  "width", "height", "stroke", "strokeWidth"
];

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
  if (args.symbol !== undefined && !isPlainObject(args.symbol)) {
    throw new TypeError("createLegend.symbol must be a plain object.");
  }
  const source = args.symbol ?? {};
  validateKeys(source, SYMBOL_OPTIONS, "createLegend.symbol");
  const symbol = {
    width: source.width ?? 14,
    height: source.height ?? 12,
    stroke: source.stroke ?? "white",
    strokeWidth: source.strokeWidth ?? 0.5
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
    labels: normalizeLegendTextOptions(args.labels, "createLegend.labels", {
      offset: 8,
      color: DEFAULT_COLORS.text,
      fontSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: "normal"
    }),
    titleStyle: normalizeLegendTextOptions(args.titleStyle, "createLegend.titleStyle", {
      color: DEFAULT_COLORS.text,
      fontSize: 13,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: 600
    }),
    border: normalizeLegendBorder(args.border)
  };
}

export function resolveIntervalConfig(program, stored) {
  const layer = resolveContinuousLegendLayer(program, stored.target, "color");
  const encoding = layer.encoding.color;
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Interval legend requires quantitative color.");
  }
  const scale = program.resolvedScales[encoding.scale];
  if (!["quantize", "quantile", "threshold"].includes(scale?.type)) {
    throw new Error(`Interval legend requires a resolved discretized scale "${encoding.scale}".`);
  }
  return { encoding, scale, config: {
      ...stored,
      target: layer.id,
      scale: encoding.scale,
      title: stored.inferredTitle ? encoding.field : stored.title
    } };
}

function resolveIntervalLayout(program, config, scale) {
  const { plot, canvas } = resolveContinuousBounds(program);
  const labels = formatDiscretizedIntervals(scale.thresholds);
  const symbolX = plot.x + plot.width + config.offset;
  const itemY = labels.map((_, index) => plot.y + 52 + index * config.itemGap);
  const labelX = symbolX + config.symbol.width + config.labels.offset;
  const title = { x: symbolX, y: plot.y + 20 };
  const strokeExtent = config.symbol.strokeWidth / 2;
  const occupiedBounds = [
    resolveLegendTextBounds(
      { ...title, align: "left" },
      config.title,
      config.titleStyle
    ),
    ...labels.map((label, index) => resolveLegendTextBounds(
      { x: labelX, y: itemY[index], align: "left" },
      label,
      config.labels
    )),
    ...itemY.map(y => ({
      left: symbolX - strokeExtent,
      right: symbolX + config.symbol.width + strokeExtent,
      top: y - config.symbol.height / 2 - strokeExtent,
      bottom: y + config.symbol.height / 2 + strokeExtent
    }))
  ];
  assertLegendBoundsInsideCanvas(
    occupiedBounds,
    canvas,
    "Interval legend layout"
  );
  const background = resolveLegendBackgroundFromBounds(
    occupiedBounds,
    config.border,
    canvas,
    "Interval legend"
  );
  return { labels, symbolX, labelX, itemY, title, background };
}

export const rematerializeIntervalLegend = /* @__PURE__ */ action(
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
    let next = editGraphicProperties(this
      .editSemantic({ property: "guide.legend.color.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.color.title", value: config.title })
      ._withLegendConfig("interval", config), "colorLegendSymbols", {
      length: scale.range.length,
      x: layout.symbolX,
      y: layout.itemY.map(value => value - config.symbol.height / 2),
      width: config.symbol.width,
      height: config.symbol.height,
      fill: scale.range,
      stroke: config.symbol.stroke,
      strokeWidth: config.symbol.strokeWidth
    });
    next = editGraphicProperties(next, "colorLegendLabels", {
      length: layout.labels.length,
      x: layout.labelX,
      y: layout.itemY,
      text: layout.labels
    });
    next = editLegendBackground(
      next,
      "colorLegendBackground",
      layout.background,
      config.border
    );
    next = styleContinuousText(next, "colorLegendLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = editGraphicProperties(next, "colorLegendTitle", {
      x: layout.title.x,
      y: layout.title.y,
      text: config.title
    });
    return styleContinuousText(next, "colorLegendTitle", config.titleStyle);
  }
);

export const createIntervalLegend = /* @__PURE__ */ action(
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
    let next = this
      .editSemantic({
        property: "guide.legend.color.scale",
        value: resolved.encoding.scale
      })
      .editSemantic({
        property: "guide.legend.color.title",
        value: resolved.config.title
      })
      ._withLegendConfig("interval", resolved.config);
    const placement = resolveLegendGraphicPlacement(next);
    if (resolved.config.border !== false) {
      next = next.createGraphics({
        id: "colorLegendBackground",
        type: "rect",
        ...placement
      });
    }
    return next
      .createGraphics({
        id: "colorLegendSymbols",
        type: "rect",
        length: 0,
        ...resolveLegendGraphicPlacement(next, resolved.config.border === false
          ? {}
          : { after: "colorLegendBackground" })
      })
      .createGraphics({
        id: "colorLegendLabels",
        type: "text",
        length: 0,
        ...placement
      })
      .createGraphics({
        id: "colorLegendTitle",
        type: "text",
        ...placement
      })
      .rematerializeIntervalLegend();
  }
);
