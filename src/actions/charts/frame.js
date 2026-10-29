import { findLayer } from "../../selectors/layers.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { assertProgramSingleY } from "../../materialization/frameState.js";
import { previewPositionSequence, previewNativePositionFrame } from "../encodings/position/resolve.js";
import { resolveGuideOptions } from "../guides/guides.js";
import { scopeFacadeAxes, planFacadeAxes } from "../guides/facadeAxes.js";
import { previewCreateAxisFrame } from "../guides/axes/frame.js";

export function assertFacadePositionFrame(program, { id, data, mark, coordinate, positions, guides = false, explicitGuides = guides, plotAnchor }) {
  if (findLayer(program, id) !== undefined) throw new Error(`Mark "${id}" already exists.`);
  const dataset = requireMaterializedDataset(program, data);
  const layer = { id, data, mark, encoding: {} };
  const candidate = previewPositionSequence(program, layer, dataset, positions, { coordinate, plotAnchor });
  return assertFacadeGuidesFrame(candidate, id, guides, explicitGuides);
}

export function assertFacadeGuidesFrame(candidate, id, guides = false, explicitGuides = guides) {
  const finalLayer = findLayer(candidate, id);
  if (guides !== false && guides.axes !== false) {
    const options = resolveGuideOptions(candidate, { ...guides, legend: false, grid: false }, [finalLayer]).axes;
    if (options !== undefined) {
      const axes = scopeFacadeAxes(candidate, finalLayer, options);
      planFacadeAxes(candidate, finalLayer, axes, explicitGuides.axes ?? {});
      for (const channel of ["x", "y"]) {
        if (axes[channel] === false || axes[channel] === undefined) continue;
        for (const args of Array.isArray(axes[channel]) ? axes[channel] : [axes[channel]]) {
          candidate = previewCreateAxisFrame(candidate, channel, args);
        }
      }
    }
  }
  assertProgramSingleY(candidate, { allowIncomplete: true });
  return candidate;
}

// Native statistical owners already know their final fields and scale options.
// Frame admission consumes those bindings without inventing source rows or
// running derived-data actions. Scale/value compatibility stays with that owner.
export function assertFacadeBindingFrame(program, { id, data, mark, coordinate, bindings, guides = false, explicitGuides = guides }) {
  const layer = { id, data, mark, encoding: {} };
  const candidate = previewNativePositionFrame(program, layer, coordinate, bindings);
  return assertFacadeGuidesFrame(candidate, id, guides, explicitGuides);
}
