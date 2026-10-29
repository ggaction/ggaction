import { chart } from "../../src/index.js";
import { canvas, ranges, observations, amountScale } from "./fixture.js";

export function createBullet(values = observations, {
  referenceRanges = ranges, domain = amountScale.domain, metric = "Revenue"
} = {}) {
  return chart().createCanvas(canvas)
    .createData({ id: "reference", values: referenceRanges, keyField: "id" })
    .createRectMark({ id: "ranges", data: "reference", stroke: false })
    .encodeXRange({ lower: "lower", upper: "upper", scale: { ...amountScale, domain } })
    .encodeColor({ field: "level", fieldType: "nominal",
      scale: { domain: ["Low", "Middle", "High"], range: ["#e2e8f0", "#cbd5e1", "#94a3b8"] } })
    .createData({ id: "observed", values, keyField: "id" })
    .createBarMark({ id: "measure", data: "observed", fill: "#2563eb", stroke: false })
    .encodeY({ field: "metric", fieldType: "nominal", scale: { id: "metric", type: "band", domain: [metric], padding: 0 } })
    .encodeX({ field: "actual", aggregate: "sum", scale: { id: "amount" } })
    .encodeBarWidth({ band: 0.35 })
    .createRuleMark({ id: "target", data: "observed", stroke: "#0f172a", strokeWidth: 3 })
    .encodeX({ field: "target", fieldType: "quantitative", scale: { id: "amount" } })
    .createMarkLabels({ id: "measure-label", source: "measure", content: "value", fill: "#ffffff", placement: { anchor: "center" } })
    .createTitle({ text: `${metric}: actual and target`, titleStyle: { fontSize: 14 } });
}
