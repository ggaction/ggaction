import { action } from "../../core/action.js";
import { validateOptions } from "./shared.js";

const HISTOGRAM_OPTIONS = Object.freeze([
  "field", "target", "coordinate", "maxBins", "binStep", "binBoundaries",
  "stack", "xScale", "yScale"
]);

const encodeHistogram = action(
  {
    op: "encodeHistogram",
    description: "Encode a binned count/zero-stack histogram."
  },
  function (args = {}) {
    validateOptions(args, HISTOGRAM_OPTIONS, "encodeHistogram");
    const binOptions = ["maxBins", "binStep", "binBoundaries"].filter(
      key => Object.hasOwn(args, key)
    );
    if (binOptions.length > 1) {
      throw new Error(
        "encodeHistogram accepts only one of maxBins, binStep, or binBoundaries."
      );
    }
    const bin = Object.hasOwn(args, "binStep")
      ? { step: args.binStep }
      : Object.hasOwn(args, "binBoundaries")
        ? { boundaries: args.binBoundaries }
        : { maxBins: args.maxBins ?? 10 };
    const x = {
      field: args.field,
      bin
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
