import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findSemanticScale } from "../../selectors/scales.js";

const OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "interpolate", "midpoint",
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
      if (typeof this.editScale !== "function") {
        throw new Error("Color scale type transitions require the Full ChartProgram; use a new scale id in Basic.");
      }
      return this.editScale(args);
    }
    let next = this;
    if (existing?.midpoint !== undefined && args.midpoint === undefined) {
      next = next.editSemantic({ property: `scale[${args.id}].midpoint`, remove: true });
    }
    for (const property of [
      "type", "domain", "range", "interpolate", "midpoint", "clamp", "reverse", "unknown"
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
