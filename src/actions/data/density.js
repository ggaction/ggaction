import {
  deriveKernelDensity,
  normalizeDensityTransform
} from "../../grammar/density.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "as", "weight"
]);
const CATEGORICAL_OPTIONS = Object.freeze([...OPTIONS, "placement"]);

function requestedTransform(args, op, categorical = false) {
  if (typeof args.field !== "string" || args.field.length === 0) {
    throw new TypeError(`${op} requires a non-empty field string.`);
  }
  if (categorical && args.placement?.type !== "category") {
    throw new Error(
      "createCategoricalDensityData requires normalized category placement."
    );
  }
  return normalizeDensityTransform({
    ...args,
    ...(categorical ? { placement: args.placement } : {})
  });
}

export const materializeDensityData = derivedMaterializer(
  "materializeDensityData",
  "Materialize one grouped kernel-density dataset.",
  "density",
  deriveKernelDensity,
  (result, transform) => [{
    ...transform,
    resolved: {
      ...(result.bandwidth === undefined
        ? { bandwidths: result.bandwidths }
        : { bandwidth: result.bandwidth }),
      extent: result.extent,
      ...(result.splitDomain === undefined
        ? {}
        : { splitDomain: result.splitDomain })
    }
  }]
);

export const createDensityData = derivedCreator(
  "createDensityData",
  "Create grouped kernel-density values.",
  OPTIONS,
  "Density dataset id",
  "Source dataset id",
  args => requestedTransform(args, "createDensityData"),
  "materializeDensityData"
);

export const createCategoricalDensityData = derivedCreator(
  "createCategoricalDensityData",
  "Create category-placed kernel-density values.",
  CATEGORICAL_OPTIONS,
  "Density dataset id",
  "Source dataset id",
  args => requestedTransform(args, "createCategoricalDensityData", true),
  "materializeDensityData"
);
