import { intrinsicLegendConfig, localLegendPlacement } from "../legendGroups.js";
import { legendGroupKinds } from "../guides/legendLaneState.js";
import { resolveEffectiveLegendBlockConfig } from "../guides/legendConfig.js";
import { resolveContinuousBounds } from "../guides/legendLayout.js";
import { resolveSizeLegendLayout } from "../guides/legendSamples.js";
import { resolveCategoricalLegendAppearance, legendSampleStrokeWidth } from "../legends.js";
import { prepareCategoricalLegendLayout } from "./categoricalLegendState.js";
import { prepareSizeLegendLayout } from "./sizeLegendState.js";
import { prepareGradientLegendLayout } from "./legendState.js";
import { prepareLegendGroupLayout } from "./legendGroupState.js";

// Prepare complete native groups. A dependent unsupported block keeps the whole
// group on the explicit layout fallback instead of moving only some siblings.
export function prepareAnimationLegendGroups(program, spend) {
  const result = new Map();
  if (program.context.facetLegendIntrinsic === true) return result;
  for (const [target, group] of Object.entries(program.guideConfigs.legendGroups ?? {})) {
    spend(1 + target.length);
    if (group.inferredOffset === true) continue;
    const entries = legendGroupKinds(program, target);
    if (!entries.length || entries.some(([kind, config]) => program.context.compositionCollectedLegends?.includes(kind) || !["color", "series", "stroke", "gradient", "strokeGradient", "size"].includes(kind) ||
      config.border !== false || config.clipHeight !== undefined || config.overflow || localLegendPlacement(config) !== undefined ||
      config.combine !== undefined || config.representation === "symbols" ||
      (config.channels ? config.layout !== "edge" || config.symbol.layers.some(layer => layer.outline !== undefined || layer.shadow !== undefined) : config.sampling?.mode !== "values"))) continue;
    const { plot, canvas } = resolveContinuousBounds(program), frame = { plot, canvas: { width: canvas.width, height: canvas.height } };
    const blocks = [];
    for (const [kind, stored] of entries) {
      const categorical = ["color", "series", "stroke"].includes(kind);
      const config = kind === "size" ? resolveSizeLegendLayout(program, stored).config
        : intrinsicLegendConfig(program, resolveEffectiveLegendBlockConfig(program, kind, stored));
      const scale = program.resolvedScales[config.scale], appearance = categorical ? resolveCategoricalLegendAppearance(program, config) : undefined;
      if (kind === "size" && !["linear", "log", "sqrt", "pow"].includes(scale?.type) || categorical && [...appearance.colors, ...appearance.strokes].some(value => typeof value !== "string")) break;
      const intrinsicMode = group.placement.position?.includes("-") ? "corner" : true;
      const layout = (categorical ? prepareCategoricalLegendLayout : kind === "size" ? prepareSizeLegendLayout : prepareGradientLegendLayout)({
        config, scale, appearance, frame, profile: program.materializationConfigs.textMetrics, intrinsicMode,
        stripStrokeWidth: kind === "strokeGradient" ? legendSampleStrokeWidth(program, target) : 0
      });
      spend(categorical ? config.domain.length : config.sampling.values.length);
      blocks.push({ kind, layout });
    }
    if (blocks.length === entries.length) result.set(target, prepareLegendGroupLayout({ frame, group, blocks,
      allowOverflow: program.materializationConfigs.canvas?.plot !== undefined }));
  }
  return result;
}
