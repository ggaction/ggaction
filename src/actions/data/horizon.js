import {
  deriveHorizon,
  validateHorizonTransform
} from "../../grammar/horizon.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "groupBy", "bands", "baseline", "extent",
  "resolve", "missing", "overflow", "palette", "as"
]);

function requestedTransform(args) {
  return validateHorizonTransform({
    type: "horizon",
    x: args.x,
    y: args.y,
    ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
    bands: args.bands ?? 3,
    baseline: args.baseline ?? 0,
    extent: args.extent ?? "auto",
    resolve: args.resolve ?? "shared",
    missing: args.missing ?? "break",
    overflow: args.overflow ?? "clip",
    palette: args.palette ?? {},
    as: args.as
  });
}

export const materializeHorizonData = derivedMaterializer(
  "materializeHorizonData",
  "Materialize one immutable Horizon band dataset.",
  "horizon",
  deriveHorizon,
  result => [{ ...result.transform, resolved: result.resolved }]
);

export const createHorizonData = derivedCreator(
  "createHorizonData",
  "Create one immutable Horizon band dataset.",
  OPTIONS,
  "Horizon dataset id",
  "Horizon source dataset id",
  requestedTransform,
  "materializeHorizonData",
  true
);
