import { chart } from "../../src/index.js";

export const TRACE_DEMO_ROWS = Object.freeze([
  Object.freeze({ horsepower: 52, mpg: 44, origin: "Japan" }),
  Object.freeze({ horsepower: 65, mpg: 36, origin: "Europe" }),
  Object.freeze({ horsepower: 70, mpg: 38, origin: "Japan" }),
  Object.freeze({ horsepower: 88, mpg: 27, origin: "USA" }),
  Object.freeze({ horsepower: 95, mpg: 31, origin: "Europe" }),
  Object.freeze({ horsepower: 105, mpg: 26, origin: "USA" }),
  Object.freeze({ horsepower: 110, mpg: 24, origin: "Europe" }),
  Object.freeze({ horsepower: 130, mpg: 21, origin: "USA" }),
  Object.freeze({ horsepower: 150, mpg: 18, origin: "USA" }),
  Object.freeze({ horsepower: 180, mpg: 15, origin: "USA" })
]);

const STEP_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "canvas",
    label: "Create the canvas",
    code: ".createCanvas({ width: 640, height: 400 })",
    apply: program => program.createCanvas({
      width: 640,
      height: 400,
      margin: { top: 74, right: 120, bottom: 62, left: 70 },
      background: "#fffdfa"
    })
  }),
  Object.freeze({
    id: "data",
    label: "Add immutable data",
    code: ".createData({ id: \"cars\", values: rows })",
    apply: program => program.createData({ id: "cars", values: TRACE_DEMO_ROWS })
  }),
  Object.freeze({
    id: "scatterplot",
    label: "Create the scatterplot",
    code: ".createScatterPlot({ x: \"horsepower\", y: \"mpg\", color: \"origin\", guides: false })",
    apply: program => program.createScatterPlot({
      id: "cars-points",
      x: "horsepower",
      y: "mpg",
      color: "origin",
      guides: false
    })
  }),
  Object.freeze({
    id: "guides",
    label: "Materialize guides",
    code: ".createGuides({ axes: { x: { title: { text: \"Horsepower\" } }, y: { title: { text: \"Miles per gallon\" } } } })",
    apply: program => program.createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      },
      legend: { channels: ["color"], title: "Origin" }
    })
  }),
  Object.freeze({
    id: "title",
    label: "Add a title",
    code: ".createTitle({ text: \"Power and fuel economy\", subtitle: \"Ten illustrative vehicles\" })",
    apply: program => program.createTitle({
      text: "Power and fuel economy",
      subtitle: "Ten illustrative vehicles"
    })
  })
]);

export const TRACE_DEMO_STEP_IDS = Object.freeze(
  STEP_DEFINITIONS.map(step => step.id)
);

export function createInteractiveActionTrace() {
  const stages = [];
  let program = chart();
  for (const definition of STEP_DEFINITIONS) {
    const previous = program;
    program = definition.apply(previous);
    if (program === previous || !Object.isFrozen(program)) {
      throw new Error(`Trace demo step "${definition.id}" must return a new frozen program.`);
    }
    stages.push(Object.freeze({
      id: definition.id,
      label: definition.label,
      code: definition.code,
      program
    }));
  }
  return Object.freeze(stages);
}
