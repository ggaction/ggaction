import { action } from "../../core/action.js";
import { validateOptions } from "./shared.js";

const HISTOGRAM_OPTIONS = Object.freeze([
  "field", "target", "coordinate", "maxBins", "stack", "xScale", "yScale"
]);

const encodeHistogram = action(
  {
    op: "encodeHistogram",
    description: "Encode a binned count/zero-stack histogram."
  },
  function (args = {}) {
    validateOptions(args, HISTOGRAM_OPTIONS, "encodeHistogram");
    const x = {
      field: args.field,
      bin: { maxBins: args.maxBins ?? 10 }
    };
    const y = { stack: args.stack ?? "zero" };

    for (const key of ["target", "coordinate"]) {
      if (Object.hasOwn(args, key)) x[key] = args[key];
    }
    if (Object.hasOwn(args, "target")) y.target = args.target;
    if (Object.hasOwn(args, "xScale")) x.scale = args.xScale;
    if (Object.hasOwn(args, "yScale")) y.scale = args.yScale;

    return this.encodeX(x).encodeY(y);
  }
);

export function registerHistogramEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeHistogram = encodeHistogram;
}
