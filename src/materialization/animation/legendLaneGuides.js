import { edgeKinds } from "../guides/legendLaneState.js";
import { localLegendPlacement } from "../legendGroups.js";
import { resolveGuideCollisionBlocks } from "../guides/resources.js";
import { resolveEffectiveLegendBlockConfig } from "../guides/legendConfig.js";
import { resolveContinuousBounds } from "../guides/legendLayout.js";
import { resolveSizeLegendConfig } from "../guides/legendSamples.js";
import { resolveCategoricalLegendAppearance, legendSampleStrokeWidth } from "../legends.js";
import { prepareCategoricalLegendLayout } from "./categoricalLegendState.js";
import { prepareSizeLegendLayout } from "./sizeLegendState.js";
import { prepareGradientLegendLayout } from "./legendState.js";
import { prepareLegendLaneLayout } from "./legendLaneState.js";

// A native edge lane owns every dependent block. Axis-dependent clearance is
// admitted separately once the current axis geometry is proven at each frame.
export function prepareAnimationLegendLanes(program, spend) {
  const result = new Map();
  if (program.context.facetLegendIntrinsic === true) return result;
  const axes = resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs, undefined, program.materializationConfigs.textMetrics).filter(block => block.kind === "axis");
  for (const edge of ["left", "right", "top", "bottom"]) {
    const entries = edgeKinds(program, edge);
    if (!entries.length || entries.length === 1 && entries[0][1].inferredOffset === false ||
        axes.some(block => block.position === edge && entries.some(([, config]) => config.inferredOffset === true))) continue;
    if (entries.some(([kind, config]) => program.context.compositionCollectedLegends?.includes(kind) ||
      !["color", "series", "stroke", "gradient", "strokeGradient", "size"].includes(kind) ||
      config.border !== false || config.clipHeight !== undefined || config.overflow || localLegendPlacement(config) !== undefined ||
      config.combine !== undefined || config.representation === "symbols" ||
      (config.channels ? config.layout !== "edge" || config.symbol.layers.some(layer => layer.outline !== undefined || layer.shadow !== undefined) : config.sampling?.mode !== "values"))) continue;
    const { plot, canvas } = resolveContinuousBounds(program), frame = { plot, canvas: { width: canvas.width, height: canvas.height } }, blocks = [];
    for (const [kind, stored] of entries) {
      const categorical = ["color", "series", "stroke"].includes(kind);
      const config = kind === "size" ? resolveSizeLegendConfig(program, stored).placement : resolveEffectiveLegendBlockConfig(program, kind, stored);
      const scale = program.resolvedScales[config.scale], appearance = categorical ? resolveCategoricalLegendAppearance(program, config) : undefined;
      if (kind === "size" && !["linear", "log", "sqrt", "pow"].includes(scale?.type) || categorical && [...appearance.colors, ...appearance.strokes].some(value => typeof value !== "string")) break;
      const layout = (categorical ? prepareCategoricalLegendLayout : kind === "size" ? prepareSizeLegendLayout : prepareGradientLegendLayout)({
        config, scale, appearance, frame, profile: program.materializationConfigs.textMetrics,
        stripStrokeWidth: kind === "strokeGradient" ? legendSampleStrokeWidth(program, config.target) : 0
      });
      spend(1 + config.target.length + (categorical ? config.domain.length : config.sampling.values.length));
      blocks.push({ kind, target: config.target, layout });
    }
    if (blocks.length !== entries.length) continue;
    const layout = prepareLegendLaneLayout({ edge, frame, blocks, allowOverflow: program.materializationConfigs.canvas?.plot !== undefined });
    for (const { kind } of blocks) result.set(kind, layout);
  }
  return result;
}
