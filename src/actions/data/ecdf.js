import {
  deriveECDF,
  normalizeECDFTransform,
  resolveECDFTransform
} from "../../grammar/ecdf.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "groupBy", "weight", "missing", "as"
]);

export const materializeECDFData = derivedMaterializer(
  "materializeECDFData",
  "Materialize one empirical cumulative distribution dataset.",
  "ecdf",
  deriveECDF,
  resolveECDFTransform
);

export const createECDFData = derivedCreator(
  "createECDFData",
  "Create immutable empirical cumulative distribution values.",
  OPTIONS,
  "ECDF dataset id",
  "ECDF source dataset id",
  (args, id) => normalizeECDFTransform({
    field: args.field,
    groupBy: args.groupBy,
    weight: args.weight,
    missing: args.missing,
    as: args.as ?? {
      value: `__${id}_value`,
      cumulative: `__${id}_cumulative`,
      probability: `__${id}_probability`
    }
  }),
  "materializeECDFData"
);
