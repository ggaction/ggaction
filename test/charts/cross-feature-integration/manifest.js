import {
  loadCars,
  loadFashionTsne,
  loadGapminder,
  loadNightingaleRose
} from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createCrossFeatureDashboard } from
  "../../../examples/cross-feature-dashboard/program.js";
import { createGapminderOuterGuideFacetPrimitives } from
  "../../gates/facet-resolution/primitive.program.js";
import { createGapminderOuterGuideFacet } from
  "../../gates/facet-resolution/public.program.js";
import { outerGuidesTarget } from "../../gates/facet-resolution/manifest.js";

import { createCrossFeatureDashboardPrimitives } from "./primitive.program.js";

const cars = loadCars();
const fashionRows = loadFashionTsne();
const gapminder = loadGapminder();
const nightingale = loadNightingaleRose();
const dashboardData = Object.freeze({ cars, fashionRows, nightingale });
const dashboardProbe = createCrossFeatureDashboardPrimitives(dashboardData);
const dashboardCanvas = dashboardProbe.graphicSpec.objects.canvas.properties;
const facetProbe = createGapminderOuterGuideFacetPrimitives(gapminder);
const facetCanvas = facetProbe.graphicSpec.objects.canvas.properties;
const artifact = Object.freeze({
  roadmap: "roadmap3",
  phase: "phase10",
  capability: "cross-feature-integration"
});

export const nestedDashboardTarget = `dashboard.replaceCompositionChild({
  target: "polarPair",
  program: revisedPolarPair
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cross-feature-dashboard",
    variant: "nested-polar-replacement",
    title: "Nested Polar Composition and Facet",
    callChain: nestedDashboardTarget,
    artifact,
    primitive: () => createCrossFeatureDashboardPrimitives(dashboardData),
    userFacing: () => createCrossFeatureDashboard(dashboardData),
    width: dashboardCanvas.width,
    height: dashboardCanvas.height,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [{
      name: "nested-dashboard",
      x: 0,
      y: 0,
      width: dashboardCanvas.width,
      height: dashboardCanvas.height,
      minimumInkPixels: 5000
    }]
  }),
  defineVisualVariant({
    chart: "gapminder-cluster-regression-facet",
    variant: "phase10-outer-guides",
    title: "Facet Outer Guides and Shared Legend",
    callChain: outerGuidesTarget,
    artifact,
    primitive: () => createGapminderOuterGuideFacetPrimitives(gapminder),
    userFacing: () => createGapminderOuterGuideFacet(gapminder),
    width: facetCanvas.width,
    height: facetCanvas.height,
    colors: ["#111827", "#450457", "#f8e722"],
    regions: [{
      name: "facet-and-guides",
      x: 0,
      y: 0,
      width: facetCanvas.width,
      height: facetCanvas.height,
      minimumInkPixels: 3500
    }]
  })
]);
