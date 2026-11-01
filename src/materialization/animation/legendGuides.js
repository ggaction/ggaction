import { prepareSizeLegendLayout, normalizeSizeLegendAnimationState } from "./sizeLegendState.js";
import { legendGuideItems } from "../guides/legendItems.js";
import { resolveEffectiveLegendBlockConfig } from "../guides/legendConfig.js";
import { resolveContinuousBounds } from "../guides/legendLayout.js";
import { legendSampleStrokeWidth } from "../legends.js";
import { localLegendPlacement, legendGroup } from "../legendGroups.js";
import { normalizeGuideAnimationState } from "../../grammar/animation/guideState.js";
import { prepareGradientLegendLayout, normalizeLegendAnimationState } from "./legendState.js";
import { GRADIENT_STRIP_COUNT } from "../guides/legendGradient.js";

// The native config remains the authority. Unsupported group/axis clearance
// dependencies keep their exact native identity and an explicit layout reason.
export function legendAnimationItems(program, namespaces, spend) {
  const result = [], prepared = new Map(), configs = program.guideConfigs.legend ?? {};
  for (const item of legendGuideItems(program, spend)) {
    if (!["gradient", "strokeGradient", "size"].includes(item.kind) || item.kind !== "size" && item.component === "symbol") continue;
    const component = `legend-${item.component}`, config = resolveEffectiveLegendBlockConfig(program, item.kind, configs[item.kind]);
    const value = item.component === "strip" ? [item.kind, ["segment", item.line, GRADIENT_STRIP_COUNT]] : item.value;
    const identity = { namespaces, owner: item.ownerId, component, value, line: 0 };
    if (!prepared.has(item.kind)) {
      const simple = config.clipHeight === undefined &&
        (item.kind !== "size" || ["linear", "log", "sqrt", "pow"].includes(program.resolvedScales[config.scale]?.type) &&
          !["series", "color", "stroke"].some(kind => configs[kind]?.target === config.target)) &&
        config.sampling?.mode === "values" && config.representation !== "symbols" && config.border === false &&
        config.inferredOffset === false && localLegendPlacement(config) === undefined && legendGroup(program, config.target) === undefined &&
        program.context.facetLegendIntrinsic !== true && ["left", "right", "top", "bottom"].includes(config.position) &&
        Object.values(configs).filter(other => other.position === config.position).length === 1;
      let layout;
      if (simple) {
        const { plot, canvas } = resolveContinuousBounds(program);
        layout = (item.kind === "size" ? prepareSizeLegendLayout : prepareGradientLegendLayout)({ config, scale: program.resolvedScales[config.scale],
          frame: { plot, canvas: { width: canvas.width, height: canvas.height } }, profile: program.materializationConfigs.textMetrics,
          stripStrokeWidth: item.kind === "strokeGradient" ? legendSampleStrokeWidth(program, config.target) : 0 });
      }
      prepared.set(item.kind, layout);
    }
    const layout = prepared.get(item.kind);
    const state = layout === undefined ? normalizeGuideAnimationState({ identity, reason: "guide-layout" })
      : item.kind === "size" ? normalizeSizeLegendAnimationState({ identity, kind: "size-legend", layout })
      : normalizeLegendAnimationState({ identity, kind: "legend", layout });
    result.push({ graphicId: item.graphicId, state });
  }
  return result;
}
