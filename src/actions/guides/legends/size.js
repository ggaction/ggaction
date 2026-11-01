
import { resolveSizeLegendLayout, requireSizeLegendScale } from "../../../materialization/guides/legendSamples.js";

import{hasLegendClipGraphics}from"../../../materialization/legendClip.js";



import { action, closedAction } from "../../../core/action.js";
import {
  validateKeys
} from "../../../core/validation.js";
import { isEnumeratedSizeScaleType } from "../../../grammar/scales/index.js";

import { DEFAULT_COLORS } from
  "../../../theme/defaults.js";
import { findLegendLayer as findLayer } from "../../../materialization/legendEncodings.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { ITEM_LEGEND_LABELS as SIZE_LEGEND_LABELS, ITEM_LEGEND_TITLE_STYLE as SIZE_LEGEND_TITLE_STYLE, normalizeItemLegendConfig, ITEM_LEGEND_OPTIONS as SIZE_OPTIONS, materializeItemLegend, createItemLegendGraphics, selectLegendLayer } from "./continuous/common.js";
import { legendResourcePolicies } from "../../../materialization/guides/resources.js";
import { normalizeLegendSampling } from "../../../grammar/legendSampling.js";

import { normalizeLegendOverflow } from "./categorical/options.js";



export { SIZE_LEGEND_LABELS, SIZE_LEGEND_TITLE_STYLE };

export function isSizeLegendPoint(layer) {
  return (layer?.mark?.type === "point" || layer?.mark?.type === "geo" && layer.geoBinding.mode === "point") &&
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

export const rematerializeSizeLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeSizeLegend",
    description: "Rematerialize a point-size legend."
  }, [],
  function (args = {}) {
    if(hasLegendClipGraphics(this))return this.rematerializeLegend();
    const config = this.guideConfigs.legend?.size;
    if (config === undefined) throw new Error("Size legend requires stored configuration.");
    const layer = findLayer(this, config.target);
    const encoding = layer?.encoding?.size;
    if (encoding?.scale === undefined) {
      throw new Error("Size legend target requires a size encoding.");
    }
    const scale = requireSizeLegendScale(this, encoding.scale);
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
        x: layout.symbolX, y: layout.symbolY, radius: layout.radii,
        fill: layout.config.blockSymbol?.fill ?? DEFAULT_COLORS.sizeSymbol,
        opacity: layout.config.blockSymbol?.opacity ?? 0.7
      },
      optional: {
        stroke: layout.config.blockSymbol?.stroke,
        strokeWidth: layout.config.blockSymbol?.strokeWidth ??
          (layout.config.blockSymbol?.stroke === undefined ? undefined : 0)
      }
    });
  }
);


export function resolveSizeLegendConfig(program, args = {}) {
  validateKeys(args, [...SIZE_OPTIONS, "inheritAppearance"], "createSizeLegend");
  const layer = resolveSizeLegendPoint(program, args.target);
  const encoding = layer.encoding?.size;
  if (encoding?.scale === undefined) {
    throw new Error(`Point mark "${layer.id}" requires a size encoding.`);
  }
  const scale = requireSizeLegendScale(program, encoding.scale);
  const discrete = isEnumeratedSizeScaleType(scale.type);
  if (args.overflow !== undefined && scale.type !== "ordinal") {
    throw new Error("Size legend overflow requires an ordinal scale.");
  }
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
    ...normalizeItemLegendConfig(args, encoding, "size", program.materializationConfigs.theme),
    ...(args.overflow === undefined ? {} : { overflow: normalizeLegendOverflow(args.overflow) }),
    domain: scale.domain,
    ...(discrete ? { count } : { sampling }),
    inheritAppearance: args.inheritAppearance === true,
    inheritPosition: args.position === undefined,

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
