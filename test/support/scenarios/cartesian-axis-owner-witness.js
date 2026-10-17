// Exercise named resources against the existing chart's actual resolved scales.
// Every flow removes its own guides so the caller retains its original marks.
const BASELINES = ["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"];
const ALIGNS = ["left", "center", "right"];
function interiorValues(scale) {
  if (["band", "point", "ordinal"].includes(scale.type)) return scale.domain.slice(0, 3);
  const first = Number(scale.domain[0]), last = Number(scale.domain.at(-1));
  return [0.25, 0.5, 0.75].map(fraction => first + (last - first) * fraction);
}
export function exerciseCartesianAxisOwners(program, { observe } = {}) {
  const x = interiorValues(program.resolvedScales.x), y = interiorValues(program.resolvedScales.y);
  let next = program.createScale({ id: "axisSecondary", type: "linear", domain: [0, 1] });
  for (const [index, baseline] of BASELINES.entries()) {
    const align = ALIGNS[index % ALIGNS.length];
    const ticks = { length: 6, strokeDash: [2, 2], strokeDashMap: [{ value: x[0], strokeDash: [] }] };
    const yTicks = { ...ticks, strokeDashMap: [{ value: y[0], strokeDash: [] }] };
    const labels = { fontSize: 10, offset: 18, align, overlap: "allow", maxWidth: 120, wrap: "word" };
    const title = { text: "Source", offset: 150, alongOffset: 2, align, baseline };
    const xAxis = { id: "sourceHorizontal", scale: "x", position: "bottom", offset: 2,
      line: { color: "#334155", lineWidth: 1 },
      ticksAndLabels: { values: x, ticks, labels }, title };
    const yAxis = { id: "sourceQuantity", scale: "y", position: "left", offset: 2,
      line: { color: "#334155", lineWidth: 1 },
      ticksAndLabels: { values: y, ticks: yTicks, labels }, title: { ...title, text: "Quantity", rotation: -90 } };
    next = next.createXAxis(xAxis).removeXAxis({ target: "sourceHorizontal" })
      .createYAxis(yAxis).removeYAxis({ target: "sourceQuantity" })
      .createGuides({ axes: { coordinate: { id: "main", type: "cartesian" }, x: xAxis, y: yAxis }, grid: false, legend: false })
      .removeXAxis({ target: "sourceHorizontal" }).removeYAxis({ target: "sourceQuantity" })
      .createAxes({ coordinate: { id: "main", type: "cartesian" }, x: [xAxis], y: [yAxis,
      { id: "sourceShare", scale: "axisSecondary", position: "right", offset: 2,
        ticksAndLabels: { values: [0.25, 0.5, 0.75], labels: { fontSize: 10 } }, title: { text: "Share", offset: 150 } }] })
      .editXAxis({ target: "sourceHorizontal", line: false })
      .editYAxis({ target: "sourceQuantity", line: false })
      .createXAxisLine({ target: "sourceHorizontal" }).createYAxisLine({ target: "sourceQuantity" })
      .editXAxis({ target: "sourceHorizontal", ticks: false })
      .editYAxis({ target: "sourceQuantity", ticks: false })
      .createXAxisTicks({ target: "sourceHorizontal", values: x, ...ticks })
      .createYAxisTicks({ target: "sourceQuantity", values: y, ...yTicks })
      .editXAxis({ target: "sourceHorizontal", labels: false })
      .editYAxis({ target: "sourceQuantity", labels: false })
      .createXAxisLabels({ target: "sourceHorizontal", values: x, ...labels })
      .createYAxisLabels({ target: "sourceQuantity", values: y, ...labels })
      .editXAxis({ target: "sourceHorizontal", title: false })
      .editYAxis({ target: "sourceQuantity", title: false })
      .createXAxisTitle({ target: "sourceHorizontal", ...title })
      .createYAxisTitle({ target: "sourceQuantity", ...title, text: "Quantity", rotation: -90 })
      .editXAxis({ target: "sourceHorizontal", ticksAndLabels: false })
      .editYAxis({ target: "sourceQuantity", ticksAndLabels: false })
      .createXAxisTicksAndLabels({ target: "sourceHorizontal", values: x, ticks, labels })
      .createYAxisTicksAndLabels({ target: "sourceQuantity", values: y, ticks: yTicks, labels })
      .editXAxis({ target: "sourceHorizontal", offset: 4, ticksAndLabels: { values: x, ticks, labels }, title })
      .editYAxis({ target: "sourceQuantity", offset: 4, ticksAndLabels: { values: y, ticks: yTicks, labels }, title: { ...title, rotation: -90 } })
      .editXAxisLine({ target: "sourceHorizontal", color: "#475569" })
      .editYAxisLine({ target: "sourceQuantity", color: "#475569" })
      .editXAxisTicks({ target: "sourceHorizontal", ...ticks })
      .editYAxisTicks({ target: "sourceQuantity", ...yTicks })
      .editXAxisLabels({ target: "sourceHorizontal", ...labels })
      .editYAxisLabels({ target: "sourceQuantity", ...labels })
      .editXAxisTitle({ target: "sourceHorizontal", ...title })
      .editYAxisTitle({ target: "sourceQuantity", ...title, rotation: -90 })
      .editXAxisTicksAndLabels({ target: "sourceHorizontal", values: x, ticks, labels })
      .editYAxisTicksAndLabels({ target: "sourceQuantity", values: y, ticks: yTicks, labels })
      .createGrid({ horizontal: { scale: "y", coordinate: "main", values: y, strokeDashMap: yTicks.strokeDashMap },
        vertical: { scale: "x", coordinate: "main", values: x, strokeDashMap: ticks.strokeDashMap } })
      .editGrid({ horizontal: { strokeDashMap: "auto" }, vertical: { strokeDashMap: "auto" } })
      .removeGrid({ horizontal: true, vertical: true })
      .createHorizontalGrid({ scale: "y", coordinate: "main", values: y, strokeDashMap: yTicks.strokeDashMap })
      .createVerticalGrid({ scale: "x", coordinate: "main", values: x, strokeDashMap: ticks.strokeDashMap })
      .editHorizontalGrid({ strokeDashMap: "auto" }).editVerticalGrid({ strokeDashMap: "auto" })
      .removeGrid({ horizontal: true, vertical: true });
    observe?.(next, { baseline, align });
    next = next.removeXAxis({ target: "sourceHorizontal" })
      .removeYAxis({ target: "sourceQuantity" }).removeYAxis({ target: "sourceShare" });
  }
  return next.removeScale({ id: "axisSecondary" });
}
