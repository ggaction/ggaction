import { emptyPositionPolicy } from "./common.js";

export function resolveRulePositionPolicy({ args, fieldType }) {
  if (!["quantitative", "temporal", "ordinal", "nominal"].includes(fieldType)) {
    throw new Error("Rule position encoding requires a supported field type.");
  }
  if (args.aggregate !== undefined) {
    throw new Error("Rule position encoding does not support aggregate.");
  }
  if (args.bin !== undefined) {
    throw new Error("Rule position encoding does not support bin.");
  }
  if (args.stack !== undefined) {
    throw new Error("Rule position encoding does not support stack.");
  }
  return emptyPositionPolicy();
}
