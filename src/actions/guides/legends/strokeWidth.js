import { action, closedAction } from "../../../core/action.js";
import {
  validateKeys
} from "../../../core/validation.js";
import { mapContinuousScaleValues } from "../../../grammar/scales/index.js";
import { resolveLegendItemLayout } from "../../../layout/legendItems.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS } from
  "../../../theme/defaults.js";
import {
  ITEM_LEGEND_LABELS as STROKE_WIDTH_LEGEND_LABELS,
  ITEM_LEGEND_TITLE_STYLE as STROKE_WIDTH_LEGEND_TITLE_STYLE,
  normalizeItemLegendConfig,
  ITEM_LEGEND_OPTIONS as OPTIONS,
  assertLegendBoundsInsideCanvas,
  materializeItemLegend,
  createItemLegendGraphics,
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



export { STROKE_WIDTH_LEGEND_LABELS, STROKE_WIDTH_LEGEND_TITLE_STYLE };

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
    ...normalizeItemLegendConfig(args, encoding, 32),
    sampling,

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
