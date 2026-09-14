import { action } from "../../../core/action.js";
import {
  validateNonEmptyString,
  validateKeys
} from "../../../core/validation.js";
import {
  formatDiscretizedIntervals,
  isDiscreteSizeScaleType,
  isSizeScaleType,
  mapSizeValues
} from "../../../grammar/scales/index.js";
import { resolveLegendItemLayout } from "../../../layout/legendItems.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../theme/defaults.js";
import { findLayer } from "../../../selectors/layers.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import {
  assertLegendBoundsInsideCanvas,
  editLegendBackground,
  normalizeItemLegendLayout,
  normalizeLegendBorder,
  normalizeLegendTextOptions,
  normalizeLegendTitleOptions,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds,
  formatContinuousValues,
  selectLegendLayer,
  styleContinuousText
} from "./continuous/common.js";
import { legendResourcePolicies } from "../../../materialization/guides/resources.js";
import {
  normalizeLegendSampling,
  readLegendSampling,
  resolveLegendSampleValues
} from "./sampling.js";
import { resolveEffectiveLegendBlockConfig } from "./blocks.js";

const SIZE_OPTIONS = Object.freeze(["target", "count", "values", "position", "layout", "align",
  "direction", "columns", "titlePosition", "offset", "itemGap", "title", "labels", "titleStyle", "border"]);

export const SIZE_LEGEND_LABELS = Object.freeze({
  offset: 12,
  color: DEFAULT_COLORS.text,
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: "normal"
});
export const SIZE_LEGEND_TITLE_STYLE = Object.freeze({
  color: DEFAULT_COLORS.strongText,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
});

export function isSizeLegendPoint(layer) {
  return layer?.mark?.type === "point" &&
    layer.encoding?.size?.scale !== undefined;
}

export function resolveSizeLegendPoint(program, requested) {
  const layer = selectLegendLayer(program, requested, isSizeLegendPoint);
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "Size legend requires one eligible point mark or an explicit target."
        : `Unknown size legend target "${requested}".`
    );
  }
  return layer;
}

function requireScale(program, id) {
  const scale = program.resolvedScales[id];
  if (!isSizeScaleType(scale?.type)) {
    throw new Error(`Legend requires resolved size scale "${id}".`);
  }
  return scale;
}

export function resolveSizeLegendLayout(program, config) {
  const scale = requireScale(program, config.scale);
  const categorical = [
    program.guideConfigs.legend?.series,
    program.guideConfigs.legend?.color,
    program.guideConfigs.legend?.stroke
  ]
    .find(candidate => candidate?.target === config.target);
  const inherit = config.inheritAppearance === true && categorical !== undefined;
  const inheritedLabels = inherit ? { ...categorical.labels, offset: config.labels.offset } : config.labels;
  const inheritedTitleStyle = inherit ? categorical.titleStyle : config.titleStyle;
  const effective = resolveEffectiveLegendBlockConfig(program, "size", {
    ...config,
    labels: inheritedLabels,
    titleStyle: inheritedTitleStyle
  });
  const labels = effective.labels;
  const titleStyle = effective.titleStyle;
  const position = categorical?.position ?? config.position;
  if (categorical?.layout === "legacy-bottom") {
    throw new Error('Combined size legends require layout "edge".');
  }
  const horizontal = categorical !== undefined && ["top", "bottom"].includes(position);
  const geometry = horizontal ? {
    position, align: categorical.align, direction: categorical.direction,
    columns: categorical.columns, titlePosition: categorical.titlePosition,
    offset: categorical.offset, itemGap: effective.blockGap ?? categorical.itemGap
  } : { position };
  const discrete = isDiscreteSizeScaleType(scale.type);
  if (discrete && readLegendSampling(config).mode === "values") {
    throw new Error("Discrete size legends do not support exact values.");
  }
  const values = discrete
    ? undefined
    : resolveLegendSampleValues(effective, scale, "Size legend");
  const areas = discrete
    ? scale.range
    : mapSizeValues(values, scale);
  const radii = areas.map(area => Math.sqrt(area / Math.PI));
  const radius = Math.max(...radii);
  const width = Math.max(32, radius * 2);
  const { plot, canvas } = resolveContinuousBounds(program);
  const text = discrete
    ? formatDiscretizedIntervals(scale.thresholds, config.labels.format)
    : formatContinuousValues(
        values,
        scale.domain,
        "quantitative",
        config.labels.format
      );
  const symbolStroke = effective.blockSymbol?.strokeWidth ?? 0;
  const symbolExtent = symbolStroke / 2;
  const sampleWidth = width + symbolStroke;
  const layout = resolveLegendItemLayout(plot, { ...effective, ...geometry, labels, titleStyle }, text, {
    width: sampleWidth, height: radius * 2 + symbolStroke,
    itemBounds: radii.map(r => ({
      left: sampleWidth / 2 - r - symbolExtent,
      right: sampleWidth / 2 + r + symbolExtent,
      top: -r - symbolExtent,
      bottom: r + symbolExtent
    }))
  });
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Size legend layout", { ...effective, ...geometry });
  const background = resolveLegendBackgroundFromBounds(layout.bounds, effective.border, canvas, "Size legend", { ...effective, ...geometry });
  return { ...layout, symbolX: layout.symbolX.map(x => x + sampleWidth / 2), radii, text,
    labels, titleStyle, background, config: effective };
}

