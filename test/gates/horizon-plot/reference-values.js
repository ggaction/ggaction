import { calculateHorizon } from "../../oracles/horizon.js";
export const layout = Object.freeze({ width: 1000, height: 700, margin: 150 });
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
const frozenRows = rows => Object.freeze(rows.map(Object.freeze));
export const rows = Object.freeze({
  signed: frozenRows([
    { time: 0, value: -4 }, { time: 1, value: -3 }, { time: 2, value: -1 },
    { time: 3, value: 0 }, { time: 4, value: 1 }, { time: 5, value: 3 }, { time: 6, value: 4 }
  ]),
  temporal: frozenRows([
    { time: 1000, value: -4 }, { time: 1100, value: -3 }, { time: 1300, value: -1 },
    { time: 1500, value: 0 }, { time: 1700, value: 1 }, { time: 1900, value: 3 }, { time: 2000, value: 4 }
  ]),
  "baseline-style": frozenRows([
    { time: 0, value: -2 }, { time: 1, value: -1 }, { time: 2, value: 1 },
    { time: 3, value: 2 }, { time: 4, value: 3 }, { time: 5, value: 5 }, { time: 6, value: 6 }
  ])
});
export const targets = Object.freeze({
  signed: Object.freeze({ id: "horizon", x: "time", y: "value" }),
  temporal: Object.freeze({ id: "horizon", x: Object.freeze({ field: "time", fieldType: "temporal",
    temporalUnit: "timestamp", scale: Object.freeze({ nice: false }) }), y: "value" }),
  "baseline-style": Object.freeze({ id: "horizon", x: "time", y: "value", baseline: 2, bands: 2,
    area: Object.freeze({ opacity: 0.8 }) })
});
export const revisions = Object.freeze({
  "baseline-style": Object.freeze([
    Object.freeze({ op: "editHorizon", args: Object.freeze({ target: "horizon", bands: 3 }) }),
    Object.freeze({ op: "editAreaMark", args: Object.freeze({ target: "horizon", opacity: 0.6 }) })
  ])
});
export function referenceHorizon(variant) {
  return calculateHorizon(rows[variant], { xField: "time", yField: "value",
    bands: 3, baseline: variant === "baseline-style" ? 2 : 0 });
}
