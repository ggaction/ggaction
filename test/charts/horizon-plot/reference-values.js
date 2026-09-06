import { calculateHorizon } from "../../oracles/horizon.js";
export const bandColors = Object.freeze({
  negative: Object.freeze(["#fdc9b4", "#fa7051", "#970b13"]),
  positive: Object.freeze(["#cfe1f2", "#74b2d7", "#0a4a90"])
});
// Each successive band overlays the previous bands at alpha 0.6 on white.
// Literal references use C_out = 0.6 * C_band + 0.4 * C_previous.
export const translucentBandColors = Object.freeze({
  negative: Object.freeze(["#fedfd2", "#fc9c85", "#bf4540"]),
  positive: Object.freeze(["#e2edf7", "#a0cae4", "#467db2"])
});
import { rows } from "../../../examples/horizon-plot/data.js";
export { layout, rows, targets, revisions } from "../../../examples/horizon-plot/data.js";
export function referenceHorizon(variant) {
  return calculateHorizon(rows[variant], { xField: "time", yField: "value",
    bands: 3, baseline: variant === "baseline-style" ? 2 : 0 });
}
