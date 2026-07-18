import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createGapminderRegressionFacetPrimitives } from
  "./primitive.program.js";
import { createGapminderOuterGuideFacetPrimitives } from
  "./primitive.program.js";
import { createGapminderRegressionFacetValues } from
  "./reference-values.js";
import { OUTER_GUIDE_CLUSTERS, OUTER_GUIDE_LAYOUT } from
  "./reference-values.js";
import { createGapminderRegressionFacet } from "./public.program.js";

const rows = loadGapminder();
const shared = createGapminderRegressionFacetValues(rows);
const outer = createGapminderRegressionFacetValues(rows, {
  xResolution: "independent",
  clusters: OUTER_GUIDE_CLUSTERS
});
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
  .editLineMark({ target: "pointRegressionLines", stroke: "#111827" })
  .createGuides({
    axes: {
      x: {
        line: { color: "#64748b", lineWidth: 1.2 },
        ticksAndLabels: {
          ticks: { color: "#64748b", lineWidth: 1, length: 4 },
          labels: { offset: 9, fontSize: 9.5 }
        },
        title: {
          text: "Fertility", offset: 40, color: "#0f172a", fontSize: 11, fontWeight: 500
        }
      },
      y: {
        line: { color: "#64748b", lineWidth: 1.2 },
        ticksAndLabels: {
          ticks: { color: "#64748b", lineWidth: 1, length: 4 },
          labels: { offset: 8, fontSize: 9.5 }
        },
        title: {
          text: "Life expectancy", offset: 45, color: "#0f172a", fontSize: 11, fontWeight: 500
        }
      }
    },
    legend: false
  })`;

export const sharedScalesTarget = `${baseTarget}
  .facet({
    field: "cluster",
    columns: 3,
    gap: 20,
    padding: { top: 25, right: 14, bottom: 14, left: 14 }
  })
  .editFacetHeaders({ fontSize: 12.5, fontWeight: 700 })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression recomputed by cluster · shared scales",
    align: "center",
    offset: 1.5,
    gap: 8.5,
    titleStyle: { fontSize: 19 },
    subtitleStyle: { fontSize: 12 }
  });`;

export const independentXTarget = `${baseTarget}
  .facet({
    field: "cluster",
    columns: 3,
    gap: 20,
    padding: { top: 25, right: 14, bottom: 14, left: 14 },
    scales: { x: "independent", y: "shared", color: "shared" }
  })
  .editFacetHeaders({ fontSize: 12.5, fontWeight: 700 })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression recomputed by cluster · independent fertility scales",
    align: "center",
    offset: 1.5,
    gap: 8.5,
    titleStyle: { fontSize: 19 },
    subtitleStyle: { fontSize: 12 }
  });`;

export const outerGuidesTarget = `chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 36, right: 18, bottom: 50, left: 58 }
  })
  .createData({ values: rows })
  .filterData({ field: "cluster", oneOf: [0, 3, 4, 1, 5] })
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
  .editLineMark({ target: "pointRegressionLines", stroke: "#111827" })
  .createGuides({
    axes: {
      x: {
        line: { color: "#64748b", lineWidth: 1.2 },
        ticksAndLabels: {
          ticks: { color: "#64748b", lineWidth: 1, length: 4 },
          labels: { offset: 9, fontSize: 9.5 }
        },
        title: {
          text: "Fertility", offset: 40, color: "#0f172a", fontSize: 11, fontWeight: 500
        }
      },
      y: {
        line: { color: "#64748b", lineWidth: 1.2 },
        ticksAndLabels: {
          ticks: { color: "#64748b", lineWidth: 1, length: 4 },
          labels: { offset: 8, fontSize: 9.5 }
        },
        title: {
          text: "Life expectancy", offset: 45, color: "#0f172a", fontSize: 11, fontWeight: 500
        }
      }
    },
    legend: { channels: ["color"] }
  })
  .facet({
    field: "cluster",
    columns: 3,
    gap: 20,
    padding: { top: 25, right: 14, bottom: 14, left: 14 },
    scales: { x: "independent", y: "shared", color: "shared" },
    guides: { axes: "outer", legend: "shared" }
  })
  .editFacetHeaders({ fontSize: 12.5, fontWeight: 700 })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression by cluster · outer axes · shared population legend",
    align: "center",
    offset: 1.5,
    gap: 8.5,
    titleStyle: { fontSize: 19 },
    subtitleStyle: { fontSize: 12 }
  });`;

const regions = shared.cells.map(cell => ({
  name: `cluster-${cell.cluster}`,
  x: cell.x + 58,
  y: cell.y + 36,
  width: 204,
  height: 154,
  minimumInkPixels: 80
}));
const outerWidth = outer.width + OUTER_GUIDE_LAYOUT.legendGap +
  OUTER_GUIDE_LAYOUT.legendWidth;
const outerRegions = [
  ...outer.cells.map(cell => ({
    name: `cluster-${cell.cluster}`,
    x: cell.x + 58,
    y: cell.y + 36,
    width: 204,
    height: 154,
    minimumInkPixels: 80
  })),
  {
    name: "population-legend",
    x: outer.width + OUTER_GUIDE_LAYOUT.legendGap,
    y: outer.plot.y + (outer.plot.height - OUTER_GUIDE_LAYOUT.gradientHeight) / 2 - 22,
    width: 82,
    height: OUTER_GUIDE_LAYOUT.gradientHeight + 24,
    minimumInkPixels: 120
  }
];

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-cluster-regression-facet",
    variant: "shared-scales",
    title: "Cluster Regression Facet · Shared Scales",
    callChain: sharedScalesTarget,
    artifact,
    primitive: () => createGapminderRegressionFacetPrimitives(rows),
    userFacing: () => createGapminderRegressionFacet(rows),
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
    userFacing: () => createGapminderRegressionFacet(rows, {
      xResolution: "independent"
    }),
    width: shared.width,
    height: shared.height,
    colors: ["#111827"],
    regions
  }),
  defineVisualVariant({
    chart: "gapminder-cluster-regression-facet",
    variant: "outer-guides",
    title: "Cluster Regression Facet · Outer Axes and Shared Legend",
    callChain: outerGuidesTarget,
    artifact,
    primitive: () => createGapminderOuterGuideFacetPrimitives(rows),
    width: outerWidth,
    height: outer.height,
    colors: ["#111827", "#450457", "#f8e722"],
    regions: outerRegions
  })
]);
