import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveGradientProfiles,
  normalizeGradientProfileTransform
} from "../../grammar/gradientProfile.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "category", "field", "bandwidth", "extent", "steps",
  "kernel", "normalization", "center", "as"
]);

export const materializeGradientProfileData = action(
  {
    op: "materializeGradientProfileData",
    description: "Materialize one categorical density-profile dataset."
  },
  function (args = {}) {
    validateKeys(
      args,
      MATERIALIZE_OPTIONS,
      "materializeGradientProfileData"
    );
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "gradientProfile"
    );
    const result = deriveGradientProfiles(source.values, transform);
    return this
      .editSemantic({
        property: `dataset[${id}].transform`,
        value: [{
          ...transform,
          resolved: {
            bandwidth: result.bandwidth,
            extent: result.extent,
            intensityDomain: result.intensityDomain
          }
        }]
      })
      .editSemantic({ property: `dataset[${id}].values`, value: result.values });
  }
);

export const createGradientProfileData = action(
  {
    op: "createGradientProfileData",
    description: "Create one immutable categorical density-profile dataset."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createGradientProfileData");
    const id = validateUserId(args.id, "Gradient profile dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Gradient profile source dataset id"
    );
    const transform = normalizeGradientProfileTransform(args);
    return this
      .createDerivedData({ id, source, transform: [transform] })
      .materializeGradientProfileData({ id });
  }
);
