import { chart } from "../../../src/index.js";
import { layout } from "./fixture.js";
import { referenceFor } from "./reference-values.js";

// Independent normalization supplies ISO strings to the existing parser. The
// primitive remains independent of the public temporalUnit binding.
export function createTemporalInputPrimitive(variant) {
  const reference = referenceFor(variant);
  return chart()
    .createCanvas({ width: layout.width, height: layout.height, margin: layout.margin })
    .createData({ values: reference.normalizedRows })
    .createPointMark({ id: "events", fill: layout.color })
    .encodeX({ field: "isoTime", fieldType: "temporal", scale: { nice: false } })
    .encodeY({ field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } })
    .createGuides({
      axes: { x: { ticksAndLabels: { values: reference.timestamps }, title: { text: "Time (UTC)" } },
        y: { ticksAndLabels: { values: [0, 1, 2, 3] }, title: { text: "Value" } } },
      legend: false
    })
    .createTitle({ text: variant.title, subtitle: variant.subtitle,
      titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 13 } });
}
