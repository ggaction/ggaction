import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createGapminderRegressionFacetPrimitives } from
  "./primitive.program.js";
import { createGapminderRegressionFacetValues } from
  "./reference-values.js";

const rows = loadGapminder();
const shared = createGapminderRegressionFacetValues(rows);
const artifact = Object.freeze({
  roadmap: "roadmap3",
  phase: "phase8",
  capability: "facet-resolution"
});

const baseTarget = `chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 36, right: 18, bottom: 50, left: 58 }
  })
  .createData({ values: rows })
  .createPointMark({ opacity: 0.35 })
  .encodeX({
    field: "fertility",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "life_expect",
    scale: { nice: true, zero: false }
  })
  .encodeRadius({ value: 2.5 })
  .encodeColor({
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .createRegression({
    band: { opacity: 0.14 },
    line: { strokeWidth: 2.5 }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    legend: false
  })`;

export const sharedScalesTarget = `${baseTarget}
  .facet({ field: "cluster", columns: 3 })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression recomputed by cluster · shared scales"
  });`;

export const independentXTarget = `${baseTarget}
  .facet({
    field: "cluster",
    columns: 3,
    scales: { x: "independent", y: "shared", color: "shared" }
  })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression recomputed by cluster · independent fertility scales"
  });`;

const regions = shared.cells.map(cell => ({
  name: `cluster-${cell.cluster}`,
  x: cell.x + 58,
  y: cell.y + 36,
  width: 204,
  height: 154,
  minimumInkPixels: 80
}));

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-cluster-regression-facet",
    variant: "shared-scales",
    title: "Cluster Regression Facet · Shared Scales",
    callChain: sharedScalesTarget,
    artifact,
    primitive: () => createGapminderRegressionFacetPrimitives(rows),
    width: shared.width,
    height: shared.height,
    colors: ["#111827"],
    regions
  }),
  defineVisualVariant({
    chart: "gapminder-cluster-regression-facet",
    variant: "independent-x",
    title: "Cluster Regression Facet · Independent X",
    callChain: independentXTarget,
    artifact,
    primitive: () => createGapminderRegressionFacetPrimitives(rows, {
      xResolution: "independent"
    }),
    width: shared.width,
    height: shared.height,
    colors: ["#111827"],
    regions
  })
]);
