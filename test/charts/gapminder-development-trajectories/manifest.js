import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createGapminderDevelopmentTrajectories } from
  "../../../examples/gapminder-development-trajectories/program.js";
import { TRAJECTORY_LAYOUT } from "./fixture.js";
import { createDevelopmentTrajectoryPrimitives } from "./primitive.program.js";

const gapminder = loadGapminder();

export const trajectoryTargetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 500,
    margin: { top: 85, right: 170, bottom: 80, left: 85 }
  })
  .createData({ values: trajectoryRows })
  .createLineMark({ id: "trajectories", strokeWidth: 3 })
  .encodeX({
    target: "trajectories",
    field: "fertility",
    scale: { domain: [1, 7], zero: false }
  })
  .encodeY({
    target: "trajectories",
    field: "life_expect",
    scale: { domain: [25, 85], zero: false }
  })
  .encodeColor({
    target: "trajectories",
    field: "country",
    fieldType: "nominal",
    scale: {
      domain: ["China", "South Africa", "United States"],
      range: ["#e45756", "#4c78a8", "#54a24b"]
    }
  })
  .encodePathOrder({
    target: "trajectories",
    field: "year",
    order: "ascending"
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: { title: "Country", position: "right" }
  })
  .createTitle({
    text: "Development Trajectories",
    subtitle: "Fertility and life expectancy, 1955–2005"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-development-trajectories",
    variant: "year-ordered",
    title: "Gapminder Development Trajectories",
    callChain: trajectoryTargetCallChain,
    artifact: { capability: "path-order" },
    primitive: () => createDevelopmentTrajectoryPrimitives(gapminder),
    userFacing: () => createGapminderDevelopmentTrajectories(gapminder),
    width: TRAJECTORY_LAYOUT.width,
    height: TRAJECTORY_LAYOUT.height,
    colors: [...TRAJECTORY_LAYOUT.colors, "#334155"],
    regions: [
      {
        name: "chronological trajectories",
        x: 80,
        y: 80,
        width: 515,
        height: 345,
        minimumInkPixels: 700
      },
      {
        name: "country legend",
        x: 610,
        y: 120,
        width: 135,
        height: 170,
        minimumInkPixels: 300
      }
    ]
  })
]);
