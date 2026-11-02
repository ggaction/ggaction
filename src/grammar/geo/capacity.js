import { freezeOwned } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { MAX_PATH_COMMANDS, validatePathCapacity, pathCommandCapacity, validatePathCommandCount } from "../pathTopology.js";

const DEFAULT_CAPACITY = freezeOwned({ maxProjectedPoints: 10_000, maxPathCommands: MAX_PATH_COMMANDS });
const FIELDS = Object.freeze(Object.keys(DEFAULT_CAPACITY));

export function normalizeGeoCapacity(input) {
  ownRecord(input, "Geographic capacity");
  rejectUnknownProperties(input, FIELDS, "geographic capacity");
  const result = {};
  for (const key of FIELDS) {
    if (!Object.hasOwn(input, key) && key in input) throw new TypeError("Geographic capacity requires own fields.");
    result[key] = Object.hasOwn(input, key) ? validatePathCapacity(input[key]) : DEFAULT_CAPACITY[key];
  }
  return freezeOwned(result);
}

export function geoBindingCapacity(binding) {
  if (!Object.hasOwn(binding, "capacity")) {
    if ("capacity" in binding) throw new TypeError("Geographic capacity requires an own field.");
    return DEFAULT_CAPACITY;
  }
  const descriptor = Object.getOwnPropertyDescriptor(binding, "capacity");
  if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) throw new TypeError("Geographic capacity requires own data.");
  const normalized = normalizeGeoCapacity(descriptor.value);
  if (FIELDS.some(key => !Object.hasOwn(descriptor.value, key))) throw new TypeError("Stored geographic capacity requires resolved fields.");
  return normalized;
}

// The caller resolves native ownership; standalone paths have no binding.
export function validateGeoGraphicCapacity(binding, graphic) {
  if (binding === undefined) return graphic;
  const capacity = geoBindingCapacity(binding), declared = Object.hasOwn(binding, "capacity");
  let commands = 0;
  const visit = (type, properties) => {
    if (type === "weighted-blend") {
      for (const source of properties.sources ?? []) visit(source.type, source.properties);
    } else if (type === "path") {
      if (Object.hasOwn(properties, "maxCommands") !== declared || pathCommandCapacity(properties) !== capacity.maxPathCommands) {
        throw new TypeError("Geographic path capacity must match its exact native binding.");
      }
      commands += properties.commands?.length ?? 0;
      validatePathCommandCount(commands, "Geographic mark command count", capacity.maxPathCommands);
    }
  };
  if (graphic.items === undefined) visit(graphic.type, graphic.properties ?? {});
  else for (const item of graphic.items) visit(item.type ?? graphic.type, item.properties);
  return graphic;
}
