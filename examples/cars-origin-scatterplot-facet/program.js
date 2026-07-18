import { chart } from "../../src/index.js";

function completeScatterRows(rows) {
  const originOrder = [...new Set(rows.map(row => row.Origin).filter(
    value => typeof value === "string" && value.length > 0
  ))];
  const complete = rows.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    Number.isFinite(row.Cylinders) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  return originOrder.flatMap(origin =>
    complete.filter(row => row.Origin === origin)
  );
}

export function createCarsOriginScatterplotFacet(rows) {
  return chart()
    .createCanvas({
      width: 250,
      height: 230,
      margin: { top: 34, right: 16, bottom: 48, left: 52 }
    })
    .createData({ values: completeScatterRows(rows) })
    .createPointMark()
    .encodeX({
      field: "Horsepower",
      scale: { nice: true, zero: false }
    })
    .encodeY({
      field: "Miles_per_Gallon",
      scale: { nice: true, zero: false }
    })
    .encodeRadius({ value: 2.5 })
    .encodeColor({
      field: "Cylinders",
      fieldType: "ordinal",
      scale: { domain: [8, 4, 6, 3, 5], palette: "reds" }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon", offset: 39 } }
      },
      legend: false
    })
    .facet({ field: "Origin", guides: { legend: "shared" } })
    .createTitle({
      text: "Horsepower and Fuel Economy",
      subtitle: "Faceted by Origin",
      align: "center"
    })
    .editFacetHeaders({ fontSize: 13, fontWeight: 700, offset: 10 });
}
