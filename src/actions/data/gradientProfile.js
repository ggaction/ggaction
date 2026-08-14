import {
  deriveGradientProfiles,
  normalizeGradientProfileTransform
} from "../../grammar/gradientProfile.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "category", "field", "bandwidth", "extent", "steps",
  "kernel", "normalization", "center", "as"
]);

export const materializeGradientProfileData = derivedMaterializer(
  "materializeGradientProfileData",
  "Materialize one categorical density-profile dataset.",
  "gradientProfile",
  deriveGradientProfiles,
  (result, transform) => [{
    ...transform,
    resolved: {
      bandwidth: result.bandwidth,
      extent: result.extent,
      intensityDomain: result.intensityDomain
    }
  }]
);

export const createGradientProfileData = derivedCreator(
  "createGradientProfileData",
  "Create one immutable categorical density-profile dataset.",
  OPTIONS,
  "Gradient profile dataset id",
  "Gradient profile source dataset id",
  normalizeGradientProfileTransform,
  "materializeGradientProfileData"
);
