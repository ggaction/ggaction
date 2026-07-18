import { chart } from "../../src/index.js";

export function createJobsHorizontalGroupedBar(rows) {
  return chart()
    .createCanvas({
      width: 760,
      height: 640,
      margin: { top: 82, right: 140, bottom: 72, left: 82 }
    })
    .createData({ values: rows })
    .createBarMark()
    .encodeX({
      field: "perc",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeY({ field: "year", fieldType: "ordinal" })
    .encodeColor({
      field: "sex",
      layout: "group",
      scale: { palette: "tableau10" }
    })
    .encodeBarWidth({ band: 0.72 })
    .createGuides({
      axes: {
        x: { title: { text: "Mean workforce share", offset: 48 } },
        y: { title: { text: "Year", offset: 58 } }
      },
      grid: { horizontal: false, vertical: true },
      legend: { title: "Sex" }
    })
    .createTitle({
      text: "Workforce Share by Year and Sex",
      subtitle: "Mean occupation share in the jobs dataset",
      align: "center",
      offset: -1,
      titleStyle: { fontSize: 20, fontWeight: 700 },
      subtitleStyle: { fontSize: 12, color: "#475569" }
    });
}
