import { action } from "../../core/action.js";
import { validateNonEmptyString } from "../../core/validation.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeGuides,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "field", "maxBins", "binStep",
  "binBoundaries", "stack", "xScale", "yScale", "color", "bar", "guides"
]);
const BAR_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth"
]);
const HISTOGRAM_OPTIONS = Object.freeze([
  "maxBins", "binStep", "binBoundaries", "stack", "xScale", "yScale"
]);

export const createHistogram = action(
  {
    op: "createHistogram",
    description: "Create a binned count histogram from existing chart data."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createHistogram");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "histogram",
      operation: "createHistogram"
    });
    const data = resolveFacadeData(this, args.data, "createHistogram");
    const field = validateNonEmptyString(args.field, "createHistogram field");
    const bar = normalizeAppearance(args.bar, BAR_OPTIONS, "createHistogram bar");
    const color = normalizeEncoding(args.color, "createHistogram color");
    const guides = normalizeGuides(args.guides, "createHistogram");
    const histogram = Object.fromEntries(
      HISTOGRAM_OPTIONS
        .filter(key => Object.hasOwn(args, key))
        .map(key => [key, args[key]])
    );

    let next = this
      .createBarMark({ id, data, ...bar })
      .encodeHistogram({
        field,
        target: id,
        ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
        ...histogram
      });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    return applyFacadeGuides(next, guides);
  }
);
