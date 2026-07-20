import {
  DEVELOPMENT_TRAJECTORY_COUNTRIES,
  DEVELOPMENT_TRAJECTORY_YEARS,
  createDevelopmentTrajectoryRows
} from "../../../examples/gapminder-development-trajectories/program.js";

export const TRAJECTORY_COUNTRIES = DEVELOPMENT_TRAJECTORY_COUNTRIES;
export const TRAJECTORY_YEARS = DEVELOPMENT_TRAJECTORY_YEARS;

export const TRAJECTORY_LAYOUT = Object.freeze({
  width: 760,
  height: 500,
  margin: Object.freeze({ top: 85, right: 170, bottom: 80, left: 85 }),
  plot: Object.freeze({ left: 85, top: 85, right: 590, bottom: 420 }),
  xDomain: Object.freeze([1, 7]),
  yDomain: Object.freeze([25, 85]),
  colors: Object.freeze(["#e45756", "#4c78a8", "#54a24b"])
});

export function createTrajectoryRows(gapminder) {
  return createDevelopmentTrajectoryRows(gapminder);
}
