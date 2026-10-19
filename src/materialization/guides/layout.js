import {resetLegendClipGraphics, hasLegendClipGraphics}from"../legendClip.js";
import { localLegendPosition } from "../legendGroups.js";
import { needsLegendAxisReflow, needsSideLegendAxisReflow } from "./resources.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { planCanvasRematerialization } from "../layout.js";
import { applyMaterializationPlan } from "../planner.js";
import { assertGuideCollisionBlocks } from "../../layout/guideCollisions.js";
import { resolveGuideCollisionBlocks } from "./resources.js";
export { resolveGuideCollisionBlocks } from "./resources.js";

// Defer cross-guide checks while sibling materializers still carry old
// coordinates. The scope is transient and never survives a returned program.
export function withGuideLayoutTransaction(program, apply) {
  if (program.context.deferGuideLayoutValidation === true) return apply(program);
  const plot = program.materializationConfigs.canvas?.plot;
  let margin = program.materializationConfigs.canvas?.margin;
  let result;
  for (let attempt = 0; ; attempt += 1) {
    try {
      let candidate = resetLegendClipGraphics(program)._withContext({ deferGuideLayoutValidation: true });
      if (attempt > 0) {
        candidate = candidate
          .editGraphics({ target: "canvas", property: "width", value: plot.width + margin.left + margin.right })
          .editGraphics({ target: "canvas", property: "height", value: plot.height + margin.top + margin.bottom })
          ._withCanvasConfig({ ...candidate.materializationConfigs.canvas, margin });
        candidate = applyMaterializationPlan(candidate, planCanvasRematerialization(candidate));
      }
      result = apply(candidate);
      if (hasLegendClipGraphics(program) && !hasLegendClipGraphics(result) &&
          Object.values(result.guideConfigs.legend ?? {}).some(config => config.clipHeight !== undefined)) {
        result = result.rematerializeLegend();
      }
      if (result.compositionSpec === undefined && needsSideLegendAxisReflow(program, result)) {
        // Rebuild the native anchor before applying the current axis clearance.
        // Axis removal must also discard any previously inferred displacement.
        result = result.rematerializeLegend();
      }
      if (result.compositionSpec === undefined && Object.values(result.guideConfigs.legend ?? {}).some(config =>
        ["left", "right"].includes(config.position))) {
        result = result.rematerializeSideLegendLane();
      }
      if (result.compositionSpec === undefined && needsLegendAxisReflow(program, result)) {
        result = result.rematerializeHorizontalLegendLane();
      }
      if (result.compositionSpec === undefined && (Object.keys(result.guideConfigs.legendGroups ?? {}).length > 0 || Object.values(result.guideConfigs.legend ?? {}).some(config=>localLegendPosition(config)!==undefined))) {
        result = result.rematerializeLegendGroups();
      }
      if (plot !== undefined && result.titleConfig !== undefined) result = result.rematerializeTitle();
      break;
    } catch (error) {
      const overflow = getErrorDetails(error)?.canvasOverflow;
      if (plot === undefined || overflow === undefined || attempt >= 16) throw error;
      margin = Object.fromEntries(Object.keys(margin).map(side => [side, overflow[side] > 0 ? Math.ceil((margin[side] + overflow[side]) * 4) / 4 : margin[side]]));
    }
  }
  const { deferGuideLayoutValidation: _deferred, ...context } = result.context;
  if (Object.hasOwn(program.context, "deferGuideLayoutValidation")) {
    context.deferGuideLayoutValidation = program.context.deferGuideLayoutValidation;
  }
  const next = result._clone({ context });
  assertGuideCollisionBlocks(resolveGuideCollisionBlocks(next.graphicSpec, next.guideConfigs, next.titleConfig, next.materializationConfigs.textMetrics));
  return next;
}

export function withGuideLayoutValidation(implementation) {
  return function (args) {
    return withGuideLayoutTransaction(this, program => implementation.call(program, args));
  };
}