export const rematerializeSizeLegend = /* @__PURE__ */ action(
  {
    op: "rematerializeSizeLegend",
    description: "Rematerialize a quantitative point-size legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeSizeLegend");
    const config = this.guideConfigs.legend?.size;
    if (config === undefined) throw new Error("Size legend requires stored configuration.");
    const layer = findLayer(this, config.target);
    const encoding = layer?.encoding?.size;
    if (encoding?.scale === undefined) {
      throw new Error("Size legend target requires a size encoding.");
    }
    const scale = requireScale(this, encoding.scale);
    const title = config.inferredTitle === true ? encoding.field : config.title;
    const currentConfig = {
      ...config,
      scale: encoding.scale,
      title,
      domain: scale.domain
    };
    const layout = resolveSizeLegendLayout(this, currentConfig);
    const effective = layout.config;
    const { itemY, symbolX, labelX, radii, labels, titleStyle } = layout;
    let next = this
      .editSemantic({ property: "guide.legend.size.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.size.title", value: title })
      ._withLegendConfig("size", currentConfig)
      .editGraphics({ target: "sizeLegendSymbols", property: "length", value: radii.length })
      .editGraphics({ target: "sizeLegendSymbols", property: "x", value: symbolX })
      .editGraphics({ target: "sizeLegendSymbols", property: "y", value: itemY })
      .editGraphics({
        target: "sizeLegendSymbols",
        property: "radius",
        value: radii
      })
      .editGraphics({
        target: "sizeLegendSymbols",
        property: "fill",
        value: effective.blockSymbol?.fill ?? DEFAULT_COLORS.sizeSymbol
      })
      .editGraphics({ target: "sizeLegendSymbols", property: "opacity",
        value: effective.blockSymbol?.opacity ?? 0.7 })
      .editGraphics({ target: "sizeLegendLabels", property: "length", value: radii.length })
      .editGraphics({ target: "sizeLegendLabels", property: "x", value: labelX })
      .editGraphics({ target: "sizeLegendLabels", property: "y", value: itemY })
      .editGraphics({
        target: "sizeLegendLabels",
        property: "text",
        value: layout.text
      });
    next = editLegendBackground(next, "sizeLegendBackground", layout.background, currentConfig.border);
    if (effective.blockSymbol?.stroke !== undefined) {
      next = next.editGraphics({ target: "sizeLegendSymbols", property: "stroke",
        value: effective.blockSymbol.stroke });
    }
    if (effective.blockSymbol?.strokeWidth !== undefined) {
      next = next.editGraphics({ target: "sizeLegendSymbols", property: "strokeWidth",
        value: effective.blockSymbol.strokeWidth });
    }
    next = styleContinuousText(next, "sizeLegendLabels", labels);
    if (effective.titleVisible === false) return next;
    next = next
      .editGraphics({ target: "sizeLegendTitle", property: "x", value: layout.title.x })
      .editGraphics({ target: "sizeLegendTitle", property: "y", value: layout.title.y })
      .editGraphics({ target: "sizeLegendTitle", property: "text", value: effective.title });
    return styleContinuousText(next, "sizeLegendTitle", titleStyle, { align: layout.title.align });
  }
);


