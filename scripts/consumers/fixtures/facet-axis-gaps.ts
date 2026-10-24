import { chart, hconcat, vconcat, type FacetGap, type FacetOptions, type FacetGridOptions, type RepeatChartsOptions } from "ggaction";

const pair: FacetGap = { x: 12, y: 24 } as const;
const scalar: FacetGap = 16;
const unit = chart().createCanvas().createData({ values: [{ group: "a", row: "r", column: "c", x: 1, y: 2 }] })
  .createScatterPlot({ x: "x", y: "y", guides: false });
for (const spacing of ["canvas", "plot", "content"] as const) {
  const facet: FacetOptions = { field: "group", gap: pair, spacing };
  const repeat: RepeatChartsOptions = { channel: "y", fields: ["x", "y"], gap: pair, spacing };
  unit.facet(facet).editCompositionLayout({ gap: scalar }).editCompositionLayout({ gap: pair });
  unit.repeatCharts(repeat);
}
const grid: FacetGridOptions = { rows: { field: "row" }, columns: { field: "column" }, gap: pair, spacing: "plot" };
unit.facetGrid(grid);
hconcat({ programs: [unit, unit], gap: 16 });
vconcat({ programs: [unit, unit], gap: 16 });
// @ts-expect-error Both axes are required.
const partial: FacetGap = { x: 12 };
// @ts-expect-error Pair values must be numeric.
const nonnumeric: FacetGap = { x: 12, y: "24" };
// @ts-expect-error Pair objects are closed.
const extended: FacetGap = { x: 12, y: 24, z: 0 };
// @ts-expect-error Pairs are immutable values.
pair.x = 30;
// @ts-expect-error Horizontal concat continues to accept only numeric gaps.
hconcat({ programs: [unit, unit], gap: pair });
// @ts-expect-error Vertical concat continues to accept only numeric gaps.
vconcat({ programs: [unit, unit], gap: pair });
void [partial, nonnumeric, extended];
