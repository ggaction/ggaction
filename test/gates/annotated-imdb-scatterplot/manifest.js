import { loadImdbTop1000 } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createAnnotatedImdbPrimitives } from "./primitive.program.js";
import { createAnnotatedImdbValues } from "./reference-values.js";

const rows = loadImdbTop1000();
const values = createAnnotatedImdbValues(rows);

export const annotatedImdbTarget = `chart()
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
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "annotated-imdb-scatterplot",
    variant: "default",
    title: "Annotated IMDb Scatterplot",
    callChain: annotatedImdbTarget,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase9",
      capability: "text-annotation"
    },
    primitive: () => createAnnotatedImdbPrimitives(rows),
    width: values.width,
    height: values.height,
    colors: ["#4c78a8", "#334155"],
    regions: [
      {
        name: "annotated-plot",
        x: values.bounds.x,
        y: values.bounds.y,
        width: values.bounds.width + 105,
        height: values.bounds.height,
        minimumInkPixels: 900,
        colors: ["#4c78a8", "#334155"]
      }
    ]
  })
]);
