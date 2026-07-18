import { hconcat, vconcat } from "../../src/index.js";
import { createCarsOriginDonut } from "../cars-origin-donut/program.js";
import { createCarsOriginScatterplotFacet } from
  "../cars-origin-scatterplot-facet/program.js";
import { createNightingaleRoseChart } from
  "../nightingale-rose-chart/program.js";
import { createFashionTsnePolarPoints } from "../polar-points/program.js";

export function createCrossFeatureDashboardState({
  cars,
  nightingale,
  fashionRows
}) {
  const donut = createCarsOriginDonut(cars);
  const rose = createNightingaleRoseChart(nightingale);
  const fashionPolar = createFashionTsnePolarPoints(fashionRows);
  const facet = createCarsOriginScatterplotFacet(cars);
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

export function createCrossFeatureDashboard(data) {
  return createCrossFeatureDashboardState(data).revisedDashboard;
}
