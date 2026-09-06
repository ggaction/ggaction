import { chart } from "../../src/index.js";

export const darkThemeRows = Object.freeze([
  Object.freeze({ category: "A", value: 4, group: "North" }),
  Object.freeze({ category: "B", value: 7, group: "South" }),
  Object.freeze({ category: "C", value: 5, group: "North" }),
  Object.freeze({ category: "D", value: 9, group: "South" })
]);

export function createDarkThemeScatterplot(rows = darkThemeRows) {
  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 72, right: 170, bottom: 60, left: 70 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "group" })
    .encodeRadius({ value: 5 })
    .createGuides({
      axes: {
        x: { title: { text: "Category" } },
        y: { title: { text: "Value" } }
      },
      legend: { channels: ["color"] }
    })
    .createTitle({
      text: "Quarterly observations",
      subtitle: "Dark program theme"
    })
    .applyTheme({ theme: "dark" });
}
