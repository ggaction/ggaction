import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";

const OPTIONS = Object.freeze(["id", "profile", "source"]);

export const rebindGradientPlotProfile = action(
  {
    op: "rebindGradientPlotProfile",
    description: "Rebind one gradient plot to a replayed profile revision."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "rebindGradientPlotProfile");
    const id = validateUserId(args.id, "Gradient-plot id");
    const profileId = validateUserId(
      args.profile,
      "Gradient profile dataset id"
    );
    const source = validateUserId(args.source, "Gradient profile source id");
    const layer = findLayer(this, id);
    const config = this.markConfigs[id]?.gradientPlot;
    const profile = findDataset(this, profileId);
    const transform = profile?.transform?.[0];
    if (layer?.mark?.type !== "rect" || config?.materialized !== true) {
      throw new Error(`Unknown materialized gradient plot "${id}".`);
    }
    if (layer.data !== profileId || transform?.type !== "gradientProfile") {
      throw new Error(
        `Gradient plot "${id}" must use gradient profile dataset "${profileId}".`
      );
    }
    if (profile.source !== source || findDataset(this, source) === undefined) {
      throw new Error(
        `Gradient profile dataset "${profileId}" must use source "${source}".`
      );
    }
    return this
      ._withMarkConfig(id, {
        ...this.markConfigs[id],
        gradientPlot: {
          ...config,
          source,
          profileId,
          intensityDomain: transform.resolved.intensityDomain
        }
      })
      ._withContext({ currentMark: id, currentData: source });
  }
);
