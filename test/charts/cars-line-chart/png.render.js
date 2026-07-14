import test from "node:test";

import {
  createCarsLineChart,
  createConstantDashCarsLineChart,
  createDashReassignmentCarsLineChart,
  createDispersionCarsLineChart,
  createGroupReassignmentCarsLineChart,
  createMedianCarsLineChart,
  createMonotoneEditCarsLineChart,
  createNamedDashVocabularyCarsLineChart,
  createOrderedCarsLineChart,
  createQuantileCarsLineChart,
  createStepCarsLineChart
} from "../../../examples/cars-line-chart/program.js";
import { loadCars } from "../../support/data.js";
import { assertRenderedPNG } from "../../support/png.js";
import { createCarsLineChartPrimitives } from "./primitive.program.js";
import {
  createAggregateDispersionPrimitives,
  createAggregateMedianPrimitives,
  createAggregateOrderedPrimitives,
  createAggregateQuantilePrimitives,
  createConstantDashPrimitives,
  createCurveMonotoneEditPrimitives,
  createCurveStepPrimitives,
  createDashReassignmentPrimitives,
  createGroupReassignmentPrimitives,
  createNamedDashVocabularyPrimitives
} from "./phase2-primitives.program.js";

const cars = loadCars();
const baselineArtifact = Object.freeze({
  roadmap: "roadmap2",
  chart: "cars-line-chart",
  variant: "baseline",
  title: "Canonical Line Chart Baseline",
  userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({
    axes: { y: { ticksAndLabels: { count: 6 } } }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`
});

const curveArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "curve-step",
      title: "Step Curve",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends", curve: "step" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`
    }),
    primitive: createCurveStepPrimitives(cars),
    userFacing: createStepCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "curve-monotone-edit",
      title: "Monotone Curve Edit",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  })
  .editLineMark({ target: "trends", curve: "monotone", strokeWidth: 4 });`
    }),
    primitive: createCurveMonotoneEditPrimitives(cars),
    userFacing: createMonotoneEditCarsLineChart(cars)
  })
]);

const dashPrimitiveArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "named-dash-vocabulary",
      title: "Named Dash Vocabulary",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: namedDashRows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeStrokeDash({
    field: "Cylinders",
    scale: { range: ["solid", "dashed", "dotted", "dashdot"] }
  })
  .createLegend();`
    }),
    primitive: createNamedDashVocabularyPrimitives(cars),
    userFacing: createNamedDashVocabularyCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "constant-dash",
      title: "Constant Dotted Line",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeStrokeDash({ field: "Origin", scale: { id: "originDash" } })
  .createLegend()
  .encodeStrokeDash({ value: "dotted" });`
    }),
    primitive: createConstantDashPrimitives(cars),
    userFacing: createConstantDashCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "group-reassignment",
      title: "Group Reassignment",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeGroup({ field: "Origin" })
  .encodeGroup({ field: "Cylinders" });`
    }),
    primitive: createGroupReassignmentPrimitives(cars),
    userFacing: createGroupReassignmentCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "dash-reassignment",
      title: "Dash Reassignment",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeStrokeDash({ field: "Origin", scale: { id: "originDash" } })
  .createLegend()
  .encodeStrokeDash({ field: "Cylinders" });`
    }),
    primitive: createDashReassignmentPrimitives(cars),
    userFacing: createDashReassignmentCarsLineChart(cars)
  })
]);

function aggregateTargetCallChain(aggregate) {
  return `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: ${aggregate},
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({ axes: { y: { ticksAndLabels: { count: 6 } } } })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`;
}

const aggregatePrimitiveArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "aggregate-median",
      title: "Median Acceleration",
      userFacingCallChain: aggregateTargetCallChain('"median"')
    }),
    primitive: createAggregateMedianPrimitives(cars),
    userFacing: createMedianCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "aggregate-dispersion",
      title: "Acceleration Dispersion",
      userFacingCallChain: aggregateTargetCallChain('"stdev"')
    }),
    primitive: createAggregateDispersionPrimitives(cars),
    userFacing: createDispersionCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "aggregate-quantile",
      title: "75th Percentile Acceleration",
      userFacingCallChain: aggregateTargetCallChain(
        '{ op: "quantile", probability: 0.75 }'
      )
    }),
    primitive: createAggregateQuantilePrimitives(cars),
    userFacing: createQuantileCarsLineChart(cars)
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "aggregate-ordered",
      title: "Acceleration at Lowest Horsepower",
      userFacingCallChain: aggregateTargetCallChain(
        '{ op: "first", orderBy: "Horsepower" }'
      )
    }),
    primitive: createAggregateOrderedPrimitives(cars),
    userFacing: createOrderedCarsLineChart(cars)
  })
]);

test("renders the public and primitive line charts with visible series", async () => {
  const programs = [
    ["cars-line-chart", "user-facing", createCarsLineChart(cars)],
    ["cars-line-chart-primitives", "primitive", createCarsLineChartPrimitives(cars)]
  ];

  for (const [name, , program] of programs) {
    await assertRenderedPNG(program, {
      name,
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }

  for (const [, kind, program] of programs) {
    await assertRenderedPNG(program, {
      artifact: { ...baselineArtifact, kind },
      width: 720,
      height: 460,
      colors: ["#4c78a8", "#f58518", "#e45756"]
    });
  }

  for (const { artifact, primitive, userFacing } of curveArtifacts) {
    for (const [kind, program] of [
      ["primitive", primitive],
      ["user-facing", userFacing]
    ]) {
      await assertRenderedPNG(program, {
        artifact: { ...artifact, kind },
        width: 720,
        height: 460,
        colors: ["#4c78a8", "#f58518", "#e45756"]
      });
    }
  }

  for (const { artifact, primitive, userFacing } of dashPrimitiveArtifacts) {
    for (const [kind, program] of [
      ["primitive", primitive],
      ["user-facing", userFacing]
    ]) {
      await assertRenderedPNG(program, {
        artifact: { ...artifact, kind },
        width: 720,
        height: 460,
        colors: ["#4c78a8"]
      });
    }
  }

  for (const { artifact, primitive, userFacing } of aggregatePrimitiveArtifacts) {
    for (const [kind, program] of [
      ["primitive", primitive],
      ...(userFacing === undefined ? [] : [["user-facing", userFacing]])
    ]) {
      await assertRenderedPNG(program, {
        artifact: { ...artifact, kind },
        width: 720,
        height: 460,
        colors: ["#4c78a8", "#f58518", "#e45756"]
      });
    }
  }
});
