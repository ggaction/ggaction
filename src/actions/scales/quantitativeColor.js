import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findSemanticScale } from "../../selectors/scales.js";

const OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "interpolate",
  "clamp",
  "reverse",
  "unknown"
]);

export const setQuantitativeColorScale = action(
  {
    op: "setQuantitativeColorScale",
    description: "Create or update an internal quantitative color scale."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "setQuantitativeColorScale");
    if (!["sequential", "quantize", "quantile", "threshold"].includes(args.type)) {
      throw new Error(`Unsupported quantitative color scale type "${args.type}".`);
    }
    const existing = findSemanticScale(this, args.id);
    if (existing !== undefined && existing.type !== args.type) {
      throw new Error(
        `Scale "${args.id}" cannot change type from "${existing.type}" to "${args.type}".`
      );
    }
    let next = this;
    for (const property of [
      "type", "domain", "range", "interpolate", "clamp", "reverse", "unknown"
    ]) {
      if (!Object.hasOwn(args, property)) continue;
      if (existing?.[property] === args[property]) continue;
      next = next.editSemantic({
        property: `scale[${args.id}].${property}`,
        value: args[property]
      });
    }
    return next;
  }
);
