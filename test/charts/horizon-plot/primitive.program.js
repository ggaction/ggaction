import { chart } from "../../../src/index.js";
import { layout, rows } from "./reference-values.js";

export function createSignedPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows.signed })
    .createAreaMark({ id: "horizon", data: "source" })
    .encodeHorizon({ target: "horizon", x: "time", y: "value" })
    .createGuides();
}

export function createTemporalPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows.temporal })
    .createAreaMark({ id: "horizon", data: "source" })
    .encodeHorizon({ target: "horizon", x: { field: "time", fieldType: "temporal",
      temporalUnit: "timestamp", scale: { nice: false } }, y: "value" })
    .createGuides();
}

export function createBaselineStylePrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows["baseline-style"] })
    .createAreaMark({ id: "horizon", data: "source" })
    .encodeHorizon({ target: "horizon", x: "time", y: "value", baseline: 2, bands: 2 })
    .editAreaMark({ target: "horizon", opacity: 0.8 })
    .createGuides()
    .editHorizon({ target: "horizon", bands: 3 })
    .editAreaMark({ target: "horizon", opacity: 0.6 });
}
