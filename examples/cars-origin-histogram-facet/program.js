import { chart } from "../../src/index.js";

export const DISPLACEMENT_BIN_BOUNDARIES = Object.freeze([
  50, 106.25, 162.5, 218.75, 275, 331.25, 387.5, 443.75, 500
]);

function completeHistogramRows(rows) {
  return rows.filter(row =>
    Number.isFinite(row.Displacement) &&
    Number.isFinite(row.Cylinders) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
}

export function createCarsOriginHistogramFacet(rows) {
  return chart()
    .createCanvas({
      width: 280,
      height: 240,
      margin: { top: 34, right: 18, bottom: 50, left: 52 }
    })
    .createData({ values: completeHistogramRows(rows) })
    .createBarMark()
    .encodeHistogram({
      field: "Displacement",
      binBoundaries: DISPLACEMENT_BIN_BOUNDARIES,
      xScale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "Cylinders",
      fieldType: "ordinal",
      scale: { palette: "reds" }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Displacement" } },
        y: { title: { text: "Count", offset: 39 } }
      },
      legend: false,
      grid: { horizontal: true, vertical: false }
    })
    .facet({
      field: "Origin",
      columns: 2,
      gap: 18,
      padding: 14,
      guides: { legend: "shared" }
    })
    .createTitle({
      text: "Displacement Distribution",
      subtitle: "Faceted by Origin",
      align: "center"
    });
}
