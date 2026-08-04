import { emptyPositionPolicy } from "./common.js";

export function resolveTickPositionPolicy({ args, fieldType }) {
  if (!["quantitative", "temporal", "ordinal", "nominal"].includes(fieldType)) {
    throw new Error(
      "Tick position encoding requires quantitative, temporal, ordinal, or nominal fields."
    );
  }
  if (args.aggregate !== undefined) {
    throw new Error("Tick position encoding does not support aggregate.");
  }
  if (args.bin !== undefined) {
    throw new Error("Tick position encoding does not support bin.");
  }
  if (args.stack !== undefined) {
    throw new Error("Tick position encoding does not support stack.");
  }
  return emptyPositionPolicy();
}
