import { chart, hconcat, vconcat } from "../../src/index.js";
import { observations, boundaries, valueScale, countScale, panels } from "./fixture.js";

export function createMarginal(values = observations, {
  xDomain = valueScale.domain, yDomain = valueScale.domain,
  xBins = boundaries, yBins = boundaries, countDomain = countScale.domain
} = {}) {
  const xScale = { ...valueScale, domain: xDomain };
  const yScale = { ...valueScale, domain: yDomain };
  const counts = { ...countScale, domain: countDomain };
  // Branch one immutable source so every panel keeps the same typed row keys.
  const source = chart().createData({ id: "observations", values, keyField: "id" });
  const center = source.createCanvas(panels.center)
    .createScatterPlot({ id: "points", data: "observations", x: { field: "x", scale: xScale }, y: { field: "y", scale: yScale },
      point: { fill: "#2563eb", radius: 5 }, guides: false });
  const x = source.createCanvas(panels.x)
    .createBinData({ id: "bins", source: "observations", field: "x", boundaries: xBins, members: true })
    .createRectMark({ id: "histogram", data: "bins", fill: "#93c5fd", stroke: false })
    .encodeXRange({ lower: "x_start", upper: "x_end", scale: xScale })
    .encodeYRange({ lower: { datum: 0 }, upper: "count", scale: counts });
  const y = source.createCanvas(panels.y)
    .createBinData({ id: "bins", source: "observations", field: "y", boundaries: yBins, members: true })
    .createRectMark({ id: "histogram", data: "bins", fill: "#93c5fd", stroke: false })
    .encodeXRange({ lower: { datum: 0 }, upper: "count", scale: counts })
    .encodeYRange({ lower: "y_start", upper: "y_end", scale: yScale });
  const lower = hconcat({ id: "lower", programs: [{ id: "center", program: center }, { id: "y", program: y }], gap: 12 });
  return vconcat({ id: "marginal", programs: [{ id: "x", program: x }, { id: "lower", program: lower }], gap: 0, align: "start" });
}
