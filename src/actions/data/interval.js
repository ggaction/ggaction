import {
  deriveInterval,
  normalizeIntervalTransform
} from "../../grammar/interval.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id",
  "source",
  "field",
  "groupBy",
  "center",
  "extent",
  "method",
  "level",
  "missing",
  "as"
]);

export const materializeIntervalData = /* @__PURE__ */ derivedMaterializer(
  "materializeIntervalData",
  "Materialize one grouped interval-summary dataset.",
  "interval",
  deriveInterval
);

export const createIntervalData = /* @__PURE__ */ derivedCreator(
  "createIntervalData",
  "Create immutable grouped interval-summary values.",
  OPTIONS,
  "Interval dataset id",
  "Source dataset id",
  (args, id) => {
    const as = args.as ?? {
      center: `__${id}_center`,
      lower: `__${id}_lower`,
      upper: `__${id}_upper`
    };
    return normalizeIntervalTransform({
      field: args.field,
      groupBy: args.groupBy,
      center: args.center,
      extent: args.extent,
      method: args.method,
      level: args.level,
      missing: args.missing,
      as
    });
  },
  "materializeIntervalData"
);