export function resolveSizeLegendConfig(program, args = {}) {
  validateKeys(args, [...SIZE_OPTIONS, "inheritAppearance"], "createSizeLegend");
  if (args.title !== undefined) validateNonEmptyString(args.title, "Legend title");
  const layer = resolveSizeLegendPoint(program, args.target);
  const encoding = layer.encoding?.size;
  if (encoding?.scale === undefined) {
    throw new Error(`Point mark "${layer.id}" requires a size encoding.`);
  }
  const scale = requireScale(program, encoding.scale);
  const discrete = isDiscreteSizeScaleType(scale.type);
  if (discrete && (Object.hasOwn(args, "count") || Object.hasOwn(args, "values"))) {
    throw new Error("Discrete size legends do not support count or exact values.");
  }
  const sampling = discrete ? undefined : normalizeLegendSampling(args, {
    operation: "create",
    label: "Size legend"
  });
  const count = discrete ? scale.range.length : undefined;
  return {
    target: layer.id,
    scale: encoding.scale,
    ...normalizeItemLegendLayout({ ...args, itemGap: args.itemGap ?? 40 }),
    title: args.title ?? encoding.field,
    inferredTitle: args.title === undefined,
    domain: scale.domain,
    ...(discrete ? { count } : { sampling }),
    inheritAppearance: args.inheritAppearance === true,
    labels: normalizeLegendTextOptions(args.labels, "createLegend.labels", SIZE_LEGEND_LABELS),
    titleStyle: normalizeLegendTitleOptions(args.titleStyle, "createLegend.titleStyle", SIZE_LEGEND_TITLE_STYLE),
    border: normalizeLegendBorder(args.border),
    titleVisible: true
  };
}

export function createSizeLegendFromConfig(program, config) {
  const { radii } = resolveSizeLegendLayout(program, config);
  const count = radii.length;
  const following = new Set(legendResourcePolicies().filter(policy =>
    policy.kind !== "size" && policy.family !== "categorical" &&
    program.guideConfigs.legend?.[policy.kind] !== undefined
  ).flatMap(policy => policy.graphicIds));
  const before = program.graphicSpec.objects.canvas?.children?.find(id => following.has(id));
  const placement = resolveLegendGraphicPlacement(program, before === undefined ? {} : { before });
  let next = program
    .editSemantic({ property: "guide.legend.size.scale", value: config.scale })
    .editSemantic({ property: "guide.legend.size.title", value: config.title })
    ._withLegendConfig("size", config);
  if (config.border !== false) {
    next = next.createGraphics({ id: "sizeLegendBackground", type: "rect",
      ...placement });
  }
  next = next.createGraphics({
      id: "sizeLegendSymbols",
      type: "circle",
      length: count,
      ...placement
    })
    .createGraphics({
      id: "sizeLegendLabels",
      type: "text",
      length: count,
      ...placement
    });
  if (config.titleVisible !== false) {
    next = next.createGraphics({
      id: "sizeLegendTitle",
      type: "text",
      ...placement
    });
  }
  return next.rematerializeSizeLegend();
}

export const createSizeLegend = /* @__PURE__ */ action(
  {
    op: "createSizeLegend",
    description: "Create an equal-area point-size legend."
  },
  function (args = {}) {
    const config = resolveSizeLegendConfig(this, args);
    return createSizeLegendFromConfig(this, config);
  }
);

export function registerSizeLegendActions(ProgramClass) {
  ProgramClass.prototype.createSizeLegend = createSizeLegend;
  ProgramClass.prototype.rematerializeSizeLegend = rematerializeSizeLegend;
}
