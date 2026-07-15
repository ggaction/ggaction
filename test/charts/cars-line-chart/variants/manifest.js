import {
  createCarsLineChart,
  createCompositeLegendBottomCarsLineChart,
  createCompositeLegendTopCarsLineChart,
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
} from "../../../../examples/cars-line-chart/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsLineChartPrimitives } from "../primitive.program.js";
import {
  createAggregateDispersionPrimitives,
  createAggregateMedianPrimitives,
  createAggregateOrderedPrimitives,
  createAggregateQuantilePrimitives,
  createCompositeLegendBottomPrimitives,
  createCompositeLegendTopPrimitives,
  createConstantDashPrimitives,
  createCurveMonotoneEditPrimitives,
  createCurveStepPrimitives,
  createDashReassignmentPrimitives,
  createGroupReassignmentPrimitives,
  createNamedDashVocabularyPrimitives
} from "./primitive-programs.js";

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

function compositeLegendTargetCallChain(position) {
  const top = position === "top";
  return `chart()
  .createCanvas({
    width: 720,
    height: ${top ? 520 : 560},
    margin: ${top
      ? "{ top: 170, right: 40, bottom: 60, left: 80 }"
      : "{ top: 80, right: 40, bottom: 160, left: 80 }"}
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({ field: "Year", fieldType: "temporal", scale: { nice: true } })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({
    axes: { y: { ticksAndLabels: { count: 6 } } },
    legend: false
  })
  .createLegend({
    position: "${position}",
    align: "${top ? "center" : "right"}",
    direction: "${top ? "vertical" : "horizontal"}",
    columns: 2,
    offset: ${top ? 10 : 70},
    titlePosition: "${top ? "left" : "top"}",
    labels: { offset: 10 },
    itemGap: 18,
    border: {
      color: "#94a3b8",
      lineWidth: 1,
      padding: 10,
      background: "${top ? "white" : "#f8fafc"}"
    },
    symbol: {
      layers: [
        { type: "line", length: 36, lineWidth: 3 },
        {
          type: "point",
          shape: "circle",
          size: 5,
          stroke: "white",
          strokeWidth: 1
        }
      ]
    }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });`;
}

const compositeLegendPrimitiveArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "composite-legend-top",
      title: "Top Composite Line and Point Legend",
      userFacingCallChain: compositeLegendTargetCallChain("top")
    }),
    primitive: createCompositeLegendTopPrimitives(cars),
    userFacing: createCompositeLegendTopCarsLineChart(cars),
    width: 720,
    height: 520
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-line-chart",
      variant: "composite-legend-bottom",
      title: "Bottom Composite Line and Point Legend",
      userFacingCallChain: compositeLegendTargetCallChain("bottom")
    }),
    primitive: createCompositeLegendBottomPrimitives(cars),
    userFacing: createCompositeLegendBottomCarsLineChart(cars),
    width: 720,
    height: 560
  })
]);

const SERIES_COLORS = Object.freeze(["#4c78a8", "#f58518", "#e45756"]);

function plotRegion({ height = 460, top = 80, right = 170, bottom = 60 } = {}) {
  return Object.freeze([Object.freeze({
    name: "plot",
    x: 80,
    y: top,
    width: 720 - 80 - right,
    height: height - top - bottom,
    minimumInkPixels: 20
  })]);
}

function fromArtifact(
  entry,
  { colors = SERIES_COLORS, regions = plotRegion() } = {}
) {
  return defineVisualVariant({
    chart: "cars-line-chart",
    variant: entry.artifact.variant,
    title: entry.artifact.title,
    callChain: entry.artifact.userFacingCallChain,
    primitive: entry.primitive,
    userFacing: entry.userFacing,
    width: entry.width ?? 720,
    height: entry.height ?? 460,
    colors,
    regions
  });
}

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-line-chart",
    variant: baselineArtifact.variant,
    title: baselineArtifact.title,
    callChain: baselineArtifact.userFacingCallChain,
    primitive: createCarsLineChartPrimitives(cars),
    userFacing: createCarsLineChart(cars),
    width: 720,
    height: 460,
    colors: SERIES_COLORS,
    regions: plotRegion()
  }),
  ...curveArtifacts.map(entry => fromArtifact(entry)),
  ...dashPrimitiveArtifacts.map(entry =>
    fromArtifact(entry, { colors: ["#4c78a8"] })
  ),
  ...aggregatePrimitiveArtifacts.map(entry => fromArtifact(entry)),
  ...compositeLegendPrimitiveArtifacts.map(entry => fromArtifact(entry, {
    regions: plotRegion(entry.artifact.variant.endsWith("top")
      ? { height: 520, top: 170, right: 40, bottom: 60 }
      : { height: 560, top: 80, right: 40, bottom: 160 })
  }))
]);
