import { chart, type AxisTitleOffset } from "ggaction";
import { chart as basicChart, type AxisTitleOffset as BasicOffset } from "ggaction/basic";
const offset: AxisTitleOffset = { from: "labels", gap: 5 };
const basicOffset: BasicOffset = offset;
chart().createYAxis({ title: { offset } }).editYAxisTitle({ offset: 52 });
chart().createGuides({ axes: { x: { title: { offset } } } });
chart().editYAxis({ target: "measure", title: { offset } });
basicChart().createAxes({ x: { title: { offset: basicOffset } } });
// @ts-expect-error Exact relative origin.
chart().createYAxisTitle({ offset: { from: "plot", gap: 5 } });
// @ts-expect-error The gap is required.
chart().editYAxisTitle({ offset: { from: "labels" } });
// @ts-expect-error This input is Cartesian title-only.
chart().createThetaAxisTitle({ offset });
// @ts-expect-error The frame offset remains numeric.
basicChart().createYAxis({ offset });
