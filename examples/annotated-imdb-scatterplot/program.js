import { chart } from "../../src/index.js";

export function createAnnotatedImdbScatterplot(rows) {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 64, right: 130, bottom: 66, left: 70 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "Released_Year", fieldType: "temporal" })
    .encodeY({
      field: "IMDB_Rating",
      scale: { nice: true, zero: false }
    })
    .encodeRadius({ value: 3.5 })
    .createTextMark({
      fontSize: 10,
      fill: "#334155",
      dx: 7,
      dy: -6,
      align: "left",
      baseline: "bottom"
    })
    .encodeText({ field: "Series_Title" })
    .createGuides({
      axes: {
        x: { title: { text: "Released Year" } },
        y: { title: { text: "IMDb Rating" } }
      }
    })
    .createTitle({
      text: "Selected Highly Rated Films",
      align: "center"
    });
}
