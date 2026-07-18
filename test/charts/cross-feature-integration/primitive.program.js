import { hconcat, vconcat } from "../../../src/index.js";
import { createCarsOriginScatterplotFacetPrimitives } from
  "../../charts/cars-origin-scatterplot-facet/primitive.program.js";
import {
  createCarsOriginDonutPrimitives,
  createNightingaleRosePrimitives
} from "../../charts/polar-arcs/primitive.program.js";
import { createFashionTsnePolarPointPrimitives } from
  "../../charts/polar-points/primitive.program.js";

export function createCrossFeatureDashboardPrimitiveState({
  cars,
  nightingale,
  fashionRows
}) {
  const donut = createCarsOriginDonutPrimitives(cars);
  const rose = createNightingaleRosePrimitives(nightingale);
  const fashionPolar = createFashionTsnePolarPointPrimitives(fashionRows);
  const facetPrimitive = createCarsOriginScatterplotFacetPrimitives(cars);
  const facet = facetPrimitive._withCanvasConfig({
    ...facetPrimitive.materializationConfigs.canvas,
    size: { width: "auto", height: "auto" }
  });
  const polarPair = hconcat({
    id: "polarPair",
    programs: [
      { id: "donut", program: donut },
      { id: "detail", program: rose }
    ],
    gap: 20,
    align: "center"
  });
  const dashboard = vconcat({
    id: "integrationDashboard",
    programs: [
      { id: "polarPair", program: polarPair },
      { id: "facet", program: facet }
    ],
    gap: 24,
    align: "center"
  });
  const revisedPolarPair = polarPair.replaceCompositionChild({
    target: "detail",
    program: fashionPolar
  });
  const revisedDashboard = dashboard.replaceCompositionChild({
    target: "polarPair",
    program: revisedPolarPair
  });

  return Object.freeze({
    donut,
    rose,
    fashionPolar,
    facet,
    polarPair,
    dashboard,
    revisedPolarPair,
    revisedDashboard
  });
}

export function createCrossFeatureDashboardPrimitives(data) {
  return createCrossFeatureDashboardPrimitiveState(data).revisedDashboard;
}
