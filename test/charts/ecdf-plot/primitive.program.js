import { chart } from "../../../src/index.js";
import { ecdfRows } from "../../../examples/ecdf-plot/program.js";

export function createECDFPrimitive(values = ecdfRows) {
  return chart()
    .createCanvas({ width: 520, height: 340, margin: 55 })
    .createData({ id: "data", values })
    .createECDFData({
      id: "ecdfECDFData",
      source: "data",
      field: "value",
      groupBy: ["group"],
      weight: "weight",
      as: {
        value: "__ecdfECDFData_value",
        cumulative: "__ecdfECDFData_cumulative",
        probability: "__ecdfECDFData_probability"
      }
    })
    .createLineMark({ id: "ecdf", data: "ecdfECDFData", curve: "step-after" })
    .encodeX({
      target: "ecdf", field: "__ecdfECDFData_value", fieldType: "quantitative",
      scale: { id: "ecdfValue", zero: false, nice: false }
    })
    .encodeY({
      target: "ecdf", field: "__ecdfECDFData_probability", fieldType: "quantitative",
      scale: { id: "ecdfProbability", domain: [0, 1], zero: true, nice: false }
    })
    .encodeGroup({ target: "ecdf", fields: ["group"] })
    .encodeColor({ target: "ecdf", field: "group" })
    .createMarkLabels({
      id: "ecdfLabel", source: "ecdf", field: "__ecdfECDFData_probability", dx: 10
    });
}
