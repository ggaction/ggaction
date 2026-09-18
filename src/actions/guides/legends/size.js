import { formatVisibleText } from "../../../core/textMetrics.js";
import { action, closedAction } from "../../../core/action.js";
import {
  validateNonEmptyString,
  validateKeys
} from "../../../core/validation.js";
import {
  formatDiscretizedIntervals,
  isDiscreteSizeScaleType,
  isEnumeratedSizeScaleType,
  isSizeScaleType,
  mapSizeValues
} from "../../../grammar/scales/index.js";
import { resolveLegendItemLayout } from "../../../layout/legendItems.js";
import { DEFAULT_COLORS } from
  "../../../theme/defaults.js";
import { findLayer } from "../../../selectors/layers.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import {
  ITEM_LEGEND_LABELS as SIZE_LEGEND_LABELS,
  ITEM_LEGEND_TITLE_STYLE as SIZE_LEGEND_TITLE_STYLE,
  normalizeItemLegendConfig,
  ITEM_LEGEND_OPTIONS as SIZE_OPTIONS,
  assertLegendBoundsInsideCanvas,
  materializeItemLegend,
  createItemLegendGraphics,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds,
  formatContinuousValues,
  selectLegendLayer
} from "./continuous/common.js";
import { legendResourcePolicies } from "../../../materialization/guides/resources.js";
import {
  normalizeLegendSampling,
  readLegendSampling,
  resolveLegendSampleValues
} from "./sampling.js";
import { resolveEffectiveLegendBlockConfig } from "./blocks.js";



export { SIZE_LEGEND_LABELS, SIZE_LEGEND_TITLE_STYLE };

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
  const ordinalSize = scale.type === "ordinal";
  if (ordinalSize && config.labels.format !== undefined && config.labels.format !== "auto") {
    throw new Error("Categorical size legends retain original category labels.");
  }
  const discrete = isDiscreteSizeScaleType(scale.type);
  if ((discrete || ordinalSize) && readLegendSampling(config).mode === "values") {
    throw new Error("Discrete size legends do not support exact values.");
  }
  const values = discrete
    ? undefined
    : ordinalSize ? scale.domain : resolveLegendSampleValues(effective, scale, "Size legend");
  const areas = discrete
    ? scale.range
    : mapSizeValues(values, scale);
  const radii = areas.map(area => Math.sqrt(area / Math.PI));
  const radius = Math.max(...radii);
  const width = Math.max(32, radius * 2);
  const { plot, canvas } = resolveContinuousBounds(program);
  const text = discrete
    ? formatDiscretizedIntervals(scale.thresholds, config.labels.format)
    : ordinalSize ? values.map(formatVisibleText) : formatContinuousValues(
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
  }, undefined, program.materializationConfigs.textMetrics);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Size legend layout", { ...effective, ...geometry });
  const background = resolveLegendBackgroundFromBounds(layout.bounds, effective.border, canvas, "Size legend", { ...effective, ...geometry });
  return { ...layout, symbolX: layout.symbolX.map(x => x + sampleWidth / 2), radii, text,
    labels, titleStyle, background, config: effective };
}

export const rematerializeSizeLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeSizeLegend",
    description: "Rematerialize a point-size legend."
  }, [],
  function (args = {}) {
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
    return materializeItemLegend(this, "size", currentConfig, layout, {
      text: layout.text, labels: layout.labels, titleStyle: layout.titleStyle,
      symbols: {
        x: layout.symbolX, y: layout.itemY, radius: layout.radii,
        fill: layout.config.blockSymbol?.fill ?? DEFAULT_COLORS.sizeSymbol,
        opacity: layout.config.blockSymbol?.opacity ?? 0.7
      },
      optional: {
        stroke: layout.config.blockSymbol?.stroke,
        strokeWidth: layout.config.blockSymbol?.strokeWidth
      }
    });
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
  const discrete = isEnumeratedSizeScaleType(scale.type);
  if (discrete && (Object.hasOwn(args, "count") || Object.hasOwn(args, "values"))) {
    throw new Error("Discrete size legends do not support count or exact values.");
  }
  const sampling = discrete ? undefined : normalizeLegendSampling(args, {
    operation: "create",
    label: "Size legend"
  });
  const count = discrete ? (scale.type === "ordinal" ? scale.domain.length : scale.range.length) : undefined;
  return {
    target: layer.id,
    scale: encoding.scale,
    ...normalizeItemLegendConfig(args, encoding, 40),
    domain: scale.domain,
    ...(discrete ? { count } : { sampling }),
    inheritAppearance: args.inheritAppearance === true,

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
  return createItemLegendGraphics(program, "size", config, count, "circle", placement).rematerializeSizeLegend();
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
