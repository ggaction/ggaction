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
  "level",
  "as"
]);

export const materializeIntervalData = derivedMaterializer(
  "materializeIntervalData",
  "Materialize one grouped interval-summary dataset.",
  "interval",
  deriveInterval
);

export const createIntervalData = derivedCreator(
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
      level: args.level,
      as
    });
  },
  "materializeIntervalData"
);
