import {
  createDarkThemeScatterplot,
  darkThemeRows
} from "../../../examples/dark-theme-scatterplot/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createDarkThemeScatterplotPrimitive } from "./primitive.program.js";

export const darkThemeTarget = `chart()
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
  .applyTheme({ theme: "dark" });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "dark-theme-scatterplot",
    variant: "default",
    title: "Dark Theme Scatterplot",
    callChain: darkThemeTarget,
    artifact: { capability: "program-theme" },
    primitive: () => createDarkThemeScatterplotPrimitive(darkThemeRows),
    userFacing: () => createDarkThemeScatterplot(darkThemeRows),
    width: 640,
    height: 400,
    colors: ["#0f172a", "#e2e8f0"],
    regions: [
      {
        name: "plot-and-guides",
        x: 30,
        y: 50,
        width: 580,
        height: 320,
        minimumInkPixels: 750,
        colors: ["#0f172a", "#e2e8f0"]
      }
    ]
  })
]);
